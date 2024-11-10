# Navpops
The code for [WP:NAVPOPS](https://en.wikipedia.org/wiki/Wikipedia:Tools/Navigation_popups).
## Development
```sh
npm run dev
```
and add the following to your `common.js`
```js
mw.loader.load('http://localhost:5173/dist/index.js');
importStylesheet( 'MediaWiki:Gadget-navpop.css' )
```
