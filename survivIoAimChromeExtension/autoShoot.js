var autoShoot = function(game, variables, botState) {

	var binded = false;
	var particleBarn = variables.particleBarn;

	var GLOBALSTATES = {
		INIT: {value: 0, name: "Init", code: "I"}, 
		AIMING: {value: 1, name: "Aiming", code: "A"}, 
		SHOOTING: {value: 2, name: "Shooting", code: "S"}, 
		OPENING: {value: 3, name: "Opening", code: "O"}, 
		IDLE: {value: 3, name: "Idle", code: "Idle"}, 
	};

	var pressClick = function() {
		if(!game.scope.input.mouseButton) {
			setTimeout(function() {
				game.scope.input.mouseButton = true;
				setTimeout(function() {
					delete game.scope.input.mouseButton;
				}, 20);
			}, 0);
		}
	}

	// https://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function
	var checkLineSegmentCollision = function(a1, a2, b1, b2) {
		var det, gamma, lambda;
		det = (a2.x - a1.x)*(b2.y - b1.y) - (b2.x - b1.x)*(a2.y - a1.y);
		if (det == 0)
			return {ret: false, pos: {x: null, y: null}};
		else {
			lambda = ((b2.y - b1.y)*(b2.x - a1.x) + (b1.x - b2.x)*(b2.y - a1.y))/det;
			gamma = ((a1.y - a2.y)*(b2.x - a1.x) + (a2.x - a1.x)*(b2.y - a1.y))/det;
			var collision = (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
			if (collision) {
				var collX = a1.x + (a2.x - a1.x)*lambda;
				var collY = a1.y + (a2.y - a1.y)*lambda;
				return {ret: true, pos: {x: collX, y: collY}};
			}
			return {ret: false, pos: {x: null, y: null}};
		}
	}

	var rotatePoint = function(point, theta) {
		var rotPoint = {x: point.x*Math.cos(theta) - point.y*Math.sin(theta), y: point.x*Math.sin(theta) + point.y*Math.cos(theta)};
		return rotPoint;
	}

	var offsetPoint = function(point, offset) {
		var offPoint = {x: point.x + offset.x, y: point.y + offset.y };
		return offPoint;
	}

	var detectCollision = function(playerPoint, enemyPoint, obstacle) {
		var circularObstacle = false;
		// Vertical lines
		var dx = enemyPoint.x - playerPoint.x;
		var dy = enemyPoint.y - playerPoint.y;
		var m = dy/dx; //TO-DO: CHECK FOR VERTICAL LINES

		if (obstacle.hasOwnProperty('collider')) {
			if (obstacle.collider.hasOwnProperty('rad'))
				circularObstacle = true;
		}
		else
			return [];

		if (circularObstacle) {
			var cx = obstacle.collider.pos.x;
			var cy = obstacle.collider.pos.y;
			var r = obstacle.collider.rad;

			var leftPoint = playerPoint;
			var rightPoint = enemyPoint;
			if (leftPoint.x > rightPoint.x)
				rightPoint = [leftPoint, leftPoint = rightPoint][0];
			leftPoint = offsetPoint(leftPoint, {x: -cx, y: -cy});
			rightPoint = offsetPoint(rightPoint, {x: -cx, y: -cy});

			var a = (rightPoint.x - leftPoint.x)*(rightPoint.x - leftPoint.x) + (rightPoint.y - leftPoint.y)*(rightPoint.y - leftPoint.y);
			var b = 2*(leftPoint.x*(rightPoint.x - leftPoint.x) + leftPoint.y*(rightPoint.y - leftPoint.y));
			var c = leftPoint.x*leftPoint.x + leftPoint.y*leftPoint.y - r*r;
			
			var disc = b*b - 4*a*c;
			var collisionPoints = []

			if (disc <= 0)
				return collisionPoints;
			
			var sqrtdisc = Math.sqrt(disc);

			if (a == 0) {
				var t = -b/c;
				if (0 <= t && t <= 1)
					collisionPoints.push({x: leftPoint.x + t*(rightPoint.x - leftPoint.x) + cx,
										  y: leftPoint.y + t*(rightPoint.y - leftPoint.y) + cy});
			}
			else {
				var t1 = (-b + sqrtdisc)/(2*a);
				var t2 = (-b - sqrtdisc)/(2*a);
				if (0 <= t1 && t1 <= 1)
					collisionPoints.push({x: leftPoint.x + t1*(rightPoint.x - leftPoint.x) + cx,
										  y: leftPoint.y + t1*(rightPoint.y - leftPoint.y) + cy});
				if (0 <= t2 && t2 <= 1)
					collisionPoints.push({x: leftPoint.x + t2*(rightPoint.x - leftPoint.x) + cx,
										  y: leftPoint.y + t2*(rightPoint.y - leftPoint.y) + cy});
			}
			return collisionPoints;
		}
		else {
			var cx = obstacle.pos.x;
			var cy = obstacle.pos.y;
			var theta = obstacle.rot;
			var maxCorner = offsetPoint(obstacle.collider.max, {x: -cx, y: -cy});
			var minCorner = offsetPoint(obstacle.collider.min, {x: -cx, y: -cy});

			// Rectangle fully engulfs line segment
			if (playerPoint.x >= obstacle.collider.min.x && playerPoint.x <= obstacle.collider.max.x &&
				playerPoint.y >= obstacle.collider.min.y && playerPoint.y <= obstacle.collider.max.y &&
				enemyPoint.x >= obstacle.collider.min.x && enemyPoint.x <= obstacle.collider.max.x &&
				enemyPoint.y >= obstacle.collider.min.y && enemyPoint.y <= obstacle.collider.max.y) {
				return false;
			}

			// https://gamedev.stackexchange.com/questions/86755/how-to-calculate-corner-positions-marks-of-a-rotated-tilted-rectangle
			var translated = {
				bottomLeft: rotatePoint(minCorner, -theta),
				topRight: rotatePoint(maxCorner, -theta),
				topLeft: null,
				bottomRight: null
			};

			translated.topLeft = {x: translated.bottomLeft.x, y: translated.topRight.y};
			translated.bottomRight = {x: translated.topRight.x, y: translated.bottomLeft.y};

			var rotRect = [
				offsetPoint(rotatePoint(translated.bottomLeft, theta), {x: cx, y: cy}),
				offsetPoint(rotatePoint(translated.topLeft, theta), {x: cx, y: cy}),
				offsetPoint(rotatePoint(translated.topRight, theta), {x: cx, y: cy}),
				offsetPoint(rotatePoint(translated.bottomRight, theta), {x: cx, y: cy})
			];

			// Check if line segment intersects with either corner-to-corner-of-the-rectangle line segments
			collisionPoints = [];
			for (var i = 0; i < rotRect.length; i++) {
				var tmp = checkLineSegmentCollision(playerPoint, enemyPoint, rotRect[i], rotRect[(i+1)%rotRect.length]);
				if (tmp.ret) {
					collisionPoints.push(tmp.pos);
				}
			}
			return collisionPoints;
		}
	}

	var getSelfPos = function() {
		return game.scope.activePlayer.pos;
	}

	var isFireable = function() {

	}

	var analyzeLineOfFire = function() {
		var enemyPoint;
		if (botState.state.name == "Aiming") {
			enemyPoint = botState.targetedEnemy;
			if(game.scope.playerBarn.playerInfo[game.scope.activeId]) {
				var objectIds = Object.keys(game.scope.objectCreator.idToObj);
				var playerPoint = getSelfPos();
				for(var i = 0; i < objectIds.length; i++) {
					var curObject = game.scope.objectCreator.idToObj[objectIds[i]];
					var ret = detectCollision(playerPoint, enemyPoint.pos, curObject);
					if (ret.length > 0) {
						return true;
					}
				}
			}
			pressClick();
		}
		return false;
	}



	var defaultParticleBarnUpdateFunction = function(e) {};
	var particleBarnUpdateContext = {};

	// Bind to some update function that's always running
	var bind = function() {
		console.log("Adding console.log() to particleBarn.update() in autoShoot()");

		defaultParticleBarnUpdateFunction = particleBarn.prototype.update;
		particleBarn.prototype.update = function(e, t) {
			var particleBarnUpdateContext = this;
			analyzeLineOfFire();
			defaultParticleBarnUpdateFunction.call(particleBarnUpdateContext, e, t);
		};
		binded = true;
	}

	var unbind = function() {
		particleBarn.prototype.update = defaultParticleBarnUpdateFunction;
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