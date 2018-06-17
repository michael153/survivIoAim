var bindManager = function(modules, variables) {
	// console.log('in bindManager')
	var binded = false;
	var defaultLootBarnUpdateFunction = function(e, t, a) {};
	var lootBarnUpdateContext = {};
	var lootBarn = variables.lootBarn;

	function isBinded() {
		return binded
	}
	var bind = function(opt) {
		defaultLootBarnUpdateFunction = lootBarn.prototype.update;
		modules.forEach(function(module) {
			module.preBind()
		})
		lootBarn.prototype.update = function(e, t, a) {
			lootBarnUpdateContext = this;
			defaultLootBarnUpdateFunction.call(lootBarnUpdateContext, e, t, a);

			modules.forEach(function(module) {
				module.bindInjection()
			})
		}

		binded = true;		
	}

	var unbind = function() {
		modules.forEach(function(module) {
			module.preUnbind()
		})
		lootBarn.prototype.update = defaultLootBarnUpdateFunction

		binded = false;
	}


	return {
		bind: bind,
		unbind: unbind,
		isBinded: isBinded
	}
}