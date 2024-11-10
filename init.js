function setSiteInfo() {
	if (window.popupLocalDebug) {
		pg.wiki.hostname = 'en.wikipedia.org';
	} else {
		pg.wiki.hostname = location.hostname; // use in preference to location.hostname for flexibility (?)
	}
	pg.wiki.wikimedia = /(wiki([pm]edia|source|books|news|quote|versity|species|voyage|data)|metawiki|wiktionary|mediawiki)[.]org/.test(pg.wiki.hostname);
	pg.wiki.wikia = /[.]wikia[.]com$/i.test(pg.wiki.hostname);
	pg.wiki.isLocal = /^localhost/.test(pg.wiki.hostname);
	pg.wiki.commons =
        pg.wiki.wikimedia && pg.wiki.hostname != 'commons.wikimedia.org' ?
        	'commons.wikimedia.org' :
        	null;
	pg.wiki.lang = mw.config.get('wgContentLanguage');
	var port = location.port ? ':' + location.port : '';
	pg.wiki.sitebase = pg.wiki.hostname + port;
}

function setUserInfo() {
	var params = {
		action: 'query',
		list: 'users',
		ususers: mw.config.get('wgUserName'),
		usprop: 'rights'
	};

	pg.user.canReview = false;
	if (getValueOf('popupReview')) {
		getMwApi()
			.get(params)
			.done((data) => {
				var rights = data.query.users[0].rights;
				pg.user.canReview = rights.indexOf('review') !== -1; // TODO: Should it be a getValueOf('ReviewRight') ?
			});
	}
}

function fetchSpecialPageNames() {
	var params = {
		action: 'query',
		meta: 'siteinfo',
		siprop: 'specialpagealiases',
		formatversion: 2,
		// cache for an hour
		uselang: 'content',
		maxage: 3600
	};
	return getMwApi()
		.get(params)
		.then((data) => {
			pg.wiki.specialpagealiases = data.query.specialpagealiases;
		});
}

function setTitleBase() {
	var protocol = window.popupLocalDebug ? 'http:' : location.protocol;
	pg.wiki.articlePath = mw.config.get('wgArticlePath').replace(/\/\$1/, ''); // as in http://some.thing.com/wiki/Article
	pg.wiki.botInterfacePath = mw.config.get('wgScript');
	pg.wiki.APIPath = mw.config.get('wgScriptPath') + '/api.php';
	// default mediawiki setting is paths like http://some.thing.com/articlePath/index.php?title=foo

	var titletail = pg.wiki.botInterfacePath + '?title=';
	//var titletail2 = joinPath([pg.wiki.botInterfacePath, 'wiki.phtml?title=']);

	// other sites may need to add code here to set titletail depending on how their urls work

	pg.wiki.titlebase = protocol + '//' + pg.wiki.sitebase + titletail;
	//pg.wiki.titlebase2  = protocol + '//' + joinPath([pg.wiki.sitebase, titletail2]);
	pg.wiki.wikibase = protocol + '//' + pg.wiki.sitebase + pg.wiki.botInterfacePath;
	pg.wiki.apiwikibase = protocol + '//' + pg.wiki.sitebase + pg.wiki.APIPath;
	pg.wiki.articlebase = protocol + '//' + pg.wiki.sitebase + pg.wiki.articlePath;
	pg.wiki.commonsbase = protocol + '//' + pg.wiki.commons + pg.wiki.botInterfacePath;
	pg.wiki.apicommonsbase = protocol + '//' + pg.wiki.commons + pg.wiki.APIPath;
	pg.re.basenames = RegExp(
		'^(' +
            map(literalizeRegex, [
            	pg.wiki.titlebase, //pg.wiki.titlebase2,
            	pg.wiki.articlebase
            ]).join('|') +
            ')'
	);
}

//////////////////////////////////////////////////
// Global regexps

function setMainRegex() {
	var reStart = '[^:]*://';
	var preTitles =
        literalizeRegex(mw.config.get('wgScriptPath')) + '/(?:index[.]php|wiki[.]phtml)[?]title=';
	preTitles += '|' + literalizeRegex(pg.wiki.articlePath + '/');

	var reEnd = '(' + preTitles + ')([^&?#]*)[^#]*(?:#(.+))?';
	pg.re.main = RegExp(reStart + literalizeRegex(pg.wiki.sitebase) + reEnd);
}

function buildSpecialPageGroup(specialPageObj) {
	var variants = [];
	variants.push(mw.util.escapeRegExp(specialPageObj.realname));
	variants.push(mw.util.escapeRegExp(encodeURI(specialPageObj.realname)));
	specialPageObj.aliases.forEach((alias) => {
		variants.push(mw.util.escapeRegExp(alias));
		variants.push(mw.util.escapeRegExp(encodeURI(alias)));
	});
	return variants.join('|');
}

