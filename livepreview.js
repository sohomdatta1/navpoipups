// TODO: location is often not correct (eg relative links in previews)
// NOTE: removed md5 and image and math parsing. was broken, lots of bytes.
/**
 * InstaView - a Mediawiki to HTML converter in JavaScript
 * Version 0.6.1
 * Copyright (C) Pedro Fayolle 2005-2006
 * https://en.wikipedia.org/wiki/User:Pilaf
 * Distributed under the BSD license
 *
 * Changelog:
 *
 * 0.6.1
 * - Fixed problem caused by \r characters
 * - Improved inline formatting parser
 *
 * 0.6
 * - Changed name to InstaView
 * - Some major code reorganizations and factored out some common functions
 * - Handled conversion of relative links (i.e. [[/foo]])
 * - Fixed misrendering of adjacent definition list items
 * - Fixed bug in table headings handling
 * - Changed date format in signatures to reflect Mediawiki's
 * - Fixed handling of [[:Image:...]]
 * - Updated MD5 function (hopefully it will work with UTF-8)
 * - Fixed bug in handling of links inside images
 *
 * To do:
 * - Better support for math tags
 * - Full support for <nowiki>
 * - Parser-based (as opposed to RegExp-based) inline wikicode handling (make it one-pass and
 *   bullet-proof)
 * - Support for templates (through AJAX)
 * - Support for coloured links (AJAX)
 */

var Insta = {};

function setupLivePreview() {
	// options
	Insta.conf = {
		baseUrl: '',

		user: {},

		wiki: {
			lang: pg.wiki.lang,
			interwiki: pg.wiki.interwiki,
			default_thumb_width: 180
		},

		paths: {
			articles: pg.wiki.articlePath + '/',
			// Only used for Insta previews with images. (not in popups)
			math: '/math/',
			images: '//upload.wikimedia.org/wikipedia/en/', // FIXME getImageUrlStart(pg.wiki.hostname),
			images_fallback: '//upload.wikimedia.org/wikipedia/commons/'
		},

		locale: {
			user: mw.config.get('wgFormattedNamespaces')[pg.nsUserId],
			image: mw.config.get('wgFormattedNamespaces')[pg.nsImageId],
			category: mw.config.get('wgFormattedNamespaces')[pg.nsCategoryId],
			// shouldn't be used in popup previews, i think
			months: [
				'Jan',
				'Feb',
				'Mar',
				'Apr',
				'May',
				'Jun',
				'Jul',
				'Aug',
				'Sep',
				'Oct',
				'Nov',
				'Dec'
			]
		}
	};

	// options with default values or backreferences
	Insta.conf.user.name = Insta.conf.user.name || 'Wikipedian';
	Insta.conf.user.signature =
        '[[' +
        Insta.conf.locale.user +
        ':' +
        Insta.conf.user.name +
        '|' +
        Insta.conf.user.name +
        ']]';
	//Insta.conf.paths.images = '//upload.wikimedia.org/wikipedia/' + Insta.conf.wiki.lang + '/';

	// define constants
	Insta.BLOCK_IMAGE = new RegExp(
		'^\\[\\[(?:File|Image|' +
            Insta.conf.locale.image +
            '):.*?\\|.*?(?:frame|thumbnail|thumb|none|right|left|center)',
		'i'
	);
}

Insta.dump = function (from, to) {
	if (typeof from == 'string') {
		from = document.getElementById(from);
	}
	if (typeof to == 'string') {
		to = document.getElementById(to);
	}
	to.innerHTML = this.convert(from.value);
};

