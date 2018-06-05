
var variableNames = {};
variableNames.game = '_' + Math.random().toString(36).substring(7);
variableNames.exports = '_' + Math.random().toString(36).substring(7);
variableNames.interactionEmitter = '_' + Math.random().toString(36).substring(7);
variableNames.emitActionCb = '_' + Math.random().toString(36).substring(7);
variableNames.smokeAlpha = '_' + Math.random().toString(36).substring(7);

function patchManifestCode(manifestCode) {
	var patchRules = [
		{
			name: "Exports exports scope",
			from: /var ([a-z])={},(.*?);/g,
			to: 'var $1={},$2;window["' + variableNames.exports + '"]=$1;'
		}
	];

	patchRules.forEach(function(item) {
		if(item.from.test(manifestCode)) {
			manifestCode = manifestCode.replace(item.from, item.to);
			console.log(item.name + " patched");
		} else {
			console.log("Err patching: " + item.name);
		}
	});

	return manifestCode;
}

function wrapAppCode(appCode) {
	/*
		game: 		 		actual game state
		exports: 			game constants and additional functions
		interactionEmitter: object which you may interact
		emitActionCb: 		calling when you may interact with interactionEmitter
	*/
	
	var wrapCode = '';
	var modules = '';
	
	// Exporting modules from extension files
	modules = '{';
	modules = modules + 'autoAim:';
	modules = modules + autoAim + ',';
	modules = modules + 'autoLoot:';
	modules = modules + autoLoot + ',';
	modules = modules + 'autoOpeningDoors:';
	modules = modules + autoOpeningDoors + ',';
	modules = modules + 'menu:';
	modules = modules + menu + ',';
	modules = modules + 'smokeGernadeManager:';
	modules = modules + smokeGernadeManager + ',';
	modules = modules + 'zoomRadiusManager:';
	modules = modules + zoomRadiusManager + '}';

	wrapCode = '(function(';
	wrapCode = wrapCode + variableNames.game + ',';
	wrapCode = wrapCode + variableNames.exports + ',';
	wrapCode = wrapCode + variableNames.interactionEmitter + ',';
	wrapCode = wrapCode + variableNames.emitActionCb + ',';
	wrapCode = wrapCode + variableNames.smokeAlpha + '){';

	// Wrapping game client code
	appCode = wrapCode + appCode;

	// init from init.js
	wrapCode = '\n(' + init + ')(';
	wrapCode = wrapCode + variableNames.game + ',';
	wrapCode = wrapCode + variableNames.exports + ',';
	wrapCode = wrapCode + variableNames.interactionEmitter + ',';
	wrapCode = wrapCode + variableNames.emitActionCb + ',';
	wrapCode = wrapCode + variableNames.smokeAlpha + ',';
	wrapCode = wrapCode + modules + ');';
	wrapCode = wrapCode + '})({}, window["' + variableNames.exports + '"], {}, {}, {}, {});'; 

	appCode = appCode + wrapCode;

	return appCode;
}

