function popupHandleKeypress(evt) {
    var keyCode = window.event ? window.event.keyCode : evt.keyCode ? evt.keyCode : evt.which;
    if (!keyCode || !pg.current.link || !pg.current.link.navpopup) {
        return;
    }
    if (keyCode == 27) {
        // escape
        killPopup();
        return false; // swallow keypress
    }

    var letter = String.fromCharCode(keyCode);
    var links = pg.current.link.navpopup.mainDiv.getElementsByTagName('A');
    var startLink = 0;
    var i, j;

    if (popupHandleKeypress.lastPopupLinkSelected) {
        for (i = 0; i < links.length; ++i) {
            if (links[i] == popupHandleKeypress.lastPopupLinkSelected) {
                startLink = i;
            }
        }
    }
    for (j = 0; j < links.length; ++j) {
        i = (startLink + j + 1) % links.length;
        if (links[i].getAttribute('popupkey') == letter) {
            if (evt && evt.preventDefault) {
                evt.preventDefault();
            }
            links[i].focus();
            popupHandleKeypress.lastPopupLinkSelected = links[i];
            return false; // swallow keypress
        }
    }

    // pass keypress on
    if (document.oldPopupOnkeypress) {
        return document.oldPopupOnkeypress(evt);
    }
    return true;
}

function addPopupShortcuts() {
    if (document.onkeypress != popupHandleKeypress) {
        document.oldPopupOnkeypress = document.onkeypress;
    }
    document.onkeypress = popupHandleKeypress;
}

function rmPopupShortcuts() {
    popupHandleKeypress.lastPopupLinkSelected = null;
    try {
        if (document.oldPopupOnkeypress && document.oldPopupOnkeypress == popupHandleKeypress) {
            // panic
            document.onkeypress = null; //function () {};
            return;
        }
        document.onkeypress = document.oldPopupOnkeypress;
    } catch (nasties) {
        /* IE goes here */
    }
}

function addLinkProperty(html, property) {
    // take "<a href=...>...</a> and add a property
    // not sophisticated at all, easily broken
    var i = html.indexOf('>');
    if (i < 0) {
        return html;
    }
    return html.substring(0, i) + ' ' + property + html.substring(i);
}

function addPopupShortcut(html, key) {
    if (!getValueOf('popupShortcutKeys')) {
        return html;
    }
    var ret = addLinkProperty(html, 'popupkey="' + key + '"');
    if (key == ' ') {
        key = popupString('spacebar');
    }
    return ret.replace(/^(.*?)(title=")(.*?)(".*)$/i, '$1$2$3 [' + key + ']$4');
}