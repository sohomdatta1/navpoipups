function getEditboxSelection() {
    // see http://www.webgurusforum.com/8/12/0
    var editbox;
    try {
        editbox = document.editform.wpTextbox1;
    } catch (dang) {
        return;
    }
    // IE, Opera
    if (document.selection) {
        return document.selection.createRange().text;
    }
    // Mozilla
    var selStart = editbox.selectionStart;
    var selEnd = editbox.selectionEnd;
    return editbox.value.substring(selStart, selEnd);
}

function doSelectionPopup() {
    // popup if the selection looks like [[foo|anything afterwards at all
    // or [[foo|bar]]text without ']]'
    // or [[foo|bar]]
    var sel = getEditboxSelection();
    var open = sel.indexOf('[[');
    var pipe = sel.indexOf('|');
    var close = sel.indexOf(']]');
    if (open == -1 || (pipe == -1 && close == -1)) {
        return;
    }
    if ((pipe != -1 && open > pipe) || (close != -1 && open > close)) {
        return;
    }
    var article = new Title(sel.substring(open + 2, pipe < 0 ? close : pipe));
    if (getValueOf('popupOnEditSelection') == 'boxpreview') {
        return doSeparateSelectionPopup(sel, article);
    }
    if (close > 0 && sel.substring(close + 2).indexOf('[[') >= 0) {
        return;
    }
    var a = document.createElement('a');
    a.href = pg.wiki.titlebase + article.urlString();
    mouseOverWikiLink2(a);
    if (a.navpopup) {
        a.navpopup.addHook(
            function () {
                runStopPopupTimer(a.navpopup);
            },
            'unhide',
            'after'
        );
    }
}

function doSeparateSelectionPopup(str, article) {
    var div = document.getElementById('selectionPreview');
    if (!div) {
        div = document.createElement('div');
        div.id = 'selectionPreview';
        try {
            var box = document.editform.wpTextbox1;
            box.parentNode.insertBefore(div, box);
        } catch (error) {
            return;
        }
    }
    var p = prepPreviewmaker(str, article, newNavpopup(document.createElement('a'), article));
    p.makePreview();
    if (p.html) {
        div.innerHTML = p.html;
    }
    div.ranSetupTooltipsAlready = false;
    popTipsSoonFn('selectionPreview')();
}