function setupTooltips(container, remove, force, popData) {
	log('setupTooltips, container=' + container + ', remove=' + remove);
	if (!container) {
		// the main initial call
		if (
			getValueOf('popupOnEditSelection') &&
            document &&
            document.editform &&
            document.editform.wpTextbox1
		) {
			document.editform.wpTextbox1.onmouseup = doSelectionPopup;
		}
		// article/content is a structure-dependent thing
		container = defaultPopupsContainer();
	}

	if (!remove && !force && container.ranSetupTooltipsAlready) {
		return;
	}
	container.ranSetupTooltipsAlready = !remove;

	var anchors;
	anchors = container.getElementsByTagName('A');
	setupTooltipsLoop(anchors, 0, 250, 100, remove, popData);
}

function defaultPopupsContainer() {
	if (getValueOf('popupOnlyArticleLinks')) {
		return (
			document.querySelector('.skin-vector-2022 .vector-body') ||
            document.getElementById('mw_content') ||
            document.getElementById('content') ||
            document.getElementById('article') ||
            document
		);
	}
	return document;
}

function setupTooltipsLoop(anchors, begin, howmany, sleep, remove, popData) {
	log(simplePrintf('setupTooltipsLoop(%s,%s,%s,%s,%s)', arguments));
	var finish = begin + howmany;
	var loopend = Math.min(finish, anchors.length);
	var j = loopend - begin;
	log(
		'setupTooltips: anchors.length=' +
            anchors.length +
            ', begin=' +
            begin +
            ', howmany=' +
            howmany +
            ', loopend=' +
            loopend +
            ', remove=' +
            remove
	);
	var doTooltip = remove ? removeTooltip : addTooltip;
	// try a faster (?) loop construct
	if (j > 0) {
		do {
			var a = anchors[loopend - j];
			if (typeof a === 'undefined' || !a || !a.href) {
				log('got null anchor at index ' + loopend - j);
				continue;
			}
			doTooltip(a, popData);
		} while (--j);
	}
	if (finish < anchors.length) {
		setTimeout(() => {
			setupTooltipsLoop(anchors, finish, howmany, sleep, remove, popData);
		}, sleep);
	} else {
		if (!remove && !getValueOf('popupTocLinks')) {
			rmTocTooltips();
		}
		pg.flag.finishedLoading = true;
	}
}

// eliminate popups from the TOC
// This also kills any onclick stuff that used to be going on in the toc
function rmTocTooltips() {
	var toc = document.getElementById('toc');
	if (toc) {
		var tocLinks = toc.getElementsByTagName('A');
		var tocLen = tocLinks.length;
		for (var j = 0; j < tocLen; ++j) {
			removeTooltip(tocLinks[j], true);
		}
	}
}

function addTooltip(a, popData) {
	if (!isPopupLink(a)) {
		return;
	}
	a.onmouseover = mouseOverWikiLink;
	a.onmouseout = mouseOutWikiLink;
	a.onmousedown = killPopup;
	a.hasPopup = true;
	a.popData = popData;
}

function removeTooltip(a) {
	if (!a.hasPopup) {
		return;
	}
	a.onmouseover = null;
	a.onmouseout = null;
	if (a.originalTitle) {
		a.title = a.originalTitle;
	}
	a.hasPopup = false;
}

function removeTitle(a) {
	if (!a.originalTitle) {
		a.originalTitle = a.title;
	}
	a.title = '';
}

function restoreTitle(a) {
	if (a.title || !a.originalTitle) {
		return;
	}
	a.title = a.originalTitle;
}

function registerHooks(np) {
	var popupMaxWidth = getValueOf('popupMaxWidth');

	if (typeof popupMaxWidth === 'number') {
		var setMaxWidth = function () {
			np.mainDiv.style.maxWidth = popupMaxWidth + 'px';
			np.maxWidth = popupMaxWidth;
		};
		np.addHook(setMaxWidth, 'unhide', 'before');
	}
	np.addHook(addPopupShortcuts, 'unhide', 'after');
	np.addHook(rmPopupShortcuts, 'hide', 'before');
}

function removeModifierKeyHandler(a) {
	//remove listeners for modifier key if any that were added in mouseOverWikiLink
	document.removeEventListener('keydown', a.modifierKeyHandler, false);
	document.removeEventListener('keyup', a.modifierKeyHandler, false);
}

