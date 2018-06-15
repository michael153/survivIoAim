var autoOpen = function(game, variables, botState) {

	console.log("autoOpen()...");

	var binded = false;
	var playerBarn = variables.playerBarn;

	var GLOBALSTATES = {
		INIT: {value: 0, name: "Init", code: "I"}, 
		AIMING: {value: 1, name: "Aiming", code: "A"}, 
		SHOOTING: {value: 2, name: "Shooting", code: "S"}, 
		OPENING: {value: 3, name: "Opening", code: "O"}, 
		IDLE: {value: 3, name: "Idle", code: "Idle"}, 
	};

	var STATES = {
		INIT: 		{value: 0, name: "Init", code: "I"}, 
		SEARCHING : {value: 1, name: "Searching", code: "S"}, 
		MOVING: 	{value: 2, name: "Moving", code: "M"}, 
		OPENING: 	{value: 3, name: "Opening", code: "O"}
	};

	var curState = STATES.INIT;
	var curStateMousePos = null;
	var curDestructibleId = null;

	var updateAutoOpenStateMachine = function(s) {
		curState = s;
	}

	var getSelfPos = function() {
		return game.scope.activePlayer.pos;
	}

	var pressThree = function() {
		if(!game.scope.input.keys["51"]) {
			game.scope.input.keys["51"] = true;
			setTimeout(function() {
				delete game.scope.input.keys["51"]
			}, 50);
		}
	};

	var pressClick = function() {
		if(!game.scope.input.mouseButton) {
			setTimeout(function() {
				game.scope.input.mouseButton = true;
				setTimeout(function() {
					delete game.scope.input.mouseButton;
				}, 25);
			}, 0);
		}
	}

	var calculateRadianAngle = function(cx, cy, ex, ey) {
		var dy = ey - cy;
		var dx = ex - cx;
		var theta = Math.atan2(dy, dx); // range (-PI, PI]
		// theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
		// if (theta < 0) theta = 360 + theta; // range [0, 360)
		return theta;
	}

	var getDistance = function(c, e) {
		return Math.sqrt((e.x - c.x)*(e.x - c.x) + (e.y - c.y)*(e.y - c.y));
	}

	var calculateMousePosition = function(selfPos, objPos) {
		var halfScreenWidth = game.scope.camera.screenWidth/2;
		var halfScreenHeight = game.scope.camera.screenHeight/2;
		var minScreenCircleRadius = halfScreenHeight > halfScreenWidth ? halfScreenWidth : halfScreenHeight;
		minScreenCircleRadius = Math.floor(minScreenCircleRadius - 1);	
		
		var distance = getDistance(selfPos, objPos);
		// var distance = Math.sqrt((selfPos.x - objPos.x)*(selfPos.x - objPos.x) + (selfPos.y - objPos.y)*(selfPos.y - objPos.y));
		var turnAngle = calculateRadianAngle(selfPos.x, selfPos.y, objPos.x, objPos.y);

		return {
			x: halfScreenWidth + minScreenCircleRadius * Math.cos(turnAngle),
			y: halfScreenHeight - minScreenCircleRadius * Math.sin(turnAngle),
		}
	}

	var processDestructibles = function() {
		if (curState == STATES.SEARCHING) {
			// console.log("Finding Destructibles...");
			var result = [];
			if(!game.scope.playerBarn.playerInfo[game.scope.activeId]) return result;

			var selfTeamId = game.scope.playerBarn.playerInfo[game.scope.activeId].teamId;
			var selfId = game.scope.activeId;
			var objectIds = Object.keys(game.scope.objectCreator.idToObj);
			var curPos = getSelfPos();

			for (var i = 0; i < objectIds.length; i++) {
				var curObject = game.scope.objectCreator.idToObj[objectIds[i]];
				var curDist = getDistance(curObject.pos, curPos);

				if (curDist < 4.0 && curObject.hasOwnProperty('destructible') && curObject.destructible && curObject.hasOwnProperty('dead') && !curObject.dead) {
					if (/crate/.test(curObject.type) || /chest/.test(curObject.type) || /stand/.test(curObject.type) ||
					   (/barrel/.test(curObject.type) && !/barrel_01/.test(curObject.type)) || /drawers/.test(curObject.type) ||
					    /toilet/.test(curObject.type) || /deposit/.test(curObject.type) || /locker/.test(curObject.type)) {
						// Update autoOpen's state machine to "Opening" from "Searching"
						updateAutoOpenStateMachine(STATES.OPENING);
						curDestructibleId = objectIds[i];
						// Update the bot's state machine to "Opening"
						botState.updateBotState(GLOBALSTATES.OPENING);

					}
				}
			}
		}
		if (curState == STATES.OPENING) {
			var curPos = getSelfPos();
			if (curDestructibleId in game.scope.objectCreator.idToObj) {
				var curObject = game.scope.objectCreator.idToObj[curDestructibleId];
				var curDist = getDistance(curPos, curObject.pos);
				if (curDist < 4.0 && curObject.hasOwnProperty('dead') && !curObject.dead) {
					curStateMousePos = calculateMousePosition(curPos, curObject.pos);
					game.scope.input.mousePos = calculateMousePosition(curPos, curObject.pos);
					pressThree();
					pressClick();
				}
				else {
					console.log("Finished breaking...");
					// Update autoOpen's state machine back to "Searching" after finishing opening a destructible
					updateAutoOpenStateMachine(STATES.SEARCHING);
					botState.updateBotState(GLOBALSTATES.IDLE);
					curDestructibleId = null;
				}
			}
			else {
				console.log("Object no longer valid...");
				updateAutoOpenStateMachine(STATES.SEARCHING);
				botState.updateBotState(GLOBALSTATES.IDLE);
				curStateMousePos = null;
				curDestructibleId = null;
			}
		}
	}

	var defaultPlayerBarnUpdateFunction = function(e) {};
	var playerBarnUpdateContext = {};

	// Bind to some update function that's always running
	var bind = function() {
		console.log("Binding autoOpen() to playerBarn.update()");

		defaultPlayerBarnUpdateFunction = playerBarn.prototype.update;
		updateStateMachine(STATES.SEARCHING);
		botState.updateBotState(GLOBALSTATES.IDLE);

		playerBarn.prototype.update = function(activeId, particleBarn, camera, map, input, audioManager, ambientSounds, emoteManagerWheelKeyTriggered, gameOver) {
			var playerBarnUpdateContext = this;
			processDestructibles();

			defaultPlayerBarnUpdateFunction.call(playerBarnUpdateContext, activeId, particleBarn, camera, map, input, audioManager, ambientSounds, emoteManagerWheelKeyTriggered, gameOver);
		};

		binded = true;
	}

	var unbind = function() {
		playerBarn.prototype.update = defaultPlayerBarnUpdateFunction;
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