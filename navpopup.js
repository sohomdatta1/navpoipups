/**
	 * @file  Defines two classes: {@link Navpopup} and {@link Mousetracker}.
	 *
	 * <code>Navpopup</code> describes popups: when they appear, where, what
	 * they look like and so on.
	 *
	 * <code>Mousetracker</code> "captures" the mouse using
	 * <code>document.onmousemove</code>.
	 */

/**
	 * Creates a new Mousetracker.
	 *
	 * @constructor
	 * @class The Mousetracker class. This monitors mouse movements and manages associated hooks.
	 */
function Mousetracker() {
	/**
		 * Interval to regularly run the hooks anyway, in milliseconds.
		 *
		 * @type {number}
		 */
	this.loopDelay = 400;

	/**
		 * Timer for the loop.
		 *
		 * @type Timer
		 */
	this.timer = null;

	/**
		 * Flag - are we switched on?
		 *
		 * @type {boolean}
		 */
	this.active = false;

	/**
		 * Flag - are we probably inaccurate, i.e. not reflecting the actual mouse position?
		 */
	this.dirty = true;

	/**
		 * Array of hook functions.
		 *
		 * @private
		 * @type {Array}
		 */
	this.hooks = [];
}

/**
	 * Adds a hook, to be called when we get events.
	 *
	 * @param {Function} f A function which is called as
	 * <code>f(x,y)</code>. It should return <code>true</code> when it
	 * wants to be removed, and <code>false</code> otherwise.
	 */
Mousetracker.prototype.addHook = function (f) {
	this.hooks.push(f);
};

/**
	 * Runs hooks, passing them the x
	 * and y coords of the mouse.  Hook functions that return true are
	 * passed to {@link Mousetracker#removeHooks} for removal.
	 *
	 * @private
	 */
Mousetracker.prototype.runHooks = function () {
	if (!this.hooks || !this.hooks.length) {
		return;
	}
	//log('Mousetracker.runHooks; we got some hooks to run');
	var remove = false;
	var removeObj = {};
	// this method gets called a LOT -
	// pre-cache some variables
	var x = this.x,
		y = this.y,
		len = this.hooks.length;

	for (var i = 0; i < len; ++i) {
		//~ run the hook function, and remove it if it returns true
		if (this.hooks[i](x, y) === true) {
			remove = true;
			removeObj[i] = true;
		}
	}
	if (remove) {
		this.removeHooks(removeObj);
	}
};

/**
	 * Removes hooks.
	 *
	 * @private
	 * @param {Object} removeObj An object whose keys are the index
	 * numbers of functions for removal, with values that evaluate to true
	 */
Mousetracker.prototype.removeHooks = function (removeObj) {
	var newHooks = [];
	var len = this.hooks.length;
	for (var i = 0; i < len; ++i) {
		if (!removeObj[i]) {
			newHooks.push(this.hooks[i]);
		}
	}
	this.hooks = newHooks;
};

/**
	 * Event handler for mouse wiggles.
	 * We simply grab the event, set x and y and run the hooks.
	 * This makes the cpu all hot and bothered :-(
	 *
	 * @private
	 * @param {Event} e Mousemove event
	 */
Mousetracker.prototype.track = function (e) {
	//~ Apparently this is needed in IE.
	e = e || window.event;
	var x, y;
	if (e) {
		if (e.pageX) {
			x = e.pageX;
			y = e.pageY;
		} else if (typeof e.clientX != 'undefined') {
			var left,
				top,
				docElt = document.documentElement;

			if (docElt) {
				left = docElt.scrollLeft;
			}
			left = left || document.body.scrollLeft || document.scrollLeft || 0;

			if (docElt) {
				top = docElt.scrollTop;
			}
			top = top || document.body.scrollTop || document.scrollTop || 0;

			x = e.clientX + left;
			y = e.clientY + top;
		} else {
			return;
		}
		this.setPosition(x, y);
	}
};

/**
	 * Sets the x and y coordinates stored and takes appropriate action,
	 * running hooks as appropriate.
	 *
	 * @param {number} x Screen coordinates to set
	 * @param {number} y Screen coordinates to set
	 */
