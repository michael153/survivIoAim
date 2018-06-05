
var sendXhrGETRequest = function(url, callback) {
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);

	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4) {
			callback(xhr);
		}
	}

	xhr.send();
	console.log("Send");
}

/*
	v1 > v2 return 1
	v1 < v2 return -1
	v1 == v2 return 0
*/
var compareVersions = function(v1str, v2str) {
	var v1 = [];
	var v2 = [];

	v1str.split('.').forEach(function(item) {
		v1.push(parseInt(item));
	});

	v2str.split('.').forEach(function(item) {
		v2.push(parseInt(item));
	});

	if(v1.length > v2.length) {
		var diff = v1.length - v2.length;
		for(var i = 0; i < diff; i++) {
			v2.push(0);
		}
	} else if(v2.length > v1.length) {
		var diff = v2.length - v1.length;
		for(var i = 0; i < diff; i++) {
			v1.push(0);
		}
	}

	for(var i = 0; i < v1.length; i++) {
		if(v1[i] > v2[i]) {
			return 1;
		} else if(v1[i] < v2[i]) {
			return -1;
		} else continue;
	}

	return 0;
}

var extensionManager = (function() {
	var updatesCheckUrl = "https://raw.githubusercontent.com/w3x731/survivIoAim/master/updates.json";
	var extensionFileUrls = {
		autoAim: "https://raw.githubusercontent.com/w3x731/survivIoAim/master/survivIoAimChromeExtension/autoAim.js",
		autoLoot: "https://raw.githubusercontent.com/w3x731/survivIoAim/master/survivIoAimChromeExtension/autoLoot.js",
		autoOpeningDoors: "https://raw.githubusercontent.com/w3x731/survivIoAim/master/survivIoAimChromeExtension/autoOpeningDoors.js",
		background: "https://raw.githubusercontent.com/w3x731/survivIoAim/master/survivIoAimChromeExtension/background.js",
		init: "https://raw.githubusercontent.com/w3x731/survivIoAim/master/survivIoAimChromeExtension/init.js",
		manifest: "https://raw.githubusercontent.com/w3x731/survivIoAim/master/survivIoAimChromeExtension/manifest.json",
		menu: "https://raw.githubusercontent.com/w3x731/survivIoAim/master/survivIoAimChromeExtension/menu.js",
		smokeGernadeManager: "https://raw.githubusercontent.com/w3x731/survivIoAim/master/survivIoAimChromeExtension/smokeGernadeManager.js",
		zoomRadiusManager: "https://raw.githubusercontent.com/w3x731/survivIoAim/master/survivIoAimChromeExtension/zoomRadiusManager.js"
	};

	var checkUpdateDelay = 60000; //msec
	var updateDelay = 60000;

	var allowCheckUpdate = true;
	var allowUpdate = true;

	var _getExtensionCodeFromChromeLocalStorage = function(callback) {
		chrome.storage.local.get(['extensionCode'], function(extensionCode) {
			extensionCode = extensionCode.extensionCode; // !!!
			callback(extensionCode);
		});
	}

	var _isVailidExtensionCodeObject = function(extensionCode) {
		if(	extensionCode == undefined ||
			extensionCode.autoAim == undefined ||
			extensionCode.autoLoot == undefined ||
			extensionCode.autoOpeningDoors == undefined ||
			extensionCode.background == undefined ||
			extensionCode.init == undefined ||
			extensionCode.manifest == undefined ||
			extensionCode.menu == undefined ||
			extensionCode.smokeGernadeManager == undefined ||
			extensionCode.zoomRadiusManager == undefined ) {

			return false;

		} else {
			return true;
		}
	}

	/* 
		callback(true) on succes or callback(false) on reject 
	*/
	var _tryToStoreCode = function(extensionCode, callback) {
		if(_isVailidExtensionCodeObject(extensionCode)) {
			chrome.storage.local.set({
				'extensionCode': extensionCode
			}, function() {
				console.log("Code stored");
				callback(true);
			});
		} else {
			callback(false);
		}
	}

	/* 
		callback(true) if need or callback(false)
	*/
	var isUpdateNeeded = function(callback) {
		// Limit request freq
		console.log("Is update needed...");
		if(!allowCheckUpdate) {
			console.log("Check update not allowed, return...");
			return; // !!!
		} else {
			allowCheckUpdate = false;
			setTimeout(function() {
				allowCheckUpdate = true;
			}, checkUpdateDelay);
			console.log("Check update allowed");
		}

		_getExtensionCodeFromChromeLocalStorage(function(extensionCode) {
			if(_isVailidExtensionCodeObject(extensionCode)) {
				// Check on the latest version
				console.log("Checking latest version");
				sendXhrGETRequest(updatesCheckUrl, function(xhr) {
					try {
						var updates = JSON.parse(xhr.responseText);
						var currentExtensionVersion = JSON.parse(extensionCode.manifest).version;

						if(compareVersions(updates.version, currentExtensionVersion) > 0) {
							callback(true);
						} else {
							callback(false);
						}
					} catch(e) {
						console.log("Error: xhr request failed: " + e);
						callback(false);
					}
				});
			} else {
				callback(true);
			}
		});
	}

	/*
		callback()
	*/
	var updateExtension = function(callback) {
		// Limit request freq
		if(!allowUpdate) {
			return; // !!!
		} else {
			allowUpdate = false;
			setTimeout(function() {
				allowUpdate = true;
			}, updateDelay);
		}

		var fileNames = Object.keys(extensionFileUrls);
		var extensionCode = {};

		for(var i = 0; i < fileNames.length; i++) {
			sendXhrGETRequest(extensionFileUrls[fileNames[i]], (function() {
				var index = i;
				return function(xhr) {
					extensionCode[Object.keys(extensionFileUrls)[index]] = xhr.responseText;
					_tryToStoreCode(extensionCode, function(isStored) {
						if(isStored) {
							callback();
						}
					});
				};
			})());
		}
	}

	/*
		callback(extensionCode)
	*/
	var extension = function(callback) {
		_getExtensionCodeFromChromeLocalStorage(callback);
	}

	var install = function(extensionCode) {
		// Remember that only rewrite variables allowed	
		eval(extensionCode.autoAim);
		eval(extensionCode.autoLoot);
		eval(extensionCode.autoOpeningDoors);
		eval(extensionCode.init);
		eval(extensionCode.menu);
		eval(extensionCode.smokeGernadeManager);
		eval(extensionCode.zoomRadiusManager);

		eval(extensionCode.background);
		console.log("Install");
	}

	return {
		isUpdateNeeded: isUpdateNeeded,
		updateExtension: updateExtension,
		extension: extension,
		install: install
	}
})();

extensionManager.isUpdateNeeded(function(isNeeded) {
	if(isNeeded) {
		extensionManager.updateExtension(function() {
			extensionManager.extension(function(extensionCode) {
				extensionManager.install(extensionCode);
			});
		});
	} else {
		extensionManager.extension(function(extensionCode) {
			extensionManager.install(extensionCode);
		});
	}
});