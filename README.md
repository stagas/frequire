# frequire

Just f**ing require modules and components and share code with the browser.

### Also see the [example](https://github.com/stagas/frequire/blob/master/example/app.js)

## Example

#### server:

```javascript
var f = require('frequire')(__dirname)
f.require([ 'jquery', 'client' ])
f.expose(function () { require('client').start() })
app.use(f.middleware())
```

#### index.html

Simply insert these in `<head>`:
```html
  <link rel="stylesheet" href="/wrapped.css">
  <script src="/wrapped.js"></script>
```

Then in your client code:

```html
var $ = require('jquery')
```

## API

#### f.require('module')

Load and register a module to be required.

#### f.require('module', './path/to/module')

Load a module from path, and register it with another name.

#### f.require(['emitter', 'jquery', 'tip'])

Mass register modules.

#### f.require([ 'x', ['y', './path/to/y'] ])

Combinations.

#### f.require('fn', function () { return 'woo!' })

Pass a function to be sourced out.

#### f.require('system', { os: 'amigaos3.1', reset: function () { return 'Ctrl+Amiga+Amiga' } })

Or an object.

### More

You can also require JSON files.

Any other types will be returned as Strings (for example you could require an html document, a css file, etc).

#### f.expose('some', code)

Inserts `window['some'] = code`

#### f.expose(fn)

Wraps and executes function: `(fn)()`

#### f.middleware(options OR namespace)

Returns a Connect middleware.

For now the only option is the namespace to match with req.url (defaults to `wrapped`)

### Inspirations

component, express-expose, browserify, brequire

### Credits

Uses browser require impl. by TJ Holowaychuk

### Licence

MIT/X11
