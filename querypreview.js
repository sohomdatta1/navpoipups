function loadAPIPreview(queryType, article, navpop) {
	var art = new Title(article).urlString();
	var url = pg.wiki.apiwikibase + '?format=json&formatversion=2&action=query&';
	var htmlGenerator = function (/*a, d*/) {
		alert('invalid html generator');
	};
	var usernameart = '';
	switch (queryType) {
		case 'history':
			url +=
                'titles=' + art + '&prop=revisions&rvlimit=' + getValueOf('popupHistoryPreviewLimit');
			htmlGenerator = APIhistoryPreviewHTML;
			break;
		case 'category':
			url += 'list=categorymembers&cmtitle=' + art;
			htmlGenerator = APIcategoryPreviewHTML;
			break;
		case 'userinfo':
			var username = new Title(article).userName();
			usernameart = encodeURIComponent(username);
			if (pg.re.ipUser.test(username)) {
				url += 'list=blocks&bkprop=range|restrictions&bkip=' + usernameart;
			} else {
				url +=
                    'list=users|usercontribs&usprop=blockinfo|groups|editcount|registration|gender&ususers=' +
                    usernameart +
                    '&meta=globaluserinfo&guiprop=groups|unattached&guiuser=' +
                    usernameart +
                    '&uclimit=1&ucprop=timestamp&ucuser=' +
                    usernameart;
			}
			htmlGenerator = APIuserInfoPreviewHTML;
			break;
		case 'contribs':
			usernameart = encodeURIComponent(new Title(article).userName());
			url +=
                'list=usercontribs&ucuser=' +
                usernameart +
                '&uclimit=' +
                getValueOf('popupContribsPreviewLimit');
			htmlGenerator = APIcontribsPreviewHTML;
			break;
		case 'imagepagepreview':
			var trail = '';
			if (getValueOf('popupImageLinks')) {
				trail = '&list=imageusage&iutitle=' + art;
			}
			url += 'titles=' + art + '&prop=revisions|imageinfo&rvslots=main&rvprop=content' + trail;
			htmlGenerator = APIimagepagePreviewHTML;
			break;
		case 'backlinks':
			url += 'list=backlinks&bltitle=' + art;
			htmlGenerator = APIbacklinksPreviewHTML;
			break;
		case 'revision':
			if (article.oldid) {
				url += 'revids=' + article.oldid;
			} else {
				url += 'titles=' + article.removeAnchor().urlString();
			}
			url +=
                '&prop=revisions|pageprops|info|images|categories&meta=wikibase&rvslots=main&rvprop=ids|timestamp|flags|comment|user|content&cllimit=max&imlimit=max';
			htmlGenerator = APIrevisionPreviewHTML;
			break;
	}
	pendingNavpopTask(navpop);
	var callback = function (d) {
		log('callback of API functions was hit');
		if (queryType === 'userinfo') {
			// We need to do another API request
			fetchUserGroupNames(d.data).then(() => {
				showAPIPreview(queryType, htmlGenerator(article, d, navpop), navpop.idNumber, navpop, d);
			});
			return;
		}
		showAPIPreview(queryType, htmlGenerator(article, d, navpop), navpop.idNumber, navpop, d);
	};
	var go = function () {
		getPageWithCaching(url, callback, navpop);
		return true;
	};

	if (navpop.visible || !getValueOf('popupLazyDownloads')) {
		go();
	} else {
		navpop.addHook(go, 'unhide', 'before', 'DOWNLOAD_' + queryType + '_QUERY_DATA');
	}
}

function linkList(list) {
	list.sort((x, y) => x == y ? 0 : x < y ? -1 : 1);
	var buf = [];
	for (var i = 0; i < list.length; ++i) {
		buf.push(
			wikiLink({
				article: new Title(list[i]),
				text: list[i].split(' ').join('&nbsp;'),
				action: 'view'
			})
		);
	}
	return buf.join(', ');
}

function getTimeOffset() {
	var tz = mw.user.options.get('timecorrection');

	if (tz) {
		if (tz.indexOf('|') > -1) {
			// New format
			return parseInt(tz.split('|')[1], 10);
		}
	}
	return 0;
}

