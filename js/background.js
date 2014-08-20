var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-44491916-9']);
_gaq.push(['_trackPageview']);

(function() {
    var ga = document.createElement('script');
    ga.type = 'text/javascript';
    ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
})();


var codeSending = [
    'var d = document.createElement("div");',
    'd.setAttribute("id", "notiDIV");',
    'd.innerHTML = "<p></p><font size=5 face=verdana>Sending to device</font><p></p>";',
    'd.setAttribute("align", "center");',
    'd.setAttribute("style", "' + 'color : white;' + 'background-color: #0370B7; ' + 'width: 300px; ' + 'height: 60px; ' + 'position: fixed; ' + 'top: 70px; ' + 'right: 30px; ' + 'z-index: 9999; ' + '");',
    'document.body.appendChild(d);'
].join("\n");

var codeOK = [
    'var d = document.createElement("div");',
    'd.setAttribute("id", "notiDIV");',
    'd.innerHTML = "<p></p><font size=5 face=verdana>Sent to device</font><p></p>";',
    'd.setAttribute("align", "center");',
    'd.setAttribute("style", "' + 'color : white;' + 'background-color: #0370B7; ' + 'width: 300px; ' + 'height: 60px; ' + 'position: fixed; ' + 'top: 70px; ' + 'right: 30px; ' + 'z-index: 9999; ' + '");',
    'document.body.appendChild(d);'
].join("\n");


var codeNotOK = [
    'var d = document.createElement("div");',
    'd.setAttribute("id", "notiDIV");',
    'd.innerHTML = "<p></p><font size=5 face=verdana>Error sending to device</font><p></p>";',
    'd.setAttribute("align", "center");',
    'd.setAttribute("style", "' + 'color : white;' + 'background-color: red; ' + 'width: 300px; ' + 'height: 60px; ' + 'position: fixed; ' + 'top: 70px; ' + 'right: 30px; ' + 'z-index: 9999; ' + '");',
    'document.body.appendChild(d);'
].join("\n");

var codeHideNoti = [
    'var notiDIV = document.getElementById("notiDIV");',
    'document.body.removeChild(notiDIV)'
].join("\n");


chrome.contextMenus.create({
    id: "myContextMenu", //
    title: "Send to Authenticator Plus",
    contexts: ["all"]
});



chrome.browserAction.onClicked.addListener(function(tab) {
    console.log("browser button clicked");
    tryToSendMessage(false, tab);
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
    console.log("right click menu clicked");
    tryToSendMessage(true, tab);
});

var head = document.getElementsByTagName('head')[0];
var script = document.createElement('script');
script.type = 'text/javascript';
script.src = "https://apis.google.com/js/client.js?onload=init";
head.appendChild(script);

console.log('load gsapi script');

function init() {
    console.log('gsapi script loaded');

    var apiName = 'messaging';
    var apiVersion = 'v1';
    var apiRoot = 'https://authplussync.appspot.com/_ah/api';
    var callback = function() {
        // endpoint loaded();
    };
    gapi.client.load(apiName, apiVersion, callback, apiRoot);
}

// @corecode_begin getProtectedData
function xhrWithAuth(method, url, interactive, callback, tab) {
    var access_token;

    var retry = true;

    getToken();

    function getToken() {
        chrome.identity.getAuthToken({
            interactive: interactive
        }, function(token) {
            if (chrome.runtime.lastError) {
                callback(chrome.runtime.lastError, tab);
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
        //console.log('access_token = ' + access_token)
    }

    function requestComplete() {
        //console.log('this.status ' + this.status)
        if (this.status == 401 && retry) {
            retry = false;
            chrome.identity.removeCachedAuthToken({
                token: access_token
            }, getToken);
        } else {
            callback(null, this.status, this.response, tab);
        }
    }

}

function tryToSendMessage(interactive, tab) {
    console.log("Current tab is " + tab.url);
    if (tab.url.indexOf('chrome://') != -1 || tab.url.indexOf('chrome-extension://') != -1) {
        console.log('ignore chrome pages');
        return;
    }

    chrome.storage.local.get('userID', function(result) {
        console.log('hasOwnProperty ' + result.hasOwnProperty('userID'));
        if (result.hasOwnProperty('userID')) {
            var userID = result['userID'];
            //console.log('userID ' + userID)
            sendMessage(userID, tab, false);
        } else {
            console.log('we dont have cached userID fetch it now');
            xhrWithAuth('GET', 'https://www.googleapis.com/plus/v1/people/me', interactive, onUserInfoFetched, tab);
        }

    });

}

// @corecode_end getProtectedData
function onUserInfoFetched(error, status, response, tab) {
    if (!error && status == 200) {
        console.log('STATE_AUTHTOKEN_ACQUIRED');
        //console.log(response);
        var user_info = JSON.parse(response);
        //console.log("user_info " + user_info)

        sendMessage(user_info.id, tab, true);
    } else {
        //changeState(STATE_START);
        console.log('STATE_START');
        chrome.tabs.create({
            url: "html/options.html"
        });
    }
}

/*function sendMessage(userID, tab) {
 sendMessage(userID, tab, true);
 }*/

function sendMessage(userID, tab, cacheUserID) {
    chrome.tabs.executeScript(tab.id, {
            code: codeSending
        });

    _gaq.push(['_trackEvent', 'Chrome extension', 'message pushed']);
    chrome.identity.getAuthToken({
        interactive: false
    }, function(token) {
        xhrWithAuth('POST', getMessageURL(userID, tab.url, token), false, onMessageSent, tab);
        console.log('do we need to chache userId ' + cacheUserID);

        if (cacheUserID) {
            console.log('cacher userID');
            // Save it using the Chrome extension storage API.
            chrome.storage.local.set({
                'userID': userID
            }, function() {
                // Notify that we saved.
                console.log('userID saved');
            });
        }
    });

}

function onMessageSent(error, status, response, tab) {
    if (!error && status == 204) {
        chrome.tabs.executeScript(tab.id, {
            code: codeOK
        });

        window.setTimeout(function() {
            chrome.tabs.executeScript(tab.id, {
                code: codeHideNoti
            });
            chrome.tabs.executeScript(tab.id, {
                code: codeHideNoti
            });
        }, 3000);

    } else {
        chrome.tabs.executeScript(tab.id, {
            code: codeNotOK
        });
        window.setTimeout(function() {
            chrome.tabs.executeScript(tab.id, {
                code: codeHideNoti
            });
            chrome.tabs.executeScript(tab.id, {
                code: codeHideNoti
            });
        }, 3000);
    }

}

function getMessageURL(userID, url, token) {
    var hostname = new URL(url).hostname;
    return 'https://authplussync.appspot.com/_ah/api/messaging/v1/sendMessage/' + encodeURI(hostname) + '/' + userID + '/' + token;
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.greeting) {
        case "maprender":
            alert("reached here sendin resp" + request.name);

            break;
        case "retrieveAddr":

            console.log("heeeeeeee");
            xhrWithAuth('GET', 'https://www.googleapis.com/plus/v1/people/me', interactive, onUserInfoFetched, tab);

            sendResponse({
                addr: Addr_details
            });

        default:
            sendResponse({});
    }
});