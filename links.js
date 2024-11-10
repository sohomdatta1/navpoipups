/////////////////////
// LINK GENERATION //
/////////////////////

// titledDiffLink --> titledWikiLink --> generalLink
// wikiLink	   --> titledWikiLink --> generalLink
// editCounterLink --> generalLink

// TODO Make these functions return Element objects, not just raw HTML strings.

function titledDiffLink(l) {
	// article, text, title, from, to) {
	return titledWikiLink({
		article: l.article,
		action: l.to + '&oldid=' + l.from,
		newWin: l.newWin,
		noPopup: l.noPopup,
		text: l.text,
		title: l.title,
		/* hack: no oldid here */
		actionName: 'diff'
	});
}

function wikiLink(l) {
	//{article:article, action:action, text:text, oldid, newid}) {
	if (
		!(typeof l.article == typeof {} && typeof l.action == typeof '' && typeof l.text == typeof '')
	) {
		return null;
	}
	if (typeof l.oldid == 'undefined') {
		l.oldid = null;
	}
	var savedOldid = l.oldid;
	if (!/^(edit|view|revert|render)$|^raw/.test(l.action)) {
		l.oldid = null;
	}
	var hint = popupString(l.action + 'Hint'); // revertHint etc etc etc
	var oldidData = [l.oldid, safeDecodeURI(l.article)];
	var revisionString = tprintf('revision %s of %s', oldidData);
	log('revisionString=' + revisionString);
	switch (l.action) {
		case 'edit&section=new':
			hint = popupString('newSectionHint');
			break;
		case 'edit&undo=':
			if (l.diff && l.diff != 'prev' && savedOldid) {
				l.action += l.diff + '&undoafter=' + savedOldid;
			} else if (savedOldid) {
				l.action += savedOldid;
			}
			hint = popupString('undoHint');
			break;
		case 'raw&ctype=text/css':
			hint = popupString('rawHint');
			break;
		case 'revert':
			var p = parseParams(pg.current.link.href);
			l.action =
                'edit&autoclick=wpSave&actoken=' +
                autoClickToken() +
                '&autoimpl=' +
                popupString('autoedit_version') +
                '&autosummary=' +
                revertSummary(l.oldid, p.diff);
			if (p.diff == 'prev') {
				l.action += '&direction=prev';
				revisionString = tprintf('the revision prior to revision %s of %s', oldidData);
			}
			if (getValueOf('popupRevertSummaryPrompt')) {
				l.action += '&autosummaryprompt=true';
			}
			if (getValueOf('popupMinorReverts')) {
				l.action += '&autominor=true';
			}
			log('revisionString is now ' + revisionString);
			break;
		case 'nullEdit':
			l.action =
                'edit&autoclick=wpSave&actoken=' +
                autoClickToken() +
                '&autoimpl=' +
                popupString('autoedit_version') +
                '&autosummary=null';
			break;
		case 'historyfeed':
			l.action = 'history&feed=rss';
			break;
		case 'markpatrolled':
			l.action = 'markpatrolled&rcid=' + l.rcid;
	}

	if (hint) {
		if (l.oldid) {
			hint = simplePrintf(hint, [revisionString]);
		} else {
			hint = simplePrintf(hint, [safeDecodeURI(l.article)]);
		}
	} else {
		hint = safeDecodeURI(l.article + '&action=' + l.action) + l.oldid ? '&oldid=' + l.oldid : '';
	}

	return titledWikiLink({
		article: l.article,
		action: l.action,
		text: l.text,
		newWin: l.newWin,
		title: hint,
		oldid: l.oldid,
		noPopup: l.noPopup,
		onclick: l.onclick
	});
}

function revertSummary(oldid, diff) {
	var ret = '';
	if (diff == 'prev') {
		ret = getValueOf('popupQueriedRevertToPreviousSummary');
	} else {
		ret = getValueOf('popupQueriedRevertSummary');
	}
	return ret + '&autorv=' + oldid;
}