Insta.convert = function (wiki) {
	var ll = typeof wiki == 'string' ? wiki.replace(/\r/g, '').split(/\n/) : wiki, // lines of wikicode
		o = '', // output
		p = 0, // para flag
		r; // result of passing a regexp to compareLineStringOrReg()

	// some shorthands
	function remain() {
		return ll.length;
	}
	function sh() {
		return ll.shift();
	} // shift
	function ps(s) {
		o += s;
	} // push

	// similar to C's printf, uses ? as placeholders, ?? to escape question marks
	function f() {
		var i = 1,
			a = arguments,
			f = a[0],
			o = '',
			c,
			p;
		for (; i < a.length; i++) {
			if ((p = f.indexOf('?')) + 1) {
				// allow character escaping
				i -= c = f.charAt(p + 1) == '?' ? 1 : 0;
				o += f.substring(0, p) + (c ? '?' : a[i]);
				f = f.substr(p + 1 + c);
			} else {
				break;
			}
		}
		return o + f;
	}

	function html_entities(s) {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	// Wiki text parsing to html is a nightmare.
	// The below functions deliberately don't escape the ampersand since this would make it more
	// difficult, and we don't absolutely need to for how we need it. This means that any
	// unescaped ampersands in wikitext will remain unescaped and can cause invalid HTML.
	// Browsers should all be able to handle it though. We also escape significant wikimarkup
	// characters to prevent further matching on the processed text.
	function htmlescape_text(s) {
		return s
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/:/g, '&#58;')
			.replace(/\[/g, '&#91;')
			.replace(/]/g, '&#93;');
	}
	function htmlescape_attr(s) {
		return htmlescape_text(s).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
	}

	// return the first non matching character position between two strings
	function str_imatch(a, b) {
		for (var i = 0, l = Math.min(a.length, b.length); i < l; i++) {
			if (a.charAt(i) != b.charAt(i)) {
				break;
			}
		}
		return i;
	}

	// compare current line against a string or regexp
	// if passed a string it will compare only the first string.length characters
	// if passed a regexp the result is stored in r
	function compareLineStringOrReg(c) {
		return typeof c == 'string' ?
			ll[0] && ll[0].substr(0, c.length) == c :
			(r = ll[0] && ll[0].match(c));
	}

	function compareLineString(c) {
		return ll[0] == c;
	} // compare current line against a string
	function charAtPoint(p) {
		return ll[0].charAt(p);
	} // return char at pos p

	function endl(s) {
		ps(s);
		sh();
	}

	function parse_list() {
		var prev = '';

		while (remain() && compareLineStringOrReg(/^([*#:;]+)(.*)$/)) {
			var l_match = r;

			sh();

			var ipos = str_imatch(prev, l_match[1]);

			// close uncontinued lists
			for (var prevPos = prev.length - 1; prevPos >= ipos; prevPos--) {
				var pi = prev.charAt(prevPos);

				if (pi == '*') {
					ps('</ul>');
				} else if (pi == '#') {
					ps('</ol>');
				}
				// close a dl only if the new item is not a dl item (:, ; or empty)
				else if ($.inArray(l_match[1].charAt(prevPos), ['', '*', '#'])) {
					ps('</dl>');
				}
			}

			// open new lists
			for (var matchPos = ipos; matchPos < l_match[1].length; matchPos++) {
				var li = l_match[1].charAt(matchPos);

				if (li == '*') {
					ps('<ul>');
				} else if (li == '#') {
					ps('<ol>');
				}
				// open a new dl only if the prev item is not a dl item (:, ; or empty)
				else if ($.inArray(prev.charAt(matchPos), ['', '*', '#'])) {
					ps('<dl>');
				}
			}

			switch (l_match[1].charAt(l_match[1].length - 1)) {
				case '*':
				case '#':
					ps('<li>' + parse_inline_nowiki(l_match[2]));
					break;

				case ';':
					ps('<dt>');

					var dt_match = l_match[2].match(/(.*?)(:.*?)$/);

					// handle ;dt :dd format
					if (dt_match) {
						ps(parse_inline_nowiki(dt_match[1]));
						ll.unshift(dt_match[2]);
					} else {
						ps(parse_inline_nowiki(l_match[2]));
					}
					break;

				case ':':
					ps('<dd>' + parse_inline_nowiki(l_match[2]));
			}

			prev = l_match[1];
		}

		// close remaining lists
		for (var i = prev.length - 1; i >= 0; i--) {
			ps(f('</?>', prev.charAt(i) == '*' ? 'ul' : prev.charAt(i) == '#' ? 'ol' : 'dl'));
		}
	}

	function parse_table() {
		endl(f('<table>', compareLineStringOrReg(/^\{\|( .*)$/) ? r[1] : ''));

		for (; remain(); ) {
			if (compareLineStringOrReg('|')) {
				switch (charAtPoint(1)) {
					case '}':
						endl('</table>');
						return;
					case '-':
						endl(f('<tr>', compareLineStringOrReg(/\|-*(.*)/)[1]));
						break;
					default:
						parse_table_data();
				}
			} else if (compareLineStringOrReg('!')) {
				parse_table_data();
			} else {
				sh();
			}
		}
	}

	function parse_table_data() {
		var td_line, match_i;

		// 1: "|+", '|' or '+'
		// 2: ??
		// 3: attributes ??
		// TODO: finish commenting this regexp
		var td_match = sh().match(/^(\|\+|\||!)((?:([^[|]*?)\|(?!\|))?(.*))$/);

		if (td_match[1] == '|+') {
			ps('<caption');
		} else {
			ps('<t' + (td_match[1] == '|' ? 'd' : 'h'));
		}

		if (typeof td_match[3] != 'undefined') {
			//ps(' ' + td_match[3])
			match_i = 4;
		} else {
			match_i = 2;
		}

		ps('>');

		if (td_match[1] != '|+') {
			// use || or !! as a cell separator depending on context
			// NOTE: when split() is passed a regexp make sure to use non-capturing brackets
			td_line = td_match[match_i].split(td_match[1] == '|' ? '||' : /(?:\|\||!!)/);

			ps(parse_inline_nowiki(td_line.shift()));

			while (td_line.length) {
				ll.unshift(td_match[1] + td_line.pop());
			}
		} else {
			ps(parse_inline_nowiki(td_match[match_i]));
		}

		var tc = 0,
			td = [];

		while (remain()) {
			td.push(sh());
			if (compareLineStringOrReg('|')) {
				if (!tc) {
					break;
				}
				// we're at the outer-most level (no nested tables), skip to td parse
				else if (charAtPoint(1) == '}') {
					tc--;
				}
			} else if (!tc && compareLineStringOrReg('!')) {
				break;
			} else if (compareLineStringOrReg('{|')) {
				tc++;
			}
		}

		if (td.length) {
			ps(Insta.convert(td));
		}
	}

	function parse_pre() {
		ps('<pre>');
		do {
			endl(parse_inline_nowiki(ll[0].substring(1)) + '\n');
		} while (remain() && compareLineStringOrReg(' '));
		ps('</pre>');
	}

	function parse_block_image() {
		ps(parse_image(sh()));
	}

	function parse_image(str) {
		// get what's in between "[[Image:" and "]]"
		var tag = str.substring(str.indexOf(':') + 1, str.length - 2);
		var width;
		var attr = [],
			filename,
			caption = '';
		var thumb = 0,
			frame = 0,
			center = 0;
		var align = '';

		if (tag.match(/\|/)) {
			// manage nested links
			var nesting = 0;
			var last_attr;
			for (var i = tag.length - 1; i > 0; i--) {
				if (tag.charAt(i) == '|' && !nesting) {
					last_attr = tag.substr(i + 1);
					tag = tag.substring(0, i);
					break;
				} else {
					switch (tag.substr(i - 1, 2)) {
						case ']]':
							nesting++;
							i--;
							break;
						case '[[':
							nesting--;
							i--;
					}
				}
			}

			attr = tag.split(/\s*\|\s*/);
			attr.push(last_attr);
			filename = attr.shift();

			var w_match;

			for (; attr.length; attr.shift()) {
				w_match = attr[0].match(/^(\d*)(?:[px]*\d*)?px$/);
				if (w_match) {
					width = w_match[1];
				} else {
					switch (attr[0]) {
						case 'thumb':
						case 'thumbnail':
							thumb = true;
							frame = true;
							break;
						case 'frame':
							frame = true;
							break;
						case 'none':
						case 'right':
						case 'left':
							center = false;
							align = attr[0];
							break;
						case 'center':
							center = true;
							align = 'none';
							break;
						default:
							if (attr.length == 1) {
								caption = attr[0];
							}
					}
				}
			}
		} else {
			filename = tag;
		}

		return '';
	}

	function parse_inline_nowiki(str) {
		var start,
			lastend = 0;
		var substart = 0,
			nestlev = 0,
			open,
			close,
			subloop;
		var html = '';

		while ((start = str.indexOf('<nowiki>', substart)) != -1) {
			html += parse_inline_wiki(str.substring(lastend, start));
			start += 8;
			substart = start;
			subloop = true;
			do {
				open = str.indexOf('<nowiki>', substart);
				close = str.indexOf('</nowiki>', substart);
				if (close <= open || open == -1) {
					if (close == -1) {
						return html + html_entities(str.substr(start));
					}
					substart = close + 9;
					if (nestlev) {
						nestlev--;
					} else {
						lastend = substart;
						html += html_entities(str.substring(start, lastend - 9));
						subloop = false;
					}
				} else {
					substart = open + 8;
					nestlev++;
				}
			} while (subloop);
		}

		return html + parse_inline_wiki(str.substr(lastend));
	}

	function parse_inline_images(str) {
		var start,
			substart = 0,
			nestlev = 0;
		var loop, close, open, wiki, html;

		while ((start = str.indexOf('[[', substart)) != -1) {
			if (
				str.substr(start + 2).match(RegExp('^(Image|File|' + Insta.conf.locale.image + '):', 'i'))
			) {
				loop = true;
				substart = start;
				do {
					substart += 2;
					close = str.indexOf(']]', substart);
					open = str.indexOf('[[', substart);
					if (close <= open || open == -1) {
						if (close == -1) {
							return str;
						}
						substart = close;
						if (nestlev) {
							nestlev--;
						} else {
							wiki = str.substring(start, close + 2);
							html = parse_image(wiki);
							str = str.replace(wiki, html);
							substart = start + html.length;
							loop = false;
						}
					} else {
						substart = open;
						nestlev++;
					}
				} while (loop);
			} else {
				break;
			}
		}

		return str;
	}

	// the output of this function doesn't respect the FILO structure of HTML
	// but since most browsers can handle it I'll save myself the hassle
	function parse_inline_formatting(str) {
		var em,
			st,
			i,
			li,
			o = '';
		while ((i = str.indexOf("''", li)) + 1) {
			o += str.substring(li, i);
			li = i + 2;
			if (str.charAt(i + 2) == "'") {
				li++;
				st = !st;
				o += st ? '<strong>' : '</strong>';
			} else {
				em = !em;
				o += em ? '<em>' : '</em>';
			}
		}
		return o + str.substr(li);
	}

	function parse_inline_wiki(str) {
		str = parse_inline_images(str);

		// math
		str = str.replace(/<(?:)math>(.*?)<\/math>/gi, '');

		// Build a Mediawiki-formatted date string
		var date = new Date();
		var minutes = date.getUTCMinutes();
		if (minutes < 10) {
			minutes = '0' + minutes;
		}
		date = f(
			'?:?, ? ? ? (UTC)',
			date.getUTCHours(),
			minutes,
			date.getUTCDate(),
			Insta.conf.locale.months[date.getUTCMonth()],
			date.getUTCFullYear()
		);

		// text formatting
		str =
            str
            // signatures
            	.replace(/~{5}(?!~)/g, date)
            	.replace(/~{4}(?!~)/g, Insta.conf.user.name + ' ' + date)
            	.replace(/~{3}(?!~)/g, Insta.conf.user.name)
            // [[:Category:...]], [[:Image:...]], etc...
            	.replace(
            		RegExp(
            			'\\[\\[:((?:' +
                            Insta.conf.locale.category +
                            '|Image|File|' +
                            Insta.conf.locale.image +
                            '|' +
                            Insta.conf.wiki.interwiki +
                            '):[^|]*?)\\]\\](\\w*)',
            			'gi'
            		),
            		($0, $1, $2) => f(
            				"<a href='?'>?</a>",
            				Insta.conf.paths.articles + htmlescape_attr($1),
            				htmlescape_text($1) + htmlescape_text($2)
            			)
            	)
            // remove straight category and interwiki tags
            	.replace(
            		RegExp(
            			'\\[\\[(?:' +
                            Insta.conf.locale.category +
                            '|' +
                            Insta.conf.wiki.interwiki +
                            '):.*?\\]\\]',
            			'gi'
            		),
            		''
            	)
            // [[:Category:...|Links]], [[:Image:...|Links]], etc...
            	.replace(
            		RegExp(
            			'\\[\\[:((?:' +
                            Insta.conf.locale.category +
                            '|Image|File|' +
                            Insta.conf.locale.image +
                            '|' +
                            Insta.conf.wiki.interwiki +
                            '):.*?)\\|([^\\]]+?)\\]\\](\\w*)',
            			'gi'
            		),
            		($0, $1, $2, $3) => f(
            				"<a href='?'>?</a>",
            				Insta.conf.paths.articles + htmlescape_attr($1),
            				htmlescape_text($2) + htmlescape_text($3)
            			)
            	)
            // [[/Relative links]]
            	.replace(/\[\[(\/[^|]*?)\]\]/g, ($0, $1) => f(
            			"<a href='?'>?</a>",
            			Insta.conf.baseUrl + htmlescape_attr($1),
            			htmlescape_text($1)
            		))
            // [[/Replaced|Relative links]]
            	.replace(/\[\[(\/.*?)\|(.+?)\]\]/g, ($0, $1, $2) => f(
            			"<a href='?'>?</a>",
            			Insta.conf.baseUrl + htmlescape_attr($1),
            			htmlescape_text($2)
            		))
            // [[Common links]]
            	.replace(/\[\[([^[|]*?)\]\](\w*)/g, ($0, $1, $2) => f(
            			"<a href='?'>?</a>",
            			Insta.conf.paths.articles + htmlescape_attr($1),
            			htmlescape_text($1) + htmlescape_text($2)
            		))
            // [[Replaced|Links]]
            	.replace(/\[\[([^[]*?)\|([^\]]+?)\]\](\w*)/g, ($0, $1, $2, $3) => f(
            			"<a href='?'>?</a>",
            			Insta.conf.paths.articles + htmlescape_attr($1),
            			htmlescape_text($2) + htmlescape_text($3)
            		))
            // [[Stripped:Namespace|Namespace]]
            	.replace(/\[\[([^\]]*?:)?(.*?)( *\(.*?\))?\|\]\]/g, ($0, $1, $2, $3) => f(
            			"<a href='?'>?</a>",
            			Insta.conf.paths.articles +
                            htmlescape_attr($1) +
                            htmlescape_attr($2) +
                            htmlescape_attr($3),
            			htmlescape_text($2)
            		))
            // External links
            	.replace(
            		/\[(https?|news|ftp|mailto|gopher|irc):(\/*)([^\]]*?) (.*?)\]/g,
            		($0, $1, $2, $3, $4) => f(
            				"<a class='external' href='?:?'>?</a>",
            				htmlescape_attr($1),
            				htmlescape_attr($2) + htmlescape_attr($3),
            				htmlescape_text($4)
            			)
            	)
            	.replace(/\[http:\/\/(.*?)\]/g, ($0, $1) => f("<a class='external' href='http://?'>[#]</a>", htmlescape_attr($1)))
            	.replace(/\[(news|ftp|mailto|gopher|irc):(\/*)(.*?)\]/g, ($0, $1, $2, $3) => f(
            			"<a class='external' href='?:?'>?:?</a>",
            			htmlescape_attr($1),
            			htmlescape_attr($2) + htmlescape_attr($3),
            			htmlescape_text($1),
            			htmlescape_text($2) + htmlescape_text($3)
            		))
            	.replace(
            		/(^| )(https?|news|ftp|mailto|gopher|irc):(\/*)([^ $]*[^.,!?;: $])/g,
            		($0, $1, $2, $3, $4) => f(
            				"?<a class='external' href='?:?'>?:?</a>",
            				htmlescape_text($1),
            				htmlescape_attr($2),
            				htmlescape_attr($3) + htmlescape_attr($4),
            				htmlescape_text($2),
            				htmlescape_text($3) + htmlescape_text($4)
            			)
            	)
            	.replace('__NOTOC__', '')
            	.replace('__NOINDEX__', '')
            	.replace('__INDEX__', '')
            	.replace('__NOEDITSECTION__', '');
		return parse_inline_formatting(str);
	}

	// begin parsing
	for (; remain(); ) {
		if (compareLineStringOrReg(/^(={1,6})(.*)\1(.*)$/)) {
			p = 0;
			endl(f('<h?>?</h?>?', r[1].length, parse_inline_nowiki(r[2]), r[1].length, r[3]));
		} else if (compareLineStringOrReg(/^[*#:;]/)) {
			p = 0;
			parse_list();
		} else if (compareLineStringOrReg(' ')) {
			p = 0;
			parse_pre();
		} else if (compareLineStringOrReg('{|')) {
			p = 0;
			parse_table();
		} else if (compareLineStringOrReg(/^----+$/)) {
			p = 0;
			endl('<hr />');
		} else if (compareLineStringOrReg(Insta.BLOCK_IMAGE)) {
			p = 0;
			parse_block_image();
		} else {
			// handle paragraphs
			if (compareLineString('')) {
				p = remain() > 1 && ll[1] === '';
				if (p) {
					endl('<p><br>');
				}
			} else {
				if (!p) {
					ps('<p>');
					p = 1;
				}
				ps(parse_inline_nowiki(ll[0]) + ' ');
			}

			sh();
		}
	}

	return o;
};

function wiki2html(txt, baseurl) {
	Insta.conf.baseUrl = baseurl;
	return Insta.convert(txt);
}
