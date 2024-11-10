// IE madness with encoding
// ========================
//
// suppose throughout that the page is in utf8, like wikipedia
//
// if a is an anchor DOM element and a.href should consist of
//
// http://host.name.here/wiki/foo?bar=baz
//
// then IE gives foo as "latin1-encoded" utf8; we have foo = decode_utf8(decodeURI(foo_ie))
// but IE gives bar=baz correctly as plain utf8
//
// ---------------------------------
//
// IE's xmlhttp doesn't understand utf8 urls. Have to use encodeURI here.
//
// ---------------------------------
//
// summat else

// Source: http://aktuell.de.selfhtml.org/artikel/javascript/utf8b64/utf8.htm

function getJsObj(json) {
	try {
		var json_ret = JSON.parse(json);
		if (json_ret.warnings) {
			for (var w = 0; w < json_ret.warnings.length; w++) {
				if (json_ret.warnings[w]['*']) {
					log(json_ret.warnings[w]['*']);
				} else {
					log(json_ret.warnings[w].warnings);
				}
			}
		} else if (json_ret.error) {
			errlog(json_ret.error.code + ': ' + json_ret.error.info);
		}
		return json_ret;
	} catch (someError) {
		errlog('Something went wrong with getJsObj, json=' + json);
		return 1;
	}
}

function anyChild(obj) {
	for (var p in obj) {
		return obj[p];
	}
	return null;
}

function upcaseFirst(str) {
	if (typeof str != typeof '' || str === '') {
		return '';
	}
	return str.charAt(0).toUpperCase() + str.substring(1);
}

function findInArray(arr, foo) {
	if (!arr || !arr.length) {
		return -1;
	}
	var len = arr.length;
	for (var i = 0; i < len; ++i) {
		if (arr[i] == foo) {
			return i;
		}
	}
	return -1;
}

function nextOne(array, value) {
	// NB if the array has two consecutive entries equal
	//	then this will loop on successive calls
	var i = findInArray(array, value);
	if (i < 0) {
		return null;
	}
	return array[i + 1];
}

function literalizeRegex(str) {
	return mw.util.escapeRegExp(str);
}

String.prototype.entify = function () {
	//var shy='&shy;';
	return this.split('&')
		.join('&amp;')
		.split('<')
		.join('&lt;')
		.split('>')
		.join('&gt;' /*+shy*/)
		.split('"')
		.join('&quot;');
};

// Array filter function
function removeNulls(val) {
	return val !== null;
}

function joinPath(list) {
	return list.filter(removeNulls).join('/');
}

function simplePrintf(str, subs) {
	if (!str || !subs) {
		return str;
	}
	var ret = [];
	var s = str.parenSplit(/(%s|\$[0-9]+)/);
	var i = 0;
	do {
		ret.push(s.shift());
		if (!s.length) {
			break;
		}
		var cmd = s.shift();
		if (cmd == '%s') {
			if (i < subs.length) {
				ret.push(subs[i]);
			} else {
				ret.push(cmd);
			}
			++i;
		} else {
			var j = parseInt(cmd.replace('$', ''), 10) - 1;
			if (j > -1 && j < subs.length) {
				ret.push(subs[j]);
			} else {
				ret.push(cmd);
			}
		}
	} while (s.length > 0);
	return ret.join('');
}

function isString(x) {
	return typeof x === 'string' || x instanceof String;
}

function isNumber(x) {
	return typeof x === 'number' || x instanceof Number;
}

function isRegExp(x) {
	return x instanceof RegExp;
}

function isArray(x) {
	return x instanceof Array;
}

function isObject(x) {
	return x instanceof Object;
}

function isFunction(x) {
	return !isRegExp(x) && (typeof x === 'function' || x instanceof Function);
}

function repeatString(s, mult) {
	var ret = '';
	for (var i = 0; i < mult; ++i) {
		ret += s;
	}
	return ret;
}

function zeroFill(s, min) {
	min = min || 2;
	var t = s.toString();
	return repeatString('0', min - t.length) + t;
}

function map(f, o) {
	if (isArray(o)) {
		return map_array(f, o);
	}
	return map_object(f, o);
}
function map_array(f, o) {
	var ret = [];
	for (var i = 0; i < o.length; ++i) {
		ret.push(f(o[i]));
	}
	return ret;
}
function map_object(f, o) {
	var ret = {};
	for (var i in o) {
		ret[o] = f(o[i]);
	}
	return ret;
}

pg.escapeQuotesHTML = function (text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
};

pg.unescapeQuotesHTML = function (html) {
	// From https://stackoverflow.com/a/7394787
	// This seems to be implemented correctly on all major browsers now, so we
	// don't have to make our own function.
	var txt = document.createElement('textarea');
	txt.innerHTML = html;
	return txt.value;
};
