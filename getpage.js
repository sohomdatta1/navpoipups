//////////////////////////////////////////////////
// Wiki-specific downloading
//

// Schematic for a getWiki call
//
//             getPageWithCaching
//					|
//	   false		|		  true
// getPage<-[findPictureInCache]->-onComplete(a fake download)
//   \.
//	 (async)->addPageToCache(download)->-onComplete(download)

// check cache to see if page exists

function getPageWithCaching(url, onComplete, owner) {
	log('getPageWithCaching, url=' + url);
	var i = findInPageCache(url);
	var d;
	if (i > -1) {
		d = fakeDownload(
			url,
			owner.idNumber,
			onComplete,
			pg.cache.pages[i].data,
			pg.cache.pages[i].lastModified,
			owner
		);
	} else {
		d = getPage(url, onComplete, owner);
		if (d && owner && owner.addDownload) {
			owner.addDownload(d);
			d.owner = owner;
		}
	}
}

function getPage(url, onComplete, owner) {
	log('getPage');
	var callback = function (d) {
		if (!d.aborted) {
			addPageToCache(d);
			onComplete(d);
		}
	};
	return startDownload(url, owner.idNumber, callback);
}

function findInPageCache(url) {
	for (var i = 0; i < pg.cache.pages.length; ++i) {
		if (url == pg.cache.pages[i].url) {
			return i;
		}
	}
	return -1;
}

function addPageToCache(download) {
	log('addPageToCache ' + download.url);
	var page = {
		url: download.url,
		data: download.data,
		lastModified: download.lastModified
	};
	return pg.cache.pages.push(page);
}
