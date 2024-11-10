//////////////////////////////////////////////////
// Globals
//

// Trying to shove as many of these as possible into the pg (popup globals) object
var pg = {
    api: {}, // MediaWiki API requests
    re: {}, // regexps
    ns: {}, // namespaces
    string: {}, // translatable strings
    wiki: {}, // local site info
    user: {}, // current user info
    misc: {}, // YUCK PHOOEY
    option: {}, // options, see newOption etc
    optionDefault: {}, // default option values
    flag: {}, // misc flags
    cache: {}, // page and image cache
    structures: {}, // navlink structures
    timer: {}, // all sorts of timers (too damn many)
    counter: {}, // .. and all sorts of counters
    current: {}, // state info
    fn: {}, // functions
    endoflist: null,
};

/* Bail if the gadget/script is being loaded twice */
/* An element with id "pg" would add a window.pg property, ignore such property */
if (window.pg && !(window.pg instanceof HTMLElement)) {
    return;
}

/* Export to global context */
window.pg = pg;

/// Local Variables: ///
/// mode:c ///
/// End: ///