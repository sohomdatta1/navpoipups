// load image of type Title.
function loadImage(image, navpop) {
    if (typeof image.stripNamespace != 'function') {
        alert('loadImages bad');
    }
    // API call to retrieve image info.

    if (!getValueOf('popupImages')) {
        return;
    }
    if (!isValidImageName(image)) {
        return false;
    }

    var art = image.urlString();

    var url = pg.wiki.apiwikibase + '?format=json&formatversion=2&action=query';
    url += '&prop=imageinfo&iiprop=url|mime&iiurlwidth=' + getValueOf('popupImageSizeLarge');
    url += '&titles=' + art;

    pendingNavpopTask(navpop);
    var callback = function (d) {
        popupsInsertImage(navpop.idNumber, navpop, d);
    };
    var go = function () {
        getPageWithCaching(url, callback, navpop);
        return true;
    };
    if (navpop.visible || !getValueOf('popupLazyDownloads')) {
        go();
    } else {
        navpop.addHook(go, 'unhide', 'after', 'DOWNLOAD_IMAGE_QUERY_DATA');
    }
}

function popupsInsertImage(id, navpop, download) {
    log('popupsInsertImage');
    var imageinfo;
    try {
        var jsObj = getJsObj(download.data);
        var imagepage = anyChild(jsObj.query.pages);
        if (typeof imagepage.imageinfo === 'undefined') {
            return;
        }
        imageinfo = imagepage.imageinfo[0];
    } catch (someError) {
        log('popupsInsertImage failed :(');
        return;
    }

    var popupImage = document.getElementById('popupImg' + id);
    if (!popupImage) {
        log('could not find insertion point for image');
        return;
    }

    popupImage.width = getValueOf('popupImageSize');
    popupImage.style.display = 'inline';

    // Set the source for the image.
    if (imageinfo.thumburl) {
        popupImage.src = imageinfo.thumburl;
    } else if (imageinfo.mime.indexOf('image') === 0) {
        popupImage.src = imageinfo.url;
        log('a thumb could not be found, using original image');
    } else {
        log("fullsize imagethumb, but not sure if it's an image");
    }

    var a = document.getElementById('popupImageLink' + id);
    if (a === null) {
        return null;
    }

    // Determine the action of the surrouding imagelink.
    switch (getValueOf('popupThumbAction')) {
        case 'imagepage':
            if (pg.current.article.namespaceId() != pg.nsImageId) {
                a.href = imageinfo.descriptionurl;
                // FIXME: unreliable pg.idNumber
                popTipsSoonFn('popupImage' + id)();
                break;
            }
        /* falls through */
        case 'sizetoggle':
            a.onclick = toggleSize;
            a.title = popupString('Toggle image size');
            return;
        case 'linkfull':
            a.href = imageinfo.url;
            a.title = popupString('Open full-size image');
            return;
    }
}

// Toggles the image between inline small and navpop fullwidth.
// It's the same image, no actual sizechange occurs, only display width.
function toggleSize() {
    var imgContainer = this;
    if (!imgContainer) {
        alert('imgContainer is null :/');
        return;
    }
    var img = imgContainer.firstChild;
    if (!img) {
        alert('img is null :/');
        return;
    }

    if (!img.style.width || img.style.width === '') {
        img.style.width = '100%';
    } else {
        img.style.width = '';
    }
}

// Returns one title of an image from wikiText.
function getValidImageFromWikiText(wikiText) {
    // nb in pg.re.image we're interested in the second bracketed expression
    // this may change if the regex changes :-(
    //var match=pg.re.image.exec(wikiText);
    var matched = null;
    var match;
    // strip html comments, used by evil bots :-(
    var t = removeMatchesUnless(
        wikiText,
        /(<!--[\s\S]*?-->)/,
        1,
        /^<!--[^[]*popup/i
    );

    while ((match = pg.re.image.exec(t))) {
        // now find a sane image name - exclude templates by seeking {
        var m = match[2] || match[6];
        if (isValidImageName(m)) {
            matched = m;
            break;
        }
    }
    pg.re.image.lastIndex = 0;
    if (!matched) {
        return null;
    }
    return mw.config.get('wgFormattedNamespaces')[pg.nsImageId] + ':' + upcaseFirst(matched);
}

function removeMatchesUnless(str, re1, parencount, re2) {
    var split = str.parenSplit(re1);
    var c = parencount + 1;
    for (var i = 0; i < split.length; ++i) {
        if (i % c === 0 || re2.test(split[i])) {
            continue;
        }
        split[i] = '';
    }
    return split.join('');
}