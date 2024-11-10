/**
 * @file
 * {@link Downloader}, a xmlhttprequest wrapper, and helper functions.
 */

/**
 * Creates a new Downloader
 * @constructor
 * @class The Downloader class. Create a new instance of this class to download stuff.
 * @param {string} url The url to download. This can be omitted and supplied later.
 */
function Downloader(url) {
    if (typeof XMLHttpRequest != 'undefined') {
        this.http = new XMLHttpRequest();
    }

    /**
     * The url to download
     * @type {string}
     */
    this.url = url;

    /**
     * A universally unique ID number
     * @type {number}
     */
    this.id = null;

    /**
     * Modification date, to be culled from the incoming headers
     * @type Date
     * @private
     */
    this.lastModified = null;

    /**
     * What to do when the download completes successfully
     * @type {Function}
     * @private
     */
    this.callbackFunction = null;

    /**
     * What to do on failure
     * @type {Function}
     * @private
     */
    this.onFailure = null;

    /**
     * Flag set on <code>abort</code>
     * @type {boolean}
     */
    this.aborted = false;

    /**
     * HTTP method. See https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html for
     * possibilities.
     * @type {string}
     */
    this.method = 'GET';
    /**
     * Async flag.
     * @type {boolean}
     */
    this.async = true;
}

new Downloader();

/** Submits the http request. */
Downloader.prototype.send = function (x) {
    if (!this.http) {
        return null;
    }
    return this.http.send(x);
};

/** Aborts the download, setting the <code>aborted</code> field to true.  */
Downloader.prototype.abort = function () {
    if (!this.http) {
        return null;
    }
    this.aborted = true;
    return this.http.abort();
};

/** Returns the downloaded data. */
Downloader.prototype.getData = function () {
    if (!this.http) {
        return null;
    }
    return this.http.responseText;
};

/** Prepares the download. */
Downloader.prototype.setTarget = function () {
    if (!this.http) {
        return null;
    }
    this.http.open(this.method, this.url, this.async);
    this.http.setRequestHeader('Api-User-Agent', pg.api.userAgent);
};

/** Gets the state of the download. */
Downloader.prototype.getReadyState = function () {
    if (!this.http) {
        return null;
    }
    return this.http.readyState;
};

pg.misc.downloadsInProgress = {};

/**
 * Starts the download.
 * Note that setTarget {@link Downloader#setTarget} must be run first
 */
Downloader.prototype.start = function () {
    if (!this.http) {
        return;
    }
    pg.misc.downloadsInProgress[this.id] = this;
    this.http.send(null);
};

/**
 * Gets the 'Last-Modified' date from the download headers.
 * Should be run after the download completes.
 * Returns <code>null</code> on failure.
 * @return {Date}
 */
Downloader.prototype.getLastModifiedDate = function () {
    if (!this.http) {
        return null;
    }
    var lastmod = null;
    try {
        lastmod = this.http.getResponseHeader('Last-Modified');
    } catch (err) {}
    if (lastmod) {
        return new Date(lastmod);
    }
    return null;
};

/**
 * Sets the callback function.
 * @param {Function} f callback function, called as <code>f(this)</code> on success
 */
Downloader.prototype.setCallback = function (f) {
    if (!this.http) {
        return;
    }
    this.http.onreadystatechange = f;
};

Downloader.prototype.getStatus = function () {
    if (!this.http) {
        return null;
    }
    return this.http.status;
};

//////////////////////////////////////////////////
// helper functions

/**
 * Creates a new {@link Downloader} and prepares it for action.
 * @param {string} url The url to download
 * @param {number} id The ID of the {@link Downloader} object
 * @param {Function} callback The callback function invoked on success
 * @return {string|Downloader} the {@link Downloader} object created, or 'ohdear' if an unsupported browser
 */
function newDownload(url, id, callback, onfailure) {
    var d = new Downloader(url);
    if (!d.http) {
        return 'ohdear';
    }
    d.id = id;
    d.setTarget();
    if (!onfailure) {
        onfailure = 2;
    }
    var f = function () {
        if (d.getReadyState() == 4) {
            delete pg.misc.downloadsInProgress[this.id];
            try {
                if (d.getStatus() == 200) {
                    d.data = d.getData();
                    d.lastModified = d.getLastModifiedDate();
                    callback(d);
                } else if (typeof onfailure == typeof 1) {
                    if (onfailure > 0) {
                        // retry
                        newDownload(url, id, callback, onfailure - 1);
                    }
                } else if (typeof onfailure === 'function') {
                    onfailure(d, url, id, callback);
                }
            } catch (somerr) {
                /* ignore it */
            }
        }
    };
    d.setCallback(f);
    return d;
}
/**
 * Simulates a download from cached data.
 * The supplied data is put into a {@link Downloader} as if it had downloaded it.
 * @param {string} url The url.
 * @param {number} id The ID.
 * @param {Function} callback The callback, which is invoked immediately as <code>callback(d)</code>,
 * where <code>d</code> is the new {@link Downloader}.
 * @param {string} data The (cached) data.
 * @param {Date} lastModified The (cached) last modified date.
 */
function fakeDownload(url, id, callback, data, lastModified, owner) {
    var d = newDownload(url, callback);
    d.owner = owner;
    d.id = id;
    d.data = data;
    d.lastModified = lastModified;
    return callback(d);
}

/**
 * Starts a download.
 * @param {string} url The url to download
 * @param {number} id The ID of the {@link Downloader} object
 * @param {Function} callback The callback function invoked on success
 * @return {string|Downloader} the {@link Downloader} object created, or 'ohdear' if an unsupported browser
 */
function startDownload(url, id, callback) {
    var d = newDownload(url, id, callback);
    if (typeof d == typeof '') {
        return d;
    }
    d.start();
    return d;
}

/**
 * Aborts all downloads which have been started.
 */
function abortAllDownloads() {
    for (var x in pg.misc.downloadsInProgress) {
        try {
            pg.misc.downloadsInProgress[x].aborted = true;
            pg.misc.downloadsInProgress[x].abort();
            delete pg.misc.downloadsInProgress[x];
        } catch (e) {}
    }
}