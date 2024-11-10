function popupFilterPageSize(data) {
	return formatBytes(data.length);
}

function popupFilterCountLinks(data) {
	var num = countLinks(data);
	return String(num) + '&nbsp;' + (num != 1 ? popupString('wikiLinks') : popupString('wikiLink'));
}

function popupFilterCountImages(data) {
	var num = countImages(data);
	return String(num) + '&nbsp;' + (num != 1 ? popupString('images') : popupString('image'));
}

function popupFilterCountCategories(data) {
	var num = countCategories(data);
	return (
		String(num) + '&nbsp;' + (num != 1 ? popupString('categories') : popupString('category'))
	);
}

function popupFilterLastModified(data, download) {
	var lastmod = download.lastModified;
	var now = new Date();
	var age = now - lastmod;
	if (lastmod && getValueOf('popupLastModified')) {
		return tprintf('%s old', [formatAge(age)]).replace(/ /g, '&nbsp;');
	}
	return '';
}

function popupFilterWikibaseItem(data, download) {
	return download.wikibaseItem ?
		tprintf('<a href="%s">%s</a>', [
			download.wikibaseRepo.replace(/\$1/g, download.wikibaseItem),
			download.wikibaseItem
		]) :
		'';
}

function formatAge(age) {
	// coerce into a number
	var a = 0 + age,
		aa = a;

	var seclen = 1000;
	var minlen = 60 * seclen;
	var hourlen = 60 * minlen;
	var daylen = 24 * hourlen;
	var weeklen = 7 * daylen;

	var numweeks = (a - (a % weeklen)) / weeklen;
	a = a - numweeks * weeklen;
	var sweeks = addunit(numweeks, 'week');
	var numdays = (a - (a % daylen)) / daylen;
	a = a - numdays * daylen;
	var sdays = addunit(numdays, 'day');
	var numhours = (a - (a % hourlen)) / hourlen;
	a = a - numhours * hourlen;
	var shours = addunit(numhours, 'hour');
	var nummins = (a - (a % minlen)) / minlen;
	a = a - nummins * minlen;
	var smins = addunit(nummins, 'minute');
	var numsecs = (a - (a % seclen)) / seclen;
	a = a - numsecs * seclen;
	var ssecs = addunit(numsecs, 'second');

	if (aa > 4 * weeklen) {
		return sweeks;
	}
	if (aa > weeklen) {
		return sweeks + ' ' + sdays;
	}
	if (aa > daylen) {
		return sdays + ' ' + shours;
	}
	if (aa > 6 * hourlen) {
		return shours;
	}
	if (aa > hourlen) {
		return shours + ' ' + smins;
	}
	if (aa > 10 * minlen) {
		return smins;
	}
	if (aa > minlen) {
		return smins + ' ' + ssecs;
	}
	return ssecs;
}

function addunit(num, str) {
	return String(num) + ' ' + (num != 1 ? popupString(str + 's') : popupString(str));
}

function runPopupFilters(list, data, download) {
	var ret = [];
	for (var i = 0; i < list.length; ++i) {
		if (list[i] && typeof list[i] == 'function') {
			var s = list[i](data, download, download.owner.article);
			if (s) {
				ret.push(s);
			}
		}
	}
	return ret;
}

function getPageInfo(data, download) {
	if (!data || data.length === 0) {
		return popupString('Empty page');
	}

	var popupFilters = getValueOf('popupFilters') || [];
	var extraPopupFilters = getValueOf('extraPopupFilters') || [];
	var pageInfoArray = runPopupFilters(popupFilters.concat(extraPopupFilters), data, download);

	var pageInfo = pageInfoArray.join(', ');
	if (pageInfo !== '') {
		pageInfo = upcaseFirst(pageInfo);
	}
	return pageInfo;
}

// this could be improved!
function countLinks(wikiText) {
	return wikiText.split('[[').length - 1;
}

// if N = # matches, n = # brackets, then
// String.parenSplit(regex) intersperses the N+1 split elements
// with Nn other elements. So total length is
// L= N+1 + Nn = N(n+1)+1. So N=(L-1)/(n+1).

function countImages(wikiText) {
	return (wikiText.parenSplit(pg.re.image).length - 1) / (pg.re.imageBracketCount + 1);
}

function countCategories(wikiText) {
	return (wikiText.parenSplit(pg.re.category).length - 1) / (pg.re.categoryBracketCount + 1);
}

function popupFilterStubDetect(data, download, article) {
	var counts = stubCount(data, article);
	if (counts.real) {
		return popupString('stub');
	}
	if (counts.sect) {
		return popupString('section stub');
	}
	return '';
}

function popupFilterDisambigDetect(data, download, article) {
	if (!getValueOf('popupAllDabsStubs') && article.namespace()) {
		return '';
	}
	return isDisambig(data, article) ? popupString('disambig') : '';
}

function formatBytes(num) {
	return num > 949 ?
		Math.round(num / 100) / 10 + popupString('kB') :
		num + '&nbsp;' + popupString('bytes');
}