function titledWikiLink(l) {
	// possible properties of argument:
	// article, action, text, title, oldid, actionName, className, noPopup
	// oldid = null is fine here

	// article and action are mandatory args

	if (typeof l.article == 'undefined' || typeof l.action == 'undefined') {
		errlog('got undefined article or action in titledWikiLink');
		return null;
	}

	var base = pg.wiki.titlebase + l.article.urlString();
	var url = base;

	if (typeof l.actionName == 'undefined' || !l.actionName) {
		l.actionName = 'action';
	}

	// no need to add &action=view, and this confuses anchors
	if (l.action != 'view') {
		url = base + '&' + l.actionName + '=' + l.action;
	}

	if (typeof l.oldid != 'undefined' && l.oldid) {
		url += '&oldid=' + l.oldid;
	}

	var cssClass = pg.misc.defaultNavlinkClassname;
	if (typeof l.className != 'undefined' && l.className) {
		cssClass = l.className;
	}

	return generalNavLink({
		url: url,
		newWin: l.newWin,
		title: typeof l.title != 'undefined' ? l.title : null,
		text: typeof l.text != 'undefined' ? l.text : null,
		className: cssClass,
		noPopup: l.noPopup,
		onclick: l.onclick
	});
}

pg.fn.getLastContrib = function getLastContrib(wikipage, newWin) {
	getHistoryInfo(wikipage, (x) => {
		processLastContribInfo(x, { page: wikipage, newWin: newWin });
	});
};

function processLastContribInfo(info, stuff) {
	if (!info.edits || !info.edits.length) {
		alert('Popups: an odd thing happened. Please retry.');
		return;
	}
	if (!info.firstNewEditor) {
		alert(
			tprintf('Only found one editor: %s made %s edits', [
				info.edits[0].editor,
				info.edits.length
			])
		);
		return;
	}
	var newUrl =
        pg.wiki.titlebase +
        new Title(stuff.page).urlString() +
        '&diff=cur&oldid=' +
        info.firstNewEditor.oldid;
	displayUrl(newUrl, stuff.newWin);
}

pg.fn.getDiffSinceMyEdit = function getDiffSinceMyEdit(wikipage, newWin) {
	getHistoryInfo(wikipage, (x) => {
		processDiffSinceMyEdit(x, { page: wikipage, newWin: newWin });
	});
};

function processDiffSinceMyEdit(info, stuff) {
	if (!info.edits || !info.edits.length) {
		alert('Popups: something fishy happened. Please try again.');
		return;
	}
	var friendlyName = stuff.page.split('_').join(' ');
	if (!info.myLastEdit) {
		alert(
			tprintf("Couldn't find an edit by %s\nin the last %s edits to\n%s", [
				info.userName,
				getValueOf('popupHistoryLimit'),
				friendlyName
			])
		);
		return;
	}
	if (info.myLastEdit.index === 0) {
		alert(
			tprintf('%s seems to be the last editor to the page %s', [info.userName, friendlyName])
		);
		return;
	}
	var newUrl =
        pg.wiki.titlebase +
        new Title(stuff.page).urlString() +
        '&diff=cur&oldid=' +
        info.myLastEdit.oldid;
	displayUrl(newUrl, stuff.newWin);
}

function displayUrl(url, newWin) {
	if (newWin) {
		window.open(url);
	} else {
		document.location = url;
	}
}

pg.fn.purgePopups = function purgePopups() {
	processAllPopups(true);
	setupCache(); // deletes all cached items (not browser cached, though...)
	pg.option = {};
	abortAllDownloads();
};

function processAllPopups(nullify, banish) {
	for (var i = 0; pg.current.links && i < pg.current.links.length; ++i) {
		if (!pg.current.links[i].navpopup) {
			continue;
		}
		if (nullify || banish) {
			pg.current.links[i].navpopup.banish();
		}
		pg.current.links[i].simpleNoMore = false;
		if (nullify) {
			pg.current.links[i].navpopup = null;
		}
	}
}

pg.fn.disablePopups = function disablePopups() {
	processAllPopups(false, true);
	setupTooltips(null, true);
};

pg.fn.togglePreviews = function togglePreviews() {
	processAllPopups(true, true);
	pg.option.simplePopups = !pg.option.simplePopups;
	abortAllDownloads();
};

function magicWatchLink(l) {
	//Yuck!! Would require a thorough redesign to add this as a click event though ...
	l.onclick = simplePrintf("pg.fn.modifyWatchlist('%s','%s');return false;", [
		l.article.toString(true).split('\\').join('\\\\').split("'").join("\\'"),
		this.id
	]);
	return wikiLink(l);
}