function getTimeZone() {
	if (!pg.user.timeZone) {
		var tz = mw.user.options.get('timecorrection');
		pg.user.timeZone = 'UTC';

		if (tz) {
			var tzComponents = tz.split('|');
			if (tzComponents.length === 3 && tzComponents[0] === 'ZoneInfo') {
				pg.user.timeZone = tzComponents[2];
			} else {
				errlog('Unexpected timezone information: ' + tz);
			}
		}
	}
	return pg.user.timeZone;
}

/**
 * Should we use an offset or can we use proper timezones
 */
function useTimeOffset() {
	if (typeof Intl.DateTimeFormat.prototype.formatToParts === 'undefined') {
		// IE 11
		return true;
	}
	var tz = mw.user.options.get('timecorrection');
	if (tz && tz.indexOf('ZoneInfo|') === -1) {
		// System| Default system time, default for users who didn't configure timezone
		// Offset| Manual defined offset by user
		return true;
	}
	return false;
}

/**
 * Array of locales for the purpose of javascript locale based formatting
 * Filters down to those supported by the browser. Empty [] === System's default locale
 */
function getLocales() {
	if (!pg.user.locales) {
		var userLanguage = document.querySelector('html').getAttribute('lang'); // make sure we have HTML locale
		if (getValueOf('popupLocale')) {
			userLanguage = getValueOf('popupLocale');
		} else if (userLanguage === 'en') {
			// en.wp tends to treat this as international english / unspecified
			// but we have more specific settings in user options
			if (getMWDateFormat() === 'mdy') {
				userLanguage = 'en-US';
			} else {
				userLanguage = 'en-GB';
			}
		}
		pg.user.locales = Intl.DateTimeFormat.supportedLocalesOf([userLanguage, navigator.language]);
	}
	return pg.user.locales;
}

/**
 * Retrieve configured MW date format for this user
 * These can be
 * default
 * dmy: time, dmy
 * mdy: time, mdy
 * ymd: time, ymd
 * dmyt: dmy, time
 * dmyts: dmy, time + seconds
 * ISO 8601: YYYY-MM-DDThh:mm:ss (local time)
 *
 * This isn't too useful for us, as JS doesn't have formatters to match these private specifiers
 */
function getMWDateFormat() {
	return mw.user.options.get('date');
}

/**
 * Creates a HTML table that's shown in the history and user-contribs popups.
 *
 * @param {Object[]} h - a list of revisions, returned from the API
 * @param {boolean} reallyContribs - true only if we're displaying user contributions
 */