function patchAppCode(appCode) {

	appCode = wrapAppCode(appCode);

	var patchRules = [
		{
			name: "Export game scope",
			from: /init:function\(\){var ([a-z]),([a-z])=this.pixi.renderer/,
			to: 'init:function(){' + variableNames.game + '.scope=this;var $1,$2=this.pixi.renderer'
		},
		{
			name: "Action emitter export",
			from: /([a-z])\.interaction\.text\=this\.getInteractionText\(([A-Za-z])\,([A-Za-z])\),/g,
			to: '$1.interaction.text=this.getInteractionText($2,$3),' + variableNames.interactionEmitter + '.scope=$3,'
		},
		{
			name: "Action emittion export",
			from: /([a-z]).interaction.text&&\(([a-z]).interaction.text.innerHTML=([a-z]).interaction.text\)/g,
			to: 'e.interaction.text&&(a.interaction.text.innerHTML=t.interaction.text,' + variableNames.emitActionCb + '.scope())'
		},

		{
			name: "Change removeAds function",
			from: /removeAds:function\(\)/g,
			to: 'removeAds:function(){},_removeAds:function()'
		},
		{
			name: "Smoke gernade alpha",
			from: /sprite.tint=([a-z]).tint,([a-z]).sprite.alpha=[a-z],([a-z]).sprite.visible=([a-z]).active/g,
			to: 'sprite.tint=$1.tint,$2.sprite.alpha=' + variableNames.smokeAlpha + '.scope,$3.sprite.visible=$4.active'
		},

		{
			name: "Wheeldown emotes",
			from: /([a-z])\(document\).on\(\"mousedown\",function\(([a-z])\){var ([a-z])=\"which\"in e\?3==e.which/g,
			to: '$1(document).on("mousedown",function($2){var $3="which"in e?2==e.which'
		},
		{
			name: "Wheelup emotes",
			from: /([a-z])\(document\).on\("mouseup",function\(([a-z])\){3==e.which&&([a-z]).pingKeyTriggered&&([a-z]).pingMouseTriggered&&([a-z]).triggerPing\(\),3==e.which/g,
			to: '$1(document).on("mouseup",function($2){2==e.which&&$3.pingKeyTriggered&&$4.pingMouseTriggered&&$5.triggerPing(),2==e.which'
		}
	];

	patchRules.forEach(function(item) {
		if(item.from.test(appCode)) {
			appCode = appCode.replace(item.from, item.to);
		} else {
			console.log("Err patching: " + item.name);
		}
	});

	return appCode;
}

var codeInjector = (function(){
	var _manifestCode = null;
	var _vendorCode = null;
	var _appCode = null;

	var manifestCodeUpdating = false;
	var vendorCodeUpdating = false;
	var appCodeUpdating = false;

	function updateManifestCode(url, onSuccess, onError) {
		console.log("Executing xhr manifest request...");
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url, true);
		xhr.send();

		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4) return;
			if (this.status != 200) {
				return onError();
			}

			var patchedManifestCode = patchManifestCode(xhr.responseText);
			chrome.storage.local.set({
				'manifestCode': patchedManifestCode,
				'mainfestVer': url.match(/manifest\.(.*)\.js/)[1]
			}, function() {
				return onSuccess(patchedManifestCode);
			});
		}
	}

	function updateVendorCode(url, onSuccess, onError) {
		console.log("Executing xhr vendor request...");
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url, true);
		xhr.send();

		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4) return;
			if (this.status != 200) {
				return onError();
			}

			chrome.storage.local.set({
				'vendorCode': xhr.responseText,
				'vendorVer': url.match(/vendor\.(.*)\.js/)[1]
			}, function() {
				return onSuccess(xhr.responseText);
			});
		}
	}

	function updateAppCode(url, onSuccess, onError) {
		console.log("Executing xhr app request...");
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url, true);
		xhr.send();

		xhr.onreadystatechange = function() {
			if (xhr.readyState != 4) return;
			if (this.status != 200) {
				return onError();
			}

			var patchedAppCode = patchAppCode(xhr.responseText);
			chrome.storage.local.set({
				'appCode': patchedAppCode,
				'appVer': url.match(/app\.(.*)\.js/)[1]
			}, function() {
				return onSuccess(patchedAppCode);
			});
		}
	}

	var setManifestCode = function(manifestCode) {
		_manifestCode = manifestCode;
	}

	var setVendorCode = function(vendorCode) {
		_vendorCode = vendorCode;
	}

	var setAppCode = function(appCode) {
		_appCode = appCode;
	}

	var injectCode = function(tabId, code) {
		chrome.tabs.executeScript(tabId, {
			code: code
		});
	};

	var tryToInjectCode = function(tabId) {
		if(_manifestCode && _vendorCode && _appCode) {
			injectCode(tabId, _manifestCode);
			injectCode(tabId, _vendorCode);
			injectCode(tabId, _appCode);

			_manifestCode = _vendorCode = _appCode = null;

			return;
		}
	}

	var onRequest = function(details, tab) {
		if(details.url.match(/manifest/)) {

			if(!manifestCodeUpdating) {
				manifestCodeUpdating = true;	
			} else {
				return;
			}

			chrome.storage.local.get(['manifestCode'], function(manifestCode) {
				if(manifestCode.manifestCode === undefined) {
					codeInjector.updateManifestCode(details.url, function(patchedManifestCode) {
						console.log("Manifest code updated.");
						codeInjector.setManifestCode(patchedManifestCode);
						manifestCodeUpdating = false;
						codeInjector.tryToInjectCode(tab.id);
					}, function() {
						manifestCodeUpdating = false;
						console.log("Err getting manifest file. Page will be reloaded after 5 seconds...");
						setTimeout(function(){chrome.tabs.reload(tab.id, null, null)}, 5000);
					});
				} else {
					chrome.storage.local.get(['mainfestVer'], function(mainfestVer) {
						if(mainfestVer.mainfestVer != details.url.match(/manifest\.(.*)\.js/)[1]) {
							codeInjector.updateManifestCode(details.url, function(patchedManifestCode) {
								console.log("Manifest code updated.");
								codeInjector.setManifestCode(patchedManifestCode);
								manifestCodeUpdating = false;
								codeInjector.tryToInjectCode(tab.id);
							}, function(){
								manifestCodeUpdating = false;
								console.log("Err getting manifest file. Page will be reloaded after 5 seconds...");
								setTimeout(function(){chrome.tabs.reload(tab.id, null, null)}, 5000);
							});
						} else {
							codeInjector.setManifestCode(manifestCode.manifestCode);
							manifestCodeUpdating = false;
							codeInjector.tryToInjectCode(tab.id);
						}
					});
				}
			});
		}

		if(details.url.match(/vendor/)) {

			if(!vendorCodeUpdating) {
				vendorCodeUpdating = true;	
			} else {
				return;
			}

			chrome.storage.local.get(['vendorCode'], function(vendorCode) {
				if(vendorCode.vendorCode === undefined) {
					codeInjector.updateVendorCode(details.url, function(vendorCode) {
						console.log("Vendor code updated.");
						codeInjector.setVendorCode(vendorCode);
						vendorCodeUpdating = false;
						codeInjector.tryToInjectCode(tab.id);
					}, function(){
						vendorCodeUpdating = false;
						console.log("Err update vendor file. Page will be reloaded after 5 seconds...");
						setTimeout(function(){chrome.tabs.reload(tab.id, null, null)}, 5000);
					});
				} else {
					chrome.storage.local.get(['vendorVer'], function(vendorVer) {
						if(vendorVer.vendorVer != details.url.match(/vendor\.(.*)\.js/)[1]) {
							codeInjector.updateVendorCode(details.url, function(vendorCode) {
								console.log("Vendor code updated.");
								codeInjector.setVendorCode(vendorCode);
								vendorCodeUpdating = false;
								codeInjector.tryToInjectCode(tab.id);
							}, function(){
								vendorCodeUpdating = false;
								console.log("Err update vendor file. Page will be reloaded after 5 seconds...");
								setTimeout(function(){chrome.tabs.reload(tab.id, null, null)}, 5000);
							});
						} else {
							codeInjector.setVendorCode(vendorCode.vendorCode);
							vendorCodeUpdating = false;
							codeInjector.tryToInjectCode(tab.id);
						}
					});
				}
			});
		}

		if(details.url.match(/app/)) {

			if(!appCodeUpdating) {
				appCodeUpdating = true;	
			} else {
				return;
			}

			chrome.storage.local.get(['appCode'], function(appCode) {
				if(appCode.appCode === undefined) {
					codeInjector.updateAppCode(details.url, function(patchedAppCode) {
						console.log("App code updated.");
						codeInjector.setAppCode(patchedAppCode);
						appCodeUpdating = false;
						codeInjector.tryToInjectCode(tab.id);
					}, function(){
						appCodeUpdating = false;
						console.log("Err update app file. Page will be reloaded after 5 seconds...");
						setTimeout(function(){chrome.tabs.reload(tab.id, null, null)}, 5000);
					});
				} else {
					chrome.storage.local.get(['appVer'], function(appVer) {
						if(appVer.appVer != details.url.match(/app\.(.*)\.js/)[1]) {
							codeInjector.updateAppCode(details.url, function(patchedAppCode) {
								console.log("App code updated.");
								codeInjector.setAppCode(patchedAppCode);
								appCodeUpdating = false;
								codeInjector.tryToInjectCode(tab.id);
							}, function(){
								appCodeUpdating = false;
								console.log("Err update app file. Page will be reloaded after 5 seconds...");
								setTimeout(function(){chrome.tabs.reload(tab.id, null, null)}, 5000);
							});
						} else {
							codeInjector.setAppCode(appCode.appCode);
							appCodeUpdating = false;
							codeInjector.tryToInjectCode(tab.id);
						}
					});
				}
			});
		}
	}

	return {
		updateManifestCode: updateManifestCode,
		updateVendorCode: updateVendorCode,
		updateAppCode: updateAppCode,
		setManifestCode: setManifestCode,
		setVendorCode: setVendorCode,
		setAppCode: setAppCode,
		tryToInjectCode: tryToInjectCode,
		onRequest: onRequest
	}

})();