pg.fn.modifyWatchlist = function modifyWatchlist(title, action) {
	var reqData = {
		action: 'watch',
		formatversion: 2,
		titles: title,
		uselang: mw.config.get('wgUserLanguage')
	};
	if (action === 'unwatch') {
		reqData.unwatch = true;
	}

	// Load the Addedwatchtext or Removedwatchtext message and show it
	var mwTitle = mw.Title.newFromText(title);
	var messageName;
	if (mwTitle && mwTitle.getNamespaceId() > 0 && mwTitle.getNamespaceId() % 2 === 1) {
		messageName = action === 'watch' ? 'addedwatchtext-talk' : 'removedwatchtext-talk';
	} else {
		messageName = action === 'watch' ? 'addedwatchtext' : 'removedwatchtext';
	}
	$.when(
		getMwApi().postWithToken('watch', reqData),
		getMwApi().loadMessagesIfMissing([messageName])
	).done(() => {
		mw.notify(mw.message(messageName, title).parseDom());
	});
};

function magicHistoryLink(l) {
	// FIXME use onclick change href trick to sort this out instead of window.open

	var jsUrl = '',
		title = '',
		onClick = '';
	switch (l.id) {
		case 'lastContrib':
			onClick = simplePrintf("pg.fn.getLastContrib('%s',%s)", [
				l.article.toString(true).split('\\').join('\\\\').split("'").join("\\'"),
				l.newWin
			]);
			title = popupString('lastContribHint');
			break;
		case 'sinceMe':
			onClick = simplePrintf("pg.fn.getDiffSinceMyEdit('%s',%s)", [
				l.article.toString(true).split('\\').join('\\\\').split("'").join("\\'"),
				l.newWin
			]);
			title = popupString('sinceMeHint');
			break;
	}
	jsUrl = 'javascript:' + onClick; // jshint ignore:line
	onClick += ';return false;';

	return generalNavLink({
		url: jsUrl,
		newWin: false, // can't have new windows with JS links, I think
		title: title,
		text: l.text,
		noPopup: l.noPopup,
		onclick: onClick
	});
}

function popupMenuLink(l) {
	var jsUrl = simplePrintf('javascript:pg.fn.%s()', [l.id]); // jshint ignore:line
	var title = popupString(simplePrintf('%sHint', [l.id]));
	var onClick = simplePrintf('pg.fn.%s();return false;', [l.id]);
	return generalNavLink({
		url: jsUrl,
		newWin: false,
		title: title,
		text: l.text,
		noPopup: l.noPopup,
		onclick: onClick
	});
}

function specialLink(l) {
	// properties: article, specialpage, text, sep
	if (typeof l.specialpage == 'undefined' || !l.specialpage) {
		return null;
	}
	var base =
        pg.wiki.titlebase +
        mw.config.get('wgFormattedNamespaces')[pg.nsSpecialId] +
        ':' +
        l.specialpage;
	if (typeof l.sep == 'undefined' || l.sep === null) {
		l.sep = '&target=';
	}
	var article = l.article.urlString({
		keepSpaces: l.specialpage == 'Search'
	});
	var hint = popupString(l.specialpage + 'Hint');
	switch (l.specialpage) {
		case 'Log':
			switch (l.sep) {
				case '&user=':
					hint = popupString('userLogHint');
					break;
				case '&type=block&page=':
					hint = popupString('blockLogHint');
					break;
				case '&page=':
					hint = popupString('pageLogHint');
					break;
				case '&type=protect&page=':
					hint = popupString('protectLogHint');
					break;
				case '&type=delete&page=':
					hint = popupString('deleteLogHint');
					break;
				default:
					log('Unknown log type, sep=' + l.sep);
					hint = 'Missing hint (FIXME)';
			}
			break;
		case 'PrefixIndex':
			article += '/';
			break;
	}
	if (hint) {
		hint = simplePrintf(hint, [safeDecodeURI(l.article)]);
	} else {
		hint = safeDecodeURI(l.specialpage + ':' + l.article);
	}

	var url = base + l.sep + article;
	return generalNavLink({
		url: url,
		title: hint,
		text: l.text,
		newWin: l.newWin,
		noPopup: l.noPopup
	});
}

/**
 * Builds a link from a object representing a link
 *
 * @param {Object} link
 * @param {string} link.url URL
 * @param {string} link.text The text to show for a link
 * @param {string} link.title Title of the link, this shows up
 * when you hover over the link
 * @param {boolean} link.newWin Should open in a new Window
 * @param {number} link.noPopup Should nest new popups from link (0 or 1)
 * @param {string} link.onclick
 * @return {string|null} null if no url is given
 */
