////////////////////////////////////////////////////////////////////
// Debugging functions
////////////////////////////////////////////////////////////////////

function setupDebugging() {
	if (window.popupDebug) {
		// popupDebug is set from .version
		window.log = function (x) {
			//if(gMsg!='')gMsg += '\n'; gMsg+=time() + ' ' + x; };
			window.console.log(x);
		};
		window.errlog = function (x) {
			window.console.error(x);
		};
		log('Initializing logger');
	} else {
		window.log = function () {};
		window.errlog = function () {};
	}
}
