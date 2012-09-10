# frequire

**require()** for the browser - works with npm modules, browserify modules, components, expose objects and more


### Also see the [example](https://github.com/stagas/frequire/blob/master/example/app.js)

## Example

#### server.js:

```javascript
var f = require('frequire')(__dirname)

f.expose(f.node().js) // node.js shim, needed by browserify modules

f.require('popover') // component modules
f.require('http', 'http-browserify') // browserify modules, here with alias
f.require('shoe') // a browserify module
f.require('youtube-player') // another browserify module
f.require('./client') // our client code

f.expose(function () { window.onload = require('./client') }) // expose a function to execute immediately

f.expose('config', { name: 'frequire demo' }) // exposes objects in window

f.require('yo', { run: function () { alert('yo', config.name) } }) // expose an object as a module

f.expose('require("yo").run()') // expose raw code

app.use(f.middleware())

```

#### index.html

Simply insert these in `<head>`:

```html
  <link rel="stylesheet" href="/wrapped.css">
  <script src="/wrapped.js"></script>
```

Then in your client code:

#### client.js

```javascript
module.exports = function () {
  var $ = require('jquery')
  var http = require('http')
  var Popover = require('popover')
  var shoe = require('shoe')
  var YouTubePlayer = require('youtube-player')

  var $result = $('#result')

  $('a').on('click', function (ev) {
    var popover = new Popover($(this).attr('title'), 'Hello');
    popover.show(this)
    setTimeout(function () {
      popover.hide()
    }, 1000)
  })

  http.get({ path : '/beep' }, function (res) {
    var div = $result[0]
    div.innerHTML += 'GET /beep<br>';

    res.on('data', function (buf) {
      div.innerHTML += buf;
    });

    res.on('end', function () {
      div.innerHTML += '<br>__END__';
    });
  });

  var stream = shoe('/invert')

  stream.on('data', function (data) {
    $result[0].appendChild(document.createTextNode(data))
  })

  var p = new YouTubePlayer({ id: 'player', width: 400, height: 300 })

  p.play('EvObIwCu8CQ')
}

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

#### f.expose('code')

Inserts raw code

#### f.expose(fn)

Wraps and executes function: `(fn)()`

#### f.middleware(options OR namespace)

Returns a Connect middleware.

For now the only option is the namespace to match with req.url (defaults to `wrapped`)

### Inspirations

component, express-expose, browserify, brequire

### Credits

- Uses a modified version of [component/require](https://github.com/component/require) by TJ Holowaychuk

- node.js shims extracted from [browserify](https://github.com/substack/node-browserify/) by James Halliday (aka substack)

### Licence

MIT/X11