function generalLink(link) {
	if (typeof link.url == 'undefined') {
		return null;
	}

	var elem = document.createElement( 'a' );

	elem.href = link.url;
	elem.title = link.title;
	// The onclick event adds raw JS in textual form to the HTML.
	// TODO: We should look into removing this, and/or auditing what gets sent.
	elem.setAttribute( 'onclick', link.onclick );

	if ( link.noPopup ) {
		elem.setAttribute('noPopup', '1' );
	}

	var newWin;
	if (typeof link.newWin == 'undefined' || link.newWin === null) {
		newWin = getValueOf('popupNewWindows');
	} else {
		newWin = link.newWin;
	}
	if (newWin) {
		elem.target = '_blank';
	}
	if (link.className) {
		elem.className = link.className;
	}
	elem.innerText = pg.unescapeQuotesHTML(link.text);

	return elem.outerHTML;
}

function appendParamsToLink(linkstr, params) {
	var sp = linkstr.parenSplit(/(href="[^"]+?)"/i);
	if (sp.length < 2) {
		return null;
	}
	var ret = sp.shift() + sp.shift();
	ret += '&' + params + '"';
	ret += sp.join('');
	return ret;
}

function changeLinkTargetLink(x) {
	// newTarget, text, hint, summary, clickButton, minor, title (optional), alsoChangeLabel {
	if (x.newTarget) {
		log('changeLinkTargetLink: newTarget=' + x.newTarget);
	}
	if (x.oldTarget !== decodeURIComponent(x.oldTarget)) {
		log('This might be an input problem: ' + x.oldTarget);
	}

	// FIXME: first character of page title as well as namespace should be case insensitive
	// eg [[:category:X1]] and [[:Category:X1]] are equivalent
	// this'll break if charAt(0) is nasty
	var cA = mw.util.escapeRegExp(x.oldTarget);
	var chs = cA.charAt(0).toUpperCase();
	chs = '[' + chs + chs.toLowerCase() + ']';
	var currentArticleRegexBit = chs + cA.substring(1);
	currentArticleRegexBit = currentArticleRegexBit
		.split(/(?:[_ ]+|%20)/g)
		.join('(?:[_ ]+|%20)')
		.split('\\(')
		.join('(?:%28|\\()')
		.split('\\)')
		.join('(?:%29|\\))'); // why does this need to match encoded strings ? links in the document ?
	// leading and trailing space should be ignored, and anchor bits optional:
	currentArticleRegexBit = '\\s*(' + currentArticleRegexBit + '(?:#[^\\[\\|]*)?)\\s*';
	// e.g. Computer (archaic) -> \s*([Cc]omputer[_ ](?:%2528|\()archaic(?:%2528|\)))\s*

	// autoedit=s~\[\[([Cc]ad)\]\]~[[Computer-aided%20design|$1]]~g;s~\[\[([Cc]AD)[|]~[[Computer-aided%20design|~g

	var title = x.title || mw.config.get('wgPageName').split('_').join(' ');
	var lk = titledWikiLink({
		article: new Title(title),
		newWin: x.newWin,
		action: 'edit',
		text: x.text,
		title: x.hint,
		className: 'popup_change_title_link'
	});
	var cmd = '';
	if (x.newTarget) {
		// escape '&' and other nasties
		var t = x.newTarget;
		var s = mw.util.escapeRegExp(x.newTarget);
		if (x.alsoChangeLabel) {
			cmd += 's~\\[\\[' + currentArticleRegexBit + '\\]\\]~[[' + t + ']]~g;';
			cmd += 's~\\[\\[' + currentArticleRegexBit + '[|]~[[' + t + '|~g;';
			cmd += 's~\\[\\[' + s + '\\|' + s + '\\]\\]~[[' + t + ']]~g';
		} else {
			cmd += 's~\\[\\[' + currentArticleRegexBit + '\\]\\]~[[' + t + '|$1]]~g;';
			cmd += 's~\\[\\[' + currentArticleRegexBit + '[|]~[[' + t + '|~g;';
			cmd += 's~\\[\\[' + s + '\\|' + s + '\\]\\]~[[' + t + ']]~g';
		}
	} else {
		cmd += 's~\\[\\[' + currentArticleRegexBit + '\\]\\]~$1~g;';
		cmd += 's~\\[\\[' + currentArticleRegexBit + '[|](.*?)\\]\\]~$2~g';
	}
	// Build query
	cmd = 'autoedit=' + encodeURIComponent(cmd);
	cmd +=
        '&autoclick=' +
        encodeURIComponent(x.clickButton) +
        '&actoken=' +
        encodeURIComponent(autoClickToken());
	cmd += x.minor === null ? '' : '&autominor=' + encodeURIComponent(x.minor);
	cmd += x.watch === null ? '' : '&autowatch=' + encodeURIComponent(x.watch);
	cmd += '&autosummary=' + encodeURIComponent(x.summary);
	cmd += '&autoimpl=' + encodeURIComponent(popupString('autoedit_version'));
	return appendParamsToLink(lk, cmd);
}

