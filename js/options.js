'use strict';

var optionsLoader = (function() {
	var opts = {
		lines : 13, // The number of lines to draw
		length : 20, // The length of each line
		width : 10, // The line thickness
		radius : 30, // The radius of the inner circle
		corners : 1, // Corner roundness (0..1)
		rotate : 0, // The rotation offset
		direction : 1, // 1: clockwise, -1: counterclockwise
		color : '#0370B7', // #rgb or #rrggbb or array of colors
		speed : 1, // Rounds per second
		trail : 60, // Afterglow percentage
		shadow : false, // Whether to render a shadow
		hwaccel : false, // Whether to use hardware acceleration
		className : 'spinner', // The CSS class to assign to the spinner
		zIndex : 2e9, // The z-index (defaults to 2000000000)
		top : '50%', // Top position relative to parent
		left : '50%' // Left position relative to parent
	};

	// @corecode_begin getProtectedData
	function xhrWithAuth(method, url, interactive, callback) {

		var access_token;

		var retry = true;

		getToken();

		function getToken() {
			chrome.identity.getAuthToken({
				interactive : interactive
			}, function(token) {
				if (chrome.runtime.lastError) {
					callback(chrome.runtime.lastError);
					return;
				}

				access_token = token;
				requestStart();
			});
		}

		function requestStart() {
			var xhr = new XMLHttpRequest();
			xhr.open(method, url);
			xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
			xhr.onload = requestComplete;
			xhr.send();
		}

		function requestComplete() {
			if (this.status == 401 && retry) {
				retry = false;
				chrome.identity.removeCachedAuthToken({
					token : access_token
				}, getToken);
			} else {
				callback(null, this.status, this.response);
			}
		}

	}

	function getUserInfo(interactive) {
		xhrWithAuth('GET', 'https://www.googleapis.com/plus/v1/people/me', interactive, onUserInfoFetched);
	}

	// @corecode_end getProtectedData

	function onUserInfoFetched(error, status, response) {
		if (!error && status == 200) {
			var user_info = JSON.parse(response);
			log('userid fetched save it');
			chrome.storage.local.set({
				'userID' : user_info.id
			}, function() {
				$("#link_div").hide();
				$("#unlink_div").show();
				$('#progressbar').hide();
				console.log('userID saved');
			});

		} else {
			log('error in signin');
			$('#progressbar').hide();
		}
	}

	function interactiveSignIn() {
		$("#signin").prop('disabled', true);
		//$('progressbar').show();
		var target = document.getElementById('progressbar');
		var spinner = new Spinner(opts);

		spinner.spin(target);

		log('opening login page please wait');

		chrome.identity.getAuthToken({
			'interactive' : true
		}, function(token) {
			//alert('testtoken')
			if (chrome.runtime.lastError) {
				log('login error ' + JSON.stringify(chrome.runtime.lastError));
				$('#signin').prop('disabled', false);
				// $("#progressbar").hide();
				spinner.stop(target);
			} else {
				getUserInfo(false);
				log('logged in successfully try to get userID');

			}
		});
		// @corecode_end getAuthToken
	}

	function revokeToken() {
		chrome.identity.getAuthToken({
			'interactive' : false
		}, function(current_token) {
			if (!chrome.runtime.lastError) {

				// @corecode_begin removeAndRevokeAuthToken
				// @corecode_begin removeCachedAuthToken
				// Remove the local cached token
				chrome.identity.removeCachedAuthToken({
					token : current_token
				}, function() {
				});
				// @corecode_end removeCachedAuthToken

				// Make a request to revoke token in the server
				var xhr = new XMLHttpRequest();
				xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' + current_token);
				xhr.send();
				// @corecode_end removeAndRevokeAuthToken

				chrome.storage.local.remove('userID');

				// Update the user interface accordingly
				log('logged out successfully');
				$("#link_div").show();
				$("#unlink_div").hide();
				$("#signin").prop('disabled', false);

			}
		});
	}

	function log(message) {
		$("#status").append('<br/>' + message + '<br/>');
	}

	return {
		onload : function() {

			chrome.storage.local.get('debug', function(result) {

				var debug = result.hasOwnProperty('debug') && result['debug'];
				$('#show_debug_info').prop('checked', debug);
				$("#status").toggle(debug);

			});

			$("#signin").click(interactiveSignIn);
			$("#signout").click(revokeToken);

			$('#show_debug_info').click(function() {
				$("#status").toggle(this.checked);
				chrome.storage.local.set({
					'debug' : this.checked
				});

			});

			chrome.storage.local.get('userID', function(result) {

				log('logged in ' + result.hasOwnProperty('userID'));

				if (result.hasOwnProperty('userID')) {//signed in
					$("#unlink_div").show();
				} else {//not logged in
					$("#link_div").show();
				}

			});
		}
	};

})();

window.onload = optionsLoader.onload; 