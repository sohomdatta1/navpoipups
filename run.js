////////////////////////////////////////////////////////////////////
// Run things
////////////////////////////////////////////////////////////////////

// For some reason popups requires a fully loaded page jQuery.ready(...) causes problems for some.
// The old addOnloadHook did something similar to the below
if (document.readyState == 'complete') {
    autoEdit();
}
//will setup popups
else {
    $(window).on('load', autoEdit);
}

// Support for MediaWiki's live preview, VisualEditor's saves and Echo's flyout.
(function () {
    var once = true;
    function dynamicContentHandler($content) {
        // Try to detect the hook fired on initial page load and disregard
        // it, we already hook to onload (possibly to different parts of
        // page - it's configurable) and running twice might be bad. Ugly…
        if ($content.attr('id') == 'mw-content-text') {
            if (once) {
                once = false;
                return;
            }
        }

        function registerHooksForVisibleNavpops() {
            for (var i = 0; pg.current.links && i < pg.current.links.length; ++i) {
                var navpop = pg.current.links[i].navpopup;
                if (!navpop || !navpop.isVisible()) {
                    continue;
                }

                Navpopup.tracker.addHook(posCheckerHook(navpop));
            }
        }

        function doIt() {
            registerHooksForVisibleNavpops();
            $content.each(function () {
                this.ranSetupTooltipsAlready = false;
                setupTooltips(this);
            });
        }

        setupPopups(doIt);
    }

    // This hook is also fired after page load.
    mw.hook('wikipage.content').add(dynamicContentHandler);

    mw.hook('ext.echo.overlay.beforeShowingOverlay').add(function ($overlay) {
        dynamicContentHandler($overlay.find('.mw-echo-state'));
    });
}());