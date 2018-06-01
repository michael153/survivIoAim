var init = function(game, exports, interactionEmitter, emitActionCb, modules) {
	if(!exports) return;
	
	function findVariable(name, exports) {
		var keys = Object.keys(exports);
		for(var i = 0; i < keys.length; i++) {
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

	var options = {
		particlesTransparency: 0.5,
		ceilingTrancparency: 0.5,
		fragGernadeSize: 0.31,
		fragGernadeColor: 16711680,
		defaultFragGernadeEnabled: false,
		autoAimEnabled: true,
		autoLootEnabled: true,
		autoOpeningDoorsEnabled: true,
		zoomRadiusManagerEnabled: true,
		targetEnemyNicknameVisibility: true,
		forwardFiringCoeff: 1
	}

	var defsParticles = findVariable("Defs", exports);
	var bullets = findVariable("bullets", exports);
	var items = findVariable("items", exports);
	var bagSizes = findVariable("bagSizes", exports);
	var playerBarn = findVariable("PlayerBarn", exports);
	var lootBarn = findVariable("LootBarn", exports);
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

	var particlesTransparencyCb = null;
	var ceilingTrancparencyCb = null;
	var gernadePropertiesCb = null;
	var defaultGernadePropertiesCb = null;
	var forwardFiringCoeffCb = null;

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

		defsParticles["bush_03"].img.alpha = defsParticles["bush_02"].img.alpha = defsParticles["bush_01"].img.alpha = options.particlesTransparency;

		defsParticles["tree_01"].img.alpha = defsParticles["tree_02"].img.alpha = options.particlesTransparency;
		
		defsParticles["table_02"].img.alpha = defsParticles["table_01"].img.alpha = options.particlesTransparency;

		particlesTransparencyCb = function(alpha) {
			// Particle alpha
			options.particlesTransparency = alpha;

			defsParticles["bush_01"].img.alpha = alpha;
			defsParticles["bush_02"].img.alpha = alpha;
			defsParticles["bush_03"].img.alpha = alpha;

			defsParticles["tree_01"].img.alpha = alpha;
			defsParticles["tree_02"].img.alpha = alpha;
			
			defsParticles["table_01"].img.alpha = alpha;
			defsParticles["table_02"].img.alpha = alpha;
		}

		ceilingTrancparencyCb = function(alpha) {
			// Ceiling alpha
			options.ceilingTrancparency = alpha;

			Object.keys(defsParticles).forEach(function(key) {
				if(defsParticles[key].ceiling) {
					defsParticles[key].ceiling.imgs.forEach(function(item) {
						item.alpha = alpha;
					});
				}
			});
		}

		gernadePropertiesCb = function(size, color) {
			options.fragGernadeSize = size;
			options.fragGernadeColor = color;

			items.frag.worldImg.tint = color;
			items.frag.worldImg.scale = size;
		}

		defaultGernadePropertiesCb = function() {
			options.fragGernadeSize = defaultFragGernadeScale;
			options.fragGernadeColor = defaultFragGernadeTint;

			items.frag.worldImg.scale = defaultFragGernadeScale;
			items.frag.worldImg.tint = defaultFragGernadeTint;

			return {
				defaultFragGernadeScale: defaultFragGernadeScale,
				defaultFragGernadeTint: defaultFragGernadeTint
			}
		}
	}

	forwardFiringCoeffCb = function(coeff) {
		options.forwardFiringCoeff = parseFloat(coeff);
		autoAim.setforwardFiringCoeff(options.forwardFiringCoeff);
	}

	// setInterval(function(){if(game.scope && game.scope.activePlayer){
	// 	console.log(game.scope);console.log(exports);
	// }}, 2000);

	var bindAutoAim = function() {
		autoAim.bind({
			targetEnemyNicknameVisibility: options.targetEnemyNicknameVisibility,
			forwardFiringCoeff: options.forwardFiringCoeff
		});
	}

	var unbindAutoAim = function() {
		autoAim.unbind();
	}

	var autoAimEnableCb = function() {
		if(autoAim.isBinded() && options.autoAimEnabled) {
			unbindAutoAim();
			options.autoAimEnabled = false;
		} else if(!autoAim.isBinded() && !options.autoAimEnabled) {
			bindAutoAim();
			options.autoAimEnabled = true;
		}
	}

	var autoAimTargetEnemyVisibilityCb = function() {
		options.targetEnemyNicknameVisibility = !options.targetEnemyNicknameVisibility;
		if(autoAim.isBinded() && options.autoAimEnabled) {
			unbindAutoAim();
			bindAutoAim();
		}
	}

	var autoLootEnableCb = function() {
		if(autoLoot.isBinded() && options.autoLootEnabled) {
			autoLoot.unbind();
			options.autoLootEnabled = false;
		} else if(!autoLoot.isBinded() && !options.autoLootEnabled) {
			autoLoot.bind();
			options.autoLootEnabled = true;
		}
	}

	var autoOpeningDoorsEnableCb = function() {
		if(autoOpeningDoors.isBinded() && options.autoOpeningDoorsEnabled) {
			autoOpeningDoors.unbind();
			options.autoOpeningDoorsEnabled = false;
		} else if(!autoOpeningDoors.isBinded() && !options.autoOpeningDoorsEnabled) {
			autoOpeningDoors.bind();
			options.autoOpeningDoorsEnabled = true;
		}
	}

	var zoomRadiusManagerEnableCb = function() {
		if(zoomRadiusManager.isBinded() && options.zoomRadiusManagerEnabled) {
			zoomRadiusManager.unbind();
			options.zoomRadiusManagerEnabled = false;
		} else if(!zoomRadiusManager.isBinded() && !options.zoomRadiusManagerEnabled) {
			zoomRadiusManager.bind();
			options.zoomRadiusManagerEnabled = true;
		}
	}

	var autoAim = modules.autoAim(game, {
		bullets: bullets, 
		items: items, 
		playerBarn: playerBarn
	});

	var autoLoot = modules.autoLoot(game, {
		lootBarn: lootBarn,
		bagSizes: bagSizes
	});

	var autoOpeningDoors = modules.autoOpeningDoors(game, emitActionCb, interactionEmitter);

	var zoomRadiusManager = modules.zoomRadiusManager(game, {
		scopeZoomRadius: scopeZoomRadius
	});

	var menu = modules.menu(options, {
		particlesTransparencyCb: particlesTransparencyCb,
		ceilingTrancparencyCb: ceilingTrancparencyCb,
		gernadePropertiesCb: gernadePropertiesCb,
		defaultGernadePropertiesCb: defaultGernadePropertiesCb,

		autoAimEnableCb: autoAimEnableCb,
		autoAimTargetEnemyVisibilityCb: autoAimTargetEnemyVisibilityCb,
		forwardFiringCoeffCb: forwardFiringCoeffCb,
		
		autoLootEnableCb: autoLootEnableCb,
		autoOpeningDoorsEnableCb: autoOpeningDoorsEnableCb,
		zoomRadiusManagerEnableCb: zoomRadiusManagerEnableCb
	});

	var lShiftKeyListener = {
		keydown: function(event) {
			if(event.which == 16) {
				if(autoAim.isBinded()) {
					unbindAutoAim();
				}
				if(autoLoot.isBinded()) {
					autoLoot.unbind();
				}
			}
		},
		keyup: function(event) {
			if(event.which == 16) {
				if(options.autoAimEnabled && !autoAim.isBinded()) {
					bindAutoAim();
				}
				if(options.autoLootEnabled && !autoLoot.isBinded()) {
					autoLoot.bind({
						targetEnemyNicknameVisibility: options.targetEnemyNicknameVisibility
					});
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

		if(options.autoAimEnabled && !autoAim.isBinded()) {
			bindAutoAim();
		}

		if(options.autoLootEnabled && !autoLoot.isBinded()) {
			autoLoot.bind();
		}

		if(options.autoOpeningDoorsEnabled && !autoOpeningDoors.isBinded()) {
			autoOpeningDoors.bind();
		}

		if(options.zoomRadiusManagerEnabled && !zoomRadiusManager.isBinded()) {
			zoomRadiusManager.bind();
		}

		if(!menu.isBinded()) {
			menu.bind();
		}
	}

	var unbindCheatListeners = function() {
		removeLShiftKeyListener();

		if(menu.isBinded()) {
			menu.unbind();
		}
		
		if(autoAim.isBinded()) {
			unbindAutoAim();
		}

		if(autoLoot.isBinded()) {
			autoLoot.unbind();
		}

		if(autoOpeningDoors.isBinded()) {
			autoOpeningDoors.unbind();
		}

		if(zoomRadiusManager.isBinded()) {
			zoomRadiusManager.unbind();
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
