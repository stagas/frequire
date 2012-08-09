var fs = require('fs')
var path = require('path')
var exists = fs.existsSync || path.existsSync
var extname = path.extname
var dirname = path.dirname
var normalize = path.normalize
var toSource = require('tosource')

var requireManager = read(__dirname + '/require.js')

module.exports = function (_require, skipPackageJson) {
  var wrapped = requireManager
  var styles = ''
  return {
    require: function __require (name, thing, resolver, skipFiles) {
      if (Array.isArray(name)) {
        name.forEach(function (n) {
          if (Array.isArray(n)) __require(n[0], n[1])
          else __require(n)
        })
        return this
      }
      var args = [].slice.call(arguments)
      var registryName = name
      resolver = resolver || _require.resolve

      if ('string' === typeof thing) {
        // passing path
        if (!~thing.indexOf(' ')) name = thing
        else {
          // pass code string
          wrapped += wrap(name, thing)
          return this
        }
      }

      // passing code
      else if (null != thing) {
        wrapped += wrap(name, 'module.exports = ' + toSource(thing))
        return this
      }

      var isComponent = args[1] && !!~args[1].indexOf('component')

      try {
        var filename = resolver(name)
      } catch(e) {
        if (isComponent && ~args[1].indexOf('component-')) {
          throw e
        }
        args[1] = isComponent ? 'component-' + args[0] : args[0] + '-component'
        return __require.apply(this, args)
      }

      var ext = extname(filename.toLowerCase())

      var script = read(filename)

      var moduleName = name.split('-component')[0]
      if (moduleName[0] == '.') moduleName = moduleName.split('/')[1]

      // bundle package.files
      if (!skipFiles) {
        var pkg = readPackageJson(filename) || {}

        function requireChildren (files, type) {
          if (!Array.isArray(files)) files = Object.keys(files).map(function (el) { return files[el] })
          for (var i = files.length; i--;) {
            __require(
              moduleName + '/' + files[i]
            , files[i]
            , function (x) { return resolver(name + '/' + x) }
            , true
            )
          }
        }

        if (pkg.files) requireChildren(pkg.files)
        if (pkg.component) {
          if (pkg.component.styles) requireChildren(pkg.component.styles)
          if (pkg.component.templates) {
            script = "var render = function (n) { return require('./' + n + '.html') };\n" + script
            requireChildren(pkg.component.templates)
          }
        }
      }

      if ('.js' === ext) {}
      else if ('.json' === ext) script = 'module.exports = ' + script
      else {
        if ('.css' === ext) {
          styles += '/* stylesheet: ' + registryName + ' */\n\n' + script + '\n\n'
        }
        script = 'module.exports = "' + script.replace(/"/g, '\\"').replace(/\r\n|\r|\n/g, '\\n') + '"'
      }

      wrapped += wrap(registryName, script)

      return this
    }

  , expose: function (name, thing) {
      wrapped += __expose(name, thing)
      return this
    }

  , middleware: function (opts) {
      if ('string' === typeof opts) opts = { name: opts }
      opts = opts || { name: 'wrapped' }
      return function (req, res, next) {
        if (req.url === '/' + opts.name + '.js') {
          res.setHeader('content-type', 'application/javascript')
          res.end(wrapped)
          return
        }
        else if (req.url === '/' + opts.name + '.css') {
          res.setHeader('content-type', 'text/css')
          res.end(styles)
          return
        }
        else {
          res.expose = function (name, thing) {
            res.locals.exposed = res.locals.exposed || ''
            res.locals.exposed += __expose(name, thing)
          }
          next()
        }
      }
    }
  }
}

function __expose (name, thing) {
  var s
  if ('function' === typeof name) {
    s = '\n;(' + name + ')();\n'
  }
  else s = '\nwindow["' + name + '"] = ' + toSource(thing) + ';\n'
  return s
}

function read (filename) {
  return fs.readFileSync(normalize(filename), 'utf8')
}

// modified from vesln/package
function readPackageJson (filename) {
  var location = dirname(filename)
  var found = null
  var pkg = {}

  while (!found) {
    if (exists(location + '/package.json')) {
      found = location
    } else if (location !== '/' && location.substr(1) !== ':\\') {
      location = dirname(location)
    } else {
      break
    }
  }

  if (found) {
    pkg = JSON.parse(read(found + '/package.json'))
  }

  return pkg
}

function wrap (name, script) {
  var str = '\n// package ' + name + '\n'
  str += 'require.register("' + name + '", function(module, exports, require){\n'
  str += script + '\n'
  str += '});\n'
  return str
}
