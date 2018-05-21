var autoAim = function(game, variables) {

	var bullets = variables.bullets;
	var items = variables.items;
	var playerBarn = variables.playerBarn;
	var binded = false;
	var state = null;

	if(!!!bullets || !!!items || !!! playerBarn) {
		console.log("Cannot init autoaim");
		return;
	}

	var options = {
		captureEnemyMode: false 
	}

	// Yeah i know that i can create single func with key arg
	var pressOne = function() {
		if(!game.scope.input.keys["49"]) {
			// setTimeout(function() {
				game.scope.input.keys["49"] = true;
				setTimeout(function() {
					delete game.scope.input.keys["49"]
				}, 50);
			// }, 10);
		}
	}

	var pressTwo = function() {
		if(!game.scope.input.keys["50"]) {
			// setTimeout(function() {
				game.scope.input.keys["50"] = true;
				setTimeout(function() {
					delete game.scope.input.keys["50"]
				}, 50);
			// }, 10);
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

	var calculateDistance = function(cx, cy, ex, ey) {
		return Math.sqrt(Math.pow((cx - ex), 2) + Math.pow((cy - ey), 2));
	}

	var getSelfPos = function() {
		return game.scope.activePlayer.pos;
	}

	// todo: not detect on different levels
	var detectEnemies = function() {
		var result = [];
		if(!game.scope.playerBarn.playerInfo[game.scope.activeId]) return result;

		var selfTeamId = game.scope.playerBarn.playerInfo[game.scope.activeId].teamId;
		var selfId = game.scope.activeId;
		var objectIds = Object.keys(game.scope.objectCreator.idToObj);
		var playerIds = Object.keys(game.scope.playerBarn.playerInfo);

		for(var i = 0; i < playerIds.length; i++) {
			if( game.scope.objectCreator.idToObj[playerIds[i]] && 
				(!game.scope.objectCreator.idToObj[playerIds[i]].netData.dead) && 
				(!game.scope.objectCreator.idToObj[playerIds[i]].netData.downed) &&
				game.scope.playerBarn.playerInfo[playerIds[i]].teamId != selfTeamId) {
				if(playerIds[i] != selfId) {
					result[playerIds[i]] = game.scope.objectCreator.idToObj[playerIds[i]];
				}
			}
		}

		return result;
	}

	var getMinimalDistanceIndex = function(enemyDistances) {
		return enemyDistances.indexOf(Math.min.apply(null, enemyDistances));
	}

	var calculateTargetMousePosition = function(enemyPos, enemyPosTimestamp,  prevEnemyPos, prevEnemyPosTimestamp, distance) {
		var bulletSpeed = 0;
		var bulletApproachTime = Infinity;
		
		if(items[game.scope.activePlayer.weapType].bulletType) {
			bulletSpeed = bullets[items[game.scope.activePlayer.weapType].bulletType].speed;
		} else {
			bulletSpeed = 1000;
		};

		var selfPos = getSelfPos();

		var predictionEnemyPos = {
			x: enemyPos.x,
			y: enemyPos.y
		}
		var predictionEnemyDistance = calculateDistance(selfPos.x, selfPos.y, enemyPos.x, enemyPos.y);
		
		var enemySpeed = {
			x: (enemyPos.x - prevEnemyPos.x)/((enemyPosTimestamp - prevEnemyPosTimestamp + 1)/1000.0),
			y: (enemyPos.y - prevEnemyPos.y)/((enemyPosTimestamp - prevEnemyPosTimestamp + 1)/1000.0)
		}

		for(var i = 0; i < 10; i++) {
			bulletApproachTime = predictionEnemyDistance/bulletSpeed;
			predictionEnemyPos = {
				x: enemyPos.x + enemySpeed.x * bulletApproachTime,
				y: enemyPos.y + enemySpeed.y * bulletApproachTime
			};
			predictionEnemyDistance = calculateDistance(selfPos.x, selfPos.y, predictionEnemyPos.x, predictionEnemyPos.y);
		}

		var halfScreenWidth = game.scope.camera.screenWidth/2;
		var halfScreenHeight = game.scope.camera.screenHeight/2;

		var minScreenCircleRadius = halfScreenHeight > halfScreenWidth ? halfScreenWidth : halfScreenHeight;
		minScreenCircleRadius = Math.floor(minScreenCircleRadius - 1);		

		// todo: remove angles
		var predictionRadianAngle = calculateRadianAngle(selfPos.x, selfPos.y, predictionEnemyPos.x, predictionEnemyPos.y);

		return {
			x: halfScreenWidth + minScreenCircleRadius * Math.cos(predictionRadianAngle),
			y: halfScreenHeight - minScreenCircleRadius * Math.sin(predictionRadianAngle),
		}		
	}

	var getNewState = function() {
		var state = [];
		for(var i = 0; i < 4; i++) {
			state.push({
				distance: null,
				radianAngle: null,
				pos: {
					x: 0,
					y: 0
				},
				timestamp: 0,
				targetMousePosition: {
					x: 0,
					y: 0
				}
			});
		}
		state.new = null;
		state.player = {
			nameText: {
				visible: false,
				style: {
					fontSize: 22,
					fill: "#00FFFF"
				}
			}
		}; // enemy
		state.averageTargetMousePosition = null;
		state.captureIndex = 0; // 0 - 7 
		return state;
	}

	var stateNewTriggered = function(newStateNew) {
		// from true to false
		if(!newStateNew) {
			state.player.nameText.visible = false;
			state.player.nameText.style.fontSize = 22;
			state.player.nameText.style.fill = "#00FFFF";
			state.captureIndex = 0;
		}
	}

	var updateState = function(detectedEnemies) {
		var selfPos = getSelfPos();
		var enemyDistances = [];
		var enemyRadianAngles = [];
		var detectedEnemiesKeys = Object.keys(detectedEnemies);

		if(!detectedEnemiesKeys.length) {
			if(state.new) {
				state.new = false;
				stateNewTriggered(false);
			}
			return;
		} else {
			// if(options.captureEnemyMode) {				
				// if(detectedEnemies[state[0].playerId]) {
				// 	var enemyPos = detectedEnemies[state[0].playerId].netData.pos;
				// 	var distance = calculateDistance(selfPos.x, selfPos.y, enemyPos.x, enemyPos.y);
				// 	var radianAngle = calculateRadianAngle(selfPos.x, selfPos.y, enemyPos.x, enemyPos.y);

				// 	state.unshift({
				// 		player: detectedEnemies[state[0].playerId],
				// 		playerId: detectedEnemies[state[0].playerId].__id,
				// 		distance: distance,
				// 		radianAngle: radianAngle,
				// 		pos: enemyPos,
				// 		timestamp: Date.now(),
				// 	});
				// 	state.pop();
				// 	state[0].targetMousePosition = calculateTargetMousePosition(state[0].pos, state[0].timestamp, state[1].pos, state[1].timestamp, state.distance);
				// 	state.averageTargetMousePosition = {
				// 		x: 0,
				// 		y: 0
				// 	};

				// 	for(var i = 0; i < state.length; i++) {
				// 		state.averageTargetMousePosition.x += state[i].targetMousePosition.x;
				// 		state.averageTargetMousePosition.y += state[i].targetMousePosition.y;
				// 	}

				// 	state.averageTargetMousePosition.x /= state.length;
				// 	state.averageTargetMousePosition.y /= state.length;

				// 	return;
				// }
			// }

			for(var i = 0; i < detectedEnemiesKeys.length; i++) {
				var enemyPos = detectedEnemies[detectedEnemiesKeys[i]].netData.pos;
				var distance = Math.sqrt(Math.pow(selfPos.x - enemyPos.x, 2) + Math.pow(selfPos.y - enemyPos.y, 2));
				var radianAngle = calculateRadianAngle(selfPos.x, selfPos.y, enemyPos.x, enemyPos.y);

				enemyDistances.push(distance);
				enemyRadianAngles.push(radianAngle);	
			}

			var targetEnemyIndex = getMinimalDistanceIndex(enemyDistances);

			state.unshift({
				distance: enemyDistances[targetEnemyIndex],
				radianAngle: enemyRadianAngles[targetEnemyIndex],
				pos: detectedEnemies[detectedEnemiesKeys[targetEnemyIndex]].netData.pos,
				timestamp: Date.now(),
			});
			state.pop();
			state[0].targetMousePosition = calculateTargetMousePosition(state[0].pos, state[0].timestamp, state[1].pos, state[1].timestamp, state.distance);
			state.averageTargetMousePosition = {
				x: 0,
				y: 0
			};

			for(var i = 0; i < state.length; i++) {
				state.averageTargetMousePosition.x += state[i].targetMousePosition.x;
				state.averageTargetMousePosition.y += state[i].targetMousePosition.y;
			}

			state.averageTargetMousePosition.x /= state.length;
			state.averageTargetMousePosition.y /= state.length;

			state.player.nameText.visible = false;
			state.player.nameText.style.fontSize = 22;
			state.player.nameText.style.fill = "#00FFFF";

			state.player = detectedEnemies[detectedEnemiesKeys[targetEnemyIndex]];

			state.player.nameText.visible = true;
			state.player.nameText.style.fontSize = 100;
			state.player.nameText.style.fill = "#D50000";
			
			if(state.new) {
				return;
			}

			state.new = true;
			stateNewTriggered(true);

			return;
			// todo: check equals playerId in all items of array
		}
	}

	var defaultPlayerBarnRenderFunction = function(e) {};
	var playerBarnRenderContext = {};

	var defaultBOnMouseDown = function(event) {};
	var defaultBOnMouseMove = function(event) {};
	var defaultBOnMouseWheel = function(event) {};

	var mouseListener = {
		mousedown: function(event) {
			if(event.button === 2) {
				if(game.scope.activePlayer.curWeapIdx) {
					pressOne();
					return;
				}
				
				if(!game.scope.activePlayer.curWeapIdx) {
					pressTwo();
					return;
				}
			}

			if(((event.button === 0) || (event.button === 2)) && state.new) {

				game.scope.input.mousePos = state.averageTargetMousePosition;
				// ???
				game.scope.input.mouseButtonOld = false;
				game.scope.input.mouseButton = true;
			} else {
				defaultBOnMouseDown(event);
			}
		},
		mousemove: function(event) {
			if(!state.new) {
				defaultBOnMouseMove(event);
			} // else add a input.mousepos = cursorpos
		},
		wheel: function(event) {
			var delta = event.deltaY || event.detail || event.wheelDelta;
			state.captureIndex += Math.sign(delta);
			state.captureIndex = Math.abs(state.captureIndex);
			state.captureIndex %= 8;
		}
	}

	var addMouseListener = function() {
		window.addEventListener("mousedown", mouseListener.mousedown);
		window.addEventListener("mousemove", mouseListener.mousemove);
		window.addEventListener('wheel', mouseListener.wheel);
	}

	var removeMouseListener = function() {
		window.removeEventListener("mousedown", mouseListener.mousedown);
		window.removeEventListener("mousemove", mouseListener.mousemove);
		window.removeEventListener('wheel', mouseListener.wheel);
	}

	var spaceKeyListeners = {
		keydown: function(event) {
			if(event.which == 32) {
				game.scope.input.mouseButton = true;
			}
		},
		keyup: function(event) {
			if(event.which == 32) {
				game.scope.input.mouseButton = false;
			}
		}
	}

	var addSpaceKeyListener = function() {
		window.addEventListener("keydown", spaceKeyListeners.keydown);
		window.addEventListener("keyup", spaceKeyListeners.keyup);
	}

	var removeSpaceKeyListener = function() {
		window.removeEventListener("keydown", spaceKeyListeners.keydown);
		window.removeEventListener("keyup", spaceKeyListeners.keyup);
	}

	var oKeyListener = {
		keyup: function(event) {
			if(event.which == 79) {
				options.captureEnemyMode = !options.captureEnemyMode;
			}
		}
	}

	var addOKeyListener = function() {
		window.addEventListener("keyup", oKeyListener.keyup);
	}

	var removeOKeyListener = function() {
		window.removeEventListener("keyup", oKeyListener.keyup);
	}

	var bind = function() {
		state = getNewState();

		defaultBOnMouseDown = game.scope.input.bOnMouseDown;
		defaultBOnMouseMove = game.scope.input.bOnMouseMove;
		defaultBOnMouseWheel = game.scope.input.bOnMouseWheel;

		defaultPlayerBarnRenderFunction = playerBarn.prototype.render;
		playerBarn.prototype.render = function(e) {
			playerBarnRenderContext = this;

			updateState(detectEnemies());
						
			if(state.new) {
				game.scope.input.mousePos = state.averageTargetMousePosition;
			}

			defaultPlayerBarnRenderFunction.call(playerBarnRenderContext, e);
		};

		window.removeEventListener("mousedown", game.scope.input.bOnMouseDown);
		window.removeEventListener("mousemove", game.scope.input.bOnMouseMove);
		window.removeEventListener("wheel", game.scope.input.bOnMouseWheel);

		game.scope.input.bOnMouseWheel = function(e) {};

		removeMouseListener();
		removeSpaceKeyListener();
		removeOKeyListener();

		addMouseListener();
		addSpaceKeyListener();
		addOKeyListener();

		binded = true;		
	}

	var unbind = function() {
		removeMouseListener();
		removeSpaceKeyListener();
		removeOKeyListener();

		game.scope.input.bOnMouseWheel = defaultBOnMouseWheel;

		window.removeEventListener("mousedown", defaultBOnMouseDown);
		window.removeEventListener("mousemove", defaultBOnMouseMove);
		window.removeEventListener("wheel", defaultBOnMouseWheel);

		window.addEventListener("mousedown", defaultBOnMouseDown);
		window.addEventListener("mousemove", defaultBOnMouseMove);
		window.addEventListener("wheel", defaultBOnMouseWheel);

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