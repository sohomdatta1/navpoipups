/**
 * @file Defines the {@link Title} class, and associated crufty functions.
 *
 * <code>Title</code> deals with article titles and their various
 * forms.  {@link Stringwrapper} is the parent class of
 * <code>Title</code>, which exists simply to make things a little
 * neater.
 */

/**
 * Creates a new Stringwrapper.
 *
 * @constructor
 *
 * @class the Stringwrapper class. This base class is not really
 * useful on its own; it just wraps various common string operations.
 */
function Stringwrapper() {
	/**
     * Wrapper for this.toString().indexOf()
     *
     * @param {string} x
     * @type {number}
     */
	this.indexOf = function (x) {
		return this.toString().indexOf(x);
	};
	/**
     * Returns this.value.
     *
     * @type {string}
     */
	this.toString = function () {
		return this.value;
	};
	/**
     * Wrapper for {@link String#parenSplit} applied to this.toString()
     *
     * @param {RegExp} x
     * @type {Array}
     */
	this.parenSplit = function (x) {
		return this.toString().parenSplit(x);
	};
	/**
     * Wrapper for this.toString().substring()
     *
     * @param {string} x
     * @param {string} y (optional)
     * @type {string}
     */
	this.substring = function (x, y) {
		if (typeof y == 'undefined') {
			return this.toString().substring(x);
		}
		return this.toString().substring(x, y);
	};
	/**
     * Wrapper for this.toString().split()
     *
     * @param {string} x
     * @type {Array}
     */
	this.split = function (x) {
		return this.toString().split(x);
	};
	/**
     * Wrapper for this.toString().replace()
     *
     * @param {string} x
     * @param {string} y
     * @type {string}
     */
	this.replace = function (x, y) {
		return this.toString().replace(x, y);
	};
}

/**
 * Creates a new <code>Title</code>.
 *
 * @constructor
 *
 * @class The Title class. Holds article titles and converts them into
 * various forms. Also deals with anchors, by which we mean the bits
 * of the article URL after a # character, representing locations
 * within an article.
 *
 * @param {string} value The initial value to assign to the
 * article. This must be the canonical title (see {@link
 * Title#value}. Omit this in the constructor and use another function
 * to set the title if this is unavailable.
 */
function Title(val) {
	/**
     * The canonical article title. This must be in UTF-8 with no
     * entities, escaping or nasties. Also, underscores should be
     * replaced with spaces.
     *
     * @type {string}
     * @private
     */
	this.value = null;

	/**
     * The canonical form of the anchor. This should be exactly as
     * it appears in the URL, i.e. with the .C3.0A bits in.
     *
     * @type {string}
     */
	this.anchor = '';

	this.setUtf(val);
}
Title.prototype = new Stringwrapper();
/**
 * Returns the canonical representation of the article title, optionally without anchor.
 *
 * @param {boolean} omitAnchor
 * @fixme Decide specs for anchor
 * @return String The article title and the anchor.
 */
