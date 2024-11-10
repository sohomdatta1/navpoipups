pg.structures.original = {};
pg.structures.original.popupLayout = function () {
	return [
		'popupError',
		'popupImage',
		'popupTopLinks',
		'popupTitle',
		'popupUserData',
		'popupData',
		'popupOtherLinks',
		'popupRedir',
		[
			'popupWarnRedir',
			'popupRedirTopLinks',
			'popupRedirTitle',
			'popupRedirData',
			'popupRedirOtherLinks'
		],
		'popupMiscTools',
		['popupRedlink'],
		'popupPrePreviewSep',
		'popupPreview',
		'popupSecondPreview',
		'popupPreviewMore',
		'popupPostPreview',
		'popupFixDab'
	];
};
pg.structures.original.popupRedirSpans = function () {
	return [
		'popupRedir',
		'popupWarnRedir',
		'popupRedirTopLinks',
		'popupRedirTitle',
		'popupRedirData',
		'popupRedirOtherLinks'
	];
};
pg.structures.original.popupTitle = function (x) {
	log('defaultstructure.popupTitle');
	if (!getValueOf('popupNavLinks')) {
		return navlinkStringToHTML('<b><<mainlink>></b>', x.article, x.params);
	}
	return '';
};
pg.structures.original.popupTopLinks = function (x) {
	log('defaultstructure.popupTopLinks');
	if (getValueOf('popupNavLinks')) {
		return navLinksHTML(x.article, x.hint, x.params);
	}
	return '';
};
pg.structures.original.popupImage = function (x) {
	log('original.popupImage, x.article=' + x.article + ', x.navpop.idNumber=' + x.navpop.idNumber);
	return imageHTML(x.article, x.navpop.idNumber);
};
pg.structures.original.popupRedirTitle = pg.structures.original.popupTitle;
pg.structures.original.popupRedirTopLinks = pg.structures.original.popupTopLinks;

function copyStructure(oldStructure, newStructure) {
	pg.structures[newStructure] = {};
	for (var prop in pg.structures[oldStructure]) {
		pg.structures[newStructure][prop] = pg.structures[oldStructure][prop];
	}
}

copyStructure('original', 'nostalgia');
pg.structures.nostalgia.popupTopLinks = function (x) {
	var str = '';
	str += '<b><<mainlink|shortcut= >></b>';

	// user links
	// contribs - log - count - email - block
	// count only if applicable; block only if popupAdminLinks
	str += 'if(user){<br><<contribs|shortcut=c>>';
	str += 'if(wikimedia){*<<count|shortcut=#>>}';
	str += 'if(ipuser){}else{*<<email|shortcut=E>>}if(admin){*<<block|shortcut=b>>}}';

	// editing links
	// talkpage   -> edit|new - history - un|watch - article|edit
	// other page -> edit - history - un|watch - talk|edit|new
	var editstr = '<<edit|shortcut=e>>';
	var editOldidStr =
        'if(oldid){<<editOld|shortcut=e>>|<<revert|shortcut=v|rv>>|<<edit|cur>>}else{' +
        editstr +
        '}';
	var historystr = '<<history|shortcut=h>>';
	var watchstr = '<<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>>';

	str +=
        '<br>if(talk){' +
        editOldidStr +
        '|<<new|shortcut=+>>' +
        '*' +
        historystr +
        '*' +
        watchstr +
        '*' +
        '<b><<article|shortcut=a>></b>|<<editArticle|edit>>' +
        '}else{' + // not a talk page
        editOldidStr +
        '*' +
        historystr +
        '*' +
        watchstr +
        '*' +
        '<b><<talk|shortcut=t>></b>|<<editTalk|edit>>|<<newTalk|shortcut=+|new>>}';

	// misc links
	str += '<br><<whatLinksHere|shortcut=l>>*<<relatedChanges|shortcut=r>>';
	str += 'if(admin){<br>}else{*}<<move|shortcut=m>>';

	// admin links
	str +=
        'if(admin){*<<unprotect|unprotectShort>>|<<protect|shortcut=p>>*' +
        '<<undelete|undeleteShort>>|<<delete|shortcut=d>>}';
	return navlinkStringToHTML(str, x.article, x.params);
};
pg.structures.nostalgia.popupRedirTopLinks = pg.structures.nostalgia.popupTopLinks;

