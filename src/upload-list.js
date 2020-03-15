function get_policy(file, callback) {
	var filename = file.name;
	console.log("get_policy: filename = " + filename);
	get_query(file, function(query) {
		console.log("query: " + query);
		var url = "https://www.youtube.com/audioswap_ajax?action_get_tracks=1&q=" +
			encodeURIComponent(query) + "&s=ad_supported_music&mr=25&si=0&qid=1&sh=true";
		console.log("request asset filename: " + filename + ", url: " + url);
		$.getJSON(url, function(response) {
			console.log("request asset filename: " + filename + ", response: " + JSON.stringify(response));
			if (response.tracks.length == 0) {
				add_result(filename, "no", "");
				callback();
				return;
			}
			var asset_id = response.tracks[0].asset_id;
			var isrc = response.tracks[0].isrc;
			var url = "https://www.youtube.com/audioswap_ajax?action_get_track_details=1"
				+ "&asset_id=" + asset_id + "&um=false&are=false"
				+ "&isrc=" + isrc;
			console.log("request policy filename: " + filename + ", url: " + url);
			$.getJSON(url, function(response) {
				console.log("request policy response: " + filename + ", response: " + JSON.stringify(response));
				add_result(filename, "yes", format_policy(response));
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

function add_result(filename, found, restricted_countries) {
	console.log("add_result: filename: " + filename + " found: " + found
		+ " restricted_countries: " + restricted_countries);
	var row = document.createElement("tr");
	row.appendChild(create_td(filename));
	row.appendChild(create_td(found));
	row.appendChild(create_td(restricted_countries));
	result_table.appendChild(row);
}

function create_td(text) {
	var td = document.createElement("td");
	td.innerHTML += text;
	return td;
}

function format_policy(response) {
	if (!response.is_available) {
		return "no";
	}
	if (response.sr_policy
		&& response.sr_policy.restrictions
		&& response.sr_policy.restrictions.blocked_terr_names) {

		var blocked_terr = response.sr_policy.restrictions.blocked_terr_names;
		if (blocked_terr.includes(country_text.value)) {
			return "no";
		}
	}
	return "yes";
}

function oncheck() {
	console.log("check_button.onclick");
	var files = file_selector.files;
	var i = 0;
	var loop = function() {
		if (i < files.length) {
			get_policy(files[i++], loop);
		} else {
			loading_img.style.visibility = "hidden";
		}
	};
	loading_img.style.height = check_button.offsetHeight + "px";
	loading_img.style.visibility = "visible";
	loop();
}

var file_selector = document.createElement("input");
file_selector.setAttribute("type", "file");
file_selector.setAttribute("multiple", "");

var check_button = document.createElement("input");
check_button.setAttribute("type", "button");
check_button.setAttribute("value", "Check");
check_button.onclick = oncheck;

var loading_img = document.createElement("img");
loading_img.setAttribute("src", browser.runtime.getURL("./icons/loading-103.gif"));
// TODO: find out when one should use setAttribute and when fields?
loading_img.style.visibility = "hidden";
loading_img.style.height = "0px";

var country_label = document.createElement("label");
country_label.innerHTML += "Your country name: ";
var country_text = document.createElement("input");
country_text.setAttribute("type", "text");
country_label.appendChild(country_text);

var button_div = document.createElement("div");
button_div.appendChild(country_label);
button_div.appendChild(file_selector);
button_div.appendChild(check_button);
button_div.appendChild(loading_img);

var result_table = document.createElement("table");
result_table.setAttribute("width", "100%");
add_result("File name", "Found", "Available in your country");

var gui = document.createElement("div");
gui.setAttribute("id", "youtube-music-policy-extension");
gui.appendChild(button_div);
gui.appendChild(result_table);

var old_gui = document.querySelector('[id="youtube-music-policy-extension"]');
if (old_gui != null) {
	old_gui.parentNode.removeChild(old_gui);
}
var audio_library_browser = document.querySelector('[class="audio-library-browser"]');
audio_library_browser.insertBefore(gui, audio_library_browser.firstChild);
