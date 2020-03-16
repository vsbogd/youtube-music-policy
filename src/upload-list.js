function get_policy(file, callback) {
	var filename = file.name;
	var result = newResult(file); 
	console.log("get_policy: filename = " + filename);
	get_query(file, function(query) {
		result.query = query;
		console.log("query: " + query);
		var url = "https://www.youtube.com/audioswap_ajax?action_get_tracks=1&q=" +
			encodeURIComponent(query) + "&s=ad_supported_music&mr=25&si=0&qid=1&sh=true";
		console.log("request asset filename: " + filename + ", url: " + url);
		$.getJSON(url, function(response) {
			console.log("request asset filename: " + filename + ", response: " + JSON.stringify(response));
			if (response.tracks.length == 0) {
				result.found = false;
				results.add(result);
				callback();
				return;
			}
			var track = response.tracks[0];
			result.artist = track.artist;
			result.title = track.title;
			var asset_id = track.asset_id;
			var isrc = track.isrc;
			var url = "https://www.youtube.com/audioswap_ajax?action_get_track_details=1"
				+ "&asset_id=" + asset_id + "&um=false&are=false"
				+ "&isrc=" + isrc;
			console.log("request policy filename: " + filename + ", url: " + url);
			$.getJSON(url, function(response) {
				console.log("request policy response: " + filename + ", response: " + JSON.stringify(response));
				result.found = true;
				result.add_restrictions(response);
				results.add(result);
				callback();
			});
		});
	});
}

function read_id3(file, callback) {
	var filename = file.name;
	ID3.loadTags(filename, function() {
		console.log("ID3.loadTags: filename: " + filename);
		callback(ID3.getAllTags(filename));
	}, {
		dataReader: ID3.FileAPIReader(file)
	});
}

function get_query(file, callback) {
	var filename = file.name;
	read_id3(file, function(tags) {
		console.log("read_id3: filename: " + filename + ", tags: " + JSON.stringify(tags));
		if ("artist" in tags && "title" in tags) {
			callback(tags.artist + " " + tags.title);
		} else {
			callback(filename_to_query(filename));
		}
	});
}

function filename_to_query(filename) {
	var query = filename.substring(0, filename.lastIndexOf("."));
	query = query.replace(/[0-9\,\-\_\'\"]/g, " ");
	query = query.replace(/ +/g, " ");
	query = query.replace(/^ | $/g, "");
	console.log("get_query: filename = " + filename + ", query = " + query);
	return query;
}

function newResult(file) {
	return {
		file: file,
		found: false,
		artist: "",
		title: "",
		is_available: true,
		restricted_countries: [],
		query: "",

		add_restrictions: function(response) {
			this.is_available = response.is_available;
			if (response.sr_policy
				&& response.sr_policy.restrictions
				&& response.sr_policy.restrictions.blocked_terr_names) {
				var blocked_terr = response.sr_policy.restrictions.blocked_terr_names;
				this.restricted_countries = blocked_terr;
			} else {
				this.restricted_countries = [];
			}
		}
	};
}

function newResults() {
	var result_table = document.createElement("table");
	result_table.setAttribute("width", "100%");
	result_table.style.borderCollapse = "separate";
	result_table.style.borderSpacing = "5px";

	var results = {
		table: result_table,

		add_header: function(list) {
			var row = newRow();
			for (var i = 0; i < list.length; ++i) {
				row.add_header(list[i]);
			}
			this.table.appendChild(row.element);
		},

		add: function(result) {
			console.log("results.add: result: " + JSON.stringify(result));
			var row = newRow();
			row.add(result.file.name);
			row.add(yes_no(result.found));
			row.add(result.artist);
			row.add(result.title);
			this._add_countries(row, result);
			row.add(result.query);
			this.table.appendChild(row.element);
		},

		_add_countries: function(row, result) {
			if (!result.is_available) {
				row.add("Not available anywhere");
				return;
			}
			if (result.restricted_countries.length == 0) {
				row.add("Available everywhere");
				return;
			}
			var countries = result.restricted_countries.join();
			if (countries.length < 100) {
				row.add(countries);
			} else {
				row.add_with_title(countries.substring(0, 100) + "... ("
					+ result.restricted_countries.length + " countries)",
					countries);
			}
		}
	};
	results.add_header(["File name", "Found", "Artist", "Title", "Using restrictions", "Query"]);

	return results;
}

function yes_no(bool) {
	if (bool) {
		return "yes";
	} else {
		return "no";
	}
}

function newRow() {
	return {
		element: document.createElement("tr"),

		add: function(text) {
			var td = document.createElement("td");
			td.innerHTML += text;
			this.element.appendChild(td);
		},

		add_with_title: function(text, title) {
			var td = document.createElement("td");
			td.setAttribute("title", title);
			td.innerHTML += text;
			this.element.appendChild(td);
		},

		add_header: function(text) {
			var th = document.createElement("th");
			th.innerHTML += text;
			this.element.appendChild(th);
		}

	}
}

function oncheck() {
	console.log("check_button.onclick");
	if (file_selector.files.length == 0) {
		alert("Select files to check");
		return;
	}
	var files = file_selector.files;
	var i = 0;
	var loop = function() {
		if (i < files.length) {
			get_policy(files[i++], loop);
		} else {
			loading_img.style.visibility = "hidden";
		}
	};
	loading_img.style.visibility = "visible";
	loop();
}

var file_selector = document.createElement("input");
file_selector.setAttribute("type", "file");
file_selector.setAttribute("multiple", "");

var file_selector_label = document.createElement("label");
file_selector_label.innerHTML += "Select files: ";
file_selector_label.appendChild(file_selector);

var check_button = document.createElement("input");
check_button.setAttribute("type", "button");
check_button.setAttribute("value", "Check");
check_button.onclick = oncheck;

var loading_img = document.createElement("span");
loading_img.setAttribute("class", "yt-spinner-img  yt-sprite");
// TODO: find out when one should use setAttribute and when fields?
loading_img.style.visibility = "hidden";

var button_div = document.createElement("div");
button_div.setAttribute("width", "100%");
button_div.setAttribute("align", "right");
button_div.appendChild(file_selector_label);
button_div.appendChild(check_button);
button_div.appendChild(loading_img);

var results = newResults();

var gui = document.createElement("div");
gui.setAttribute("id", "youtube-music-policy-extension");
gui.appendChild(button_div);
gui.appendChild(results.table);

var old_gui = document.querySelector('[id="youtube-music-policy-extension"]');
if (old_gui != null) {
	old_gui.parentNode.removeChild(old_gui);
}
var audio_library_browser = document.querySelector('[class="audio-library-browser"]');
audio_library_browser.insertBefore(gui, audio_library_browser.firstChild);