function editPreviewTable(article, h, reallyContribs) {
	var html = ['<table>'];
	var day = null;
	var curart = article;
	var page = null;

	var makeFirstColumnLinks;
	if (reallyContribs) {
		// We're showing user contributions, so make (diff | hist) links
		makeFirstColumnLinks = function (currentRevision) {
			var result = '(';
			result +=
                '<a href="' +
                pg.wiki.titlebase +
                new Title(currentRevision.title).urlString() +
                '&diff=prev' +
                '&oldid=' +
                currentRevision.revid +
                '">' +
                popupString('diff') +
                '</a>';
			result += '&nbsp;|&nbsp;';
			result +=
                '<a href="' +
                pg.wiki.titlebase +
                new Title(currentRevision.title).urlString() +
                '&action=history">' +
                popupString('hist') +
                '</a>';
			result += ')';
			return result;
		};
	} else {
		// It's a regular history page, so make (cur | last) links
		var firstRevid = h[0].revid;
		makeFirstColumnLinks = function (currentRevision) {
			var result = '(';
			result +=
                '<a href="' +
                pg.wiki.titlebase +
                new Title(curart).urlString() +
                '&diff=' +
                firstRevid +
                '&oldid=' +
                currentRevision.revid +
                '">' +
                popupString('cur') +
                '</a>';
			result += '&nbsp;|&nbsp;';
			result +=
                '<a href="' +
                pg.wiki.titlebase +
                new Title(curart).urlString() +
                '&diff=prev&oldid=' +
                currentRevision.revid +
                '">' +
                popupString('last') +
                '</a>';
			result += ')';
			return result;
		};
	}

	for (var i = 0; i < h.length; ++i) {
		if (reallyContribs) {
			page = h[i].title;
			curart = new Title(page);
		}
		var minor = h[i].minor ? '<b>m </b>' : '';
		var editDate = new Date(h[i].timestamp);
		var thisDay = formattedDate(editDate);
		var thisTime = formattedTime(editDate);
		if (thisDay == day) {
			thisDay = '';
		} else {
			day = thisDay;
		}
		if (thisDay) {
			html.push(
				'<tr><td colspan=3><span class="popup_history_date">' + thisDay + '</span></td></tr>'
			);
		}
		html.push('<tr class="popup_history_row_' + (i % 2 ? 'odd' : 'even') + '">');
		html.push('<td>' + makeFirstColumnLinks(h[i]) + '</td>');
		html.push(
			'<td>' +
                '<a href="' +
                pg.wiki.titlebase +
                new Title(curart).urlString() +
                '&oldid=' +
                h[i].revid +
                '">' +
                thisTime +
                '</a></td>'
		);
		var col3url = '',
			col3txt = '';
		if (!reallyContribs) {
			var user = h[i].user;
			if (!h[i].userhidden) {
				if (pg.re.ipUser.test(user)) {
					col3url =
                        pg.wiki.titlebase +
                        mw.config.get('wgFormattedNamespaces')[pg.nsSpecialId] +
                        ':Contributions&target=' +
                        new Title(user).urlString();
				} else {
					col3url =
                        pg.wiki.titlebase +
                        mw.config.get('wgFormattedNamespaces')[pg.nsUserId] +
                        ':' +
                        new Title(user).urlString();
				}
				col3txt = pg.escapeQuotesHTML(user);
			} else {
				col3url = getValueOf('popupRevDelUrl');
				col3txt = pg.escapeQuotesHTML(popupString('revdel'));
			}
		} else {
			col3url = pg.wiki.titlebase + curart.urlString();
			col3txt = pg.escapeQuotesHTML(page);
		}
		html.push(
			'<td>' +
                (reallyContribs ? minor : '') +
                '<a href="' +
                col3url +
                '">' +
                col3txt +
                '</a></td>'
		);
		var comment = '';
		var c = h[i].comment || ( typeof h[i].slots !== 'undefined' ? h[i].slots.main.content : null );
		if (c) {
			comment = new Previewmaker(c, new Title(curart).toUrl()).editSummaryPreview();
		} else if (h[i].commenthidden) {
			comment = popupString('revdel');
		}
		html.push('<td>' + (!reallyContribs ? minor : '') + comment + '</td>');
		html.push('</tr>');
		html = [html.join('')];
	}
	html.push('</table>');
	return html.join('');
}

function adjustDate(d, offset) {
	// offset is in minutes
	var o = offset * 60 * 1000;
	return new Date(Number(d) + o);
}

/**
 * This relies on the Date parser understanding en-US dates,
 * which is pretty safe assumption, but not perfect.
 */
function convertTimeZone(date, timeZone) {
	return new Date(date.toLocaleString('en-US', { timeZone: timeZone }));
}

function formattedDateTime(date) {
	// fallback for IE11 and unknown timezones
	if (useTimeOffset()) {
		return formattedDate(date) + ' ' + formattedTime(date);
	}

	if (getMWDateFormat() === 'ISO 8601') {
		var d2 = convertTimeZone(date, getTimeZone());
		return (
			map(zeroFill, [d2.getFullYear(), d2.getMonth() + 1, d2.getDate()]).join('-') +
            'T' +
            map(zeroFill, [d2.getHours(), d2.getMinutes(), d2.getSeconds()]).join(':')
		);
	}

	var options = getValueOf('popupDateTimeFormatterOptions');
	options.timeZone = getTimeZone();
	return date.toLocaleString(getLocales(), options);
}

function formattedDate(date) {
	// fallback for IE11 and unknown timezones
	if (useTimeOffset()) {
		// we adjust the UTC time, so we print the adjusted UTC, but not really UTC values
		var d2 = adjustDate(date, getTimeOffset());
		return map(zeroFill, [d2.getUTCFullYear(), d2.getUTCMonth() + 1, d2.getUTCDate()]).join('-');
	}

	if (getMWDateFormat() === 'ISO 8601') {
		var d2 = convertTimeZone(date, getTimeZone());
		return map(zeroFill, [d2.getFullYear(), d2.getMonth() + 1, d2.getDate()]).join('-');
	}

	var options = getValueOf('popupDateFormatterOptions');
	options.timeZone = getTimeZone();
	return date.toLocaleDateString(getLocales(), options);
}