Title.prototype.toString = function (omitAnchor) {
	return this.value + (!omitAnchor && this.anchor ? '#' + this.anchorString() : '');
};
Title.prototype.anchorString = function () {
	if (!this.anchor) {
		return '';
	}
	var split = this.anchor.parenSplit(/((?:[.][0-9A-F]{2})+)/);
	var len = split.length;
	var value;
	for (var j = 1; j < len; j += 2) {
		// FIXME s/decodeURI/decodeURIComponent/g ?
		value = split[j].split('.').join('%');
		try {
			value = decodeURIComponent(value);
		} catch (e) {
			// cannot decode
		}
		split[j] = value.split('_').join(' ');
	}
	return split.join('');
};
Title.prototype.urlAnchor = function () {
	var split = this.anchor.parenSplit('/((?:[%][0-9A-F]{2})+)/');
	var len = split.length;
	for (var j = 1; j < len; j += 2) {
		split[j] = split[j].split('%').join('.');
	}
	return split.join('');
};
Title.prototype.anchorFromUtf = function (str) {
	this.anchor = encodeURIComponent(str.split(' ').join('_'))
		.split('%3A')
		.join(':')
		.split("'")
		.join('%27')
		.split('%')
		.join('.');
};
Title.fromURL = function (h) {
	return new Title().fromURL(h);
};
Title.prototype.fromURL = function (h) {
	if (typeof h != 'string') {
		this.value = null;
		return this;
	}

	// NOTE : playing with decodeURI, encodeURI, escape, unescape,
	// we seem to be able to replicate the IE borked encoding

	// IE doesn't do this new-fangled utf-8 thing.
	// and it's worse than that.
	// IE seems to treat the query string differently to the rest of the url
	// the query is treated as bona-fide utf8, but the first bit of the url is pissed around with

	// we fix up & for all browsers, just in case.
	var splitted = h.split('?');
	splitted[0] = splitted[0].split('&').join('%26');

	h = splitted.join('?');

	var contribs = pg.re.contribs.exec(h);
	if (contribs) {
		if (contribs[1] == 'title=') {
			contribs[3] = contribs[3].split('+').join(' ');
		}
		var u = new Title(contribs[3]);
		this.setUtf(
			this.decodeNasties(
				mw.config.get('wgFormattedNamespaces')[pg.nsUserId] + ':' + u.stripNamespace()
			)
		);
		return this;
	}

	var email = pg.re.email.exec(h);
	if (email) {
		this.setUtf(
			this.decodeNasties(
				mw.config.get('wgFormattedNamespaces')[pg.nsUserId] +
                    ':' +
                    new Title(email[3]).stripNamespace()
			)
		);
		return this;
	}

	var backlinks = pg.re.backlinks.exec(h);
	if (backlinks) {
		this.setUtf(this.decodeNasties(new Title(backlinks[3])));
		return this;
	}

	//A dummy title object for a Special:Diff link.
	var specialdiff = pg.re.specialdiff.exec(h);
	if (specialdiff) {
		this.setUtf(
			this.decodeNasties(
				new Title(mw.config.get('wgFormattedNamespaces')[pg.nsSpecialId] + ':Diff')
			)
		);
		return this;
	}

	// no more special cases to check --
	// hopefully it's not a disguised user-related or specially treated special page
	// Includes references
	var m = pg.re.main.exec(h);
	if (m === null) {
		this.value = null;
	} else {
		var fromBotInterface = /[?](.+[&])?title=/.test(h);
		if (fromBotInterface) {
			m[2] = m[2].split('+').join('_');
		}
		var extracted = m[2] + (m[3] ? '#' + m[3] : '');
		if (pg.flag.isSafari && /%25[0-9A-Fa-f]{2}/.test(extracted)) {
			// Fix Safari issue
			// Safari sometimes encodes % as %25 in UTF-8 encoded strings like %E5%A3 -> %25E5%25A3.
			this.setUtf(decodeURIComponent(unescape(extracted)));
		} else {
			this.setUtf(this.decodeNasties(extracted));
		}
	}
	return this;
};
Title.prototype.decodeNasties = function (txt) {
	// myDecodeURI uses decodeExtras, which removes _,
	// thus ruining citations previews, which are formated as "cite_note-1"
	try {
		var ret = decodeURI(this.decodeEscapes(txt));
		ret = ret.replace(/[_ ]*$/, '');
		return ret;
	} catch (e) {
		return txt; // cannot decode
	}
};
// Decode valid %-encodings, otherwise escape them
Title.prototype.decodeEscapes = function (txt) {
	var split = txt.parenSplit(/((?:[%][0-9A-Fa-f]{2})+)/);
	var len = split.length;
	// No %-encoded items found, so replace the literal %
	if (len === 1) {
		return split[0].replace(/%(?![0-9a-fA-F][0-9a-fA-F])/g, '%25');
	}
	for (var i = 1; i < len; i = i + 2) {
		split[i] = decodeURIComponent(split[i]);
	}
	return split.join('');
};
Title.fromAnchor = function (a) {
	return new Title().fromAnchor(a);
};
Title.prototype.fromAnchor = function (a) {
	if (!a) {
		this.value = null;
		return this;
	}
	return this.fromURL(a.href);
};
Title.fromWikiText = function (txt) {
	return new Title().fromWikiText(txt);
};
Title.prototype.fromWikiText = function (txt) {
	// FIXME - testing needed
	txt = myDecodeURI(txt);
	this.setUtf(txt);
	return this;
};
Title.prototype.hintValue = function () {
	if (!this.value) {
		return '';
	}
	return safeDecodeURI(this.value);
};
Title.prototype.toUserName = function (withNs) {
	if (this.namespaceId() != pg.nsUserId && this.namespaceId() != pg.nsUsertalkId) {
		this.value = null;
		return;
	}
	this.value =
        (withNs ? mw.config.get('wgFormattedNamespaces')[pg.nsUserId] + ':' : '') +
        this.stripNamespace().split('/')[0];
};
Title.prototype.userName = function (withNs) {
	var t = new Title(this.value);
	t.toUserName(withNs);
	if (t.value) {
		return t;
	}
	return null;
};
Title.prototype.toTalkPage = function () {
	// convert article to a talk page, or if we can't, return null
	// In other words: return null if this ALREADY IS a talk page
	// and return the corresponding talk page otherwise
	//
	// Per https://www.mediawiki.org/wiki/Manual:Namespace#Subject_and_talk_namespaces
	// * All discussion namespaces have odd-integer indices
	// * The discussion namespace index for a specific namespace with index n is n + 1
	if (this.value === null) {
		return null;
	}

	var namespaceId = this.namespaceId();
	if (namespaceId >= 0 && namespaceId % 2 === 0) {
		//non-special and subject namespace
		var localizedNamespace = mw.config.get('wgFormattedNamespaces')[namespaceId + 1];
		if (typeof localizedNamespace !== 'undefined') {
			if (localizedNamespace === '') {
				this.value = this.stripNamespace();
			} else {
				this.value = localizedNamespace.split(' ').join('_') + ':' + this.stripNamespace();
			}
			return this.value;
		}
	}

	this.value = null;
	return null;
};
// Return canonical, localized namespace
Title.prototype.namespace = function () {
	return mw.config.get('wgFormattedNamespaces')[this.namespaceId()];
};
Title.prototype.namespaceId = function () {
	var n = this.value.indexOf(':');
	if (n < 0) {
		return 0;
	} //mainspace
	var namespaceId =
        mw.config.get('wgNamespaceIds')[
        	this.value.substring(0, n).split(' ').join('_').toLowerCase()
        ];
	if (typeof namespaceId == 'undefined') {
		return 0;
	} //mainspace
	return namespaceId;
};
Title.prototype.talkPage = function () {
	var t = new Title(this.value);
	t.toTalkPage();
	if (t.value) {
		return t;
	}
	return null;
};
Title.prototype.isTalkPage = function () {
	if (this.talkPage() === null) {
		return true;
	}
	return false;
};
Title.prototype.toArticleFromTalkPage = function () {
	//largely copy/paste from toTalkPage above.
	if (this.value === null) {
		return null;
	}

	var namespaceId = this.namespaceId();
	if (namespaceId >= 0 && namespaceId % 2 == 1) {
		//non-special and talk namespace
		var localizedNamespace = mw.config.get('wgFormattedNamespaces')[namespaceId - 1];
		if (typeof localizedNamespace !== 'undefined') {
			if (localizedNamespace === '') {
				this.value = this.stripNamespace();
			} else {
				this.value = localizedNamespace.split(' ').join('_') + ':' + this.stripNamespace();
			}
			return this.value;
		}
	}

	this.value = null;
	return null;
};
Title.prototype.articleFromTalkPage = function () {
	var t = new Title(this.value);
	t.toArticleFromTalkPage();
	if (t.value) {
		return t;
	}
	return null;
};
Title.prototype.articleFromTalkOrArticle = function () {
	var t = new Title(this.value);
	if (t.toArticleFromTalkPage()) {
		return t;
	}
	return this;
};
Title.prototype.isIpUser = function () {
	return pg.re.ipUser.test(this.userName());
};
Title.prototype.stripNamespace = function () {
	// returns a string, not a Title
	var n = this.value.indexOf(':');
	if (n < 0) {
		return this.value;
	}
	var namespaceId = this.namespaceId();
	if (namespaceId === pg.nsMainspaceId) {
		return this.value;
	}
	return this.value.substring(n + 1);
};
Title.prototype.setUtf = function (value) {
	if (!value) {
		this.value = '';
		return;
	}
	var anch = value.indexOf('#');
	if (anch < 0) {
		this.value = value.split('_').join(' ');
		this.anchor = '';
		return;
	}
	this.value = value.substring(0, anch).split('_').join(' ');
	this.anchor = value.substring(anch + 1);
	this.ns = null; // wait until namespace() is called
};
Title.prototype.setUrl = function (urlfrag) {
	var anch = urlfrag.indexOf('#');
	this.value = safeDecodeURI(urlfrag.substring(0, anch));
	this.anchor = this.value.substring(anch + 1);
};
Title.prototype.append = function (x) {
	this.setUtf(this.value + x);
};
Title.prototype.urlString = function (x) {
	if (!x) {
		x = {};
	}
	var v = this.toString(true);
	if (!x.omitAnchor && this.anchor) {
		v += '#' + this.urlAnchor();
	}
	if (!x.keepSpaces) {
		v = v.split(' ').join('_');
	}
	return encodeURI(v).split('&').join('%26').split('?').join('%3F').split('+').join('%2B');
};
Title.prototype.removeAnchor = function () {
	return new Title(this.toString(true));
};
Title.prototype.toUrl = function () {
	return pg.wiki.titlebase + this.urlString();
};