/** -- fancy -- **/
copyStructure('original', 'fancy');
pg.structures.fancy.popupTitle = function (x) {
	return navlinkStringToHTML('<font size=+0><<mainlink>></font>', x.article, x.params);
};
pg.structures.fancy.popupTopLinks = function (x) {
	var hist =
        '<<history|shortcut=h|hist>>|<<lastEdit|shortcut=/|last>>|<<editors|shortcut=E|eds>>';
	var watch = '<<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>>';
	var move = '<<move|shortcut=m|move>>';
	return navlinkStringToHTML(
		'if(talk){' +
            '<<edit|shortcut=e>>|<<new|shortcut=+|+>>*' +
            hist +
            '*' +
            '<<article|shortcut=a>>|<<editArticle|edit>>' +
            '*' +
            watch +
            '*' +
            move +
            '}else{<<edit|shortcut=e>>*' +
            hist +
            '*<<talk|shortcut=t|>>|<<editTalk|edit>>|<<newTalk|shortcut=+|new>>' +
            '*' +
            watch +
            '*' +
            move +
            '}<br>',
		x.article,
		x.params
	);
};
pg.structures.fancy.popupOtherLinks = function (x) {
	var admin =
        '<<unprotect|unprotectShort>>|<<protect|shortcut=p>>*<<undelete|undeleteShort>>|<<delete|shortcut=d|del>>';
	var user = '<<contribs|shortcut=c>>if(wikimedia){|<<count|shortcut=#|#>>}';
	user +=
        'if(ipuser){|<<arin>>}else{*<<email|shortcut=E|' +
        popupString('email') +
        '>>}if(admin){*<<block|shortcut=b>>}';

	var normal = '<<whatLinksHere|shortcut=l|links here>>*<<relatedChanges|shortcut=r|related>>';
	return navlinkStringToHTML(
		'<br>if(user){' + user + '*}if(admin){' + admin + 'if(user){<br>}else{*}}' + normal,
		x.article,
		x.params
	);
};
pg.structures.fancy.popupRedirTitle = pg.structures.fancy.popupTitle;
pg.structures.fancy.popupRedirTopLinks = pg.structures.fancy.popupTopLinks;
pg.structures.fancy.popupRedirOtherLinks = pg.structures.fancy.popupOtherLinks;

/** -- fancy2 -- **/
// hack for [[User:MacGyverMagic]]
copyStructure('fancy', 'fancy2');
pg.structures.fancy2.popupTopLinks = function (x) {
	// hack out the <br> at the end and put one at the beginning
	return '<br>' + pg.structures.fancy.popupTopLinks(x).replace(/<br>$/i, '');
};
pg.structures.fancy2.popupLayout = function () {
	// move toplinks to after the title
	return [
		'popupError',
		'popupImage',
		'popupTitle',
		'popupUserData',
		'popupData',
		'popupTopLinks',
		'popupOtherLinks',
		'popupRedir',
		[
			'popupWarnRedir',
			'popupRedirTopLinks',
			'popupRedirTitle',
			'popupRedirData',
			'popupRedirOtherLinks'
		],
		'popupMiscTools',
		['popupRedlink'],
		'popupPrePreviewSep',
		'popupPreview',
		'popupSecondPreview',
		'popupPreviewMore',
		'popupPostPreview',
		'popupFixDab'
	];
};

/** -- menus -- **/
copyStructure('original', 'menus');
pg.structures.menus.popupLayout = function () {
	return [
		'popupError',
		'popupImage',
		'popupTopLinks',
		'popupTitle',
		'popupOtherLinks',
		'popupRedir',
		[
			'popupWarnRedir',
			'popupRedirTopLinks',
			'popupRedirTitle',
			'popupRedirData',
			'popupRedirOtherLinks'
		],
		'popupUserData',
		'popupData',
		'popupMiscTools',
		['popupRedlink'],
		'popupPrePreviewSep',
		'popupPreview',
		'popupSecondPreview',
		'popupPreviewMore',
		'popupPostPreview',
		'popupFixDab'
	];
};

