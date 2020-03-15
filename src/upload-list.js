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
				add_result("&quot;" + filename + "&quot;, &quot;" + "not found" + "&quot;");
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
				add_result("&quot;" + filename + "&quot;, &quot;" + format_policy(response) + "&quot;");
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

function add_result(text) {
	console.log("add_result: text = " + text);
	var result = document.createElement("p");
	result.innerHTML += text
	result_div.appendChild(result);
}

function format_policy(response) {
	if (!response.is_available) {
		return "not available anywhere";
	}
	if (response.sr_policy
		&& response.sr_policy.restrictions
		&& response.sr_policy.restrictions.blocked_terr_names) {

		var blocked_terr = response.sr_policy.restrictions.blocked_terr_names;
		if (blocked_terr.includes("Россия") || blocked_terr.includes("Russia")) {
			return "not available in Russia";
		}
	}
	return "ok";
}

function oncheck() {
	console.log("check_button.onclick");
	var files = file_selector.files;
	var i = 0;
	var loop = function() {
		if (i < files.length) {
			get_policy(files[i++], loop);
		} else {
			add_result("Finished.");
		}
	};
	loop();
}

var file_selector = document.createElement("input");
file_selector.setAttribute("type", "file");
file_selector.setAttribute("multiple", "");

var check_button = document.createElement("input");
check_button.setAttribute("type", "button");
check_button.setAttribute("value", "Check");
check_button.onclick = oncheck;

var button_div = document.createElement("div");
button_div.appendChild(file_selector);
button_div.appendChild(check_button);

var gui = document.createElement("div");
gui.setAttribute("id", "youtube-music-policy-extension");
gui.appendChild(button_div);
var result_div = gui.appendChild(document.createElement("div"));

var old_gui = document.querySelector('[id="youtube-music-policy-extension"]');
if (old_gui != null) {
	old_gui.parentNode.removeChild(old_gui);
}
var audio_library_browser = document.querySelector('[class="audio-library-browser"]');
audio_library_browser.insertBefore(gui, audio_library_browser.firstChild);