function mouseOverWikiLink(evt) {
	if (!evt && window.event) {
		evt = window.event;
	}

	// if the modifier is needed, listen for it,
	// we will remove the listener when we mouseout of this link or kill popup.
	if (getValueOf('popupModifier')) {
		// if popupModifierAction = enable, we should popup when the modifier is pressed
		// if popupModifierAction = disable, we should popup unless the modifier is pressed
		var action = getValueOf('popupModifierAction');
		var key = action == 'disable' ? 'keyup' : 'keydown';
		var a = this;
		a.modifierKeyHandler = function (evt) {
			mouseOverWikiLink2(a, evt);
		};
		document.addEventListener(key, a.modifierKeyHandler, false);
	}

	return mouseOverWikiLink2(this, evt);
}

/**
 * Gets the references list item that the provided footnote link targets. This
 * is typically a li element within the ol.references element inside the reflist.
 *
 * @param {Element} a - A footnote link.
 * @return {Element|boolean} The targeted element, or false if one can't be found.
 */
function footnoteTarget(a) {
	var aTitle = Title.fromAnchor(a);
	// We want ".3A" rather than "%3A" or "?" here, so use the anchor property directly
	var anch = aTitle.anchor;
	if (!/^(cite_note-|_note-|endnote)/.test(anch)) {
		return false;
	}

	var lTitle = Title.fromURL(location.href);
	if (lTitle.toString(true) !== aTitle.toString(true)) {
		return false;
	}

	var el = document.getElementById(anch);
	while (el && typeof el.nodeName === 'string') {
		var nt = el.nodeName.toLowerCase();
		if (nt === 'li') {
			return el;
		} else if (nt === 'body') {
			return false;
		} else if (el.parentNode) {
			el = el.parentNode;
		} else {
			return false;
		}
	}
	return false;
}

function footnotePreview(x, navpop) {
	setPopupHTML('<hr />' + x.innerHTML, 'popupPreview', navpop.idNumber);
}

function modifierPressed(evt) {
	var mod = getValueOf('popupModifier');
	if (!mod) {
		return false;
	}

	if (!evt && window.event) {
		evt = window.event;
	}

	return evt && mod && evt[mod.toLowerCase() + 'Key'];
}

// Checks if the correct modifier pressed/unpressed if needed
function isCorrectModifier(a, evt) {
	if (!getValueOf('popupModifier')) {
		return true;
	}
	// if popupModifierAction = enable, we should popup when the modifier is pressed
	// if popupModifierAction = disable, we should popup unless the modifier is pressed
	var action = getValueOf('popupModifierAction');
	return (
		(action == 'enable' && modifierPressed(evt)) || (action == 'disable' && !modifierPressed(evt))
	);
}

function mouseOverWikiLink2(a, evt) {
	if (!isCorrectModifier(a, evt)) {
		return;
	}
	if (getValueOf('removeTitles')) {
		removeTitle(a);
	}
	if (a == pg.current.link && a.navpopup && a.navpopup.isVisible()) {
		return;
	}
	pg.current.link = a;

	if (getValueOf('simplePopups') && !pg.option.popupStructure) {
		// reset *default value* of popupStructure
		setDefault('popupStructure', 'original');
	}

	var article = new Title().fromAnchor(a);
	// set global variable (ugh) to hold article (wikipage)
	pg.current.article = article;

	if (!a.navpopup) {
		a.navpopup = newNavpopup(a, article);
		pg.current.linksHash[a.href] = a.navpopup;
		pg.current.links.push(a);
	}
	if (a.navpopup.pending === null || a.navpopup.pending !== 0) {
		// either fresh popups or those with unfinshed business are redone from scratch
		simplePopupContent(a, article);
	}
	a.navpopup.showSoonIfStable(a.navpopup.delay);

	clearInterval(pg.timer.checkPopupPosition);
	pg.timer.checkPopupPosition = setInterval(checkPopupPosition, 600);

	if (getValueOf('simplePopups')) {
		if (getValueOf('popupPreviewButton') && !a.simpleNoMore) {
			var d = document.createElement('div');
			d.className = 'popupPreviewButtonDiv';
			var s = document.createElement('span');
			d.appendChild(s);
			s.className = 'popupPreviewButton';
			s['on' + getValueOf('popupPreviewButtonEvent')] = function () {
				a.simpleNoMore = true;
				d.style.display = 'none';
				nonsimplePopupContent(a, article);
			};
			s.innerHTML = popupString('show preview');
			setPopupHTML(d, 'popupPreview', a.navpopup.idNumber);
		}
	}

	if (a.navpopup.pending !== 0) {
		nonsimplePopupContent(a, article);
	}
}

