// Set up namespaces and other non-strings.js localization
// (currently that means redirs too)

function setNamespaces() {
	pg.nsSpecialId = -1;
	pg.nsMainspaceId = 0;
	pg.nsImageId = 6;
	pg.nsUserId = 2;
	pg.nsUsertalkId = 3;
	pg.nsCategoryId = 14;
	pg.nsTemplateId = 10;
}

function setRedirs() {
	var r = 'redirect';
	var R = 'REDIRECT';
	var redirLists = {
		ar: [R, 'تحويل'],
		be: [r, 'перанакіраваньне'],
		bg: [r, 'пренасочване', 'виж'],
		bs: [r, 'Preusmjeri', 'preusmjeri', 'PREUSMJERI'],
		bn: [R, 'পুনর্নির্দেশ'],
		cs: [R, 'PŘESMĚRUJ'],
		cy: [r, 'ail-cyfeirio'],
		de: [R, 'WEITERLEITUNG'],
		el: [R, 'ΑΝΑΚΑΤΕΥΘΥΝΣΗ'],
		eo: [R, 'ALIDIREKTU', 'ALIDIREKTI'],
		es: [R, 'REDIRECCIÓN'],
		et: [r, 'suuna'],
		ga: [r, 'athsheoladh'],
		gl: [r, 'REDIRECCIÓN', 'REDIRECIONAMENTO'],
		he: [R, 'הפניה'],
		hu: [R, 'ÁTIRÁNYÍTÁS'],
		is: [r, 'tilvísun', 'TILVÍSUN'],
		it: [R, 'RINVIA', 'Rinvia'],
		ja: [R, '転送'],
		mk: [r, 'пренасочување', 'види'],
		nds: [r, 'wiederleiden'],
		'nds-nl': [R, 'DEURVERWIEZING', 'DUURVERWIEZING'],
		nl: [R, 'DOORVERWIJZING'],
		nn: [r, 'omdiriger'],
		pl: [R, 'PATRZ', 'PRZEKIERUJ', 'TAM'],
		pt: [R, 'redir'],
		ru: [R, 'ПЕРЕНАПРАВЛЕНИЕ', 'ПЕРЕНАПР'],
		sk: [r, 'presmeruj'],
		sr: [r, 'Преусмери', 'преусмери', 'ПРЕУСМЕРИ', 'Preusmeri', 'preusmeri', 'PREUSMERI'],
		tr: [R, 'YÖNLENDİRME', 'yönlendirme', 'YÖNLENDİR', 'yönlendir'],
		tt: [R, 'yünältü', 'перенаправление', 'перенапр'],
		uk: [R, 'ПЕРЕНАПРАВЛЕННЯ', 'ПЕРЕНАПР'],
		vi: [r, 'đổi'],
		yi: [R, 'ווייטערפירן'],
		zh: [R, '重定向'] // no comma
	};
	var redirList = redirLists[pg.wiki.lang] || [r, R];
	// Mediawiki is very tolerant about what comes after the #redirect at the start
	pg.re.redirect = RegExp(
		'^\\s*[#](' + redirList.join('|') + ').*?\\[{2}([^\\|\\]]*)(|[^\\]]*)?\\]{2}\\s*(.*)',
		'i'
	);
}

function setInterwiki() {
	if (pg.wiki.wikimedia) {
		// From https://meta.wikimedia.org/wiki/List_of_Wikipedias
		//en.wikipedia.org/w/api.php?action=sitematrix&format=json&smtype=language&smlangprop=code&formatversion=2
		pg.wiki.interwiki =
            'aa|ab|ace|af|ak|als|am|an|ang|ar|arc|arz|as|ast|av|ay|az|ba|bar|bat-smg|bcl|be|be-x-old|bg|bh|bi|bjn|bm|bn|bo|bpy|br|bs|bug|bxr|ca|cbk-zam|cdo|ce|ceb|ch|cho|chr|chy|ckb|co|cr|crh|cs|csb|cu|cv|cy|da|de|diq|dsb|dv|dz|ee|el|eml|en|eo|es|et|eu|ext|fa|ff|fi|fiu-vro|fj|fo|fr|frp|frr|fur|fy|ga|gag|gan|gd|gl|glk|gn|got|gu|gv|ha|hak|haw|he|hi|hif|ho|hr|hsb|ht|hu|hy|hz|ia|id|ie|ig|ii|ik|ilo|io|is|it|iu|ja|jbo|jv|ka|kaa|kab|kbd|kg|ki|kj|kk|kl|km|kn|ko|koi|kr|krc|ks|ksh|ku|kv|kw|ky|la|lad|lb|lbe|lg|li|lij|lmo|ln|lo|lt|ltg|lv|map-bms|mdf|mg|mh|mhr|mi|mk|ml|mn|mo|mr|mrj|ms|mt|mus|mwl|my|myv|mzn|na|nah|nap|nds|nds-nl|ne|new|ng|nl|nn|no|nov|nrm|nv|ny|oc|om|or|os|pa|pag|pam|pap|pcd|pdc|pfl|pi|pih|pl|pms|pnb|pnt|ps|pt|qu|rm|rmy|rn|ro|roa-rup|roa-tara|ru|rue|rw|sa|sah|sc|scn|sco|sd|se|sg|sh|si|simple|sk|sl|sm|sn|so|sq|sr|srn|ss|st|stq|su|sv|sw|szl|ta|te|tet|tg|th|ti|tk|tl|tn|to|tpi|tr|ts|tt|tum|tw|ty|udm|ug|uk|ur|uz|ve|vec|vi|vls|vo|wa|war|wo|wuu|xal|xh|yi|yo|za|zea|zh|zh-classical|zh-min-nan|zh-yue|zu';
		pg.re.interwiki = RegExp('^' + pg.wiki.interwiki + ':');
	} else {
		pg.wiki.interwiki = null;
		pg.re.interwiki = /^$/;
	}
}

// return a regexp pattern matching all variants to write the given namespace
function nsRe(namespaceId) {
	var imageNamespaceVariants = [];
	mw.config.get('wgNamespaceIds').forEach( (_localizedNamespaceLc, _namespaceId) => {
		if (_namespaceId != namespaceId) {
			return;
		}
		_localizedNamespaceLc = upcaseFirst(_localizedNamespaceLc);
		imageNamespaceVariants.push(
			mw.util.escapeRegExp(_localizedNamespaceLc).split(' ').join('[ _]')
		);
		imageNamespaceVariants.push(mw.util.escapeRegExp(encodeURI(_localizedNamespaceLc)));
	} );

	return '(?:' + imageNamespaceVariants.join('|') + ')';
}

function nsReImage() {
	return nsRe(pg.nsImageId);
}