Mousetracker.prototype.setPosition = function (x, y) {
	this.x = x;
	this.y = y;
	if (this.dirty || this.hooks.length === 0) {
		this.dirty = false;
		return;
	}
	if (typeof this.lastHook_x != 'number') {
		this.lastHook_x = -100;
		this.lastHook_y = -100;
	}
	var diff = (this.lastHook_x - x) * (this.lastHook_y - y);
	diff = diff >= 0 ? diff : -diff;
	if (diff > 1) {
		this.lastHook_x = x;
		this.lastHook_y = y;
		if (this.dirty) {
			this.dirty = false;
		} else {
			this.runHooks();
		}
	}
};

/**
	 * Sets things in motion, unless they are already that is, registering an event handler on
	 * <code>document.onmousemove</code>. A half-hearted attempt is made to preserve the old event
	 * handler if there is one.
	 */
Mousetracker.prototype.enable = function () {
	if (this.active) {
		return;
	}
	this.active = true;
	//~ Save the current handler for mousemove events. This isn't too
	//~ robust, of course.
	this.savedHandler = document.onmousemove;
	//~ Gotta save @tt{this} again for the closure, and use apply for
	//~ the member function.
	var savedThis = this;
	document.onmousemove = function (e) {
		savedThis.track.apply(savedThis, [e]);
	};
	if (this.loopDelay) {
		this.timer = setInterval(() => {
			//log('loop delay in mousetracker is working');
			savedThis.runHooks();
		}, this.loopDelay);
	}
};

/**
	 * Disables the tracker, removing the event handler.
	 */
Mousetracker.prototype.disable = function () {
	if (!this.active) {
		return;
	}
	if (typeof this.savedHandler === 'function') {
		document.onmousemove = this.savedHandler;
	} else {
		delete document.onmousemove;
	}
	if (this.timer) {
		clearInterval(this.timer);
	}
	this.active = false;
};

/**
	 * Creates a new Navpopup.
	 * Gets a UID for the popup and
	 *
	 * @param init Contructor object. If <code>init.draggable</code> is true or absent, the popup becomes draggable.
	 * @constructor
	 * @class The Navpopup class. This generates popup hints, and does some management of them.
	 */
function Navpopup(/*init*/) {
	//alert('new Navpopup(init)');

	/**
		 * UID for each Navpopup instance.
		 * Read-only.
		 *
		 * @type {number}
		 */
	this.uid = Navpopup.uid++;

	/**
		 * Read-only flag for current visibility of the popup.
		 *
		 * @type {boolean}
		 * @private
		 */
	this.visible = false;

	/**
		 * Flag to be set when we want to cancel a previous request to
		 * show the popup in a little while.
		 *
		 * @private
		 * @type {boolean}
		 */
	this.noshow = false;

	/** Categorised list of hooks.
		 * @see #runHooks
		 * @see #addHook
		 * @private
		 * @type {Object}
		 */
	this.hooks = {
		create: [],
		unhide: [],
		hide: []
	};

	/**
		 * list of unique IDs of hook functions, to avoid duplicates
		 *
		 * @private
		 */
	this.hookIds = {};

	/** List of downloads associated with the popup.
		 * @private
		 * @type {Array}
		 */
	this.downloads = [];

	/**
		 * Number of uncompleted downloads.
		 *
		 * @type {number}
		 */
	this.pending = null;

	/**
		 * Tolerance in pixels when detecting whether the mouse has left the popup.
		 *
		 * @type {number}
		 */
	this.fuzz = 5;

	/**
		 * Flag to toggle running {@link #limitHorizontalPosition} to regulate the popup's position.
		 *
		 * @type {boolean}
		 */
	this.constrained = true;

	/**
		 * The popup width in pixels.
		 *
		 * @private
		 * @type {number}
		 */
	this.width = 0;

	/**
		 * The popup width in pixels.
		 *
		 * @private
		 * @type {number}
		 */
	this.height = 0;

	/**
		 * The main content DIV element.
		 *
		 * @type HTMLDivElement
		 */
	this.mainDiv = null;
	this.createMainDiv();

	//	if (!init || typeof init.popups_draggable=='undefined' || init.popups_draggable) {
	//		this.makeDraggable(true);
	//	}
}

/**
	 * A UID for each Navpopup. This constructor property is just a counter.
	 *
	 * @type {number}
	 * @private
	 */
Navpopup.uid = 0;

