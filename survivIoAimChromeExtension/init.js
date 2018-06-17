var init = function(game, exports, interactionEmitter, emitActionCb, smokeAlpha, modules, options, extensionId) {
	if(!exports) {
		console.log("Error: Exports not defined, return.");
		return;
	}

	// console.log("Exports");
	// console.log(exports);
	// console.log("Object.keys(exports)");
	// console.log(Object.keys(exports));
	// console.log("exports['1jzZ']");
	// console.log(exports["1jzZ"]);

	var GLOBALSTATES = {
		INIT: {value: 0, name: "Init", code: "I"}, 
		AIMING: {value: 1, name: "Aiming", code: "A"}, 
		SHOOTING: {value: 2, name: "Shooting", code: "S"}, 
		OPENING: {value: 3, name: "Opening", code: "O"}, 
		IDLE: {value: 3, name: "Idle", code: "Idle"}, 
	};

	var botState = {
		state: GLOBALSTATES.INIT,
		shootingOverride: false,
		updateBotState: function(s) {
			this.state = s;
		}
	};
	
	function findVariable(name, exports) {
		var keys = Object.keys(exports);
		for(var i = 0; i < keys.length; i++) {
			if(exports[name]) {
				return exports[name];
			}
			if(exports[keys[i]].exports[name]) {
				return exports[keys[i]].exports[name];
			}
		}
		return null;
	};

	function findPrototype(name, exports) {
		var keys = Object.keys(exports);
		for(var i = 0; i < keys.length; i++) {
			if(exports[keys[i]].exports.prototype) {
				if(exports[keys[i]].exports.prototype[name]) {
					return exports[keys[i]].exports;
				}
			}
		}	
	}

	function storeOptions(extensionId, optionsObj) {
		chrome.runtime.sendMessage(extensionId, JSON.stringify(optionsObj));
		console.log("Storing options...");
	}

	if(!options) {
		options = {
			particlesTransparency: 0.5,
			ceilingTrancparency: 0.5,
			fragGernadeSize: 0.31,
			fragGernadeColor: 16711680,
			smokeGernadeAlpha: 0.1,
			defaultFragGernadeEnabled: false,
			modulesEnabled: true,
			gernadeTimerEnabled: true,
			zoomRadiusManagerEnabled: true,
			targetEnemyNicknameVisibility: true,
			forwardFiringCoeff: 1
		}
		storeOptions(extensionId, options);
	}

	emitActionCb.scope = function(){};
	smokeAlpha.scope = options.smokeGernadeAlpha;

	var map = findVariable("map", exports);
	var defsParticles = findVariable("Defs", exports);
	var bullets = findVariable("bullets", exports);
	var items = findVariable("items", exports);
	var bagSizes = findVariable("bagSizes", exports);
	var playerBarn = findVariable("PlayerBarn", exports);
	var particleBarn = findVariable("ParticleBarn", exports);
	var lootBarn = findVariable("LootBarn", exports);
	var decalBarn = findVariable("DecalBarn", exports);
	var scopeZoomRadius = findVariable("scopeZoomRadius", exports);
	var inputHandler = findVariable("InputHandler", exports);

	if(inputHandler) {
		var defaultInputHandlerFreeFunction = function() {};
		var inputHandlerFreeContext = {};

		defaultInputHandlerFreeFunction = inputHandler.prototype.free;
		inputHandler.prototype.free = function() {
			disableCheat();
			inputHandlerFreeContext = this;
			defaultInputHandlerFreeFunction.call(inputHandlerFreeContext);			
		}
	} else {
		console.log("Cannot init");
		return;
	}


	// Default gernade properties
	var defaultFragGernadeTint = null;
	var defaultFragGernadeScale = null;

	if(!!defsParticles || !!items) {
		// Gernade size and color
		defaultFragGernadeTint = items.frag.worldImg.tint;
		defaultFragGernadeScale	= items.frag.worldImg.scale;

		items.frag.worldImg.tint = options.fragGernadeColor;
		items.frag.worldImg.scale = options.fragGernadeSize;

		// Ceiling alpha
		Object.keys(defsParticles).forEach(function(key) {
			if(defsParticles[key].ceiling) {
				defsParticles[key].ceiling.imgs.forEach(function(item) {
					item.alpha = options.ceilingTrancparency;
				});
			}
		});

		defsParticles["bush_03"].img.alpha = options.particlesTransparency;
		defsParticles["bush_02"].img.alpha = options.particlesTransparency;
		defsParticles["bush_01"].img.alpha = options.particlesTransparency;

		defsParticles["tree_01"].img.alpha = options.particlesTransparency;
		
		defsParticles["table_02"].img.alpha = options.particlesTransparency;
		defsParticles["table_01"].img.alpha = options.particlesTransparency;
	}


	var bindManager = modules.bindManager([
		modules.autoLoot(game, {
			lootBarn: lootBarn,
			bagSizes: bagSizes
		}),
		modules.autoOpen(game, {
			playerBarn: playerBarn
		}, botState),
		modules.autoAim(game, {
			bullets: bullets, 
			items: items, 
			playerBarn: playerBarn
		}, botState)
	], {lootBarn: lootBarn})

	var autoOpeningDoors = modules.autoOpeningDoors(game, emitActionCb, interactionEmitter);

	var gernadeTimer = modules.gernadeTimer(game);

	var zoomRadiusManager = modules.zoomRadiusManager(game, {
		scopeZoomRadius: scopeZoomRadius
	});

	var smokeAlphaManager = modules.smokeAlphaManager(game, smokeAlpha);

	var lShiftKeyListener = {
		keydown: function(event) {
			if(event.which == 16) {
				if(bindManager.isBinded()) {
					bindManager.unbind()
				}
			}
		},
		keyup: function(event) {
			if(event.which == 16) {
				if(options.modulesEnabled && !bindManager.isBinded()) {
					bindManager.bind()
				}
			}
		}
	}

	var addLShiftKeyListener = function() {
		window.addEventListener("keydown", lShiftKeyListener.keydown);
		window.addEventListener("keyup", lShiftKeyListener.keyup);
	}

	var removeLShiftKeyListener = function() {
		window.removeEventListener("keydown", lShiftKeyListener.keydown);
		window.removeEventListener("keyup", lShiftKeyListener.keyup);
	}

	var bindCheatListeners = function() {
		addLShiftKeyListener();


		if(options.modulesEnabled && !bindManager.isBinded()) {
			bindManager.bind()
		}


		if(options.autoOpeningDoorsEnabled && !autoOpeningDoors.isBinded()) {
			autoOpeningDoors.bind();
		}

		if(options.gernadeTimerEnabled && !gernadeTimer.isBinded()) {
			gernadeTimer.bind();
		}

		if(options.zoomRadiusManagerEnabled && !zoomRadiusManager.isBinded()) {
			zoomRadiusManager.bind();
		}

		if(!smokeAlphaManager.isBinded()) {
			smokeAlphaManager.bind({
				smokeAlpha: options.smokeGernadeAlpha
			});
		}

		/*if(!menu.isBinded()) {
			menu.bind();
		}*/
	}

	var unbindCheatListeners = function() {
		removeLShiftKeyListener();


		/*if(menu.isBinded()) {
			menu.unbind();
		}*/
		
		if(bindManager.isBinded()) {
			bindManager.unbind();
		}


		if(autoOpeningDoors.isBinded()) {
			autoOpeningDoors.unbind();
		}

		if(gernadeTimer.isBinded()) {
			gernadeTimer.unbind();
		}

		if(zoomRadiusManager.isBinded()) {
			zoomRadiusManager.unbind();
		}

		if(smokeAlphaManager.isBinded()) {
			smokeAlphaManager.unbind();
		}
	}

	var gameOver = function() {
		if(game.scope) return !!game.scope.gameOver;
		return true;
	}

	var cheatEnabled = false;
	function enableCheat() {
		if(game.scope && !gameOver() && !cheatEnabled) {			
			bindCheatListeners();
			cheatEnabled = true;
		}
	}
  
	function disableCheat() {
		if(cheatEnabled) {
			unbindCheatListeners();
			cheatEnabled = false;
		}
	}

	var zKeyListener = {
		keyup: function(event) {
			if(event.which == 90) {
				if(!gameOver()) {
					if(cheatEnabled) {
						disableCheat();
					} else {
						enableCheat();
					}
				}
			}
		}
	}

	var addZKeyListener = function() {
		window.addEventListener("keyup", zKeyListener.keyup);
	}

	var removeZKeyListener = function() {
		window.removeEventListener("keyup", zKeyListener.keyup);
	}

	removeZKeyListener();
	addZKeyListener();
}
