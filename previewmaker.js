/**
 * @file
 * Defines the {@link Previewmaker} object, which generates short previews from wiki markup.
 */

/**
 * Creates a new Previewmaker
 * @constructor
 * @class The Previewmaker class. Use an instance of this to generate short previews from Wikitext.
 * @param {string} wikiText The Wikitext source of the page we wish to preview.
 * @param {string} baseUrl The url we should prepend when creating relative urls.
 * @param {Navpopup} owner The navpop associated to this preview generator
 */
function Previewmaker(wikiText, baseUrl, owner) {
    /** The wikitext which is manipulated to generate the preview. */
    this.originalData = wikiText;
    this.baseUrl = baseUrl;
    this.owner = owner;

    this.maxCharacters = getValueOf('popupMaxPreviewCharacters');
    this.maxSentences = getValueOf('popupMaxPreviewSentences');

    this.setData();
}

Previewmaker.prototype.setData = function () {
    var maxSize = Math.max(10000, 2 * this.maxCharacters);
    this.data = this.originalData.substring(0, maxSize);
};

/**
 * Remove HTML comments
 * @private
 */
Previewmaker.prototype.killComments = function () {
    // this also kills one trailing newline, eg [[diamyo]]
    this.data = this.data.replace(
        /^<!--[^$]*?-->\n|\n<!--[^$]*?-->(?=\n)|<!--[^$]*?-->/g,
        ''
    );
};

/**
 * @private
 */
Previewmaker.prototype.killDivs = function () {
    // say goodbye, divs (can be nested, so use * not *?)
    this.data = this.data.replace(/< *div[^>]* *>[\s\S]*?< *\/ *div *>/gi, '');
};

/**
 * @private
 */
Previewmaker.prototype.killGalleries = function () {
    this.data = this.data.replace(/< *gallery[^>]* *>[\s\S]*?< *\/ *gallery *>/gi, '');
};

/**
 * @private
 */
Previewmaker.prototype.kill = function (opening, closing, subopening, subclosing, repl) {
    var oldk = this.data;
    var k = this.killStuff(this.data, opening, closing, subopening, subclosing, repl);
    while (k.length < oldk.length) {
        oldk = k;
        k = this.killStuff(k, opening, closing, subopening, subclosing, repl);
    }
    this.data = k;
};

/**
 * @private
 */
Previewmaker.prototype.killStuff = function (
    txt,
    opening,
    closing,
    subopening,
    subclosing,
    repl
) {
    var op = this.makeRegexp(opening);
    var cl = this.makeRegexp(closing, '^');
    var sb = subopening ? this.makeRegexp(subopening, '^') : null;
    var sc = subclosing ? this.makeRegexp(subclosing, '^') : cl;
    if (!op || !cl) {
        alert('Navigation Popups error: op or cl is null! something is wrong.');
        return;
    }
    if (!op.test(txt)) {
        return txt;
    }
    var ret = '';
    var opResult = op.exec(txt);
    ret = txt.substring(0, opResult.index);
    txt = txt.substring(opResult.index + opResult[0].length);
    var depth = 1;
    while (txt.length > 0) {
        var removal = 0;
        if (depth == 1 && cl.test(txt)) {
            depth--;
            removal = cl.exec(txt)[0].length;
        } else if (depth > 1 && sc.test(txt)) {
            depth--;
            removal = sc.exec(txt)[0].length;
        } else if (sb && sb.test(txt)) {
            depth++;
            removal = sb.exec(txt)[0].length;
        }
        if (!removal) {
            removal = 1;
        }
        txt = txt.substring(removal);
        if (depth === 0) {
            break;
        }
    }
    return ret + (repl || '') + txt;
};

/**
 * @private
 */