/**
	 * Retrieves the {@link #visible} attribute, indicating whether the popup is currently visible.
	 *
	 * @type {boolean}
	 */
Navpopup.prototype.isVisible = function () {
	return this.visible;
};

/**
	 * Repositions popup using CSS style.
	 *
	 * @private
	 * @param {number} x x-coordinate (px)
	 * @param {number} y y-coordinate (px)
	 * @param {boolean} noLimitHor Don't call {@link #limitHorizontalPosition}
	 */
Navpopup.prototype.reposition = function (x, y, noLimitHor) {
	log('reposition(' + x + ',' + y + ',' + noLimitHor + ')');
	if (typeof x != 'undefined' && x !== null) {
		this.left = x;
	}
	if (typeof y != 'undefined' && y !== null) {
		this.top = y;
	}
	if (typeof this.left != 'undefined' && typeof this.top != 'undefined') {
		this.mainDiv.style.left = this.left + 'px';
		this.mainDiv.style.top = this.top + 'px';
	}
	if (!noLimitHor) {
		this.limitHorizontalPosition();
	}
	//console.log('navpop'+this.uid+' - (left,top)=(' + this.left + ',' + this.top + '), css=('
	//+ this.mainDiv.style.left + ',' + this.mainDiv.style.top + ')');
};

/**
	 * Prevents popups from being in silly locations. Hopefully.
	 * Should not be run if {@link #constrained} is true.
	 *
	 * @private
	 */
Navpopup.prototype.limitHorizontalPosition = function () {
	if (!this.constrained || this.tooWide) {
		return;
	}
	this.updateDimensions();
	var x = this.left;
	var w = this.width;
	var cWidth = document.body.clientWidth;

	//	log('limitHorizontalPosition: x='+x+
	//			', this.left=' + this.left +
	//			', this.width=' + this.width +
	//			', cWidth=' + cWidth);

	if (
		x + w >= cWidth ||
			(x > 0 &&
				this.maxWidth &&
				this.width < this.maxWidth &&
				this.height > this.width &&
				x > cWidth - this.maxWidth)
	) {
		// This is a very nasty hack. There has to be a better way!
		// We find the "natural" width of the div by positioning it at the far left
		// then reset it so that it should be flush right (well, nearly)
		this.mainDiv.style.left = '-10000px';
		this.mainDiv.style.width = this.maxWidth + 'px';
		var naturalWidth = parseInt(this.mainDiv.offsetWidth, 10);
		var newLeft = cWidth - naturalWidth - 1;
		if (newLeft < 0) {
			newLeft = 0;
			this.tooWide = true;
		} // still unstable for really wide popups?
		log(
			'limitHorizontalPosition: moving to (' +
					newLeft +
					',' +
					this.top +
					');' +
					' naturalWidth=' +
					naturalWidth +
					', clientWidth=' +
					cWidth
		);
		this.reposition(newLeft, null, true);
	}
};

/**
	 * Counter indicating the z-order of the "highest" popup.
	 * We start the z-index at 1000 so that popups are above everything
	 * else on the screen.
	 *
	 * @private
	 * @type {number}
	 */
Navpopup.highest = 1000;

/**
	 * Brings popup to the top of the z-order.
	 * We increment the {@link #highest} property of the contructor here.
	 *
	 * @private
	 */
Navpopup.prototype.raise = function () {
	this.mainDiv.style.zIndex = Navpopup.highest + 1;
	++Navpopup.highest;
};

/**
	 * Shows the popup provided {@link #noshow} is not true.
	 * Updates the position, brings the popup to the top of the z-order and unhides it.
	 */
Navpopup.prototype.show = function () {
	//document.title+='s';
	if (this.noshow) {
		return;
	}
	//document.title+='t';
	this.reposition();
	this.raise();
	this.unhide();
};

/**
	 * Checks to see if the mouse pointer has
	 * stabilised (checking every <code>time</code>/2 milliseconds) and runs the
	 * {@link #show} method if it has.
	 *
	 * @param {number} time The minimum time (ms) before the popup may be shown.
	 */