// simplePopupContent: the content that do not require additional download
// (it is shown even when simplePopups is true)
function simplePopupContent(a, article) {
	/* FIXME hack */ a.navpopup.hasPopupMenu = false;
	a.navpopup.setInnerHTML(popupHTML(a));
	fillEmptySpans({ navpopup: a.navpopup });

	if (getValueOf('popupDraggable')) {
		var dragHandle = getValueOf('popupDragHandle') || null;
		if (dragHandle && dragHandle != 'all') {
			dragHandle += a.navpopup.idNumber;
		}
		setTimeout(() => {
			a.navpopup.makeDraggable(dragHandle);
		}, 150);
	}

	if (getValueOf('popupRedlinkRemoval') && a.className == 'new') {
		setPopupHTML('<br>' + popupRedlinkHTML(article), 'popupRedlink', a.navpopup.idNumber);
	}
}

function debugData(navpopup) {
	if (getValueOf('popupDebugging') && navpopup.idNumber) {
		setPopupHTML(
			'idNumber=' + navpopup.idNumber + ', pending=' + navpopup.pending,
			'popupError',
			navpopup.idNumber
		);
	}
}

function newNavpopup(a, article) {
	var navpopup = new Navpopup();
	navpopup.fuzz = 5;
	navpopup.delay = getValueOf('popupDelay') * 1000;
	// increment global counter now
	navpopup.idNumber = ++pg.idNumber;
	navpopup.parentAnchor = a;
	navpopup.parentPopup = a.popData && a.popData.owner;
	navpopup.article = article;
	registerHooks(navpopup);
	return navpopup;
}

// Should we show nonsimple context?
// If simplePopups is set to true, then we do not show nonsimple context,
// but if a bottom "show preview" was clicked we do show nonsimple context
function shouldShowNonSimple(a) {
	return !getValueOf('simplePopups') || a.simpleNoMore;
}

// Should we show nonsimple context govern by the option (e.g. popupUserInfo)?
// If the user explicitly asked for nonsimple context by setting the option to true,
// then we show it even in nonsimple mode.
function shouldShow(a, option) {
	if (shouldShowNonSimple(a)) {
		return getValueOf(option);
	} else {
		return typeof window[option] != 'undefined' && window[option];
	}
}

function nonsimplePopupContent(a, article) {
	var diff = null,
		history = null;
	var params = parseParams(a.href);
	var oldid = typeof params.oldid == 'undefined' ? null : params.oldid;
	if (shouldShow(a, 'popupPreviewDiffs')) {
		diff = params.diff;
	}
	if (shouldShow(a, 'popupPreviewHistory')) {
		history = params.action == 'history';
	}
	a.navpopup.pending = 0;
	var referenceElement = footnoteTarget(a);
	if (referenceElement) {
		footnotePreview(referenceElement, a.navpopup);
	} else if (diff || diff === 0) {
		loadDiff(article, oldid, diff, a.navpopup);
	} else if (history) {
		loadAPIPreview('history', article, a.navpopup);
	} else if (shouldShowNonSimple(a) && pg.re.contribs.test(a.href)) {
		loadAPIPreview('contribs', article, a.navpopup);
	} else if (shouldShowNonSimple(a) && pg.re.backlinks.test(a.href)) {
		loadAPIPreview('backlinks', article, a.navpopup);
	} else if (
	// FIXME should be able to get all preview combinations with options
		article.namespaceId() == pg.nsImageId &&
        (shouldShow(a, 'imagePopupsForImages') || !anchorContainsImage(a))
	) {
		loadAPIPreview('imagepagepreview', article, a.navpopup);
		loadImage(article, a.navpopup);
	} else {
		if (article.namespaceId() == pg.nsCategoryId && shouldShow(a, 'popupCategoryMembers')) {
			loadAPIPreview('category', article, a.navpopup);
		} else if (
			(article.namespaceId() == pg.nsUserId || article.namespaceId() == pg.nsUsertalkId) &&
            shouldShow(a, 'popupUserInfo')
		) {
			loadAPIPreview('userinfo', article, a.navpopup);
		}
		if (shouldShowNonSimple(a)) {
			startArticlePreview(article, oldid, a.navpopup);
		}
	}
}

function pendingNavpopTask(navpop) {
	if (navpop && navpop.pending === null) {
		navpop.pending = 0;
	}
	++navpop.pending;
	debugData(navpop);
}

function completedNavpopTask(navpop) {
	if (navpop && navpop.pending) {
		--navpop.pending;
	}
	debugData(navpop);
}

function startArticlePreview(article, oldid, navpop) {
	navpop.redir = 0;
	loadPreview(article, oldid, navpop);
}

function loadPreview(article, oldid, navpop) {
	if (!navpop.redir) {
		navpop.originalArticle = article;
	}
	article.oldid = oldid;
	loadAPIPreview('revision', article, navpop);
}

