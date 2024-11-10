/**
	 * Load diff data.
	 *
	 * lets jump through hoops to find the rev ids we need to retrieve
	 *
	 * @param {Title} article
	 * @param {string} oldid
	 * @param {string} diff
	 * @param {Navpopup} navpop
	 */
function loadDiff(article, oldid, diff, navpop) {
	navpop.diffData = { oldRev: {}, newRev: {} };
	mw.loader.using('mediawiki.api').then(() => {
		var api = getMwApi();
		var params = {
			action: 'compare',
			prop: 'ids|title'
		};
		params.fromtitle = article.toString();

		switch (diff) {
			case 'cur':
				switch (oldid) {
					case null:
					case '':
					case 'prev':
						// this can only work if we have the title
						// cur -> prev
						params.torelative = 'prev';
						break;
					default:
						params.fromrev = oldid;
						params.torelative = 'cur';
						break;
				}
				break;
			case 'prev':
				if (oldid && oldid !== 'cur') {
					params.fromrev = oldid;
				}
				params.torelative = 'prev';
				break;
			case 'next':
				params.fromrev = oldid || 0;
				params.torelative = 'next';
				break;
			default:
				params.fromrev = oldid || 0;
				params.torev = diff || 0;
				break;
		}

		api.get(params).then((data) => {
			navpop.diffData.oldRev.revid = data.compare.fromrevid;
			navpop.diffData.newRev.revid = data.compare.torevid;

			addReviewLink(navpop, 'popupMiscTools');

			var go = function () {
				pendingNavpopTask(navpop);
				var url = pg.wiki.apiwikibase + '?format=json&formatversion=2&action=query&';

				url += 'revids=' + navpop.diffData.oldRev.revid + '|' + navpop.diffData.newRev.revid;
				url += '&prop=revisions&rvslots=main&rvprop=ids|timestamp|content';

				getPageWithCaching(url, doneDiff, navpop);

				return true; // remove hook once run
			};
			if (navpop.visible || !getValueOf('popupLazyDownloads')) {
				go();
			} else {
				navpop.addHook(go, 'unhide', 'before', 'DOWNLOAD_DIFFS');
			}
		});
	});
}

// Put a "mark patrolled" link to an element target
// TODO: Allow patrol a revision, as well as a diff
function addReviewLink(navpop, target) {
	if (!pg.user.canReview) {
		return;
	}
	// If 'newRev' is older than 'oldRev' than it could be confusing, so we do not show the review link.
	if (navpop.diffData.newRev.revid <= navpop.diffData.oldRev.revid) {
		return;
	}
	var params = {
		action: 'query',
		prop: 'info|flagged',
		revids: navpop.diffData.oldRev.revid,
		formatversion: 2
	};
	getMwApi()
		.get(params)
		.then((data) => {
			var stable_revid =
                (data.query.pages[0].flagged && data.query.pages[0].flagged.stable_revid) || 0;
			// The diff can be reviewed if the old version is the last reviewed version
			// TODO: Other possible conditions that we may want to implement instead of this one:
			//  * old version is patrolled and the new version is not patrolled
			//  * old version is patrolled and the new version is more recent than the last reviewed version
			if (stable_revid == navpop.diffData.oldRev.revid) {
				var a = document.createElement('a');
				a.innerHTML = popupString('mark patrolled');
				a.title = popupString('markpatrolledHint');
				a.onclick = function () {
					var params = {
						action: 'review',
						revid: navpop.diffData.newRev.revid,
						comment: tprintf('defaultpopupReviewedSummary', [
							navpop.diffData.oldRev.revid,
							navpop.diffData.newRev.revid
						])
					};
					getMwApi()
						.postWithToken('csrf', params)
						.done(() => {
							a.style.display = 'none';
							// TODO: Update current page and other already constructed popups
						})
						.fail(() => {
							alert(popupString('Could not marked this edit as patrolled'));
						});
				};
				setPopupHTML(a, target, navpop.idNumber, null, true);
			}
		});
}

function doneDiff(download) {
	if (!download.owner || !download.owner.diffData) {
		return;
	}
	var navpop = download.owner;
	completedNavpopTask(navpop);

	var pages,
		revisions = [];
	try {
		// Process the downloads
		pages = getJsObj(download.data).query.pages;
		for (var i = 0; i < pages.length; i++) {
			revisions = revisions.concat(pages[i].revisions);
		}
		for (i = 0; i < revisions.length; i++) {
			if (revisions[i].revid == navpop.diffData.oldRev.revid) {
				navpop.diffData.oldRev.revision = revisions[i];
			} else if (revisions[i].revid == navpop.diffData.newRev.revid) {
				navpop.diffData.newRev.revision = revisions[i];
			}
		}
	} catch (someError) {
		errlog('Could not get diff');
	}

	insertDiff(navpop);
}