function redirLink(redirMatch, article) {
	// NB redirMatch is in wikiText
	var ret = '';

	if (getValueOf('popupAppendRedirNavLinks') && getValueOf('popupNavLinks')) {
		ret += '<hr />';

		if (getValueOf('popupFixRedirs') && typeof autoEdit != 'undefined' && autoEdit) {
			ret += popupString('Redirects to: (Fix ');
			log('redirLink: newTarget=' + redirMatch);
			ret += addPopupShortcut(
				changeLinkTargetLink({
					newTarget: redirMatch,
					text: popupString('target'),
					hint: popupString('Fix this redirect, changing just the link target'),
					summary: simplePrintf(getValueOf('popupFixRedirsSummary'), [
						article.toString(),
						redirMatch
					]),
					oldTarget: article.toString(),
					clickButton: getValueOf('popupRedirAutoClick'),
					minor: true,
					watch: getValueOf('popupWatchRedirredPages')
				}),
				'R'
			);
			ret += popupString(' or ');
			ret += addPopupShortcut(
				changeLinkTargetLink({
					newTarget: redirMatch,
					text: popupString('target & label'),
					hint: popupString('Fix this redirect, changing the link target and label'),
					summary: simplePrintf(getValueOf('popupFixRedirsSummary'), [
						article.toString(),
						redirMatch
					]),
					oldTarget: article.toString(),
					clickButton: getValueOf('popupRedirAutoClick'),
					minor: true,
					watch: getValueOf('popupWatchRedirredPages'),
					alsoChangeLabel: true
				}),
				'R'
			);
			ret += popupString(')');
		} else {
			ret += popupString('Redirects') + popupString(' to ');
		}

		return ret;
	} else {
		return (
			'<br> ' +
            popupString('Redirects') +
            popupString(' to ') +
            titledWikiLink({
            	article: new Title().fromWikiText(redirMatch),
            	action: 'view' /* FIXME: newWin */,
            	text: safeDecodeURI(redirMatch),
            	title: popupString('Bypass redirect')
            })
		);
	}
}

function arinLink(l) {
	if (!saneLinkCheck(l)) {
		return null;
	}
	if (!l.article.isIpUser() || !pg.wiki.wikimedia) {
		return null;
	}

	var uN = l.article.userName();

	return generalNavLink({
		url: 'http://ws.arin.net/cgi-bin/whois.pl?queryinput=' + encodeURIComponent(uN),
		newWin: l.newWin,
		title: tprintf('Look up %s in ARIN whois database', [uN]),
		text: l.text,
		noPopup: 1
	});
}

function toolDbName(cookieStyle) {
	var ret = mw.config.get('wgDBname');
	if (!cookieStyle) {
		ret += '_p';
	}
	return ret;
}

function saneLinkCheck(l) {
	if (typeof l.article != typeof {} || typeof l.text != typeof '') {
		return false;
	}
	return true;
}
function editCounterLink(l) {
	if (!saneLinkCheck(l)) {
		return null;
	}
	if (!pg.wiki.wikimedia) {
		return null;
	}
	var uN = l.article.userName();
	var tool = getValueOf('popupEditCounterTool');
	var url;
	var defaultToolUrl = 'https://xtools.wmflabs.org/ec?user=$1&project=$2.$3&uselang=' + mw.config.get('wgUserLanguage');

	switch (tool) {
		case 'custom':
			url = simplePrintf(getValueOf('popupEditCounterUrl'), [
				encodeURIComponent(uN),
				toolDbName()
			]);
			break;
		case 'soxred': // no longer available
		case 'kate': // no longer available
		case 'interiot': // no longer available
			/* fall through */
		case 'supercount':
		default:
			var theWiki = pg.wiki.hostname.split('.');
			url = simplePrintf(defaultToolUrl, [encodeURIComponent(uN), theWiki[0], theWiki[1]]);
	}
	return generalNavLink({
		url: url,
		title: tprintf('editCounterLinkHint', [uN]),
		newWin: l.newWin,
		text: l.text,
		noPopup: 1
	});
}