function loadPreviewFromRedir(redirMatch, navpop) {
	// redirMatch is a regex match
	var target = new Title().fromWikiText(redirMatch[2]);
	// overwrite (or add) anchor from original target
	// mediawiki does overwrite; eg [[User:Lupin/foo3#Done]]
	if (navpop.article.anchor) {
		target.anchor = navpop.article.anchor;
	}
	navpop.redir++;
	navpop.redirTarget = target;
	var warnRedir = redirLink(target, navpop.article);
	setPopupHTML(warnRedir, 'popupWarnRedir', navpop.idNumber);
	navpop.article = target;
	fillEmptySpans({ redir: true, redirTarget: target, navpopup: navpop });
	return loadPreview(target, null, navpop);
}

function insertPreview(download) {
	if (!download.owner) {
		return;
	}

	var redirMatch = pg.re.redirect.exec(download.data);
	if (download.owner.redir === 0 && redirMatch) {
		loadPreviewFromRedir(redirMatch, download.owner);
		return;
	}

	if (download.owner.visible || !getValueOf('popupLazyPreviews')) {
		insertPreviewNow(download);
	} else {
		var id = download.owner.redir ? 'PREVIEW_REDIR_HOOK' : 'PREVIEW_HOOK';
		download.owner.addHook(
			() => {
				insertPreviewNow(download);
				return true;
			},
			'unhide',
			'after',
			id
		);
	}
}

function insertPreviewNow(download) {
	if (!download.owner) {
		return;
	}
	var wikiText = download.data;
	var navpop = download.owner;
	var art = navpop.redirTarget || navpop.originalArticle;

	makeFixDabs(wikiText, navpop);
	if (getValueOf('popupSummaryData')) {
		getPageInfo(wikiText, download);
		setPopupTrailer(getPageInfo(wikiText, download), navpop.idNumber);
	}

	var imagePage = '';
	if (art.namespaceId() == pg.nsImageId) {
		imagePage = art.toString();
	} else {
		imagePage = getValidImageFromWikiText(wikiText);
	}
	if (imagePage) {
		loadImage(Title.fromWikiText(imagePage), navpop);
	}

	if (getValueOf('popupPreviews')) {
		insertArticlePreview(download, art, navpop);
	}
}

function insertArticlePreview(download, art, navpop) {
	if (download && typeof download.data == typeof '') {
		if (art.namespaceId() == pg.nsTemplateId && getValueOf('popupPreviewRawTemplates')) {
			// FIXME compare/consolidate with diff escaping code for wikitext
			var h =
                '<hr /><span style="font-family: monospace;">' +
                download.data.entify().split('\\n').join('<br />\\n') +
                '</span>';
			setPopupHTML(h, 'popupPreview', navpop.idNumber);
		} else {
			var p = prepPreviewmaker(download.data, art, navpop);
			p.showPreview();
		}
	}
}

function prepPreviewmaker(data, article, navpop) {
	// deal with tricksy anchors
	var d = anchorize(data, article.anchorString());
	var urlBase = joinPath([pg.wiki.articlebase, article.urlString()]);
	var p = new Previewmaker(d, urlBase, navpop);
	return p;
}

// Try to imitate the way mediawiki generates HTML anchors from section titles
function anchorize(d, anch) {
	if (!anch) {
		return d;
	}
	var anchRe = RegExp(
		'(?:=+\\s*' +
            literalizeRegex(anch).replace(/[_ ]/g, '[_ ]') +
            '\\s*=+|\\{\\{\\s*' +
            getValueOf('popupAnchorRegexp') +
            '\\s*(?:\\|[^|}]*)*?\\s*' +
            literalizeRegex(anch) +
            '\\s*(?:\\|[^}]*)?}})'
	);
	var match = d.match(anchRe);
	if (match && match.length > 0 && match[0]) {
		return d.substring(d.indexOf(match[0]));
	}

	// now try to deal with == foo [[bar|baz]] boom == -> #foo_baz_boom
	var lines = d.split('\n');
	for (var i = 0; i < lines.length; ++i) {
		lines[i] = lines[i]
			.replace(/[[]{2}([^|\]]*?[|])?(.*?)[\]]{2}/g, '$2')
			.replace(/'''([^'])/g, '$1')
			.replace(/''([^'])/g, '$1');
		if (lines[i].match(anchRe)) {
			return d.split('\n').slice(i).join('\n').replace(/^[^=]*/, '');
		}
	}
	return d;
}

function killPopup() {
	removeModifierKeyHandler(this);
	if (getValueOf('popupShortcutKeys')) {
		rmPopupShortcuts();
	}
	if (!pg) {
		return;
	}
	if (pg.current.link && pg.current.link.navpopup) {
		pg.current.link.navpopup.banish();
	}
	pg.current.link = null;
	abortAllDownloads();
	if (pg.timer.checkPopupPosition) {
		clearInterval(pg.timer.checkPopupPosition);
		pg.timer.checkPopupPosition = null;
	}
	return true; // preserve default action
}
