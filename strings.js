//////////////////////////////////////////////////
// Translatable strings
//////////////////////////////////////////////////
//
// See instructions at
// https://en.wikipedia.org/wiki/Wikipedia:Tools/Navigation_popups/Translation

pg.string = {
    /////////////////////////////////////
    // summary data, searching etc.
    /////////////////////////////////////
    article: 'article',
    category: 'category',
    categories: 'categories',
    image: 'image',
    images: 'images',
    stub: 'stub',
    'section stub': 'section stub',
    'Empty page': 'Empty page',
    kB: 'kB',
    bytes: 'bytes',
    day: 'day',
    days: 'days',
    hour: 'hour',
    hours: 'hours',
    minute: 'minute',
    minutes: 'minutes',
    second: 'second',
    seconds: 'seconds',
    week: 'week',
    weeks: 'weeks',
    search: 'search',
    SearchHint: 'Find English Wikipedia articles containing %s',
    web: 'web',
    global: 'global',
    globalSearchHint: 'Search across Wikipedias in different languages for %s',
    googleSearchHint: 'Google for %s',
    /////////////////////////////////////
    // article-related actions and info
    // (some actions also apply to user pages)
    /////////////////////////////////////
    actions: 'actions', ///// view articles and view talk
    popupsMenu: 'popups',
    togglePreviewsHint: 'Toggle preview generation in popups on this page',
    'enable previews': 'enable previews',
    'disable previews': 'disable previews',
    'toggle previews': 'toggle previews',
    'show preview': 'show preview',
    reset: 'reset',
    'more...': 'more...',
    disable: 'disable popups',
    disablePopupsHint: 'Disable popups on this page. Reload page to re-enable.',
    historyfeedHint: 'RSS feed of recent changes to this page',
    purgePopupsHint: 'Reset popups, clearing all cached popup data.',
    PopupsHint: 'Reset popups, clearing all cached popup data.',
    spacebar: 'space',
    view: 'view',
    'view article': 'view article',
    viewHint: 'Go to %s',
    talk: 'talk',
    'talk page': 'talk page',
    'this&nbsp;revision': 'this&nbsp;revision',
    'revision %s of %s': 'revision %s of %s',
    'Revision %s of %s': 'Revision %s of %s',
    'the revision prior to revision %s of %s': 'the revision prior to revision %s of %s',
    'Toggle image size': 'Click to toggle image size',
    del: 'del', ///// delete, protect, move
    delete: 'delete',
    deleteHint: 'Delete %s',
    undeleteShort: 'un',
    UndeleteHint: 'Show the deletion history for %s',
    protect: 'protect',
    protectHint: 'Restrict editing rights to %s',
    unprotectShort: 'un',
    unprotectHint: 'Allow %s to be edited by anyone again',
    'send thanks': 'send thanks',
    ThanksHint: 'Send a thank you notification to this user',
    move: 'move',
    'move page': 'move page',
    MovepageHint: 'Change the title of %s',
    edit: 'edit', ///// edit articles and talk
    'edit article': 'edit article',
    editHint: 'Change the content of %s',
    'edit talk': 'edit talk',
    new: 'new',
    'new topic': 'new topic',
    newSectionHint: 'Start a new section on %s',
    'null edit': 'null edit',
    nullEditHint: 'Submit an edit to %s, making no changes ',
    hist: 'hist', ///// history, diffs, editors, related
    history: 'history',
    historyHint: 'List the changes made to %s',
    'History preview failed': 'History preview failed :-(',
    last: 'prev', // For labelling the previous revision in history pages; the key is "last" for backwards compatibility
    lastEdit: 'lastEdit',
    'mark patrolled': 'mark patrolled',
    markpatrolledHint: 'Mark this edit as patrolled',
    'Could not marked this edit as patrolled': 'Could not marked this edit as patrolled',
    'show last edit': 'most recent edit',
    'Show the last edit': 'Show the effects of the most recent change',
    lastContrib: 'lastContrib',
    'last set of edits': 'latest edits',
    lastContribHint: 'Show the net effect of changes made by the last editor',
    cur: 'cur',
    diffCur: 'diffCur',
    'Show changes since revision %s': 'Show changes since revision %s',
    '%s old': '%s old', // as in 4 weeks old
    oldEdit: 'oldEdit',
    purge: 'purge',
    purgeHint: 'Demand a fresh copy of %s',
    raw: 'source',
    rawHint: 'Download the source of %s',
    render: 'simple',
    renderHint: 'Show a plain HTML version of %s',
    'Show the edit made to get revision': 'Show the edit made to get revision',
    sinceMe: 'sinceMe',
    'changes since mine': 'diff my edit',
    sinceMeHint: 'Show changes since my last edit',
    "Couldn't find an edit by %s\nin the last %s edits to\n%s":
        "Couldn't find an edit by %s\nin the last %s edits to\n%s",
    eds: 'eds',
    editors: 'editors',
    editorListHint: 'List the users who have edited %s',
    related: 'related',
    relatedChanges: 'relatedChanges',
    'related changes': 'related changes',
    RecentchangeslinkedHint: 'Show changes in articles related to %s',
    editOld: 'editOld', ///// edit old version, or revert
    rv: 'rv',
    revert: 'revert',
    revertHint: 'Revert to %s',
    defaultpopupReviewedSummary:
        'Accepted by reviewing the [[Special:diff/%s/%s|difference]] between this version and previously accepted version using [[:en:Wikipedia:Tools/Navigation_popups|popups]]',
    defaultpopupRedlinkSummary:
        'Removing link to empty page [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]',
    defaultpopupFixDabsSummary:
        'Disambiguate [[%s]] to [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]',
    defaultpopupFixRedirsSummary:
        'Redirect bypass from [[%s]] to [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]',
    defaultpopupExtendedRevertSummary:
        'Revert to revision dated %s by %s, oldid %s using [[:en:Wikipedia:Tools/Navigation_popups|popups]]',
    defaultpopupRevertToPreviousSummary:
        'Revert to the revision prior to revision %s using [[:en:Wikipedia:Tools/Navigation_popups|popups]]',
    defaultpopupRevertSummary:
        'Revert to revision %s using [[:en:Wikipedia:Tools/Navigation_popups|popups]]',
    defaultpopupQueriedRevertToPreviousSummary:
        'Revert to the revision prior to revision $1 dated $2 by $3 using [[:en:Wikipedia:Tools/Navigation_popups|popups]]',
    defaultpopupQueriedRevertSummary:
        'Revert to revision $1 dated $2 by $3 using [[:en:Wikipedia:Tools/Navigation_popups|popups]]',
    defaultpopupRmDabLinkSummary:
        'Remove link to dab page [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]',
    Redirects: 'Redirects', // as in Redirects to ...
    ' to ': ' to ', // as in Redirects to ...
    'Bypass redirect': 'Bypass redirect',
    'Fix this redirect': 'Fix this redirect',
    disambig: 'disambig', ///// add or remove dab etc.
    disambigHint: 'Disambiguate this link to [[%s]]',
    'Click to disambiguate this link to:': 'Click to disambiguate this link to:',
    'remove this link': 'remove this link',
    'remove all links to this page from this article':
        'remove all links to this page from this article',
    'remove all links to this disambig page from this article':
        'remove all links to this disambig page from this article',
    mainlink: 'mainlink', ///// links, watch, unwatch
    wikiLink: 'wikiLink',
    wikiLinks: 'wikiLinks',
    'links here': 'links here',
    whatLinksHere: 'whatLinksHere',
    'what links here': 'what links here',
    WhatlinkshereHint: 'List the pages that are hyperlinked to %s',
    unwatchShort: 'un',
    watchThingy: 'watch', // called watchThingy because {}.watch is a function
    watchHint: 'Add %s to my watchlist',
    unwatchHint: 'Remove %s from my watchlist',
    'Only found one editor: %s made %s edits': 'Only found one editor: %s made %s edits',
    '%s seems to be the last editor to the page %s':
        '%s seems to be the last editor to the page %s',
    rss: 'rss',
    /////////////////////////////////////
    // diff previews
    /////////////////////////////////////
    'Diff truncated for performance reasons': 'Diff truncated for performance reasons',
    'Old revision': 'Old revision',
    'New revision': 'New revision',
    'Something went wrong :-(': 'Something went wrong :-(',
    'Empty revision, maybe non-existent': 'Empty revision, maybe non-existent',
    'Unknown date': 'Unknown date',
    /////////////////////////////////////
    // other special previews
    /////////////////////////////////////
    'Empty category': 'Empty category',
    'Category members (%s shown)': 'Category members (%s shown)',
    'No image links found': 'No image links found',
    'File links': 'File links',
    'No image found': 'No image found',
    'Image from Commons': 'Image from Commons',
    'Description page': 'Description page',
    'Alt text:': 'Alt text:',
    revdel: 'Hidden revision',
    /////////////////////////////////////
    // user-related actions and info
    /////////////////////////////////////
    user: 'user', ///// user page, talk, email, space
    'user&nbsp;page': 'user&nbsp;page',
    'user talk': 'user talk',
    'edit user talk': 'edit user talk',
    'leave comment': 'leave comment',
    email: 'email',
    'email user': 'email user',
    EmailuserHint: 'Send an email to %s',
    space: 'space', // short form for userSpace link
    PrefixIndexHint: 'Show pages in the userspace of %s',
    count: 'count', ///// contributions, log
    'edit counter': 'edit counter',
    editCounterLinkHint: 'Count the contributions made by %s',
    contribs: 'contribs',
    contributions: 'contributions',
    deletedContribs: 'deleted contributions',
    DeletedcontributionsHint: 'List deleted edits made by %s',
    ContributionsHint: 'List the contributions made by %s',
    log: 'log',
    'user log': 'user log',
    userLogHint: "Show %s's user log",
    arin: 'ARIN lookup', ///// ARIN lookup, block user or IP
    'Look up %s in ARIN whois database': 'Look up %s in the ARIN whois database',
    unblockShort: 'un',
    block: 'block',
    'block user': 'block user',
    IpblocklistHint: 'Unblock %s',
    BlockipHint: 'Prevent %s from editing',
    'block log': 'block log',
    blockLogHint: 'Show the block log for %s',
    protectLogHint: 'Show the protection log for %s',
    pageLogHint: 'Show the page log for %s',
    deleteLogHint: 'Show the deletion log for %s',
    'Invalid %s %s': 'The option %s is invalid: %s',
    'No backlinks found': 'No backlinks found',
    ' and more': ' and more',
    undo: 'undo',
    undoHint: 'undo this edit',
    'Download preview data': 'Download preview data',
    'Invalid or IP user': 'Invalid or IP user',
    'Not a registered username': 'Not a registered username',
    BLOCKED: 'BLOCKED',
    'Has blocks': 'Has blocks',
    ' edits since: ': ' edits since: ',
    'last edit on ': 'last edit on ',
    'he/him': 'he/him',
    'she/her': 'she/her',
    /////////////////////////////////////
    // Autoediting
    /////////////////////////////////////
    'Enter a non-empty edit summary or press cancel to abort':
        'Enter a non-empty edit summary or press cancel to abort',
    'Failed to get revision information, please edit manually.\n\n':
        'Failed to get revision information, please edit manually.\n\n',
    'The %s button has been automatically clicked. Please wait for the next page to load.':
        'The %s button has been automatically clicked. Please wait for the next page to load.',
    'Could not find button %s. Please check the settings in your javascript file.':
        'Could not find button %s. Please check the settings in your javascript file.',
    /////////////////////////////////////
    // Popups setup
    /////////////////////////////////////
    'Open full-size image': 'Open full-size image',
    zxy: 'zxy',
    autoedit_version: 'np20140416',
};

function popupString(str) {
    if (typeof popupStrings != 'undefined' && popupStrings && popupStrings[str]) {
        return popupStrings[str];
    }
    if (pg.string[str]) {
        return pg.string[str];
    }
    return str;
}

function tprintf(str, subs) {
    if (typeof subs != typeof []) {
        subs = [subs];
    }
    return simplePrintf(popupString(str), subs);
}