function formattedTime(date) {
	// fallback for IE11 and unknown timezones
	if (useTimeOffset()) {
		// we adjust the UTC time, so we print the adjusted UTC, but not really UTC values
		var d2 = adjustDate(date, getTimeOffset());
		return map(zeroFill, [d2.getUTCHours(), d2.getUTCMinutes(), d2.getUTCSeconds()]).join(':');
	}

	if (getMWDateFormat() === 'ISO 8601') {
		var d2 = convertTimeZone(date, getTimeZone());
		return map(zeroFill, [d2.getHours(), d2.getMinutes(), d2.getSeconds()]).join(':');
	}

	var options = getValueOf('popupTimeFormatterOptions');
	options.timeZone = getTimeZone();
	return date.toLocaleTimeString(getLocales(), options);
}

// Get the proper groupnames for the technicalgroups
function fetchUserGroupNames(userinfoResponse) {
	var queryObj = getJsObj(userinfoResponse).query;
	var user = anyChild(queryObj.users);
	var messages = [];
	if (user.groups) {
		user.groups.forEach((groupName) => {
			if (['*', 'user', 'autoconfirmed', 'extendedconfirmed', 'named'].indexOf(groupName) === -1) {
				messages.push('group-' + groupName + '-member');
			}
		});
	}
	if (queryObj.globaluserinfo && queryObj.globaluserinfo.groups) {
		queryObj.globaluserinfo.groups.forEach((groupName) => {
			messages.push('group-' + groupName + '-member');
		});
	}
	return getMwApi().loadMessagesIfMissing(messages);
}

function showAPIPreview(queryType, html, id, navpop, download) {
	// DJ: done
	var target = 'popupPreview';
	completedNavpopTask(navpop);

	switch (queryType) {
		case 'imagelinks':
		case 'category':
			target = 'popupPostPreview';
			break;
		case 'userinfo':
			target = 'popupUserData';
			break;
		case 'revision':
			insertPreview(download);
			return;
	}
	setPopupTipsAndHTML(html, target, id);
}

function APIrevisionPreviewHTML(article, download) {
	try {
		var jsObj = getJsObj(download.data);
		var page = anyChild(jsObj.query.pages);
		if (page.missing) {
			// TODO we need to fix this proper later on
			download.owner = null;
			return;
		}
		var content =
            page && page.revisions && page.revisions[0] &&
            page.revisions[0].slots && page.revisions[0].slots.main &&
            page.revisions[0].slots.main.contentmodel === 'wikitext' ?
            	page.revisions[0].slots.main.content :
            	null;
		if (typeof content === 'string') {
			download.data = content;
			download.lastModified = new Date(page.revisions[0].timestamp);
		}
		if (page.pageprops.wikibase_item) {
			download.wikibaseItem = page.pageprops.wikibase_item;
			download.wikibaseRepo = jsObj.query.wikibase.repo.url.base +
                                    jsObj.query.wikibase.repo.url.articlepath;
		}
	} catch (someError) {
		return 'Revision preview failed :(';
	}
}

function APIbacklinksPreviewHTML(article, download /*, navpop*/) {
	try {
		var jsObj = getJsObj(download.data);
		var list = jsObj.query.backlinks;

		var html = [];
		if (!list) {
			return popupString('No backlinks found');
		}
		for (var i = 0; i < list.length; i++) {
			var t = new Title(list[i].title);
			html.push(
				'<a href="' + pg.wiki.titlebase + t.urlString() + '">' + t.toString().entify() + '</a>'
			);
		}
		html = html.join(', ');
		if (jsObj.continue && jsObj.continue.blcontinue) {
			html += popupString(' and more');
		}
		return html;
	} catch (someError) {
		return 'backlinksPreviewHTML went wonky';
	}
}