Navpopup.prototype.showSoonIfStable = function (time) {
	log('showSoonIfStable, time=' + time);
	if (this.visible) {
		return;
	}
	this.noshow = false;

	//~ initialize these variables so that we never run @tt{show} after
	//~ just half the time
	this.stable_x = -10000;
	this.stable_y = -10000;

	var stableShow = function () {
		log('stableShow called');
		var new_x = Navpopup.tracker.x,
			new_y = Navpopup.tracker.y;
		var dx = savedThis.stable_x - new_x,
			dy = savedThis.stable_y - new_y;
		var fuzz2 = 0; // savedThis.fuzz * savedThis.fuzz;
		//document.title += '[' + [savedThis.stable_x,new_x, savedThis.stable_y,new_y, dx, dy, fuzz2].join(',') + '] ';
		if (dx * dx <= fuzz2 && dy * dy <= fuzz2) {
			log('mouse is stable');
			clearInterval(savedThis.showSoonStableTimer);
			savedThis.reposition.apply(savedThis, [new_x + 2, new_y + 2]);
			savedThis.show.apply(savedThis, []);
			savedThis.limitHorizontalPosition.apply(savedThis, []);
			return;
		}
		savedThis.stable_x = new_x;
		savedThis.stable_y = new_y;
	};
	var savedThis = this;
	this.showSoonStableTimer = setInterval(stableShow, time / 2);
};

/**
	 * Sets the {@link #noshow} flag and hides the popup. This should be called
	 * when the mouse leaves the link before
	 * (or after) it's actually been displayed.
	 */
Navpopup.prototype.banish = function () {
	log('banish called');
	// hide and prevent showing with showSoon in the future
	this.noshow = true;
	if (this.showSoonStableTimer) {
		log('clearing showSoonStableTimer');
		clearInterval(this.showSoonStableTimer);
	}
	this.hide();
};

/**
	 * Runs hooks added with {@link #addHook}.
	 *
	 * @private
	 * @param {string} key Key name of the {@link #hooks} array - one of 'create', 'unhide', 'hide'
	 * @param {string} when Controls exactly when the hook is run: either 'before' or 'after'
	 */
Navpopup.prototype.runHooks = function (key, when) {
	if (!this.hooks[key]) {
		return;
	}
	var keyHooks = this.hooks[key];
	var len = keyHooks.length;
	for (var i = 0; i < len; ++i) {
		if (keyHooks[i] && keyHooks[i].when == when) {
			if (keyHooks[i].hook.apply(this, [])) {
				// remove the hook
				if (keyHooks[i].hookId) {
					delete this.hookIds[keyHooks[i].hookId];
				}
				keyHooks[i] = null;
			}
		}
	}
};

/**
	 * Adds a hook to the popup. Hook functions are run with <code>this</code> set to refer to the
	 * Navpopup instance, and no arguments.
	 *
	 * @param {Function} hook The hook function. Functions that return true are deleted.
	 * @param {string} key Key name of the {@link #hooks} array - one of 'create', 'unhide', 'hide'
	 * @param {string} when Controls exactly when the hook is run: either 'before' or 'after'
	 * @param {string} uid A truthy string identifying the hook function; if it matches another hook
	 * in this position, it won't be added again.
	 */
Navpopup.prototype.addHook = function (hook, key, when, uid) {
	when = when || 'after';
	if (!this.hooks[key]) {
		return;
	}
	// if uid is specified, don't add duplicates
	var hookId = null;
	if (uid) {
		hookId = [key, when, uid].join('|');
		if (this.hookIds[hookId]) {
			return;
		}
		this.hookIds[hookId] = true;
	}
	this.hooks[key].push({ hook: hook, when: when, hookId: hookId });
};

/**
	 * Creates the main DIV element, which contains all the actual popup content.
	 * Runs hooks with key 'create'.
	 *
	 * @private
	 */
Navpopup.prototype.createMainDiv = function () {
	if (this.mainDiv) {
		return;
	}
	this.runHooks('create', 'before');
	var mainDiv = document.createElement('div');

	var savedThis = this;
	mainDiv.onclick = function (e) {
		savedThis.onclickHandler(e);
	};
	mainDiv.className = this.className ? this.className : 'navpopup_maindiv';
	mainDiv.id = mainDiv.className + this.uid;

	mainDiv.style.position = 'absolute';
	mainDiv.style.minWidth = '350px';
	mainDiv.style.display = 'none';
	mainDiv.className = 'navpopup';

	// easy access to javascript object through DOM functions
	mainDiv.navpopup = this;

	this.mainDiv = mainDiv;
	document.body.appendChild(mainDiv);
	this.runHooks('create', 'after');
};

