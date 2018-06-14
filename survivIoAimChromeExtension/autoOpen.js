var autoOpen = function(game, variables) {

	console.log("autoOpen()...");

	var binded = false;
	var playerBarn = variables.playerBarn;

	var STATES = {
		INIT: 		{value: 0, name: "Init", code: "I"}, 
		SEARCHING : {value: 1, name: "Searching", code: "S"}, 
		MOVING: 	{value: 2, name: "Moving", code: "M"}, 
		OPENING: 	{value: 3, name: "Opening", code: "O"}
	};

	var curState = STATES.INIT;
	var curStateMousePos = null;
	var curDestructibleId = null;

	var updateStateMachine = function(s) {
		console.log("Updating curState to: ");
		console.log(s);
		curState = s;
	}

	var getSelfPos = function() {
		return game.scope.activePlayer.pos;
	}

	var pressThree = function() {
		if(!game.scope.input.keys["51"]) {
			setTimeout(function() {
				game.scope.input.keys["51"] = true;
				setTimeout(function() {
					delete game.scope.input.keys["51"]
				}, 50);
			}, 50);
		}
	};

	var pressClick = function() {
		if(!game.scope.input.mouseButton) {
			setTimeout(function() {
				game.scope.input.mouseButton = true;
				setTimeout(function() {
					delete game.scope.input.mouseButton;
				}, 50);
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

			// console.log("Current mouse pos: (" + game.scope.input.mousePos.x + ", " + game.scope.input.mousePos.y + ")");
			// console.log("Current location: (" + curPos.x + ", " + curPos.y + ")");

			for (var i = 0; i < objectIds.length; i++) {
				var curObject = game.scope.objectCreator.idToObj[objectIds[i]];
				var curDist = getDistance(curObject.pos, curPos);

				if (curDist < 4.0) {
					if(/crate/.test(curObject.type) && curObject.destructible && !curObject.dead) {
						// console.log("Destructible Crate detected at position: " + curObject.pos.x + ", " + curObject.pos.y);
						// console.log(curObject);
						updateStateMachine(STATES.OPENING);
						curDestructibleId = objectIds[i];
					}
					else if(/chest/.test(curObject.type) && !curObject.dead) {
						// console.log("Unbroken chest detected at position: " + curObject.pos.x + ", " + curObject.pos.y);
						// console.log(curObject);
						updateStateMachine(STATES.OPENING);
						curDestructibleId = objectIds[i];
					}
					else if(/stand/.test(curObject.type) && !curObject.dead) {
						// console.log("Unbroken stands detected at position: " + curObject.pos.x + ", " + curObject.pos.y);
						// console.log(curObject);
						updateStateMachine(STATES.OPENING);
						curDestructibleId = objectIds[i];
					}
					else if(/barrel/.test(curObject.type) && !/barrel_01/.test(curObject.type) && !curObject.dead) {
						// console.log("Unbroken barrel detected at position: " + curObject.pos.x + ", " + curObject.pos.y);
						// console.log(curObject);
						updateStateMachine(STATES.OPENING);
						curDestructibleId = objectIds[i];
					}
					else if(/drawers/.test(curObject.type) && !curObject.dead) {
						// console.log("Unbroken drawers detected at position: " + curObject.pos.x + ", " + curObject.pos.y);
						// console.log(curObject);
						updateStateMachine(STATES.OPENING);
						curDestructibleId = objectIds[i];
					}
					else if(/toilet/.test(curObject.type) && !curObject.dead) {
						// console.log("Unbroken toilet detected at position: " + curObject.pos.x + ", " + curObject.pos.y);
						// console.log(curObject);
						updateStateMachine(STATES.OPENING);
						curDestructibleId = objectIds[i];
					}
					else if(/deposit/.test(curObject.type) && !curObject.dead) {
						// console.log("Unbroken deposit box detected at position: " + curObject.pos.x + ", " + curObject.pos.y);
						// console.log(curObject);
						updateStateMachine(STATES.OPENING);
						curDestructibleId = objectIds[i];
					}
					else if(/locker/.test(curObject.type) && !curObject.dead) {
						// console.log("Unbroken locker detected at position: " + curObject.pos.x + ", " + curObject.pos.y);
						// console.log(curObject);
						updateStateMachine(STATES.OPENING);
						curDestructibleId = objectIds[i];
					}
					// else if(curObject.hasOwnProperty('destructible') && !curObject.dead) {
					// 	console.log("Unknown object detected at position: " + curObject.pos.x + ", " + curObject.pos.y);
					// 	console.log(curObject);
					// }
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
					console.log("Breaking object...");
					pressThree();
					pressClick();
				}
				else {
					console.log("Finished breaking...");
					updateStateMachine(STATES.SEARCHING);
					curDestructibleId = null;
				}
			}
			else {
				console.log("Object no longer valid...");
				updateStateMachine(STATES.SEARCHING);
				curStateMousePos = null;
				curDestructibleId = null;
			}
		}
	}

	var defaultPlayerBarnRenderFunction = function(e) {};
	var playerBarnRenderContext = {};

	// Bind to some update function that's always running
	var bind = function() {
		console.log("Binding autoOpen() to playerBarn.update()");

		defaultPlayerBarnRenderFunction = playerBarn.prototype.render;
		updateStateMachine(STATES.SEARCHING);

		playerBarn.prototype.render = function(e) {
			var playerBarnRenderContext = this;
			processDestructibles();

			defaultPlayerBarnRenderFunction.call(playerBarnRenderContext, e);
		};

		binded = true;
	}

	var unbind = function() {
		playerBarn.prototype.render = defaultPlayerBarnRenderFunction;
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