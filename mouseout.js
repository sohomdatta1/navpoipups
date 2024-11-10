//////////////////////////////////////////////////
// fuzzy checks

function fuzzyCursorOffMenus(x, y, fuzz, parent) {
	if (!parent) {
		return null;
	}
	var uls = parent.getElementsByTagName('ul');
	for (var i = 0; i < uls.length; ++i) {
		if (uls[i].className == 'popup_menu') {
			if (uls[i].offsetWidth > 0) {
				return false;
			}
		} // else {document.title+='.';}
	}
	return true;
}

function checkPopupPosition() {
	// stop the popup running off the right of the screen
	// FIXME avoid pg.current.link
	if (pg.current.link && pg.current.link.navpopup) {
		pg.current.link.navpopup.limitHorizontalPosition();
	}
}

function mouseOutWikiLink() {
	//console ('mouseOutWikiLink');
	var a = this;

	removeModifierKeyHandler(a);

	if (a.navpopup === null || typeof a.navpopup === 'undefined') {
		return;
	}
	if (!a.navpopup.isVisible()) {
		a.navpopup.banish();
		return;
	}
	restoreTitle(a);
	Navpopup.tracker.addHook(posCheckerHook(a.navpopup));
}

function posCheckerHook(navpop) {
	return function () {
		if (!navpop.isVisible()) {
			return true; /* remove this hook */
		}
		if (Navpopup.tracker.dirty) {
			return false;
		}
		var x = Navpopup.tracker.x,
			y = Navpopup.tracker.y;
		var mouseOverNavpop =
            navpop.isWithin(x, y, navpop.fuzz, navpop.mainDiv) ||
            !fuzzyCursorOffMenus(x, y, navpop.fuzz, navpop.mainDiv);

		// FIXME it'd be prettier to do this internal to the Navpopup objects
		var t = getValueOf('popupHideDelay');
		if (t) {
			t = t * 1000;
		}
		if (!t) {
			if (!mouseOverNavpop) {
				if (navpop.parentAnchor) {
					restoreTitle(navpop.parentAnchor);
				}
				navpop.banish();
				return true; /* remove this hook */
			}
			return false;
		}
		// we have a hide delay set
		var d = Date.now();
		if (!navpop.mouseLeavingTime) {
			navpop.mouseLeavingTime = d;
			return false;
		}
		if (mouseOverNavpop) {
			navpop.mouseLeavingTime = null;
			return false;
		}
		if (d - navpop.mouseLeavingTime > t) {
			navpop.mouseLeavingTime = null;
			navpop.banish();
			return true; /* remove this hook */
		}
		return false;
	};
}

function runStopPopupTimer(navpop) {
	// at this point, we should have left the link but remain within the popup
	// so we call this function again until we leave the popup.
	if (!navpop.stopPopupTimer) {
		navpop.stopPopupTimer = setInterval(posCheckerHook(navpop), 500);
		navpop.addHook(
			() => {
				clearInterval(navpop.stopPopupTimer);
			},
			'hide',
			'before'
		);
	}
}
