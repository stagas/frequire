var fs = require('fs')
var path = require('path')
var exists = fs.existsSync || path.existsSync
var extname = path.extname
var dirname = path.dirname
var basename = path.basename
var join = path.join
var normalize = path.normalize
var resolve = path.resolve
var toSource = require('tosource')

var requireManager = read(__dirname + '/require.js')

function each (o, fn) {
  if (Array.isArray(o)) return o.forEach(fn)
  else {
    Object.keys(o || {}).forEach(function (k, i) {
      fn(o[k], k, i, o)
    })
  }
}

function read (filename) {
  return fs.readFileSync(normalize(filename), 'utf8')
}

function top (location, filename) {
  var found = null
  var pathname = null
  var pkg = {}

  while (!found) {
    pathname = join(location, filename)
    if (exists(pathname)) {
      found = location
    } else if (location !== '/' && location.substr(1) !== ':\\') {
      location = dirname(location)
    } else {
      break
    }
  }

  return found
}

function wrap (name, script) {
  var str = '\n// package ' + name + '\n'
  str += 'require.register("' + name + '", function(module, exports, require){\n'
  str += script + '\n'
  str += '});\n'
  return str
}

function makeRequire (moduleName, thing) {
  var self = this
  var args = [].slice.call(arguments)
  var registryName = moduleName

  function process (obj, isGlobal) {
    obj = obj || { filename: obj, registryName: obj }
    var filename = obj.filename
    var registryName = obj.registryName
    var ext = extname(filename)
    var base = basename(filename)
    var isRoot = base === 'index.js' || basename(filename, ext) === registryName

    var file = read(filename)

    // preprocess
    if ('.js' === ext) {}
    else if ('.css' === ext) {}
    else if ('.json' === ext) {
      file = 'module.exports = ' + file
    }
    else {
      file = 'module.exports = "' + file.replace(/"/g, '\\"').replace(/\r\n|\r|\n/g, '\\n') + '"'
    }

    // append
    if ('.css' === ext) {
      self.css += '/* stylesheet: ' + base + ' */\n\n' + file + '\n\n'
    }
    else {
      self.js += wrap(isGlobal === true ? base : registryName, file)
    }
  }

  if ('string' === typeof thing) {
    // passing path
    if (!~thing.indexOf(' ')) {
      var filename = join(this.root, thing)
      var filenamejs = join(this.root, thing + '.js')
      var filenamejson = join(this.root, thing + '.json')

      if (exists(filename)) {}
      else if (exists(filenamejs)) filename = filenamejs
      else if (exists(filenamejson)) filename = filenamejson
      else throw new Error('file not found: ' + thing)

      process({ filename: filename, registryName: registryName }, true)

      return this
    }
    else {
      // pass code string
      this.js += wrap(moduleName, thing)
      return this
    }
  }

  // passing code
  else if (null != thing) {
    this.js += wrap(moduleName, 'module.exports = ' + toSource(thing))
    return this
  }

  var files = this.paths[moduleName]

  files.forEach(process)

  return this
}

function makeExpose (name, thing) {
  var s
  if ('function' === typeof name) {
    s = '\n;(' + name + ')();\n'
  }
  else s = '\nwindow["' + name + '"] = ' + toSource(thing) + ';\n'
  return s
}

function parseRead (filename) {
  var parsed
  try { parsed = JSON.parse(read(filename)) }
  catch (_) {}
  return parsed
}

function slashes (s) {
  return s.replace(/\\/g, '/')
}

module.exports = function (dir) {
  var root = top(dir, 'package.json')

  var pkg = parseRead(join(root, 'package.json'))
  var comp = parseRead(join(root, 'component.json'))

  var paths = {}

  function add (key, file, registryName) {
    paths[key] = paths[key] || []
    paths[key].push({ filename: file, registryName: slashes(registryName) })
  }

  if (pkg) {
    each(pkg.dependencies, function (val, key) {
      var json = parseRead(join(root, 'node_modules', key, 'package.json'))
      var files = json.files || []
      files.push(json.main || 'index.js')
      files.forEach(function (file) {
        var ext = extname(file)
        if (!ext) file = file + '.js'
        add(key, join(root, 'node_modules', key, file), join(key, file))
      })
    })
  }

  if (comp) {
    each(comp.dependencies, function (val, key) {
      var dir = key.replace('/', '-')
      var name = key.split('/')[1]
      var json = parseRead(join(root, 'components', dir, 'component.json'))
      var files = json.scripts || [ 'index.js' ]
      files = files.concat(json.styles || [])
      files.forEach(function (file) {
        add(name, join(root, 'components', dir, file), join(name, file))
      })
    })
  }

  return {
    js: requireManager
  , css: ''
  , root: root
  , paths: paths
  , require: function (name) {
      var self = this

      if (Array.isArray(name)) {
        name.forEach(function (n) {
          if (Array.isArray(n)) self.require(n[0], n[1])
          else self.require(n)
        })
        return this
      }

      makeRequire.apply(this, arguments)
    }

  , expose: function (name, thing) {
      this.js += makeExpose(name, thing)
      return this
    }

  , middleware: function (opts) {
      var self = this

      if ('string' === typeof opts) opts = { name: opts }
      opts = opts || { name: 'wrapped' }
      return function (req, res, next) {
        if (req.url === '/' + opts.name + '.js') {
          res.setHeader('content-type', 'application/javascript')
          res.end(self.js)
          return
        }
        else if (req.url === '/' + opts.name + '.css') {
          res.setHeader('content-type', 'text/css')
          res.end(self.css)
          return
        }
        else {
          res.expose = function (name, thing) {
            res.locals.exposed = res.locals.exposed || ''
            res.locals.exposed += makeExpose(name, thing)
          }
          next()
        }
      }
    }
  }
}
