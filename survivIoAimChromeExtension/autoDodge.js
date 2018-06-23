var autoDodge = function(game, variables) {
	
	var playerBarn = variables.playerBarn;
	var bulletBarn = variables.bulletBarn;
	var player = variables.player;
	// console.log(bulletBarn.prototype.render);
	var binded = false;
	var dodging = false;

	var dashDanceIteration = 0;
	var curRandMove = 0;

	var pressKey = function(keyCode) {
		if(!game.scope.input.keys[keyCode]) {
			setTimeout(function() {
				game.scope.input.keys[keyCode] = true;
				setTimeout(function() {
					delete game.scope.input.keys[keyCode]
				}, 20);
			}, 0);
		}
	}

	var pressW = function() {
		pressKey("87");
		console.log("W()...");
	}

	var pressD = function() {
		pressKey("68");
		console.log("D()...");
	}

	var pressS = function() {
		pressKey("83");
		console.log("S()...");
	}

	var pressA = function() {
		pressKey("65");
		console.log("A()...");
	}

	var dashDance = function(cycleLength) {
		if (dashDanceIteration % cycleLength == 0) {
			curRandMove = Math.floor(Math.random() * 4);
			dashDanceIteration = 0;
		}
		dashDanceIteration++;
		if (curRandMove == 0)
			pressW();
		else if (curRandMove == 1)
			pressA();
		else if (curRandMove == 2)
			pressS();
		else
			pressD();
	}

	var checkRadDistance = function(enemyPoint, enemyDir, playerPoint) {
		var t = 100;
		var u = {x: t*enemyDir.x, y: t*enemyDir.y};
		var v = {x: playerPoint.x - enemyPoint.x, y: playerPoint.y - enemyPoint.y};
		var magU = Math.sqrt(u.x*u.x + u.y*u.y);
		var magV = Math.sqrt(v.x*v.x + v.y*v.y);
		var ang = Math.acos((u.x*v.x + u.y*v.y)/(magU*magV))*180/Math.PI;
		return ang;
	}

	var dodge = function() {
		var result = [];
		if(!game.scope.playerBarn.playerInfo[game.scope.activeId]) return result;

		var selfTeamId = game.scope.playerBarn.playerInfo[game.scope.activeId].teamId;
		var selfId = game.scope.activeId;
		var objectIds = Object.keys(game.scope.objectCreator.idToObj);
		var playerIds = Object.keys(game.scope.playerBarn.playerInfo);
		var newDashDance = false;
		var distToEnemy = 0;

		for(var i = 0; i < playerIds.length; i++) {
			if( game.scope.objectCreator.idToObj[playerIds[i]] && 
				(!game.scope.objectCreator.idToObj[playerIds[i]].netData.dead) && 
				(!game.scope.objectCreator.idToObj[playerIds[i]].netData.downed) &&
				game.scope.playerBarn.playerInfo[playerIds[i]].teamId != selfTeamId &&
				game.scope.objectCreator.idToObj[playerIds[i]].netData.layer == game.scope.objectCreator.idToObj[selfId].netData.layer) {
				if(playerIds[i] != selfId) {
					var curEnemy = game.scope.objectCreator.idToObj[playerIds[i]];
					var enemyPoint = curEnemy.netData.pos;
					var playerPoint = game.scope.activePlayer.netData.pos;
					var res = checkRadDistance(enemyPoint, curEnemy.dir, playerPoint);
					// console.log("Aiming Angle: " + res);
					if (res < 10) {
						dodging = true;
						newDashDance = true;
						distToEnemy = Math.sqrt((enemyPoint.x - playerPoint.x)*(enemyPoint.x - playerPoint.x) + (enemyPoint.y - playerPoint.y)*(enemyPoint.y - playerPoint.y));
						// console.log("Calling dashDance()...");
						break;
					}
				}
			}
		}
		if (dodging && !newDashDance) {
			console.log("Terminating dashDance()...");
			dodging = false;
		}
		if (dodging) {
			dashDance(2*(Math.floor(distToEnemy/5) + 1));
		}
	}

	var defaultBulletBarnRenderFunction = function(e) {};

	var bind = function() {

		defaultBulletBarnRenderFunction = bulletBarn.prototype.render;
		bulletBarn.prototype.render = function(e) {
			var bulletBarnRenderContext = this;
			dodge();
			defaultBulletBarnRenderFunction.call(bulletBarnRenderContext, e);
		};

		binded = true;
	}

	var unbind = function() {
		bulletBarn.prototype.render = defaultBulletBarnRenderFunction;
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