pg.fn.APIsharedImagePagePreviewHTML = function APIsharedImagePagePreviewHTML(obj) {
	log('APIsharedImagePagePreviewHTML');
	var popupid = obj.requestid;
	if (obj.query && obj.query.pages) {
		var page = anyChild(obj.query.pages);
		var content =
            page && page.revisions && page.revisions[0] &&
            page.revisions[0].slots && page.revisions[0].slots.main &&
            page.revisions[0].slots.main.contentmodel === 'wikitext' ?
            	page.revisions[0].slots.main.content :
            	null;
		if (
			typeof content === 'string' &&
            pg &&
            pg.current &&
            pg.current.link &&
            pg.current.link.navpopup
		) {
			/* Not entirely safe, but the best we can do */
			var p = new Previewmaker(
				content,
				pg.current.link.navpopup.article,
				pg.current.link.navpopup
			);
			p.makePreview();
			setPopupHTML(p.html, 'popupSecondPreview', popupid);
		}
	}
};

function APIimagepagePreviewHTML(article, download, navpop) {
	try {
		var jsObj = getJsObj(download.data);
		var page = anyChild(jsObj.query.pages);
		var content =
            page && page.revisions && page.revisions[0] &&
            page.revisions[0].slots && page.revisions[0].slots.main &&
            page.revisions[0].slots.main.contentmodel === 'wikitext' ?
            	page.revisions[0].slots.main.content :
            	null;
		var ret = '';
		var alt = '';
		try {
			alt = navpop.parentAnchor.childNodes[0].alt;
		} catch (e) {}
		if (alt) {
			ret = ret + '<hr /><b>' + popupString('Alt text:') + '</b> ' + pg.escapeQuotesHTML(alt);
		}
		if (typeof content === 'string') {
			var p = prepPreviewmaker(content, article, navpop);
			p.makePreview();
			if (p.html) {
				ret += '<hr />' + p.html;
			}
			if (getValueOf('popupSummaryData')) {
				var info = getPageInfo(content, download);
				log(info);
				setPopupTrailer(info, navpop.idNumber);
			}
		}
		if (page && page.imagerepository == 'shared') {
			var art = new Title(article);
			var encart = encodeURIComponent('File:' + art.stripNamespace());
			var shared_url =
                pg.wiki.apicommonsbase +
                '?format=json&formatversion=2' +
                '&callback=pg.fn.APIsharedImagePagePreviewHTML' +
                '&requestid=' +
                navpop.idNumber +
                '&action=query&prop=revisions&rvslots=main&rvprop=content&titles=' +
                encart;

			ret =
                ret +
                '<hr />' +
                popupString('Image from Commons') +
                ': <a href="' +
                pg.wiki.commonsbase +
                '?title=' +
                encart +
                '">' +
                popupString('Description page') +
                '</a>';
			mw.loader.load(shared_url);
		}
		showAPIPreview(
			'imagelinks',
			APIimagelinksPreviewHTML(article, download),
			navpop.idNumber,
			download
		);
		return ret;
	} catch (someError) {
		return 'API imagepage preview failed :(';
	}
}

function APIimagelinksPreviewHTML(article, download) {
	try {
		var jsobj = getJsObj(download.data);
		var list = jsobj.query.imageusage;
		if (list) {
			var ret = [];
			for (var i = 0; i < list.length; i++) {
				ret.push(list[i].title);
			}
			if (ret.length === 0) {
				return popupString('No image links found');
			}
			return '<h2>' + popupString('File links') + '</h2>' + linkList(ret);
		} else {
			return popupString('No image links found');
		}
	} catch (someError) {
		return 'Image links preview generation failed :(';
	}
}

function APIcategoryPreviewHTML(article, download) {
	try {
		var jsobj = getJsObj(download.data);
		var list = jsobj.query.categorymembers;
		var ret = [];
		for (var p = 0; p < list.length; p++) {
			ret.push(list[p].title);
		}
		if (ret.length === 0) {
			return popupString('Empty category');
		}
		ret = '<h2>' + tprintf('Category members (%s shown)', [ret.length]) + '</h2>' + linkList(ret);
		if (jsobj.continue && jsobj.continue.cmcontinue) {
			ret += popupString(' and more');
		}
		return ret;
	} catch (someError) {
		return 'Category preview failed :(';
	}
}

