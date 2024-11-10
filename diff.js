/*
* Javascript Diff Algorithm
*  By John Resig (http://ejohn.org/) and [[:en:User:Lupin]]
*
* More Info:
*  http://ejohn.org/projects/javascript-diff-algorithm/
*/

function delFmt(x) {
    if (!x.length) {
        return '';
    }
    return "<del class='popupDiff'>" + x.join('') + '</del>';
}

function insFmt(x) {
    if (!x.length) {
        return '';
    }
    return "<ins class='popupDiff'>" + x.join('') + '</ins>';
}

function countCrossings(a, b, i, eject) {
    // count the crossings on the edge starting at b[i]
    if (!b[i].row && b[i].row !== 0) {
        return -1;
    }
    var count = 0;
    for (var j = 0; j < a.length; ++j) {
        if (!a[j].row && a[j].row !== 0) {
            continue;
        }
        if ((j - b[i].row) * (i - a[j].row) > 0) {
            if (eject) {
                return true;
            }
            count++;
        }
    }
    return count;
}

function shortenDiffString(str, context) {
    var re = /(<del[\s\S]*?<\/del>|<ins[\s\S]*?<\/ins>)/;
    var splitted = str.parenSplit(re);
    var ret = [''];
    for (var i = 0; i < splitted.length; i += 2) {
        if (splitted[i].length < 2 * context) {
            ret[ret.length - 1] += splitted[i];
            if (i + 1 < splitted.length) {
                ret[ret.length - 1] += splitted[i + 1];
            }
            continue;
        } else {
            if (i > 0) {
                ret[ret.length - 1] += splitted[i].substring(0, context);
            }
            if (i + 1 < splitted.length) {
                ret.push(splitted[i].substring(splitted[i].length - context) + splitted[i + 1]);
            }
        }
    }
    while (ret.length > 0 && !ret[0]) {
        ret = ret.slice(1);
    }
    return ret;
}

function diffString(o, n, simpleSplit) {
    var splitRe = /([[]{2}|[\]]{2}|[{]{2,3}|[}]{2,3}|[|]|=|<|>|[*:]+|\s|\b)/;

    //  We need to split the strings o and n first, and entify() the parts
    //  individually, so that the HTML entities are never cut apart. (AxelBoldt)
    var out, i, oSplitted, nSplitted;
    if (simpleSplit) {
        oSplitted = o.split(/\b/);
        nSplitted = n.split(/\b/);
    } else {
        oSplitted = o.parenSplit(splitRe);
        nSplitted = n.parenSplit(splitRe);
    }
    for (i = 0; i < oSplitted.length; ++i) {
        oSplitted[i] = oSplitted[i].entify();
    }
    for (i = 0; i < nSplitted.length; ++i) {
        nSplitted[i] = nSplitted[i].entify();
    }

    out = diff(oSplitted, nSplitted);
    var str = '';
    var acc = []; // accumulator for prettier output

    // crossing pairings -- eg 'A B' vs 'B A' -- cause problems, so let's iron them out
    // this doesn't always do things optimally but it should be fast enough
    var maxOutputPair = 0;
    for (i = 0; i < out.n.length; ++i) {
        if (out.n[i].paired) {
            if (maxOutputPair > out.n[i].row) {
                // tangle - delete pairing
                out.o[out.n[i].row] = out.o[out.n[i].row].text;
                out.n[i] = out.n[i].text;
            }
            if (maxOutputPair < out.n[i].row) {
                maxOutputPair = out.n[i].row;
            }
        }
    }

    // output the stuff preceding the first paired old line
    for (i = 0; i < out.o.length && !out.o[i].paired; ++i) {
        acc.push(out.o[i]);
    }
    str += delFmt(acc);
    acc = [];

    // main loop
    for (i = 0; i < out.n.length; ++i) {
        // output unpaired new "lines"
        while (i < out.n.length && !out.n[i].paired) {
            acc.push(out.n[i++]);
        }
        str += insFmt(acc);
        acc = [];
        if (i < out.n.length) {
            // this new "line" is paired with the (out.n[i].row)th old "line"
            str += out.n[i].text;
            // output unpaired old rows starting after this new line's partner
            var m = out.n[i].row + 1;
            while (m < out.o.length && !out.o[m].paired) {
                acc.push(out.o[m++]);
            }
            str += delFmt(acc);
            acc = [];
        }
    }
    return str;
}

// see http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Object
// FIXME: use obj.hasOwnProperty instead of this kludge!
var jsReservedProperties = RegExp(
    '^(constructor|prototype|__((define|lookup)[GS]etter)__' +
        '|eval|hasOwnProperty|propertyIsEnumerable' +
        '|to(Source|String|LocaleString)|(un)?watch|valueOf)$'
);

function diffBugAlert(word) {
    if (!diffBugAlert.list[word]) {
        diffBugAlert.list[word] = 1;
        alert('Bad word: ' + word + '\n\nPlease report this bug.');
    }
}

diffBugAlert.list = {};

function makeDiffHashtable(src) {
    var ret = {};
    for (var i = 0; i < src.length; i++) {
        if (jsReservedProperties.test(src[i])) {
            src[i] += '<!-- -->';
        }
        if (!ret[src[i]]) {
            ret[src[i]] = [];
        }
        try {
            ret[src[i]].push(i);
        } catch (err) {
            diffBugAlert(src[i]);
        }
    }
    return ret;
}

function diff(o, n) {
    // pass 1: make hashtable ns with new rows as keys
    var ns = makeDiffHashtable(n);

    // pass 2: make hashtable os with old rows as keys
    var os = makeDiffHashtable(o);

    // pass 3: pair unique new rows and matching unique old rows
    var i;
    for (i in ns) {
        if (ns[i].length == 1 && os[i] && os[i].length == 1) {
            n[ns[i][0]] = { text: n[ns[i][0]], row: os[i][0], paired: true };
            o[os[i][0]] = { text: o[os[i][0]], row: ns[i][0], paired: true };
        }
    }

    // pass 4: pair matching rows immediately following paired rows (not necessarily unique)
    for (i = 0; i < n.length - 1; i++) {
        if (
            n[i].paired &&
            !n[i + 1].paired &&
            n[i].row + 1 < o.length &&
            !o[n[i].row + 1].paired &&
            n[i + 1] == o[n[i].row + 1]
        ) {
            n[i + 1] = { text: n[i + 1], row: n[i].row + 1, paired: true };
            o[n[i].row + 1] = { text: o[n[i].row + 1], row: i + 1, paired: true };
        }
    }

    // pass 5: pair matching rows immediately preceding paired rows (not necessarily unique)
    for (i = n.length - 1; i > 0; i--) {
        if (
            n[i].paired &&
            !n[i - 1].paired &&
            n[i].row > 0 &&
            !o[n[i].row - 1].paired &&
            n[i - 1] == o[n[i].row - 1]
        ) {
            n[i - 1] = { text: n[i - 1], row: n[i].row - 1, paired: true };
            o[n[i].row - 1] = { text: o[n[i].row - 1], row: i - 1, paired: true };
        }
    }

    return { o: o, n: n };
}