function substitute(data, cmdBody) {
	// alert('sub\nfrom: '+cmdBody.from+'\nto: '+cmdBody.to+'\nflags: '+cmdBody.flags);
	var fromRe = RegExp(cmdBody.from, cmdBody.flags);
	return data.replace(fromRe, cmdBody.to);
}

function execCmds(data, cmdList) {
	for (var i = 0; i < cmdList.length; ++i) {
		data = cmdList[i].action(data, cmdList[i]);
	}
	return data;
}

function parseCmd(str) {
	// returns a list of commands
	if (!str.length) {
		return [];
	}
	var p = false;
	switch (str.charAt(0)) {
		case 's':
			p = parseSubstitute(str);
			break;
		default:
			return false;
	}
	if (p) {
		return [p].concat(parseCmd(p.remainder));
	}
	return false;
}

// FIXME: Only used once here, confusing with native (and more widely-used) unescape, should probably be replaced
// Then again, unescape is semi-soft-deprecated, so we should look into replacing that too
function unEscape(str, sep) {
	return str
		.split('\\\\')
		.join('\\')
		.split('\\' + sep)
		.join(sep)
		.split('\\n')
		.join('\n');
}

function parseSubstitute(str) {
	// takes a string like s/a/b/flags;othercmds and parses it

	var from, to, flags, tmp;

	if (str.length < 4) {
		return false;
	}
	var sep = str.charAt(1);
	str = str.substring(2);

	tmp = skipOver(str, sep);
	if (tmp) {
		from = tmp.segment;
		str = tmp.remainder;
	} else {
		return false;
	}

	tmp = skipOver(str, sep);
	if (tmp) {
		to = tmp.segment;
		str = tmp.remainder;
	} else {
		return false;
	}

	flags = '';
	if (str.length) {
		tmp = skipOver(str, ';') || skipToEnd(str, ';');
		if (tmp) {
			flags = tmp.segment;
			str = tmp.remainder;
		}
	}

	return {
		action: substitute,
		from: from,
		to: to,
		flags: flags,
		remainder: str
	};
}

function skipOver(str, sep) {
	var endSegment = findNext(str, sep);
	if (endSegment < 0) {
		return false;
	}
	var segment = unEscape(str.substring(0, endSegment), sep);
	return { segment: segment, remainder: str.substring(endSegment + 1) };
}

/*eslint-disable*/
function skipToEnd(str, sep) {
    return { segment: str, remainder: '' };
}
/*eslint-enable */

function findNext(str, ch) {
	for (var i = 0; i < str.length; ++i) {
		if (str.charAt(i) == '\\') {
			i += 2;
		}
		if (str.charAt(i) == ch) {
			return i;
		}
	}
	return -1;
}

function setCheckbox(param, box) {
	var val = mw.util.getParamValue(param);
	if (val) {
		switch (val) {
			case '1':
			case 'yes':
			case 'true':
				box.checked = true;
				break;
			case '0':
			case 'no':
			case 'false':
				box.checked = false;
		}
	}
}

function autoEdit() {
	setupPopups(() => {
		if (mw.util.getParamValue('autoimpl') !== popupString('autoedit_version')) {
			return false;
		}
		if (
			mw.util.getParamValue('autowatchlist') &&
            mw.util.getParamValue('actoken') === autoClickToken()
		) {
			pg.fn.modifyWatchlist(mw.util.getParamValue('title'), mw.util.getParamValue('action'));
		}
		if (!document.editform) {
			return false;
		}
		if (autoEdit.alreadyRan) {
			return false;
		}
		autoEdit.alreadyRan = true;
		var cmdString = mw.util.getParamValue('autoedit');
		if (cmdString) {
			try {
				var editbox = document.editform.wpTextbox1;
				var cmdList = parseCmd(cmdString);
				var input = editbox.value;
				var output = execCmds(input, cmdList);
				editbox.value = output;
			} catch (dang) {
				return;
			}
			// wikEd user script compatibility
			if (typeof wikEdUseWikEd != 'undefined') {
				if (wikEdUseWikEd === true) {
					WikEdUpdateFrame();
				}
			}
		}
		setCheckbox('autominor', document.editform.wpMinoredit);
		setCheckbox('autowatch', document.editform.wpWatchthis);

		var rvid = mw.util.getParamValue('autorv');
		if (rvid) {
			var url =
                pg.wiki.apiwikibase +
                '?action=query&format=json&formatversion=2&prop=revisions&revids=' +
                rvid;
			startDownload(url, null, autoEdit2);
		} else {
			autoEdit2();
		}
	});
}

function autoEdit2(d) {
	var summary = mw.util.getParamValue('autosummary');
	var summaryprompt = mw.util.getParamValue('autosummaryprompt');
	var summarynotice = '';
	if (d && d.data && mw.util.getParamValue('autorv')) {
		var s = getRvSummary(summary, d.data);
		if (s === false) {
			summaryprompt = true;
			summarynotice = popupString(
				'Failed to get revision information, please edit manually.\n\n'
			);
			summary = simplePrintf(summary, [
				mw.util.getParamValue('autorv'),
				'(unknown)',
				'(unknown)'
			]);
		} else {
			summary = s;
		}
	}
	if (summaryprompt) {
		var txt =
            summarynotice + popupString('Enter a non-empty edit summary or press cancel to abort');
		var response = prompt(txt, summary);
		if (response) {
			summary = response;
		} else {
			return;
		}
	}
	if (summary) {
		document.editform.wpSummary.value = summary;
	}
	// Attempt to avoid possible premature clicking of the save button
	// (maybe delays in updates to the DOM are to blame?? or a red herring)
	setTimeout(autoEdit3, 100);
}

function autoClickToken() {
	return mw.user.sessionId();
}

function autoEdit3() {
	if (mw.util.getParamValue('actoken') != autoClickToken()) {
		return;
	}

	var btn = mw.util.getParamValue('autoclick');
	if (btn) {
		if (document.editform && document.editform[btn]) {
			var button = document.editform[btn];
			var msg = tprintf(
				'The %s button has been automatically clicked. Please wait for the next page to load.',
				[button.value]
			);
			bannerMessage(msg);
			document.title = '(' + document.title + ')';
			button.click();
		} else {
			alert(
				tprintf('Could not find button %s. Please check the settings in your javascript file.', [
					btn
				])
			);
		}
	}
}

function bannerMessage(s) {
	var headings = document.getElementsByTagName('h1');
	if (headings) {
		var div = document.createElement('div');
		div.innerHTML = '<font size=+1><b>' + pg.escapeQuotesHTML(s) + '</b></font>';
		headings[0].parentNode.insertBefore(div, headings[0]);
	}
}

function getRvSummary(template, json) {
	try {
		var o = getJsObj(json);
		var edit = anyChild(o.query.pages).revisions[0];
		var timestamp = edit.timestamp
			.split(/[A-Z]/g)
			.join(' ')
			.replace(/^ *| *$/g, '');
		return simplePrintf(template, [
			edit.revid,
			timestamp,
			edit.userhidden ? '(hidden)' : edit.user
		]);
	} catch (badness) {
		return false;
	}
}
