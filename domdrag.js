/**
 * @file
 * The {@link Drag} object, which enables objects to be dragged around.
 * 
 * <pre>
 * *************************************************
 * dom-drag.js
 * 09.25.2001
 * www.youngpup.net
 * **************************************************
 * 10.28.2001 - fixed minor bug where events
 * sometimes fired off the handle, not the root.
 * *************************************************
 * Pared down, some hooks added by [[User:Lupin]]
 * 
 * Copyright Aaron Boodman.
 * Saying stupid things daily since March 2001.
 * </pre>
 */

/**
 * Creates a new Drag object. This is used to make various DOM elements draggable.
 * @constructor
 */
function Drag() {
    /**
     * Condition to determine whether or not to drag. This function should take one parameter,
     * an Event.  To disable this, set it to <code>null</code>.
     * @type {Function}
     */
    this.startCondition = null;

    /**
     * Hook to be run when the drag finishes. This is passed the final coordinates of the
     * dragged object (two integers, x and y). To disables this, set it to <code>null</code>.
     * @type {Function}
     */
    this.endHook = null;
}

/**
 * Gets an event in a cross-browser manner.
 * @param {Event} e
 * @private
 */
Drag.prototype.fixE = function (e) {
    if (typeof e == 'undefined') {
        e = window.event;
    }
    if (typeof e.layerX == 'undefined') {
        e.layerX = e.offsetX;
    }
    if (typeof e.layerY == 'undefined') {
        e.layerY = e.offsetY;
    }
    return e;
};

/**
 * Initialises the Drag instance by telling it which object you want to be draggable, and what
 * you want to drag it by.
 * @param {DOMElement} o The "handle" by which <code>oRoot</code> is dragged.
 * @param {DOMElement} oRoot The object which moves when <code>o</code> is dragged, or <code>o</code> if omitted.
 */
Drag.prototype.init = function (o, oRoot) {
    var dragObj = this;
    this.obj = o;
    o.onmousedown = function (e) {
        dragObj.start.apply(dragObj, [e]);
    };
    o.dragging = false;
    o.popups_draggable = true;
    o.hmode = true;
    o.vmode = true;

    o.root = oRoot || o;

    if (isNaN(parseInt(o.root.style.left, 10))) {
        o.root.style.left = '0px';
    }
    if (isNaN(parseInt(o.root.style.top, 10))) {
        o.root.style.top = '0px';
    }

    o.root.onthisStart = function () {};
    o.root.onthisEnd = function () {};
    o.root.onthis = function () {};
};

/**
 * Starts the drag.
 * @private
 * @param {Event} e
 */
Drag.prototype.start = function (e) {
    var o = this.obj; // = this;
    e = this.fixE(e);
    if (this.startCondition && !this.startCondition(e)) {
        return;
    }
    var y = parseInt(o.vmode ? o.root.style.top : o.root.style.bottom, 10);
    var x = parseInt(o.hmode ? o.root.style.left : o.root.style.right, 10);
    o.root.onthisStart(x, y);

    o.lastMouseX = e.clientX;
    o.lastMouseY = e.clientY;

    var dragObj = this;
    o.onmousemoveDefault = document.onmousemove;
    o.dragging = true;
    document.onmousemove = function (e) {
        dragObj.drag.apply(dragObj, [e]);
    };
    document.onmouseup = function (e) {
        dragObj.end.apply(dragObj, [e]);
    };
    return false;
};

/**
 * Does the drag.
 * @param {Event} e
 * @private
 */
Drag.prototype.drag = function (e) {
    e = this.fixE(e);
    var o = this.obj;

    var ey = e.clientY;
    var ex = e.clientX;
    var y = parseInt(o.vmode ? o.root.style.top : o.root.style.bottom, 10);
    var x = parseInt(o.hmode ? o.root.style.left : o.root.style.right, 10);
    var nx, ny;

    nx = x + (ex - o.lastMouseX) * (o.hmode ? 1 : -1);
    ny = y + (ey - o.lastMouseY) * (o.vmode ? 1 : -1);

    this.obj.root.style[o.hmode ? 'left' : 'right'] = nx + 'px';
    this.obj.root.style[o.vmode ? 'top' : 'bottom'] = ny + 'px';
    this.obj.lastMouseX = ex;
    this.obj.lastMouseY = ey;

    this.obj.root.onthis(nx, ny);
    return false;
};

/**
 * Ends the drag.
 * @private
 */
Drag.prototype.end = function () {
    document.onmousemove = this.obj.onmousemoveDefault;
    document.onmouseup = null;
    this.obj.dragging = false;
    if (this.endHook) {
        this.endHook(
            parseInt(this.obj.root.style[this.obj.hmode ? 'left' : 'right'], 10),
            parseInt(this.obj.root.style[this.obj.vmode ? 'top' : 'bottom'], 10)
        );
    }
};