Previewmaker.prototype.makeRegexp = function (x, prefix, suffix) {
    prefix = prefix || '';
    suffix = suffix || '';
    var reStr = '';
    var flags = '';
    if (isString(x)) {
        reStr = prefix + literalizeRegex(x) + suffix;
    } else if (isRegExp(x)) {
        var s = x.toString().substring(1);
        var sp = s.split('/');
        flags = sp[sp.length - 1];
        sp[sp.length - 1] = '';
        s = sp.join('/');
        s = s.substring(0, s.length - 1);
        reStr = prefix + s + suffix;
    } else {
        log('makeRegexp failed');
    }

    log('makeRegexp: got reStr=' + reStr + ', flags=' + flags);
    return RegExp(reStr, flags);
};

/**
 * @private
 */
Previewmaker.prototype.killBoxTemplates = function () {
    // taxobox removal... in fact, there's a saudiprincebox_begin, so let's be more general
    // also, have float_begin, ... float_end
    this.kill(/[{][{][^{}\s|]*?(float|box)[_ ](begin|start)/i, /[}][}]\s*/, '{{');

    // infoboxes etc
    // from [[User:Zyxw/popups.js]]: kill frames too
    this.kill(/[{][{][^{}\s|]*?(infobox|elementbox|frame)[_ ]/i, /[}][}]\s*/, '{{');
};

/**
 * @private
 */
Previewmaker.prototype.killTemplates = function () {
    this.kill('{{', '}}', '{', '}', ' ');
};

/**
 * @private
 */
Previewmaker.prototype.killTables = function () {
    // tables are bad, too
    // this can be slow, but it's an inprovement over a browser hang
    // torture test: [[Comparison_of_Intel_Central_Processing_Units]]
    this.kill('{|', /[|]}\s*/, '{|');
    this.kill(/<table.*?>/i, /<\/table.*?>/i, /<table.*?>/i);
    // remove lines starting with a pipe for the hell of it (?)
    this.data = this.data.replace(/^[|].*$/mg, '');
};

/**
 * @private
 */
Previewmaker.prototype.killImages = function () {
    var forbiddenNamespaceAliases = [];
    $.each(mw.config.get('wgNamespaceIds'), function (_localizedNamespaceLc, _namespaceId) {
        if (_namespaceId != pg.nsImageId && _namespaceId != pg.nsCategoryId) {
            return;
        }
        forbiddenNamespaceAliases.push(_localizedNamespaceLc.split(' ').join('[ _]')); //todo: escape regexp fragments!
    });

    // images and categories are a nono
    this.kill(
        RegExp('[[][[]\\s*(' + forbiddenNamespaceAliases.join('|') + ')\\s*:', 'i'),
        /\]\]\s*/,
        '[',
        ']'
    );
};

/**
 * @private
 */
Previewmaker.prototype.killHTML = function () {
    // kill <ref ...>...</ref>
    this.kill(/<ref\b[^/>]*?>/i, /<\/ref>/i);

    // let's also delete entire lines starting with <. it's worth a try.
    this.data = this.data.replace(/(^|\n) *<.*/g, '\n');

    // and those pesky html tags, but not <nowiki> or <blockquote>
    var splitted = this.data.parenSplit(/(<[\w\W]*?(?:>|$|(?=<)))/);
    var len = splitted.length;
    for (var i = 1; i < len; i = i + 2) {
        switch (splitted[i]) {
            case '<nowiki>':
            case '</nowiki>':
            case '<blockquote>':
            case '</blockquote>':
                break;
            default:
                splitted[i] = '';
        }
    }
    this.data = splitted.join('');
};

/**
 * @private
 */