/**
	 * Calls the {@link #raise} method.
	 *
	 * @private
	 */
Navpopup.prototype.onclickHandler = function (/*e*/) {
	this.raise();
};

/**
	 * Makes the popup draggable, using a {@link Drag} object.
	 *
	 * @private
	 */
Navpopup.prototype.makeDraggable = function (handleName) {
	if (!this.mainDiv) {
		this.createMainDiv();
	}
	var drag = new Drag();
	if (!handleName) {
		drag.startCondition = function (e) {
			try {
				if (!e.shiftKey) {
					return false;
				}
			} catch (err) {
				return false;
			}
			return true;
		};
	}
	var dragHandle;
	if (handleName) {
		dragHandle = document.getElementById(handleName);
	}
	if (!dragHandle) {
		dragHandle = this.mainDiv;
	}
	var np = this;
	drag.endHook = function (x, y) {
		Navpopup.tracker.dirty = true;
		np.reposition(x, y);
	};
	drag.init(dragHandle, this.mainDiv);
};

/**
	 * Hides the popup using CSS. Runs hooks with key 'hide'.
	 * Sets {@link #visible} appropriately.
	 * {@link #banish} should be called externally instead of this method.
	 *
	 * @private
	 */
Navpopup.prototype.hide = function () {
	this.runHooks('hide', 'before');
	this.abortDownloads();
	if (typeof this.visible != 'undefined' && this.visible) {
		this.mainDiv.style.display = 'none';
		this.visible = false;
	}
	this.runHooks('hide', 'after');
};

/**
	 * Shows the popup using CSS. Runs hooks with key 'unhide'.
	 * Sets {@link #visible} appropriately.   {@link #show} should be called externally instead of this method.
	 *
	 * @private
	 */
Navpopup.prototype.unhide = function () {
	this.runHooks('unhide', 'before');
	if (typeof this.visible != 'undefined' && !this.visible) {
		this.mainDiv.style.display = 'inline';
		this.visible = true;
	}
	this.runHooks('unhide', 'after');
};

/**
	 * Sets the <code>innerHTML</code> attribute of the main div containing the popup content.
	 *
	 * @param {string} html The HTML to set.
	 */
Navpopup.prototype.setInnerHTML = function (html) {
	this.mainDiv.innerHTML = html;
};

/**
	 * Updates the {@link #width} and {@link #height} attributes with the CSS properties.
	 *
	 * @private
	 */
Navpopup.prototype.updateDimensions = function () {
	this.width = parseInt(this.mainDiv.offsetWidth, 10);
	this.height = parseInt(this.mainDiv.offsetHeight, 10);
};

/**
	 * Checks if the point (x,y) is within {@link #fuzz} of the
	 * {@link #mainDiv}.
	 *
	 * @param {number} x x-coordinate (px)
	 * @param {number} y y-coordinate (px)
	 * @type {boolean}
	 */
Navpopup.prototype.isWithin = function (x, y) {
	//~ If we're not even visible, no point should be considered as
	//~ being within the popup.
	if (!this.visible) {
		return false;
	}
	this.updateDimensions();
	var fuzz = this.fuzz || 0;
	//~ Use a simple box metric here.
	return (
		x + fuzz >= this.left &&
			x - fuzz <= this.left + this.width &&
			y + fuzz >= this.top &&
			y - fuzz <= this.top + this.height
	);
};

/**
	 * Adds a download to {@link #downloads}.
	 *
	 * @param {Downloader} download
	 */
Navpopup.prototype.addDownload = function (download) {
	if (!download) {
		return;
	}
	this.downloads.push(download);
};

/**
	 * Aborts the downloads listed in {@link #downloads}.
	 *
	 * @see Downloader#abort
	 */
Navpopup.prototype.abortDownloads = function () {
	for (var i = 0; i < this.downloads.length; ++i) {
		var d = this.downloads[i];
		if (d && d.abort) {
			d.abort();
		}
	}
	this.downloads = [];
};

/**
	 * A {@link Mousetracker} instance which is a property of the constructor (pseudo-global).
	 */
Navpopup.tracker = new Mousetracker();