function rmBoringLines(a, b, context) {
	if (typeof context == 'undefined') {
		context = 2;
	}
	// this is fairly slow... i think it's quicker than doing a word-based diff from the off, though
	var aa = [],
		aaa = [];
	var bb = [],
		bbb = [];
	var i, j;

	// first, gather all disconnected nodes in a and all crossing nodes in a and b
	for (i = 0; i < a.length; ++i) {
		if (!a[i].paired) {
			aa[i] = 1;
		} else if (countCrossings(b, a, i, true)) {
			aa[i] = 1;
			bb[a[i].row] = 1;
		}
	}

	// pick up remaining disconnected nodes in b
	for (i = 0; i < b.length; ++i) {
		if (bb[i] == 1) {
			continue;
		}
		if (!b[i].paired) {
			bb[i] = 1;
		}
	}

	// another pass to gather context: we want the neighbours of included nodes which are not
	// yet included we have to add in partners of these nodes, but we don't want to add context
	// for *those* nodes in the next pass
	for (i = 0; i < b.length; ++i) {
		if (bb[i] == 1) {
			for (j = Math.max(0, i - context); j < Math.min(b.length, i + context); ++j) {
				if (!bb[j]) {
					bb[j] = 1;
					aa[b[j].row] = 0.5;
				}
			}
		}
	}

	for (i = 0; i < a.length; ++i) {
		if (aa[i] == 1) {
			for (j = Math.max(0, i - context); j < Math.min(a.length, i + context); ++j) {
				if (!aa[j]) {
					aa[j] = 1;
					bb[a[j].row] = 0.5;
				}
			}
		}
	}

	for (i = 0; i < bb.length; ++i) {
		if (bb[i] > 0) {
			// it's a row we need
			if (b[i].paired) {
				bbb.push(b[i].text);
			} // joined; partner should be in aa
			else {
				bbb.push(b[i]);
			}
		}
	}
	for (i = 0; i < aa.length; ++i) {
		if (aa[i] > 0) {
			// it's a row we need
			if (a[i].paired) {
				aaa.push(a[i].text);
			} // joined; partner should be in aa
			else {
				aaa.push(a[i]);
			}
		}
	}

	return { a: aaa, b: bbb };
}

function stripOuterCommonLines(a, b, context) {
	var i = 0;
	while (i < a.length && i < b.length && a[i] == b[i]) {
		++i;
	}
	var j = a.length - 1;
	var k = b.length - 1;
	while (j >= 0 && k >= 0 && a[j] == b[k]) {
		--j;
		--k;
	}

	return {
		a: a.slice(Math.max(0, i - 1 - context), Math.min(a.length + 1, j + context + 1)),
		b: b.slice(Math.max(0, i - 1 - context), Math.min(b.length + 1, k + context + 1))
	};
}

function insertDiff(navpop) {
	// for speed reasons, we first do a line-based diff, discard stuff that seems boring, then
	// do a word-based diff
	// FIXME: sometimes this gives misleading diffs as distant chunks are squashed together
	var oldlines = navpop.diffData.oldRev.revision.slots.main.content.split('\n');
	var newlines = navpop.diffData.newRev.revision.slots.main.content.split('\n');
	var inner = stripOuterCommonLines(oldlines, newlines, getValueOf('popupDiffContextLines'));
	oldlines = inner.a;
	newlines = inner.b;
	var truncated = false;
	getValueOf('popupDiffMaxLines');
	if (
		oldlines.length > pg.option.popupDiffMaxLines ||
        newlines.length > pg.option.popupDiffMaxLines
	) {
		// truncate
		truncated = true;
		inner = stripOuterCommonLines(
			oldlines.slice(0, pg.option.popupDiffMaxLines),
			newlines.slice(0, pg.option.popupDiffMaxLines),
			pg.option.popupDiffContextLines
		);
		oldlines = inner.a;
		newlines = inner.b;
	}

	var lineDiff = diff(oldlines, newlines);
	var lines2 = rmBoringLines(lineDiff.o, lineDiff.n);
	var oldlines2 = lines2.a;
	var newlines2 = lines2.b;

	var simpleSplit = !String.prototype.parenSplit.isNative;
	var html = '<hr />';
	if (getValueOf('popupDiffDates')) {
		html += diffDatesTable(navpop);
		html += '<hr />';
	}
	html += shortenDiffString(
		diffString(oldlines2.join('\n'), newlines2.join('\n'), simpleSplit),
		getValueOf('popupDiffContextCharacters')
	).join('<hr />');
	setPopupTipsAndHTML(
		html.split('\n').join('<br>') +
            (truncated ?
            	'<hr /><b>' + popupString('Diff truncated for performance reasons') + '</b>' :
            	''),
		'popupPreview',
		navpop.idNumber
	);
}

function diffDatesTable(navpop) {
	var html = '<table class="popup_diff_dates">';
	html += diffDatesTableRow(navpop.diffData.newRev.revision, tprintf('New revision'));
	html += diffDatesTableRow(navpop.diffData.oldRev.revision, tprintf('Old revision'));
	html += '</table>';
	return html;
}
function diffDatesTableRow(revision, label) {
	var txt = '';
	var lastModifiedDate = new Date(revision.timestamp);

	txt = formattedDateTime(lastModifiedDate);

	var revlink = generalLink({
		url: mw.config.get('wgScript') + '?oldid=' + revision.revid,
		text: label,
		title: label
	});
	return simplePrintf('<tr><td>%s</td><td>%s</td></tr>', [revlink, txt]);
}