Previewmaker.prototype.killChunks = function () {
    // heuristics alert
    // chunks of italic text? you crazy, man?
    var italicChunkRegex = /((^|\n)\s*:*\s*''[^']([^']|'''|'[^']){20}(.|\n[^\n])*''[.!?\s]*\n)+/g;
    // keep stuff separated, though, so stick in \n (fixes [[Union Jack]]?
    this.data = this.data.replace(italicChunkRegex, '\n');
};

/**
 * @private
 */
Previewmaker.prototype.mopup = function () {
    // we simply *can't* be doing with horizontal rules right now
    this.data = this.data.replace(/^-{4,}/mg, '');

    // no indented lines
    this.data = this.data.replace(/(^|\n) *:[^\n]*/g, '');

    // replace __TOC__, __NOTOC__ and whatever else there is
    // this'll probably do
    this.data = this.data.replace(/^__[A-Z_]*__ *$/gmi, '');
};

/**
 * @private
 */
Previewmaker.prototype.firstBit = function () {
    // dont't be givin' me no subsequent paragraphs, you hear me?
    /// first we "normalize" section headings, removing whitespace after, adding before
    var d = this.data;

    if (getValueOf('popupPreviewCutHeadings')) {
        this.data = this.data.replace(/\s*(==+[^=]*==+)\s*/g, '\n\n$1 ');
        /// then we want to get rid of paragraph breaks whose text ends badly
        this.data = this.data.replace(/([:;]) *\n{2,}/g, '$1\n');

        this.data = this.data.replace(/^[\s\n]*/, '');
        var stuff = /^([^\n]|\n[^\n\s])*/.exec(this.data);
        if (stuff) {
            d = stuff[0];
        }
        if (!getValueOf('popupPreviewFirstParOnly')) {
            d = this.data;
        }

        /// now put \n\n after sections so that bullets and numbered lists work
        d = d.replace(/(==+[^=]*==+)\s*/g, '$1\n\n');
    }

    // Split sentences. Superfluous sentences are RIGHT OUT.
    // note: exactly 1 set of parens here needed to make the slice work
    d = d.parenSplit(/([!?.]+["']*\s)/g);
    // leading space is bad, mmkay?
    d[0] = d[0].replace(/^\s*/, '');

    var notSentenceEnds = /([^.][a-z][.] *[a-z]|etc|sic|Dr|Mr|Mrs|Ms|St|no|op|cit|\[[^\]]*|\s[A-Zvclm])$/i;
    d = this.fixSentenceEnds(d, notSentenceEnds);

    this.fullLength = d.join('').length;
    var n = this.maxSentences;
    var dd = this.firstSentences(d, n);

    do {
        dd = this.firstSentences(d, n);
        --n;
    } while (dd.length > this.maxCharacters && n !== 0);

    this.data = dd;
};

/**
 * @private
 */
Previewmaker.prototype.fixSentenceEnds = function (strs, reg) {
    // take an array of strings, strs
    // join strs[i] to strs[i+1] & strs[i+2] if strs[i] matches regex reg

    for (var i = 0; i < strs.length - 2; ++i) {
        if (reg.test(strs[i])) {
            var a = [];
            for (var j = 0; j < strs.length; ++j) {
                if (j < i) {
                    a[j] = strs[j];
                }
                if (j == i) {
                    a[i] = strs[i] + strs[i + 1] + strs[i + 2];
                }
                if (j > i + 2) {
                    a[j - 2] = strs[j];
                }
            }
            return this.fixSentenceEnds(a, reg);
        }
    }
    return strs;
};

/**
 * @private
 */
Previewmaker.prototype.firstSentences = function (strs, howmany) {
    var t = strs.slice(0, 2 * howmany);
    return t.join('');
};

/**
 * @private
 */
Previewmaker.prototype.killBadWhitespace = function () {
    // also cleans up isolated '''', eg [[Suntory Sungoliath]]
    this.data = this.data.replace(/^ *'+ *$/gm, '');
};

/**
 * Runs the various methods to generate the preview.
 * The preview is stored in the <code>html</html> field.
 * @private
 */
Previewmaker.prototype.makePreview = function () {
    if (
        this.owner.article.namespaceId() != pg.nsTemplateId &&
        this.owner.article.namespaceId() != pg.nsImageId
    ) {
        this.killComments();
        this.killDivs();
        this.killGalleries();
        this.killBoxTemplates();

        if (getValueOf('popupPreviewKillTemplates')) {
            this.killTemplates();
        } else {
            this.killMultilineTemplates();
        }
        this.killTables();
        this.killImages();
        this.killHTML();
        this.killChunks();
        this.mopup();

        this.firstBit();
        this.killBadWhitespace();
    } else {
        this.killHTML();
    }
    this.html = wiki2html(this.data, this.baseUrl); // needs livepreview
    this.fixHTML();
    this.stripLongTemplates();
};

/**
 * @private
 */
Previewmaker.prototype.esWiki2HtmlPart = function (data) {
    var reLinks = /(?:\[\[([^|\]]*)(?:\|([^|\]]*))*]]([a-z]*))/gi; //match a wikilink
    reLinks.lastIndex = 0; //reset regex

    var match;
    var result = '';
    var postfixIndex = 0;
    while ((match = reLinks.exec(data))) {
        //match all wikilinks
        //FIXME: the way that link is built here isn't perfect. It is clickable, but popups preview won't recognize it in some cases.
        result +=
            pg.escapeQuotesHTML(data.substring(postfixIndex, match.index)) +
            '<a href="' +
            Insta.conf.paths.articles +
            pg.escapeQuotesHTML(match[1]) +
            '">' +
            pg.escapeQuotesHTML((match[2] ? match[2] : match[1]) + match[3]) +
            '</a>';
        postfixIndex = reLinks.lastIndex;
    }
    //append the rest
    result += pg.escapeQuotesHTML(data.substring(postfixIndex));

    return result;
};
Previewmaker.prototype.editSummaryPreview = function () {
    var reAes = /\/\* *(.*?) *\*\//g; //match the first section marker
    reAes.lastIndex = 0; //reset regex

    var match;

    match = reAes.exec(this.data);
    if (match) {
        //we have a section link. Split it, process it, combine it.
        var prefix = this.data.substring(0, match.index - 1);
        var section = match[1];
        var postfix = this.data.substring(reAes.lastIndex);

        var start = "<span class='autocomment'>";
        var end = '</span>';
        if (prefix.length > 0) {
            start = this.esWiki2HtmlPart(prefix) + ' ' + start + '- ';
        }
        if (postfix.length > 0) {
            end = ': ' + end + this.esWiki2HtmlPart(postfix);
        }

        var t = new Title().fromURL(this.baseUrl);
        t.anchorFromUtf(section);
        var sectionLink =
            Insta.conf.paths.articles +
            pg.escapeQuotesHTML(t.toString(true)) +
            '#' +
            pg.escapeQuotesHTML(t.anchor);
        return (
            start + '<a href="' + sectionLink + '">&rarr;</a> ' + pg.escapeQuotesHTML(section) + end
        );
    }

    //else there's no section link, htmlify the whole thing.
    return this.esWiki2HtmlPart(this.data);
};

