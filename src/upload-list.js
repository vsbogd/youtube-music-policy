function get_policy(file, callback) {
	var filename = file.name;
	var result = newResult(file); 
	console.log("get_policy: filename = " + filename);
	get_query(file, function(query) {
		result.query = query.text;
		console.log("query: " + JSON.stringify(query));
		var url = "https://www.youtube.com/audioswap_ajax?action_get_tracks=1&q=" +
			encodeURIComponent(query.text) + "&s=ad_supported_music&mr=25&si=0&qid=1&sh=true";
		console.log("request asset filename: " + filename + ", url: " + url);
		$.getJSON(url, function(response) {
			console.log("request asset filename: " + filename + ", response: " + JSON.stringify(response));
			if (response.tracks.length == 0) {
				result.status = "not found";
				results.add(result);
				callback();
				return;
			}
			var track = find_best_match(response.tracks, query);
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
				result.status = "found";
				result.add_restrictions(response);
				results.add(result);
				callback();
			}).fail(function() {
				result.status = "error";
				results.add(result);
				return;
			});
		}).fail(function() {
			result.status = "error";
			results.add(result);
			return;
		});
	});
}

function find_best_match(tracks, query) {
	var min_score = get_score(tracks[0], query);
	var best_match = tracks[0];
	for (var i = 1; i < tracks.length; ++i) {
		var score = get_score(tracks[i], query);
		if (score < min_score) {
			min_score = score;
			best_match = tracks[i];
		}
	}
	console.log("find_best_match: min_score: " + min_score + ", best_match: " + best_match);
	return best_match;
}

function get_score(track, query) {
	var score = string_dist(track.title, query.title);
	if (query.artist !== undefined) {
		score += 100 * string_dist(track.artist, query.artist);
	}
	console.log("get_score: track: " + JSON.stringify(track) +
		", query: " + JSON.stringify(query) + ", score: " + score);
	return score;
}

function string_dist(a, b) {
	if (a.startsWith(b) || b.startsWith(a)) {
		return 0;
	}
	var dist = levenshteinDistance(a, b);
	return dist;
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
			callback({
				text: tags.artist + " " + tags.title,
				artist: tags.artist,
				title: tags.title
			});
		} else {
			var text = filename_to_query(filename);
			callback({
				text: text,
				title: text
			});
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
		status: "",
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

	var country_select = document.createElement("select");
	country_select.style.maxWidth = "40px";

	var results = {
		table: result_table,
		results: [],
		country_select: country_select,
		country_set: new Set(),

		add_header: function() {
			var row = newRow();
			row.add_text_header("File name");
			row.add_text_header("Status");
			row.add_element_header(country_select).style.maxWidth = "40px";
			row.add_text_header("Artist");
			row.add_text_header("Title");
			row.add_text_header("Using restrictions");
			row.add_text_header("Query");
			this.table.appendChild(row.element);
		},

		add: function(result) {
			console.log("results.add: result: " + JSON.stringify(result));
			this.results.push(result);
			var row = newRow();
			row.add_text(result.file.name);
			row.add_text(result.status);
			row.add_text("");
			row.add_text(result.artist);
			row.add_text(result.title);
			this._add_countries(row, result);
			row.add_text(result.query);
			this.table.appendChild(row.element);
		},

		_add_countries: function(row, result) {
			if (!result.is_available) {
				row.add_text("Not available anywhere");
				return;
			}
			if (result.restricted_countries.length == 0) {
				row.add_text("Available everywhere");
				return;
			}
			for (var i = 0; i < result.restricted_countries.length; ++i) {
				this._add_country(result.restricted_countries[i]);
			}
			var countries = result.restricted_countries.join();
			if (countries.length < 100) {
				row.add_text(countries);
			} else {
				row.add_with_title(countries.substring(0, 100) + "... ("
					+ result.restricted_countries.length + " countries)",
					countries);
			}
		},

		_add_country: function(country) {
			if (this.country_set.has(country)) {
				return;
			}
			console.log("results._add_country:", country);
			this.country_set.add(country);
			var option = document.createElement("option");
			option.setAttribute("value", country);
			option.textContent += country;
			this.country_select.appendChild(option);
		},

		on_country_change: function(event) {
			console.log("results.on_country_change:", event);
			var country = event.target.value;
			for (var i = 0; i < this.results.length; ++i) {
				var result = this.results[i];
				var flag = "yes";
				var color = "";
				if (!result.is_available ||
					result.restricted_countries.includes(country)) {
					flag = "no";
					color = "red";
				}
				this.table.children[i + 1].style.backgroundColor = color;
				this.table.children[i + 1].children[2].textContent = flag;
			}
		}
	};

	results.add_header();
	country_select.onchange = function(event) {
		results.on_country_change(event);
	}

	return results;
}

function newRow() {
	return {
		element: document.createElement("tr"),

		add_text: function(text) {
			var td = document.createElement("td");
			td.textContent += text;
			this.element.appendChild(td);
		},

		add_with_title: function(text, title) {
			var td = document.createElement("td");
			td.setAttribute("title", title);
			td.textContent += text;
			this.element.appendChild(td);
		},

		add_text_header: function(text) {
			var th = document.createElement("th");
			th.textContent += text;
			this.element.appendChild(th);
		},

		add_element_header: function(element) {
			var th = document.createElement("th");
			th.appendChild(element);
			this.element.appendChild(th);
			return th;
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
file_selector_label.textContent += "Select files: ";
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
