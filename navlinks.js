//////////////////////////////////////////////////
// navlinks... let the fun begin
//

function defaultNavlinkSpec() {
    var str = '';
    str += '<b><<mainlink|shortcut= >></b>';
    if (getValueOf('popupLastEditLink')) {
        str +=
            '*<<lastEdit|shortcut=/>>|<<lastContrib>>|<<sinceMe>>if(oldid){|<<oldEdit>>|<<diffCur>>}';
    }

    // user links
    // contribs - log - count - email - block
    // count only if applicable; block only if popupAdminLinks
    str += 'if(user){<br><<contribs|shortcut=c>>*<<userlog|shortcut=L|log>>';
    str += 'if(ipuser){*<<arin>>}if(wikimedia){*<<count|shortcut=#>>}';
    str +=
        'if(ipuser){}else{*<<email|shortcut=E>>}if(admin){*<<block|shortcut=b>>|<<blocklog|log>>}}';

    // editing links
    // talkpage   -> edit|new - history - un|watch - article|edit
    // other page -> edit - history - un|watch - talk|edit|new
    var editstr = '<<edit|shortcut=e>>';
    var editOldidStr =
        'if(oldid){<<editOld|shortcut=e>>|<<revert|shortcut=v|rv>>|<<edit|cur>>}else{' +
        editstr +
        '}';
    var historystr = '<<history|shortcut=h>>|<<editors|shortcut=E|>>';
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
    str += '<br><<whatLinksHere|shortcut=l>>*<<relatedChanges|shortcut=r>>*<<move|shortcut=m>>';

    // admin links
    str +=
        'if(admin){<br><<unprotect|unprotectShort>>|<<protect|shortcut=p>>|<<protectlog|log>>*' +
        '<<undelete|undeleteShort>>|<<delete|shortcut=d>>|<<deletelog|log>>}';
    return str;
}

function navLinksHTML(article, hint, params) {
    //oldid, rcid) {
    var str = '<span class="popupNavLinks">' + defaultNavlinkSpec() + '</span>';
    // BAM
    return navlinkStringToHTML(str, article, params);
}

function expandConditionalNavlinkString(s, article, z, recursionCount) {
    var oldid = z.oldid,
        rcid = z.rcid,
        diff = z.diff;
    // nested conditionals (up to 10 deep) are ok, hopefully! (work from the inside out)
    if (typeof recursionCount != typeof 0) {
        recursionCount = 0;
    }
    var conditionalSplitRegex = RegExp(
        //(1	 if	\\(	(2	2)	\\)	  {(3	3)}  (4   else	  {(5	 5)}  4)1)
        '(;?\\s*if\\s*\\(\\s*([\\w]*)\\s*\\)\\s*\\{([^{}]*)\\}(\\s*else\\s*\\{([^{}]*?)\\}|))',
        'i'
    );
    var splitted = s.parenSplit(conditionalSplitRegex);
    // $1: whole conditional
    // $2: test condition
    // $3: true expansion
    // $4: else clause (possibly empty)
    // $5: false expansion (possibly null)
    var numParens = 5;
    var ret = splitted[0];
    for (var i = 1; i < splitted.length; i = i + numParens + 1) {
        var testString = splitted[i + 2 - 1];
        var trueString = splitted[i + 3 - 1];
        var falseString = splitted[i + 5 - 1];
        if (typeof falseString == 'undefined' || !falseString) {
            falseString = '';
        }
        var testResult = null;

        switch (testString) {
            case 'user':
                testResult = !!article.userName();
                break;
            case 'talk':
                testResult = !article.talkPage(); // talkPage converts _articles_ to talkPages
                break;
            case 'admin':
                testResult = !!getValueOf('popupAdminLinks');
                break;
            case 'oldid':
                testResult = !!(typeof oldid != 'undefined' && oldid);
                break;
            case 'rcid':
                testResult = !!(typeof rcid != 'undefined' && rcid);
                break;
            case 'ipuser':
                testResult = !!article.isIpUser();
                break;
            case 'mainspace_en':
                testResult = isInMainNamespace(article) && pg.wiki.hostname == 'en.wikipedia.org';
                break;
            case 'wikimedia':
                testResult = !!pg.wiki.wikimedia;
                break;
            case 'diff':
                testResult = !!(typeof diff != 'undefined' && diff);
                break;
        }

        switch (testResult) {
            case null:
                ret += splitted[i];
                break;
            case true:
                ret += trueString;
                break;
            case false:
                ret += falseString;
                break;
        }

        // append non-conditional string
        ret += splitted[i + numParens];
    }
    if (conditionalSplitRegex.test(ret) && recursionCount < 10) {
        return expandConditionalNavlinkString(ret, article, z, recursionCount + 1);
    }
    return ret;
}