/** Test function for debugging preview problems one step at a time. */
/*eslint-disable */
function previewSteps(txt) {
    try {
        txt = txt || document.editform.wpTextbox1.value;
    } catch (err) {
        if (pg.cache.pages.length > 0) {
            txt = pg.cache.pages[pg.cache.pages.length - 1].data;
        } else {
            alert('provide text or use an edit page');
        }
    }
    txt = txt.substring(0, 10000);
    var base = pg.wiki.articlebase + Title.fromURL(document.location.href).urlString();
    var p = new Previewmaker(txt, base, pg.current.link.navpopup);
    if (this.owner.article.namespaceId() != pg.nsTemplateId) {
        p.killComments();
        if (!confirm('done killComments(). Continue?\n---\n' + p.data)) {
            return;
        }
        p.killDivs();
        if (!confirm('done killDivs(). Continue?\n---\n' + p.data)) {
            return;
        }
        p.killGalleries();
        if (!confirm('done killGalleries(). Continue?\n---\n' + p.data)) {
            return;
        }
        p.killBoxTemplates();
        if (!confirm('done killBoxTemplates(). Continue?\n---\n' + p.data)) {
            return;
        }

        if (getValueOf('popupPreviewKillTemplates')) {
            p.killTemplates();
            if (!confirm('done killTemplates(). Continue?\n---\n' + p.data)) {
                return;
            }
        } else {
            p.killMultilineTemplates();
            if (!confirm('done killMultilineTemplates(). Continue?\n---\n' + p.data)) {
                return;
            }
        }

        p.killTables();
        if (!confirm('done killTables(). Continue?\n---\n' + p.data)) {
            return;
        }
        p.killImages();
        if (!confirm('done killImages(). Continue?\n---\n' + p.data)) {
            return;
        }
        p.killHTML();
        if (!confirm('done killHTML(). Continue?\n---\n' + p.data)) {
            return;
        }
        p.killChunks();
        if (!confirm('done killChunks(). Continue?\n---\n' + p.data)) {
            return;
        }
        p.mopup();
        if (!confirm('done mopup(). Continue?\n---\n' + p.data)) {
            return;
        }

        p.firstBit();
        if (!confirm('done firstBit(). Continue?\n---\n' + p.data)) {
            return;
        }
        p.killBadWhitespace();
        if (!confirm('done killBadWhitespace(). Continue?\n---\n' + p.data)) {
            return;
        }
    }

    p.html = wiki2html(p.data, base); // needs livepreview
    p.fixHTML();
    if (!confirm('done fixHTML(). Continue?\n---\n' + p.html)) {
        return;
    }
    p.stripLongTemplates();
    if (!confirm('done stripLongTemplates(). Continue?\n---\n' + p.html)) {
        return;
    }
    alert('finished preview - end result follows.\n---\n' + p.html);
}
/*eslint-enable */