function APIuserInfoPreviewHTML(article, download) {
	var ret = [];
	var queryobj = {};
	try {
		queryobj = getJsObj(download.data).query;
	} catch (someError) {
		return 'Userinfo preview failed :(';
	}

	var user = anyChild(queryobj.users);
	if (user) {
		var globaluserinfo = queryobj.globaluserinfo;
		if (user.invalid === '') {
			ret.push(popupString('Invalid user'));
		} else if (user.missing === '') {
			ret.push(popupString('Not a registered username'));
		}
		if (user.blockedby) {
			if (user.blockpartial) {
				ret.push('<b>' + popupString('Has blocks') + '</b>');
			} else {
				ret.push('<b>' + popupString('BLOCKED') + '</b>');
			}
		}
		if (globaluserinfo && ('locked' in globaluserinfo || 'hidden' in globaluserinfo)) {
			var lockedSulAccountIsAttachedToThis = true;
			for (var i = 0; globaluserinfo.unattached && i < globaluserinfo.unattached.length; i++) {
				if (globaluserinfo.unattached[i].wiki === mw.config.get('wgDBname')) {
					lockedSulAccountIsAttachedToThis = false;
					break;
				}
			}
			if (lockedSulAccountIsAttachedToThis) {
				if ('locked' in globaluserinfo) {
					ret.push('<b><i>' + popupString('LOCKED') + '</i></b>');
				}
				if ('hidden' in globaluserinfo) {
					ret.push('<b><i>' + popupString('HIDDEN') + '</i></b>');
				}
			}
		}
		if (getValueOf('popupShowGender') && user.gender) {
			switch (user.gender) {
				case 'male':
					ret.push(popupString('he/him') + ' · ');
					break;
				case 'female':
					ret.push(popupString('she/her') + ' · ');
					break;
			}
		}
		if (user.groups) {
			user.groups.forEach((groupName) => {
				if (['*', 'user', 'autoconfirmed', 'extendedconfirmed', 'named'].indexOf(groupName) === -1) {
					ret.push(
						pg.escapeQuotesHTML(mw.message('group-' + groupName + '-member', user.gender).text())
					);
				}
			});
		}
		if (globaluserinfo && globaluserinfo.groups) {
			globaluserinfo.groups.forEach((groupName) => {
				ret.push(
					'<i>' +
                        pg.escapeQuotesHTML(
                        	mw.message('group-' + groupName + '-member', user.gender).text()
                        ) +
                        '</i>'
				);
			});
		}
		if (user.registration) {
			ret.push(
				pg.escapeQuotesHTML(
					(user.editcount ? user.editcount : '0') +
                        popupString(' edits since: ') +
                        (user.registration ? formattedDate(new Date(user.registration)) : '')
				)
			);
		}
	}

	if (queryobj.usercontribs && queryobj.usercontribs.length) {
		ret.push(
			popupString('last edit on ') + formattedDate(new Date(queryobj.usercontribs[0].timestamp))
		);
	}

	if (queryobj.blocks) {
		ret.push(popupString('IP user')); //we only request list=blocks for IPs
		for (var l = 0; l < queryobj.blocks.length; l++) {
			var rbstr =
                queryobj.blocks[l].rangestart === queryobj.blocks[l].rangeend ? 'BLOCK' : 'RANGEBLOCK';
			rbstr = !Array.isArray(queryobj.blocks[l].restrictions) ?
				'Has ' + rbstr.toLowerCase() + 's' :
				rbstr + 'ED';
			ret.push('<b>' + popupString(rbstr) + '</b>');
		}
	}

	// if any element of ret ends with ' · ', merge it with the next element to avoid
	// the .join(', ') call inserting a comma after it
	for (var m = 0; m < ret.length - 1; m++) {
		if (ret[m].length > 3 && ret[m].substring(ret[m].length - 3) === ' · ') {
			ret[m] = ret[m] + ret[m + 1];
			ret.splice(m + 1, 1); // delete element at index m+1
			m--;
		}
	}

	ret = '<hr />' + ret.join(', ');
	return ret;
}

function APIcontribsPreviewHTML(article, download, navpop) {
	return APIhistoryPreviewHTML(article, download, navpop, true);
}

function APIhistoryPreviewHTML(article, download, navpop, reallyContribs) {
	try {
		var jsobj = getJsObj(download.data);
		var edits = [];
		if (reallyContribs) {
			edits = jsobj.query.usercontribs;
		} else {
			edits = anyChild(jsobj.query.pages).revisions;
		}

		var ret = editPreviewTable(article, edits, reallyContribs);
		return ret;
	} catch (someError) {
		return popupString('History preview failed');
	}
}