function setRegexps() {
	setMainRegex();
	var sp = nsRe(pg.nsSpecialId);
	pg.re.urlNoPopup = RegExp('((title=|/)' + sp + '(?:%3A|:)|section=[0-9]|^#$)');

	pg.wiki.specialpagealiases.forEach((specialpage) => {
		if (specialpage.realname === 'Contributions') {
			pg.re.contribs = RegExp(
				'(title=|/)' +
                    sp +
                    '(?:%3A|:)(?:' +
                    buildSpecialPageGroup(specialpage) +
                    ')' +
                    '(&target=|/|/' +
                    nsRe(pg.nsUserId) +
                    ':)(.*)',
				'i'
			);
		} else if (specialpage.realname === 'Diff') {
			pg.re.specialdiff = RegExp(
				'/' + sp + '(?:%3A|:)(?:' + buildSpecialPageGroup(specialpage) + ')/([^?#]*)',
				'i'
			);
		} else if (specialpage.realname === 'Emailuser') {
			pg.re.email = RegExp(
				'(title=|/)' +
                    sp +
                    '(?:%3A|:)(?:' +
                    buildSpecialPageGroup(specialpage) +
                    ')' +
                    '(&target=|/|/(?:' +
                    nsRe(pg.nsUserId) +
                    ':)?)(.*)',
				'i'
			);
		} else if (specialpage.realname === 'Whatlinkshere') {
			pg.re.backlinks = RegExp(
				'(title=|/)' +
                    sp +
                    '(?:%3A|:)(?:' +
                    buildSpecialPageGroup(specialpage) +
                    ')' +
                    '(&target=|/)([^&]*)',
				'i'
			);
		}
	});

	var im = nsReImage();
	// note: tries to get images in infobox templates too, e.g. movie pages, album pages etc
	//					  (^|\[\[)image: *([^|\]]*[^|\] ]) *
	//					  (^|\[\[)image: *([^|\]]*[^|\] ])([^0-9\]]*([0-9]+) *px)?
	//														$4 = 120 as in 120px
	pg.re.image = RegExp(
		'(^|\\[\\[)' +
            im +
            ': *([^|\\]]*[^|\\] ])' +
            '([^0-9\\]]*([0-9]+) *px)?|(?:\\n *[|]?|[|]) *' +
            '(' +
            getValueOf('popupImageVarsRegexp') +
            ')' +
            ' *= *(?:\\[\\[ *)?(?:' +
            im +
            ':)?' +
            '([^|]*?)(?:\\]\\])? *[|]? *\\n',
		'img'
	);
	pg.re.imageBracketCount = 6;

	pg.re.category = RegExp('\\[\\[' + nsRe(pg.nsCategoryId) + ': *([^|\\]]*[^|\\] ]) *', 'i');
	pg.re.categoryBracketCount = 1;

	pg.re.ipUser = RegExp(
		'^' +
            // IPv6
            '(?::(?::|(?::[0-9A-Fa-f]{1,4}){1,7})|[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){0,6}::|[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){7})' +
            // IPv4
            '|(((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}' +
            '(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9]))$'
	);

	pg.re.stub = RegExp(getValueOf('popupStubRegexp'), 'im');
	pg.re.disambig = RegExp(getValueOf('popupDabRegexp'), 'im');

	// FIXME replace with general parameter parsing function, this is daft
	pg.re.oldid = /[?&]oldid=([^&]*)/;
	pg.re.diff = /[?&]diff=([^&]*)/;
}

//////////////////////////////////////////////////
// miscellany

function setupCache() {
	// page caching
	pg.cache.pages = [];
}

function setMisc() {
	pg.current.link = null;
	pg.current.links = [];
	pg.current.linksHash = {};

	setupCache();

	pg.timer.checkPopupPosition = null;
	pg.counter.loop = 0;

	// ids change with each popup: popupImage0, popupImage1 etc
	pg.idNumber = 0;

	// for myDecodeURI
	pg.misc.decodeExtras = [
		{ from: '%2C', to: ',' },
		{ from: '_', to: ' ' },
		{ from: '%24', to: '$' },
		{ from: '%26', to: '&' } // no ,
	];
}

function getMwApi() {
	if (!pg.api.client) {
		pg.api.userAgent = 'Navigation popups/1.0 (' + mw.config.get('wgServerName') + ')';
		pg.api.client = new mw.Api({
			ajax: {
				headers: {
					'Api-User-Agent': pg.api.userAgent
				}
			}
		});
	}
	return pg.api.client;
}

// We need a callback since this might end up asynchronous because of
// the mw.loader.using() call.
function setupPopups(callback) {
	if (setupPopups.completed) {
		if (typeof callback === 'function') {
			callback();
		}
		return;
	}
	// These dependencies should alse be enforced from the gadget,
	// but not everyone loads this as a gadget, so double check
	mw.loader
		.using([
			'mediawiki.util',
			'mediawiki.api',
			'mediawiki.user',
			'user.options',
			'mediawiki.jqueryMsg'
		])
		.then(fetchSpecialPageNames)
		.then(() => {
			// NB translatable strings should be set up first (strings.js)
			// basics
			setupDebugging();
			setSiteInfo();
			setTitleBase();
			setOptions(); // see options.js
			setUserInfo();

			// namespaces etc
			setNamespaces();
			setInterwiki();

			// regexps
			setRegexps();
			setRedirs();

			// other stuff
			setMisc();
			setupLivePreview();

			// main deal here
			setupTooltips();
			log('In setupPopups(), just called setupTooltips()');
			Navpopup.tracker.enable();

			setupPopups.completed = true;
			if (typeof callback === 'function') {
				callback();
			}
		});
}