/**
 * Works around livepreview bugs.
 * @private
 */
Previewmaker.prototype.fixHTML = function () {
    if (!this.html) {
        return;
    }

    var ret = this.html;

    // fix question marks in wiki links
    // maybe this'll break some stuff :-(
    ret = ret.replace(
        RegExp('(<a href="' + pg.wiki.articlePath + '/[^"]*)[?](.*?")', 'g'),
        '$1%3F$2'
    );
    ret = ret.replace(
        RegExp("(<a href='" + pg.wiki.articlePath + "/[^']*)[?](.*?')", 'g'),
        '$1%3F$2'
    );
    // FIXME fix up % too

    this.html = ret;
};

/**
 * Generates the preview and displays it in the current popup.
 *
 * Does nothing if the generated preview is invalid or consists of whitespace only.
 * Also activates wikilinks in the preview for subpopups if the popupSubpopups option is true.
 */
Previewmaker.prototype.showPreview = function () {
    this.makePreview();
    if (typeof this.html != typeof '') {
        return;
    }
    if (/^\s*$/.test(this.html)) {
        return;
    }
    setPopupHTML('<hr />', 'popupPrePreviewSep', this.owner.idNumber);
    setPopupTipsAndHTML(this.html, 'popupPreview', this.owner.idNumber, {
        owner: this.owner,
    });
    var more = this.fullLength > this.data.length ? this.moreLink() : '';
    setPopupHTML(more, 'popupPreviewMore', this.owner.idNumber);
};

/**
 * @private
 */
Previewmaker.prototype.moreLink = function () {
    var a = document.createElement('a');
    a.className = 'popupMoreLink';
    a.innerHTML = popupString('more...');
    var savedThis = this;
    a.onclick = function () {
        savedThis.maxCharacters += 2000;
        savedThis.maxSentences += 20;
        savedThis.setData();
        savedThis.showPreview();
    };
    return a;
};

/**
 * @private
 */
Previewmaker.prototype.stripLongTemplates = function () {
    // operates on the HTML!
    this.html = this.html.replace(
        /^.{0,1000}[{][{][^}]*?(<(p|br)( \/)?>\s*){2,}([^{}]*?[}][}])?/gi,
        ''
    );
    this.html = this.html.split('\n').join(' '); // workaround for <pre> templates
    this.html = this.html.replace(/[{][{][^}]*<pre>[^}]*[}][}]/gi, '');
};

/**
 * @private
 */
Previewmaker.prototype.killMultilineTemplates = function () {
    this.kill('{{{', '}}}');
    this.kill(/\s*[{][{][^{}]*\n/, '}}', '{{');
};