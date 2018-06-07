var autoDodge = function(game, variables) {
	
	var bulletBarn = variables.bulletBarn;
	var player = variables.player;
	// console.log(bulletBarn.prototype.render);
	var binded = false;

	if(!!!bulletBarn || !!!player) {
		console.log("Cannot init autododge");
		return;
	}

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
		console.log("pressW");
	}

	var pressD = function() {
		pressKey("68");
		console.log("pressD");
	}

	var pressS = function() {
		pressKey("83");
		console.log("pressS");
	}

	var pressA = function() {
		pressKey("65");
		console.log("pressA");
	}

	var getSelfPos = function() {
		return game.scope.activePlayer.pos;
	}

	var calculateXCoordLineIntersection = function(Mx, My, px, py) {
		return (py * Mx - px * My) / py;
	}

	var calculateYCoordLineIntersection = function(Mx, My, px, py) {
		return (py * Mx - px * My) / (-px);
	}	

	var detectBullets = function() {
		var result = [];
		var selfPos = getSelfPos();
		var intersectionWarningThreshold = player.maxVisualRadius * Math.sqrt(2); // Attention radius

		for(var i = 0; i < game.scope.bulletBarn.bullets.length; i++) {
			if(game.scope.bulletBarn.bullets[i].alive) {
				if(game.scope.activePlayer.layer == game.scope.bulletBarn.bullets[i].layer) {
					
					var bulletRelativePos = {
						x: game.scope.bulletBarn.bullets[i].pos.x - selfPos.x,
						y: game.scope.bulletBarn.bullets[i].pos.y - selfPos.y
					}

					var bulletDir = game.scope.bulletBarn.bullets[i].dir;

					// Check if the bullet flying from ourself
					if(	Math.sign(bulletRelativePos.x) == Math.sign(bulletDir.x) &&
						Math.sign(bulletRelativePos.y) == Math.sign(bulletDir.y)) {

						continue;

					} else {

						var intersectionOfCoordLines = {
							x: calculateXCoordLineIntersection(bulletRelativePos.x, bulletRelativePos.y, bulletDir.x, bulletDir.y),
							y: calculateYCoordLineIntersection(bulletRelativePos.x, bulletRelativePos.y, bulletDir.x, bulletDir.y)
						}

						if(	Math.abs(intersectionOfCoordLines.x) < intersectionWarningThreshold ||
							Math.abs(intersectionOfCoordLines.y) < intersectionWarningThreshold) {

							result.push({
								bullet: game.scope.bulletBarn.bullets[i],
								intersectionOfCoordLines: intersectionOfCoordLines
							});
						}
					}
				}
			}
		}

		return result;
	}

	var calculateDistance = function(cx, cy, ex, ey) {
		return Math.sqrt(Math.pow((cx - ex), 2) + Math.pow((cy - ey), 2));
	}

	var dodge = function(bullets) {
		if(!bullets.length) return;
		var selfPos = getSelfPos();

		for(var i = 0; i < bullets.length; i++) {
			var absoluteIntersectonCoords = {
				x: selfPos.x + bullets[i].intersectionOfCoordLines.x,
				y: selfPos.y + bullets[i].intersectionOfCoordLines.y
			}
			
			var intersectionDistance = {
				x: calculateDistance(bullets[i].bullet.pos.x, bullets[i].bullet.pos.y, absoluteIntersectonCoords.x, selfPos.y),
				y: calculateDistance(bullets[i].bullet.pos.x, bullets[i].bullet.pos.y, selfPos.x, absoluteIntersectonCoords.y)
			}

			if(intersectionDistance.x < intersectionDistance.y) {
				if(Math.sign(bullets[i].intersectionOfCoordLines.x) < 0) {
					pressD();
				} else {
					pressA();
				}
			} else {
				if(Math.sign(bullets[i].intersectionOfCoordLines.y) < 0) {
					pressW();
				} else {
					pressS();
				}
			}
		}
	}

	var defaultBulletBarnRenderFunction = function(e) {};

	var bind = function() {

		defaultBulletBarnRenderFunction = bulletBarn.prototype.render;
		bulletBarn.prototype.render = function(e) {
			var bulletBarnRenderContext = this;

			dodge(detectBullets());

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