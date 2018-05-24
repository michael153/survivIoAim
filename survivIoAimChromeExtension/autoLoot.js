var autoLoot = function(game, variables) {

	var lootBarn = variables.lootBarn;
	var bagSizes = variables.bagSizes;
	var binded = false;

	if(!!!lootBarn || !!!bagSizes) {
		console.log("Cannot init autoloot");
		return;
	}

	/*
		var bagSizes = {
			"9mm": 			[120, 240, 330, 420],
		    "762mm": 		[90, 180, 240, 300],
		    "556mm": 		[90, 180, 240, 300],
		    "12gauge": 		[15, 30, 60, 90],
		    "50AE": 		[42, 84, 126, 168],
		    "frag": 		[3, 6, 9, 12],
		    "smoke": 		[3, 6, 9, 12],
		    "bandage": 		[5, 10, 15, 30],
		    "healthkit": 	[1, 2, 3, 4],
		    "soda": 		[2, 5, 10, 15],
		    "painkiller": 	[1, 2, 3, 4]
		}
	*/

	var pressF = function() {
		if(!game.scope.input.keys["70"]) {
			setTimeout(function() {
				game.scope.input.keys["70"] = true;
				setTimeout(function() {
					delete game.scope.input.keys["70"]
				}, 90);
			}, 0);
		}
	}

	var pickupLoot = function() {
		if(game.scope.lootBarn.closestLoot && game.scope.lootBarn.closestLoot.active) {
			if(	/mm/.test(game.scope.lootBarn.closestLoot.name) ||
				/12gauge/.test(game.scope.lootBarn.closestLoot.name) ||
				/50AE/.test(game.scope.lootBarn.closestLoot.name) ||
				/bandage/.test(game.scope.lootBarn.closestLoot.name) ||
				/soda/.test(game.scope.lootBarn.closestLoot.name) ||
				/painkiller/.test(game.scope.lootBarn.closestLoot.name) ||
				/smoke/.test(game.scope.lootBarn.closestLoot.name) ||
				/frag/.test(game.scope.lootBarn.closestLoot.name) ||
				/healthkit/.test(game.scope.lootBarn.closestLoot.name)) {

				var ownBagIndex = !!game.scope.activePlayer.netData.backpack ? parseInt(game.scope.activePlayer.netData.backpack.slice(-2), 10) : 0;
				var bagSize = bagSizes[game.scope.lootBarn.closestLoot.name][ownBagIndex];

				if(game.scope.activePlayer.localData.inventory[game.scope.lootBarn.closestLoot.name] !== bagSize) {
					pressF();
				}
				return;
			}

			if(/scope/.test(game.scope.lootBarn.closestLoot.name)) {
				var scopeLevel = parseInt(game.scope.lootBarn.closestLoot.name.slice(0, -6), 10);
				if(!game.scope.activePlayer.localData.inventory[game.scope.lootBarn.closestLoot.name]) {
					pressF();
				}
				return;
			};

			/*
				helmet01
				chest01
				backpack01
			*/
			if(	/helmet/.test(game.scope.lootBarn.closestLoot.name) ||
				/chest/.test(game.scope.lootBarn.closestLoot.name) ||
				/backpack/.test(game.scope.lootBarn.closestLoot.name)) {

				var lootname = game.scope.lootBarn.closestLoot.name.slice(0, -2);
				var lootLevel = parseInt(game.scope.lootBarn.closestLoot.name.slice(-2), 10);

				if(!game.scope.activePlayer.netData[lootname]) {
					pressF();
					return;
				};

				var ownLootLevel = parseInt(game.scope.activePlayer.netData[lootname].slice(-2), 10);
				if( ownLootLevel < lootLevel) {
					pressF();
				}
				return;
			};

			/*
				Guns
			*/
			if(game.scope.activePlayer.localData.weapons[0].name == "" ||
			   game.scope.activePlayer.localData.weapons[1].name == "") {
				pressF();
				return;
			}
		}
	}

	var defaultLootBarnUpdateFunction = function(e, t, a) {};
	var lootBarnUpdateContext = {};

	var bind = function() {
		defaultLootBarnUpdateFunction = lootBarn.prototype.update;
		lootBarn.prototype.update = function(e, t, a) {
			lootBarnUpdateContext = this;
			defaultLootBarnUpdateFunction.call(lootBarnUpdateContext, e, t, a);

			pickupLoot();
		}
		binded = true;
	}

	var unbind = function() {
		lootBarn.prototype.update = defaultLootBarnUpdateFunction;
		binded = false;
	}

	var isBinded = function() {
		return binded;
	}

	return {
		bind: bind,
		unbind: unbind,
		isBinded: isBinded
	}
}