function parseParams(url) {
	var specialDiff = pg.re.specialdiff.exec(url);
	if (specialDiff) {
		var split = specialDiff[1].split('/');
		if (split.length == 1) {
			return { oldid: split[0], diff: 'prev' };
		} else if (split.length == 2) {
			return { oldid: split[0], diff: split[1] };
		}
	}

	var ret = {};
	if (url.indexOf('?') == -1) {
		return ret;
	}
	url = url.split('#')[0];
	var s = url.split('?').slice(1).join();
	var t = s.split('&');
	for (var i = 0; i < t.length; ++i) {
		var z = t[i].split('=');
		z.push(null);
		ret[z[0]] = z[1];
	}
	//Diff revision with no oldid is interpreted as a diff to the previous revision by MediaWiki
	if (ret.diff && typeof ret.oldid === 'undefined') {
		ret.oldid = 'prev';
	}
	//Documentation seems to say something different, but oldid can also accept prev/next, and
	//Echo is emitting such URLs. Simple fixup during parameter decoding:
	if (ret.oldid && (ret.oldid === 'prev' || ret.oldid === 'next' || ret.oldid === 'cur')) {
		var helper = ret.diff;
		ret.diff = ret.oldid;
		ret.oldid = helper;
	}
	return ret;
}

// (a) myDecodeURI (first standard decodeURI, then pg.re.urlNoPopup)
// (b) change spaces to underscores
// (c) encodeURI (just the straight one, no pg.re.urlNoPopup)

