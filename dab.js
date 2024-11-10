//////////////////////////////////////////////////
// Dab-fixing code
//

function retargetDab(newTarget, oldTarget, friendlyCurrentArticleName, titleToEdit) {
    log('retargetDab: newTarget=' + newTarget + ' oldTarget=' + oldTarget);
    return changeLinkTargetLink({
        newTarget: newTarget,
        text: newTarget.split(' ').join('&nbsp;'),
        hint: tprintf('disambigHint', [newTarget]),
        summary: simplePrintf(getValueOf('popupFixDabsSummary'), [
            friendlyCurrentArticleName,
            newTarget,
        ]),
        clickButton: getValueOf('popupDabsAutoClick'),
        minor: true,
        oldTarget: oldTarget,
        watch: getValueOf('popupWatchDisambiggedPages'),
        title: titleToEdit,
    });
}

function listLinks(wikitext, oldTarget, titleToEdit) {
    // mediawiki strips trailing spaces, so we do the same
    // testcase: https://en.wikipedia.org/w/index.php?title=Radial&oldid=97365633
    var reg = /\[\[([^|]*?) *(\||\]\])/gi;
    var ret = [];
    var splitted = wikitext.parenSplit(reg);
    // ^[a-z]+ should match interwiki links, hopefully (case-insensitive)
    // and ^[a-z]* should match those and [[:Category...]] style links too
    var omitRegex = /^[a-z]*:|^[Ss]pecial:|^[Ii]mage|^[Cc]ategory/;
    var friendlyCurrentArticleName = oldTarget.toString();
    var wikPos = getValueOf('popupDabWiktionary');

    for (var i = 1; i < splitted.length; i = i + 3) {
        if (
            typeof splitted[i] == typeof 'string' &&
            splitted[i].length > 0 &&
            !omitRegex.test(splitted[i])
        ) {
            ret.push(retargetDab(splitted[i], oldTarget, friendlyCurrentArticleName, titleToEdit));
        } /* if */
    } /* for loop */

    ret = rmDupesFromSortedList(ret.sort());

    if (wikPos) {
        var wikTarget =
            'wiktionary:' +
            friendlyCurrentArticleName.replace(/^(.+)\s+[(][^)]+[)]\s*$/, '$1');

        var meth;
        if (wikPos.toLowerCase() == 'first') {
            meth = 'unshift';
        } else {
            meth = 'push';
        }

        ret[meth](retargetDab(wikTarget, oldTarget, friendlyCurrentArticleName, titleToEdit));
    }

    ret.push(
        changeLinkTargetLink({
            newTarget: null,
            text: popupString('remove this link').split(' ').join('&nbsp;'),
            hint: popupString('remove all links to this disambig page from this article'),
            clickButton: getValueOf('popupDabsAutoClick'),
            oldTarget: oldTarget,
            summary: simplePrintf(getValueOf('popupRmDabLinkSummary'), [friendlyCurrentArticleName]),
            watch: getValueOf('popupWatchDisambiggedPages'),
            title: titleToEdit,
        })
    );
    return ret;
}

function rmDupesFromSortedList(list) {
    var ret = [];
    for (var i = 0; i < list.length; ++i) {
        if (ret.length === 0 || list[i] != ret[ret.length - 1]) {
            ret.push(list[i]);
        }
    }
    return ret;
}

function makeFixDab(data, navpop) {
    // grab title from parent popup if there is one; default exists in changeLinkTargetLink
    var titleToEdit = navpop.parentPopup && navpop.parentPopup.article.toString();
    var list = listLinks(data, navpop.originalArticle, titleToEdit);
    if (list.length === 0) {
        log('listLinks returned empty list');
        return null;
    }
    var html = '<hr />' + popupString('Click to disambiguate this link to:') + '<br>';
    html += list.join(', ');
    return html;
}

function makeFixDabs(wikiText, navpop) {
    if (
        getValueOf('popupFixDabs') &&
        isDisambig(wikiText, navpop.article) &&
        Title.fromURL(location.href).namespaceId() != pg.nsSpecialId &&
        navpop.article.talkPage()
    ) {
        setPopupHTML(makeFixDab(wikiText, navpop), 'popupFixDab', navpop.idNumber);
    }
}

function popupRedlinkHTML(article) {
    return changeLinkTargetLink({
        newTarget: null,
        text: popupString('remove this link').split(' ').join('&nbsp;'),
        hint: popupString('remove all links to this page from this article'),
        clickButton: getValueOf('popupRedlinkAutoClick'),
        oldTarget: article.toString(),
        summary: simplePrintf(getValueOf('popupRedlinkSummary'), [article.toString()]),
    });
}