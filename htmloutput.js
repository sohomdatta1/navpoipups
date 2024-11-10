// this has to use a timer loop as we don't know if the DOM element exists when we want to set the text
function setPopupHTML(str, elementId, popupId, onSuccess, append) {
    if (typeof popupId === 'undefined') {
        //console.error('popupId is not defined in setPopupHTML, html='+str.substring(0,100));
        popupId = pg.idNumber;
    }

    var popupElement = document.getElementById(elementId + popupId);
    if (popupElement) {
        if (!append) {
            popupElement.innerHTML = '';
        }
        if (isString(str)) {
            popupElement.innerHTML += str;
        } else {
            popupElement.appendChild(str);
        }
        if (onSuccess) {
            onSuccess();
        }
        setTimeout(checkPopupPosition, 100);
        return true;
    } else {
        // call this function again in a little while...
        setTimeout(function () {
            setPopupHTML(str, elementId, popupId, onSuccess);
        }, 600);
    }
    return null;
}

function setPopupTrailer(str, id) {
    return setPopupHTML(str, 'popupData', id);
}

// args.navpopup is mandatory
// optional: args.redir, args.redirTarget
// FIXME: ye gods, this is ugly stuff
function fillEmptySpans(args) {
    // if redir is present and true then redirTarget is mandatory
    var redir = true;
    var rcid;
    if (typeof args != 'object' || typeof args.redir == 'undefined' || !args.redir) {
        redir = false;
    }
    var a = args.navpopup.parentAnchor;

    var article,
        hint = null,
        oldid = null,
        params = {};
    if (redir && typeof args.redirTarget == typeof {}) {
        article = args.redirTarget;
        //hint=article.hintValue();
    } else {
        article = new Title().fromAnchor(a);
        hint = a.originalTitle || article.hintValue();
        params = parseParams(a.href);
        oldid = getValueOf('popupHistoricalLinks') ? params.oldid : null;
        rcid = params.rcid;
    }
    var x = {
        article: article,
        hint: hint,
        oldid: oldid,
        rcid: rcid,
        navpop: args.navpopup,
        params: params,
    };

    var structure = pg.structures[getValueOf('popupStructure')];
    if (typeof structure != 'object') {
        setPopupHTML(
            'popupError',
            'Unknown structure (this should never happen): ' + pg.option.popupStructure,
            args.navpopup.idNumber
        );
        return;
    }
    var spans = flatten(pg.misc.layout);
    var numspans = spans.length;
    var redirs = pg.misc.redirSpans;

    for (var i = 0; i < numspans; ++i) {
        var found = redirs && redirs.indexOf(spans[i]) !== -1;
        //log('redir='+redir+', found='+found+', spans[i]='+spans[i]);
        if ((found && !redir) || (!found && redir)) {
            //log('skipping this set of the loop');
            continue;
        }
        var structurefn = structure[spans[i]];
        if (structurefn === undefined) {
            // nothing to do for this structure part
            continue;
        }
        var setfn = setPopupHTML;
        if (
            getValueOf('popupActiveNavlinks') &&
            (spans[i].indexOf('popupTopLinks') === 0 || spans[i].indexOf('popupRedirTopLinks') === 0)
        ) {
            setfn = setPopupTipsAndHTML;
        }
        switch (typeof structurefn) {
            case 'function':
                log(
                    'running ' +
                        spans[i] +
                        '({article:' +
                        x.article +
                        ', hint:' +
                        x.hint +
                        ', oldid: ' +
                        x.oldid +
                        '})'
                );
                setfn(structurefn(x), spans[i], args.navpopup.idNumber);
                break;
            case 'string':
                setfn(structurefn, spans[i], args.navpopup.idNumber);
                break;
            default:
                errlog('unknown thing with label ' + spans[i] + ' (span index was ' + i + ')');
                break;
        }
    }
}

// flatten an array
function flatten(list, start) {
    var ret = [];
    if (typeof start == 'undefined') {
        start = 0;
    }
    for (var i = start; i < list.length; ++i) {
        if (typeof list[i] == typeof []) {
            return ret.concat(flatten(list[i])).concat(flatten(list, i + 1));
        } else {
            ret.push(list[i]);
        }
    }
    return ret;
}

// Generate html for whole popup
function popupHTML(a) {
    getValueOf('popupStructure');
    var structure = pg.structures[pg.option.popupStructure];
    if (typeof structure != 'object') {
        //return 'Unknown structure: '+pg.option.popupStructure;
        // override user choice
        pg.option.popupStructure = pg.optionDefault.popupStructure;
        return popupHTML(a);
    }
    if (typeof structure.popupLayout != 'function') {
        return 'Bad layout';
    }
    pg.misc.layout = structure.popupLayout();
    if (typeof structure.popupRedirSpans === 'function') {
        pg.misc.redirSpans = structure.popupRedirSpans();
    } else {
        pg.misc.redirSpans = [];
    }
    return makeEmptySpans(pg.misc.layout, a.navpopup);
}

function makeEmptySpans(list, navpop) {
    var ret = '';
    for (var i = 0; i < list.length; ++i) {
        if (typeof list[i] == typeof '') {
            ret += emptySpanHTML(list[i], navpop.idNumber, 'div');
        } else if (typeof list[i] == typeof [] && list[i].length > 0) {
            ret = ret.parenSplit(/(<\/[^>]*?>$)/).join(makeEmptySpans(list[i], navpop));
        } else if (typeof list[i] == typeof {} && list[i].nodeType) {
            ret += emptySpanHTML(list[i].name, navpop.idNumber, list[i].nodeType);
        }
    }
    return ret;
}

function emptySpanHTML(name, id, tag, classname) {
    tag = tag || 'span';
    if (!classname) {
        classname = emptySpanHTML.classAliases[name];
    }
    classname = classname || name;
    if (name == getValueOf('popupDragHandle')) {
        classname += ' popupDragHandle';
    }
    return simplePrintf('<%s id="%s" class="%s"></%s>', [tag, name + id, classname, tag]);
}
emptySpanHTML.classAliases = { popupSecondPreview: 'popupPreview' };

// generate html for popup image
// <a id="popupImageLinkn"><img id="popupImagen">
// where n=idNumber
function imageHTML(article, idNumber) {
    return simplePrintf(
        '<a id="popupImageLink$1">' +
            '<img align="right" valign="top" id="popupImg$1" style="display: none;"></img>' +
            '</a>',
        [idNumber]
    );
}

function popTipsSoonFn(id, when, popData) {
    if (!when) {
        when = 250;
    }
    var popTips = function () {
        setupTooltips(document.getElementById(id), false, true, popData);
    };
    return function () {
        setTimeout(popTips, when, popData);
    };
}

function setPopupTipsAndHTML(html, divname, idnumber, popData) {
    setPopupHTML(
        html,
        divname,
        idnumber,
        getValueOf('popupSubpopups') ? popTipsSoonFn(divname + idnumber, null, popData) : null
    );
}