function navlinkStringToArray(s, article, params) {
    s = expandConditionalNavlinkString(s, article, params);
    var splitted = s.parenSplit(/<<(.*?)>>/);
    var ret = [];
    for (var i = 0; i < splitted.length; ++i) {
        if (i % 2) {
            // i odd, so s is a tag
            var t = new navlinkTag();
            var ss = splitted[i].split('|');
            t.id = ss[0];
            for (var j = 1; j < ss.length; ++j) {
                var sss = ss[j].split('=');
                if (sss.length > 1) {
                    t[sss[0]] = sss[1];
                } else {
                    // no assignment (no "="), so treat this as a title (overwriting the last one)
                    t.text = popupString(sss[0]);
                }
            }
            t.article = article;
            var oldid = params.oldid,
                rcid = params.rcid,
                diff = params.diff;
            if (typeof oldid !== 'undefined' && oldid !== null) {
                t.oldid = oldid;
            }
            if (typeof rcid !== 'undefined' && rcid !== null) {
                t.rcid = rcid;
            }
            if (typeof diff !== 'undefined' && diff !== null) {
                t.diff = diff;
            }
            if (!t.text && t.id !== 'mainlink') {
                t.text = popupString(t.id);
            }
            ret.push(t);
        } else {
            // plain HTML
            ret.push(splitted[i]);
        }
    }
    return ret;
}

function navlinkSubstituteHTML(s) {
    return s
        .split('*')
        .join(getValueOf('popupNavLinkSeparator'))
        .split('<menurow>')
        .join('<li class="popup_menu_row">')
        .split('</menurow>')
        .join('</li>')
        .split('<menu>')
        .join('<ul class="popup_menu">')
        .split('</menu>')
        .join('</ul>');
}

function navlinkDepth(magic, s) {
    return s.split('<' + magic + '>').length - s.split('</' + magic + '>').length;
}

// navlinkString: * becomes the separator
//				<<foo|bar=baz|fubar>> becomes a foo-link with attribute bar='baz'
//									  and visible text 'fubar'
//				if(test){...} and if(test){...}else{...} work too (nested ok)

function navlinkStringToHTML(s, article, params) {
    //limitAlert(navlinkStringToHTML, 5, 'navlinkStringToHTML\n' + article + '\n' + (typeof article));
    var p = navlinkStringToArray(s, article, params);
    var html = '';
    var menudepth = 0; // nested menus not currently allowed, but doesn't do any harm to code for it
    var menurowdepth = 0;
    for (var i = 0; i < p.length; ++i) {
        if (typeof p[i] == typeof '') {
            html += navlinkSubstituteHTML(p[i]);
            menudepth += navlinkDepth('menu', p[i]);
            menurowdepth += navlinkDepth('menurow', p[i]);
            //			if (menudepth === 0) {
            //				tagType='span';
            //			} else if (menurowdepth === 0) {
            //				tagType='li';
            //			} else {
            //				tagType = null;
            //			}
        } else if (typeof p[i].type != 'undefined' && p[i].type == 'navlinkTag') {
            if (menudepth > 0 && menurowdepth === 0) {
                html += '<li class="popup_menu_item">' + p[i].html() + '</li>';
            } else {
                html += p[i].html();
            }
        }
    }
    return html;
}

function navlinkTag() {
    this.type = 'navlinkTag';
}

navlinkTag.prototype.html = function () {
    this.getNewWin();
    this.getPrintFunction();
    var html = '';
    var opening, closing;
    var tagType = 'span';
    if (!tagType) {
        opening = '';
        closing = '';
    } else {
        opening = '<' + tagType + ' class="popup_' + this.id + '">';
        closing = '</' + tagType + '>';
    }
    if (typeof this.print != 'function') {
        errlog('Oh dear - invalid print function for a navlinkTag, id=' + this.id);
    } else {
        html = this.print(this);
        if (typeof html != typeof '') {
            html = '';
        } else if (typeof this.shortcut != 'undefined') {
            html = addPopupShortcut(html, this.shortcut);
        }
    }
    return opening + html + closing;
};