var onBeforeRequestListener = function(details) {
	chrome.tabs.get(details.tabId, function(tab) {
		if(chrome.runtime.lastError) return;

		try {
			extensionManager	
		} catch(e) {
			// Launch default extension
			codeInjector.onRequest(details, tab);
			return;
		}

		extensionManager.isUpdateNeeded(function(isNeeded) {
			if(isNeeded) {
				extensionManager.updateExtension(function() {
					extensionManager.extension(function(extensionCode) {
						// Reinstall
						chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequestListener);

						extensionManager.install(extensionCode);
					});
				});
			} else {
				extensionManager.extension(function(extensionCode) {
					// Reinstall
					chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequestListener);

					extensionManager.install(extensionCode);
				});
			}
		});

	});

	return {
		cancel: true
	}
}

chrome.webRequest.onBeforeRequest.addListener(
	onBeforeRequestListener,
	// filters
	{
		urls: [
			"*://*.surviv.io/js/manifest.*.js",
			"*://*.surviv.io/js/vendor.*.js",
			"*://*.surviv.io/js/app.*.js",
			"*://*.surviv2.io/js/manifest.*.js",
			"*://*.surviv2.io/js/vendor.*.js",
			"*://*.surviv2.io/js/app.*.js",
			"*://*.2dbattleroyale.com/js/manifest.*.js",
			"*://*.2dbattleroyale.com/js/vendor.*.js",
			"*://*.2dbattleroyale.com/js/app.*.js",
			"*://*.2dbattleroyale.org/js/manifest.*.js",
			"*://*.2dbattleroyale.org/js/vendor.*.js",
			"*://*.2dbattleroyale.org/js/app.*.js",
			"*://*.googlesyndication.com/pagead/osd.js"
		],
		types: ["script"]
	},
	// extraInfoSpec
	["blocking"]
);