function globalSearchLink(l) {
	if (!saneLinkCheck(l)) {
		return null;
	}

	var base = 'https://global-search.toolforge.org/?uselang=' + mw.config.get('wgUserLanguage') + '&q=';
	var article = l.article.urlString({ keepSpaces: true });

	return generalNavLink({
		url: base + article,
		newWin: l.newWin,
		title: tprintf('globalSearchHint', [safeDecodeURI(l.article)]),
		text: l.text,
		noPopup: 1
	});
}

function googleLink(l) {
	if (!saneLinkCheck(l)) {
		return null;
	}

	var base = 'https://www.google.com/search?q=';
	var article = l.article.urlString({ keepSpaces: true });

	return generalNavLink({
		url: base + '%22' + article + '%22',
		newWin: l.newWin,
		title: tprintf('googleSearchHint', [safeDecodeURI(l.article)]),
		text: l.text,
		noPopup: 1
	});
}

function editorListLink(l) {
	if (!saneLinkCheck(l)) {
		return null;
	}
	var article = l.article.articleFromTalkPage() || l.article;
	var url =
        'https://xtools.wmflabs.org/articleinfo/' +
        encodeURI(pg.wiki.hostname) +
        '/' +
        article.urlString() +
        '?uselang=' +
        mw.config.get('wgUserLanguage');
	return generalNavLink({
		url: url,
		title: tprintf('editorListHint', [article]),
		newWin: l.newWin,
		text: l.text,
		noPopup: 1
	});
}

function generalNavLink(l) {
	l.className = l.className === null ? 'popupNavLink' : l.className;
	return generalLink(l);
}

//////////////////////////////////////////////////
// magic history links
//

function getHistoryInfo(wikipage, whatNext) {
	log('getHistoryInfo');
	getHistory(
		wikipage,
		whatNext ?
			(d) => {
				whatNext(processHistory(d));
			} :
			processHistory
	);
}

// FIXME eliminate pg.idNumber ... how? :-(

function getHistory(wikipage, onComplete) {
	log('getHistory');
	var url =
        pg.wiki.apiwikibase +
        '?format=json&formatversion=2&action=query&prop=revisions&titles=' +
        new Title(wikipage).urlString() +
        '&rvlimit=' +
        getValueOf('popupHistoryLimit');
	log('getHistory: url=' + url);
	return startDownload(url, pg.idNumber + 'history', onComplete);
}

function processHistory(download) {
	var jsobj = getJsObj(download.data);
	try {
		var revisions = anyChild(jsobj.query.pages).revisions;
		var edits = [];
		for (var i = 0; i < revisions.length; ++i) {
			edits.push({ oldid: revisions[i].revid, editor: revisions[i].user });
		}
		log('processed ' + edits.length + ' edits');
		return finishProcessHistory(edits, mw.config.get('wgUserName'));
	} catch (someError) {
		log('Something went wrong with JSON business');
		return finishProcessHistory([]);
	}
}

function finishProcessHistory(edits, userName) {
	var histInfo = {};

	histInfo.edits = edits;
	histInfo.userName = userName;

	for (var i = 0; i < edits.length; ++i) {
		if (typeof histInfo.myLastEdit === 'undefined' && userName && edits[i].editor == userName) {
			histInfo.myLastEdit = {
				index: i,
				oldid: edits[i].oldid,
				previd: i === 0 ? null : edits[i - 1].oldid
			};
		}
		if (typeof histInfo.firstNewEditor === 'undefined' && edits[i].editor != edits[0].editor) {
			histInfo.firstNewEditor = {
				index: i,
				oldid: edits[i].oldid,
				previd: i === 0 ? null : edits[i - 1].oldid
			};
		}
	}
	//pg.misc.historyInfo=histInfo;
	return histInfo;
}