function myDecodeURI(str) {
	var ret;
	// FIXME decodeURIComponent??
	try {
		ret = decodeURI(str.toString());
	} catch (summat) {
		return str;
	}
	for (var i = 0; i < pg.misc.decodeExtras.length; ++i) {
		var from = pg.misc.decodeExtras[i].from;
		var to = pg.misc.decodeExtras[i].to;
		ret = ret.split(from).join(to);
	}
	return ret;
}

function safeDecodeURI(str) {
	var ret = myDecodeURI(str);
	return ret || str;
}

///////////
// TESTS //
///////////

function isDisambig(data, article) {
	if (!getValueOf('popupAllDabsStubs') && article.namespace()) {
		return false;
	}
	return !article.isTalkPage() && pg.re.disambig.test(data);
}

function stubCount(data, article) {
	if (!getValueOf('popupAllDabsStubs') && article.namespace()) {
		return false;
	}
	var sectStub = 0;
	var realStub = 0;
	if (pg.re.stub.test(data)) {
		var s = data.parenSplit(pg.re.stub);
		for (var i = 1; i < s.length; i = i + 2) {
			if (s[i]) {
				++sectStub;
			} else {
				++realStub;
			}
		}
	}
	return { real: realStub, sect: sectStub };
}

function isValidImageName(str) {
	// extend as needed...
	return str.indexOf('{') == -1;
}

function isInStrippableNamespace(article) {
	// Does the namespace allow subpages
	// Note, would be better if we had access to wgNamespacesWithSubpages
	return article.namespaceId() !== 0;
}

function isInMainNamespace(article) {
	return article.namespaceId() === 0;
}

function anchorContainsImage(a) {
	// iterate over children of anchor a
	// see if any are images
	if (a === null) {
		return false;
	}
	var kids = a.childNodes;
	for (var i = 0; i < kids.length; ++i) {
		if (kids[i].nodeName == 'IMG') {
			return true;
		}
	}
	return false;
}
function isPopupLink(a) {
	// NB for performance reasons, TOC links generally return true
	// they should be stripped out later

	if (!markNopopupSpanLinks.done) {
		markNopopupSpanLinks();
	}
	if (a.inNopopupSpan) {
		return false;
	}

	// FIXME is this faster inline?
	if (a.onmousedown || a.getAttribute('nopopup')) {
		return false;
	}
	var h = a.href;
	if (h === document.location.href + '#') {
		return false;
	}
	if (!pg.re.basenames.test(h)) {
		return false;
	}
	if (!pg.re.urlNoPopup.test(h)) {
		return true;
	}
	return (
		(pg.re.email.test(h) ||
            pg.re.contribs.test(h) ||
            pg.re.backlinks.test(h) ||
            pg.re.specialdiff.test(h)) &&
        h.indexOf('&limit=') == -1
	);
}

function markNopopupSpanLinks() {
	if (!getValueOf('popupOnlyArticleLinks')) {
		fixVectorMenuPopups();
	}

	var s = $('.nopopups').toArray();
	for (var i = 0; i < s.length; ++i) {
		var as = s[i].getElementsByTagName('a');
		for (var j = 0; j < as.length; ++j) {
			as[j].inNopopupSpan = true;
		}
	}

	markNopopupSpanLinks.done = true;
}

function fixVectorMenuPopups() {
	$('nav.vector-menu h3:first a:first').prop('inNopopupSpan', true);
}
