var autoAim = function(game, variables, botState) {

	var bullets = variables.bullets;
	var items = variables.items;
	var playerBarn = variables.playerBarn;
	var decalBarn = variables.decalBarn;
	var binded = false;
	var state = null;

	var GLOBALSTATES = {
		INIT: {value: 0, name: "Init", code: "I"}, 
		AIMING: {value: 1, name: "Aiming", code: "A"}, 
		SHOOTING: {value: 2, name: "Shooting", code: "S"}, 
		OPENING: {value: 3, name: "Opening", code: "O"}, 
		IDLE: {value: 3, name: "Idle", code: "Idle"}, 
	};

	if(!!!bullets || !!!items || !!! playerBarn) {
		console.log("Cannot init autoaim");
		return;
	}

	var options = {
		targetEnemyNicknameVisibility: true,
		forwardFiringCoeff: 1
	};

	// Yeah i know that i can create single func with key arg
	var pressOne = function() {
		if(!game.scope.input.keys["49"]) {
			setTimeout(function() {
				game.scope.input.keys["49"] = true;
				setTimeout(function() {
					delete game.scope.input.keys["49"]
				}, 50);
			}, 0);
		}
	}

	var pressTwo = function() {
		if(!game.scope.input.keys["50"]) {
			setTimeout(function() {
				game.scope.input.keys["50"] = true;
				setTimeout(function() {
					delete game.scope.input.keys["50"]
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

	var calculateDegreeAngle = function(cx, cy, ex, ey) {
		return calculateRadianAngle(cx, cy, ex, ey) * 180 / Math.PI
	}

	var calculateDistance = function(cx, cy, ex, ey) {
		return Math.sqrt(Math.pow((cx - ex), 2) + Math.pow((cy - ey), 2));
	}

	var getSelfPos = function() {
		return game.scope.activePlayer.pos;
	}

	var getMousePos = function() {
		return state.mousePos;
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
				game.scope.playerBarn.playerInfo[playerIds[i]].teamId != selfTeamId &&
				game.scope.objectCreator.idToObj[playerIds[i]].netData.layer == game.scope.objectCreator.idToObj[selfId].netData.layer) {
				if(playerIds[i] != selfId) {
					// console.log(game.scope.objectCreator.idToObj[playerIds[i]]);
					console.log(game.scope.decalBarn);
					result[playerIds[i]] = game.scope.objectCreator.idToObj[playerIds[i]];
				}
			}
		}
		return result;
	}

	var getMinimalDistanceIndex = function(enemyDistances) {
		return enemyDistances.indexOf(Math.min.apply(null, enemyDistances));
	}


	var getMinimalAngleIndex = function(enemyRadians) {
		var mousePos = getMousePos()
		var selfPos = getSelfPos()
		angleDiffs = []
		var mouseRadians = calculateRadianAngle(selfPos.x, selfPos.y, mousePos.x, mousePos.y)
		for(var i = 0; i < enemyRadians.length; i++) {
			angleDiffs.push((enemyRadians[i] - mouseRadians + 4*Math.PI) % (2*Math.PI)) // [0, 2pi)
			angleDiffs[i] = Math.min(angleDiffs[i], 2*Math.PI-angleDiffs[i]) // if angle diff is over 180deg, go around the other way
		}
		smallestIndex = angleDiffs.indexOf(Math.min.apply(null, angleDiffs))
		// console.log({mouseRadians: mouseRadians, enemyRadians: enemyRadians, angleDiffs: angleDiffs, smallestIndex:smallestIndex })
		return smallestIndex
	}

	var getOptimalComprehensiveScoreIndex = function(enemyDistances, enemyRadians, enemyHealths) {
		var mousePos = getMousePos()
		var selfPos = getSelfPos()
		angleDiffs = []
		normedEnemyDistances = enemyDistances;
		normedEnemyHealths = enemyHealths;
		var mouseRadians = calculateRadianAngle(selfPos.x, selfPos.y, mousePos.x, mousePos.y)
		for(var i = 0; i < enemyRadians.length; i++) {
			angleDiffs.push((enemyRadians[i] - mouseRadians + 4*Math.PI) % (2*Math.PI)) // [0, 2pi)
			angleDiffs[i] = Math.min(angleDiffs[i], 2*Math.PI-angleDiffs[i]) // if angle diff is over 180deg, go around the other way
		}
		normedAngleDiffs = angleDiffs;
		maxAngle = Math.max.apply(null, angleDiffs);
		for(var i = 0; i < angleDiffs.length; i++) {
			normedAngleDiffs[i] = (maxAngle - angleDiffs[i])/(maxAngle + 0.01); // + 0.01 to prevent divide by 0 error
		}
		maxDist = Math.max.apply(null, enemyDistances);
		for(var i = 0; i < normedEnemyDistances.length; i++) {
			normedEnemyDistances[i] = (maxDist - normedEnemyDistances[i])/(maxDist + 0.01);
		}
		maxHealth = Math.max.apply(null, enemyHealths);
		for(var i = 0; i  < normedEnemyHealths.length; i++) {
			normedEnemyHealths[i] = (maxHealth - normedEnemyHealths[i])/maxHealth;
		}
		comprehensiveScore = []
		for(var i = 0; i < normedAngleDiffs.length; i++) {
			comprehensiveScore.push(1.2*normedAngleDiffs[i] + 1.2*normedEnemyDistances[i] + normedEnemyHealths[i]);
		}
		// smallestIndex = angleDiffs.indexOf(Math.min.apply(null, angleDiffs))
		optimalIndex = comprehensiveScore.indexOf(Math.max.apply(null, comprehensiveScore));
		return optimalIndex;
	}

	var calculateTargetMousePosition = function(enemyPos, enemyPosTimestamp, prevEnemyPos, prevEnemyPosTimestamp, distance) {
		var bulletSpeed = 0;
		var bulletApproachTime = Infinity;
		
		if(items[game.scope.activePlayer.weapType].bulletType) {
			bulletSpeed = bullets[items[game.scope.activePlayer.weapType].bulletType].speed * options.forwardFiringCoeff;
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
		for(var i = 0; i < 3; i++) {
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
		state.mousePos = {
			x: game.scope.camera.pos.x,
			y: game.scope.camera.pos.y
		};

		return state;
	}

	var showTargetEnemyNick = function() {
		state.player.nameText.visible = true;
		state.player.nameText.style.fontSize = 100;
		state.player.nameText.style.fill = "#D50000";
	}

	var hideTargetEnemyNick = function() {
		state.player.nameText.visible = false;
		state.player.nameText.style.fontSize = 22;
		state.player.nameText.style.fill = "#00FFFF";
	}

	var stateNewTriggered = function(newStateNew) {
		// from true to false
		if(!newStateNew) {
			options.targetEnemyNicknameVisibility && hideTargetEnemyNick();
		}
	}

	var updateState = function(detectedEnemies) {
		var selfPos = getSelfPos();
		var mousePos = getMousePos();
		var enemySelfDistances = [];
		var enemyMouseDistances = [];
		var enemySelfRadianAngles = [];
		var enemySelfDegreeAngles = [];
		var enemyHealths = [];
		var detectedEnemiesKeys = Object.keys(detectedEnemies);

		if(!detectedEnemiesKeys.length) {
			if(state.new) {
				state.new = false;
				stateNewTriggered(false);
			}
			if (!(botState.state == GLOBALSTATES.IDLE))
				botState.updateBotState(GLOBALSTATES.IDLE);
			return;
		} else {
			// Check if the bot is already occupied with opening destructibles
			if (botState.state.name == "Opening" && !botState.shootingOverride) {
				console.log("OVERRIDING AIM...");
				return;
			}

			for(var i = 0; i < detectedEnemiesKeys.length; i++) {
				var enemyPos = detectedEnemies[detectedEnemiesKeys[i]].netData.pos;

				var selfDistance = Math.sqrt(Math.pow(selfPos.x - enemyPos.x, 2) + Math.pow(selfPos.y - enemyPos.y, 2));
				var mouseDistance = Math.sqrt(Math.pow(mousePos.x - enemyPos.x, 2) + Math.pow(mousePos.y - enemyPos.y, 2));
				var selfRadianAngle = calculateRadianAngle(selfPos.x, selfPos.y, enemyPos.x, enemyPos.y);
				var selfDegreeAngle = calculateDegreeAngle(selfPos.x, selfPos.y, enemyPos.x, enemyPos.y);

				enemySelfDistances.push(selfDistance);
				enemyMouseDistances.push(mouseDistance);
				enemySelfRadianAngles.push(selfRadianAngle);
				enemySelfDegreeAngles.push(selfDegreeAngle);
				enemyHealths.push(100);
			}

			// var targetEnemyIndex = getMinimalAngleIndex(enemySelfRadianAngles);
			var targetEnemyIndex = getOptimalComprehensiveScoreIndex(enemySelfDistances, enemySelfRadianAngles, enemyHealths);

			// console.log("Targeted Enemy: id = " + detectedEnemiesKeys[targetEnemyIndex]);
			// console.log(detectedEnemies[detectedEnemiesKeys[targetEnemyIndex]]);

			// console.log(enemySelfDegreeAngles)
			state.unshift({
				distance: enemySelfDistances[targetEnemyIndex],
				radianAngle: enemySelfRadianAngles[targetEnemyIndex],
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

			options.targetEnemyNicknameVisibility && hideTargetEnemyNick();

			state.player = detectedEnemies[detectedEnemiesKeys[targetEnemyIndex]];
			
			options.targetEnemyNicknameVisibility && showTargetEnemyNick();
			
			if(state.new) {
				return;
			}

			state.new = true;
			botState.updateBotState(GLOBALSTATES.AIMING);
			botState.targetedEnemy = detectedEnemies[detectedEnemiesKeys[targetEnemyIndex]].netData;

			return;
		}
	}

	var defaultPlayerBarnRenderFunction = function(e) {};
	var playerBarnRenderContext = {};

	var defaultBOnMouseDown = function(event) {};
	var defaultBOnMouseMove = function(event) {};

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
				// TODO only if mouse is already within a certain angle
				game.scope.input.mousePos = state.averageTargetMousePosition;
				// ???
				game.scope.input.mouseButtonOld = false;
				game.scope.input.mouseButton = true;
			} else {
				defaultBOnMouseDown(event);
			}
		},
		mousemove: function(event) {
			state.mousePos = game.scope.camera.screenToPoint({
				x: event.clientX,
				y: event.clientY
			});

			if(!state.new) {
				defaultBOnMouseMove(event);
			}
		}
	}

	var addMouseListener = function() {
		window.addEventListener("mousedown", mouseListener.mousedown);
		window.addEventListener("mousemove", mouseListener.mousemove);
	}

	var removeMouseListener = function() {
		window.removeEventListener("mousedown", mouseListener.mousedown);
		window.removeEventListener("mousemove", mouseListener.mousemove);
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

	var bind = function(opt) {
		options.targetEnemyNicknameVisibility = opt.targetEnemyNicknameVisibility;
		options.forwardFiringCoeff = opt.forwardFiringCoeff;

		state = getNewState();

		defaultBOnMouseDown = game.scope.input.bOnMouseDown;
		defaultBOnMouseMove = game.scope.input.bOnMouseMove;

		defaultPlayerBarnRenderFunction = playerBarn.prototype.render;
		playerBarn.prototype.render = function(e) {
			var playerBarnRenderContext = this;

			updateState(detectEnemies());
						
			if(state.new) {
				game.scope.input.mousePos = state.averageTargetMousePosition;
			}

			defaultPlayerBarnRenderFunction.call(playerBarnRenderContext, e);
		};

		window.removeEventListener("mousedown", game.scope.input.bOnMouseDown);
		window.removeEventListener("mousemove", game.scope.input.bOnMouseMove);

		removeMouseListener();
		removeSpaceKeyListener();

		addMouseListener();
		addSpaceKeyListener();

		binded = true;		
	}

	var unbind = function() {
		removeMouseListener();
		removeSpaceKeyListener();

		window.removeEventListener("mousedown", defaultBOnMouseDown);
		window.removeEventListener("mousemove", defaultBOnMouseMove);

		window.addEventListener("mousedown", defaultBOnMouseDown);
		window.addEventListener("mousemove", defaultBOnMouseMove);

		playerBarn.prototype.render = defaultPlayerBarnRenderFunction;

		binded = false;
	}

	var isBinded = function() {
		return binded;
	}

	var setForwardFiringCoeff = function(coeff) {
		options.forwardFiringCoeff = coeff;
	}

	return {
		bind: bind,
		unbind: unbind,
		isBinded: isBinded,

		setForwardFiringCoeff: setForwardFiringCoeff
	}
}