pg.structures.menus.popupTopLinks = function (x, shorter) {
	// FIXME maybe this stuff should be cached
	var s = [];
	var dropclass = 'popup_drop';
	var enddiv = '</div>';
	var hist = '<<history|shortcut=h>>';
	if (!shorter) {
		hist = '<menurow>' + hist + '|<<historyfeed|rss>>|<<editors|shortcut=E>></menurow>';
	}
	var lastedit = '<<lastEdit|shortcut=/|show last edit>>';
	var thank = 'if(diff){<<thank|send thanks>>}';
	var jsHistory = '<<lastContrib|last set of edits>><<sinceMe|changes since mine>>';
	var linkshere = '<<whatLinksHere|shortcut=l|what links here>>';
	var related = '<<relatedChanges|shortcut=r|related changes>>';
	var search =
        '<menurow><<search|shortcut=s>>if(wikimedia){|<<globalsearch|shortcut=g|global>>}' +
        '|<<google|shortcut=G|web>></menurow>';
	var watch = '<menurow><<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>></menurow>';
	var protect =
        '<menurow><<unprotect|unprotectShort>>|' +
        '<<protect|shortcut=p>>|<<protectlog|log>></menurow>';
	var del =
        '<menurow><<undelete|undeleteShort>>|<<delete|shortcut=d>>|<<deletelog|log>></menurow>';
	var move = '<<move|shortcut=m|move page>>';
	var nullPurge = '<menurow><<nullEdit|shortcut=n|null edit>>|<<purge|shortcut=P>></menurow>';
	var viewOptions = '<menurow><<view|shortcut=v>>|<<render|shortcut=S>>|<<raw>></menurow>';
	var editRow =
        'if(oldid){' +
        '<menurow><<edit|shortcut=e>>|<<editOld|shortcut=e|this&nbsp;revision>></menurow>' +
        '<menurow><<revert|shortcut=v>>|<<undo>></menurow>' +
        '}else{<<edit|shortcut=e>>}';
	var markPatrolled = 'if(rcid){<<markpatrolled|mark patrolled>>}';
	var newTopic = 'if(talk){<<new|shortcut=+|new topic>>}';
	var protectDelete = 'if(admin){' + protect + del + '}';

	if (getValueOf('popupActionsMenu')) {
		s.push('<<mainlink>>*' + menuTitle(dropclass, 'actions'));
	} else {
		s.push('<div class="' + dropclass + '"><<mainlink>>');
	}
	s.push('<menu>');
	s.push(editRow + markPatrolled + newTopic + hist + lastedit + thank);
	if (!shorter) {
		s.push(jsHistory);
	}
	s.push(move + linkshere + related);
	if (!shorter) {
		s.push(nullPurge + search);
	}
	if (!shorter) {
		s.push(viewOptions);
	}
	s.push('<hr />' + watch + protectDelete);
	s.push(
		'<hr />' +
            'if(talk){<<article|shortcut=a|view article>><<editArticle|edit article>>}' +
            'else{<<talk|shortcut=t|talk page>><<editTalk|edit talk>>' +
            '<<newTalk|shortcut=+|new topic>>}</menu>' +
            enddiv
	);

	// user menu starts here
	var email = '<<email|shortcut=E|email user>>';
	var contribs =
        'if(wikimedia){<menurow>}<<contribs|shortcut=c|contributions>>if(wikimedia){</menurow>}' +
        'if(admin){<menurow><<deletedContribs>></menurow>}';

	s.push('if(user){*' + menuTitle(dropclass, 'user'));
	s.push('<menu>');
	s.push('<menurow><<userPage|shortcut=u|user&nbsp;page>>|<<userSpace|space>></menurow>');
	s.push(
		'<<userTalk|shortcut=t|user talk>><<editUserTalk|edit user talk>>' +
            '<<newUserTalk|shortcut=+|leave comment>>'
	);
	if (!shorter) {
		s.push('if(ipuser){<<arin>>}else{' + email + '}');
	} else {
		s.push('if(ipuser){}else{' + email + '}');
	}
	s.push('<hr />' + contribs + '<<userlog|shortcut=L|user log>>');
	s.push('if(wikimedia){<<count|shortcut=#|edit counter>>}');
	s.push(
		'if(admin){<menurow><<unblock|unblockShort>>|<<block|shortcut=b|block user>></menurow>}'
	);
	s.push('<<blocklog|shortcut=B|block log>>');
	s.push('</menu>' + enddiv + '}');

	// popups menu starts here
	if (getValueOf('popupSetupMenu') && !x.navpop.hasPopupMenu /* FIXME: hack */) {
		x.navpop.hasPopupMenu = true;
		s.push('*' + menuTitle(dropclass, 'popupsMenu') + '<menu>');
		s.push('<<togglePreviews|toggle previews>>');
		s.push('<<purgePopups|reset>>');
		s.push('<<disablePopups|disable>>');
		s.push('</menu>' + enddiv);
	}
	return navlinkStringToHTML(s.join(''), x.article, x.params);
};

function menuTitle(dropclass, s) {
	var text = popupString(s); // i18n
	var len = text.length;
	return '<div class="' + dropclass + '" style="--navpop-m-len:' + len + 'ch"><a href="#" noPopup=1>' + text + '</a>';
}

pg.structures.menus.popupRedirTitle = pg.structures.menus.popupTitle;
pg.structures.menus.popupRedirTopLinks = pg.structures.menus.popupTopLinks;

copyStructure('menus', 'shortmenus');
pg.structures.shortmenus.popupTopLinks = function (x) {
	return pg.structures.menus.popupTopLinks(x, true);
};
pg.structures.shortmenus.popupRedirTopLinks = pg.structures.shortmenus.popupTopLinks;

pg.structures.lite = {};
pg.structures.lite.popupLayout = function () {
	return ['popupTitle', 'popupPreview'];
};
pg.structures.lite.popupTitle = function (x) {
	log(x.article + ': structures.lite.popupTitle');
	//return navlinkStringToHTML('<b><<mainlink>></b>',x.article,x.params);
	return '<div><span class="popup_mainlink"><b>' + x.article.toString() + '</b></span></div>';
};
