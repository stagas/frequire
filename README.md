# frequire

Just f**ing require modules and share code with the browser.

### See example app

## API / Usage

```javascript
var f = require('frequire')(require)
```

### f.require(moduleName [, modulePath OR code ])

Loads and registers a module file, or pass some code to be required (it will be wrapped like: `module.exports = code`)

### f.expose('some', code)

Inserts `window['some'] = code`

### f.expose(fn)

Wraps and executes function: `(fn)()`

### f.middleware(options OR pathname)

Returns a Connect middleware.

For now the only option is the pathname to match with req.url (defaults to `/wrapped.js`)

### Inspirations

express-expose, browserify, brequire

### Credits

Uses browser require impl. by TJ Holowaychuk

### Licence

MIT/X11
