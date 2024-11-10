//////////////////////////////////////////////////
// parenSplit

// String.prototype.parenSplit should do what ECMAscript says String.prototype.split does,
// interspersing paren matches (regex capturing groups) between the split elements.
// i.e. 'abc'.split(/(b)/)) should return ['a','b','c'], not ['a','c']

if (String('abc'.split(/(b)/)) != 'a,b,c') {
	// broken String.split, e.g. konq, IE < 10
	String.prototype.parenSplit = function (re) {
		re = nonGlobalRegex(re);
		var s = this;
		var m = re.exec(s);
		var ret = [];
		while (m && s) {
			// without the following loop, we have
			// 'ab'.parenSplit(/a|(b)/) != 'ab'.split(/a|(b)/)
			for (var i = 0; i < m.length; ++i) {
				if (typeof m[i] == 'undefined') {
					m[i] = '';
				}
			}
			ret.push(s.substring(0, m.index));
			ret = ret.concat(m.slice(1));
			s = s.substring(m.index + m[0].length);
			m = re.exec(s);
		}
		ret.push(s);
		return ret;
	};
} else {
	String.prototype.parenSplit = function (re) {
		return this.split(re);
	};
	String.prototype.parenSplit.isNative = true;
}

function nonGlobalRegex(re) {
	var s = re.toString();
	var flags = '';
	for (var j = s.length; s.charAt(j) != '/'; --j) {
		if (s.charAt(j) != 'g') {
			flags += s.charAt(j);
		}
	}
	var t = s.substring(1, j);
	return RegExp(t, flags);
}