navlinkTag.prototype.getNewWin = function () {
    getValueOf('popupLinksNewWindow');
    if (typeof pg.option.popupLinksNewWindow[this.id] === 'undefined') {
        this.newWin = null;
    }
    this.newWin = pg.option.popupLinksNewWindow[this.id];
};

navlinkTag.prototype.getPrintFunction = function () {
    //think about this some more
    // this.id and this.article should already be defined
    if (typeof this.id != typeof '' || typeof this.article != typeof {}) {
        return;
    }

    this.noPopup = 1;
    switch (this.id) {
        case 'contribs':
        case 'history':
        case 'whatLinksHere':
        case 'userPage':
        case 'monobook':
        case 'userTalk':
        case 'talk':
        case 'article':
        case 'lastEdit':
            this.noPopup = null;
    }
    switch (this.id) {
        case 'email':
        case 'contribs':
        case 'block':
        case 'unblock':
        case 'userlog':
        case 'userSpace':
        case 'deletedContribs':
            this.article = this.article.userName();
    }

    switch (this.id) {
        case 'userTalk':
        case 'newUserTalk':
        case 'editUserTalk':
        case 'userPage':
        case 'monobook':
        case 'editMonobook':
        case 'blocklog':
            this.article = this.article.userName(true);
        /* fall through */
        case 'pagelog':
        case 'deletelog':
        case 'protectlog':
            delete this.oldid;
    }

    if (this.id == 'editMonobook' || this.id == 'monobook') {
        this.article.append('/monobook.js');
    }

    if (this.id != 'mainlink') {
        // FIXME anchor handling should be done differently with Title object
        this.article = this.article.removeAnchor();
        // if (typeof this.text=='undefined') this.text=popupString(this.id);
    }

    switch (this.id) {
        case 'undelete':
            this.print = specialLink;
            this.specialpage = 'Undelete';
            this.sep = '/';
            break;
        case 'whatLinksHere':
            this.print = specialLink;
            this.specialpage = 'Whatlinkshere';
            break;
        case 'relatedChanges':
            this.print = specialLink;
            this.specialpage = 'Recentchangeslinked';
            break;
        case 'move':
            this.print = specialLink;
            this.specialpage = 'Movepage';
            break;
        case 'contribs':
            this.print = specialLink;
            this.specialpage = 'Contributions';
            break;
        case 'deletedContribs':
            this.print = specialLink;
            this.specialpage = 'Deletedcontributions';
            break;
        case 'email':
            this.print = specialLink;
            this.specialpage = 'EmailUser';
            this.sep = '/';
            break;
        case 'block':
            this.print = specialLink;
            this.specialpage = 'Blockip';
            this.sep = '&ip=';
            break;
        case 'unblock':
            this.print = specialLink;
            this.specialpage = 'Ipblocklist';
            this.sep = '&action=unblock&ip=';
            break;
        case 'userlog':
            this.print = specialLink;
            this.specialpage = 'Log';
            this.sep = '&user=';
            break;
        case 'blocklog':
            this.print = specialLink;
            this.specialpage = 'Log';
            this.sep = '&type=block&page=';
            break;
        case 'pagelog':
            this.print = specialLink;
            this.specialpage = 'Log';
            this.sep = '&page=';
            break;
        case 'protectlog':
            this.print = specialLink;
            this.specialpage = 'Log';
            this.sep = '&type=protect&page=';
            break;
        case 'deletelog':
            this.print = specialLink;
            this.specialpage = 'Log';
            this.sep = '&type=delete&page=';
            break;
        case 'userSpace':
            this.print = specialLink;
            this.specialpage = 'PrefixIndex';
            this.sep = '&namespace=2&prefix=';
            break;
        case 'search':
            this.print = specialLink;
            this.specialpage = 'Search';
            this.sep = '&fulltext=Search&search=';
            break;
        case 'thank':
            this.print = specialLink;
            this.specialpage = 'Thanks';
            this.sep = '/';
            this.article.value = this.diff !== 'prev' ? this.diff : this.oldid;
            break;
        case 'unwatch':
        case 'watch':
            this.print = magicWatchLink;
            this.action =
                this.id +
                '&autowatchlist=1&autoimpl=' +
                popupString('autoedit_version') +
                '&actoken=' +
                autoClickToken();
            break;
        case 'history':
        case 'historyfeed':
        case 'unprotect':
        case 'protect':
            this.print = wikiLink;
            this.action = this.id;
            break;

        case 'delete':
            this.print = wikiLink;
            this.action = 'delete';
            if (this.article.namespaceId() == pg.nsImageId) {
                var img = this.article.stripNamespace();
                this.action += '&image=' + img;
            }
            break;

        case 'markpatrolled':
        case 'edit': // editOld should keep the oldid, but edit should not.
            delete this.oldid;
        /* fall through */
        case 'view':
        case 'purge':
        case 'render':
            this.print = wikiLink;
            this.action = this.id;
            break;
        case 'raw':
            this.print = wikiLink;
            this.action = 'raw';
            break;
        case 'new':
            this.print = wikiLink;
            this.action = 'edit&section=new';
            break;
        case 'mainlink':
            if (typeof this.text == 'undefined') {
                this.text = this.article.toString().entify();
            }
            if (getValueOf('popupSimplifyMainLink') && isInStrippableNamespace(this.article)) {
                // only show the /subpage part of the title text
                var s = this.text.split('/');
                this.text = s[s.length - 1];
                if (this.text === '' && s.length > 1) {
                    this.text = s[s.length - 2];
                }
            }
            this.print = titledWikiLink;
            if (
                typeof this.title === 'undefined' &&
                pg.current.link &&
                typeof pg.current.link.href !== 'undefined'
            ) {
                this.title = safeDecodeURI(
                    pg.current.link.originalTitle ? pg.current.link.originalTitle : this.article
                );
                if (typeof this.oldid !== 'undefined' && this.oldid) {
                    this.title = tprintf('Revision %s of %s', [this.oldid, this.title]);
                }
            }
            this.action = 'view';
            break;
        case 'userPage':
        case 'article':
        case 'monobook':
        case 'editMonobook':
        case 'editArticle':
            delete this.oldid;
            //alert(this.id+'\n'+this.article + '\n'+ typeof this.article);
            this.article = this.article.articleFromTalkOrArticle();
            //alert(this.id+'\n'+this.article + '\n'+ typeof this.article);
            this.print = wikiLink;
            if (this.id.indexOf('edit') === 0) {
                this.action = 'edit';
            } else {
                this.action = 'view';
            }
            break;
        case 'userTalk':
        case 'talk':
            this.article = this.article.talkPage();
            delete this.oldid;
            this.print = wikiLink;
            this.action = 'view';
            break;
        case 'arin':
            this.print = arinLink;
            break;
        case 'count':
            this.print = editCounterLink;
            break;
        case 'google':
            this.print = googleLink;
            break;
        case 'editors':
            this.print = editorListLink;
            break;
        case 'globalsearch':
            this.print = globalSearchLink;
            break;
        case 'lastEdit':
            this.print = titledDiffLink;
            this.title = popupString('Show the last edit');
            this.from = 'prev';
            this.to = 'cur';
            break;
        case 'oldEdit':
            this.print = titledDiffLink;
            this.title = popupString('Show the edit made to get revision') + ' ' + this.oldid;
            this.from = 'prev';
            this.to = this.oldid;
            break;
        case 'editOld':
            this.print = wikiLink;
            this.action = 'edit';
            break;
        case 'undo':
            this.print = wikiLink;
            this.action = 'edit&undo=';
            break;
        case 'revert':
            this.print = wikiLink;
            this.action = 'revert';
            break;
        case 'nullEdit':
            this.print = wikiLink;
            this.action = 'nullEdit';
            break;
        case 'diffCur':
            this.print = titledDiffLink;
            this.title = tprintf('Show changes since revision %s', [this.oldid]);
            this.from = this.oldid;
            this.to = 'cur';
            break;
        case 'editUserTalk':
        case 'editTalk':
            delete this.oldid;
            this.article = this.article.talkPage();
            this.action = 'edit';
            this.print = wikiLink;
            break;
        case 'newUserTalk':
        case 'newTalk':
            this.article = this.article.talkPage();
            this.action = 'edit&section=new';
            this.print = wikiLink;
            break;
        case 'lastContrib':
        case 'sinceMe':
            this.print = magicHistoryLink;
            break;
        case 'togglePreviews':
            this.text = popupString(pg.option.simplePopups ? 'enable previews' : 'disable previews');
        /* fall through */
        case 'disablePopups':
        case 'purgePopups':
            this.print = popupMenuLink;
            break;
        default:
            this.print = function () {
                return 'Unknown navlink type: ' + String(this.id);
            };
    }
};
//
//  end navlinks
//////////////////////////////////////////////////