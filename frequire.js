var fs = require('fs')
var path = require('path')
var exists = fs.existsSync || path.existsSync
var extname = path.extname
var dirname = path.dirname
var basename = path.basename
var resolve = path.resolve
var semver = require('semver')
var toSource = require('tosource')
var clientRequire = read(__dirname + '/require.js')

var styles = {}

styles.node = {
  path: 'node_modules'
, pkg: 'package.json'
}

styles.component = {
  path: 'components'
, pkg: 'component.json'
, pre: function (d) {
    d = d.replace('/', '-')
    return d
  }
}

/**
 * Join path with forward slashes
 * 
 * @param {String} path Any number of paths
 * @return {String} joined path
 */

function join () {
  return slashes(path.join.apply(path, arguments))
}

/**
 * Normalize with forward slashes
 * 
 * @param  {String} path
 * @return {String} result
 */

function normalize (p) {
  return slashes(path.normalize(p))
}

/**
 * Run fn on each element in objects and arrays
 *
 * @param  {Object|Array}   object or array
 * @param  {Function} fn
 */

function each (o, fn) {
  if (Array.isArray(o)) return o.forEach(fn)
  else {
    Object.keys(o || {}).forEach(function (k, i) {
      fn(o[k], k, i, o)
    })
  }
}

/**
 * Split string with identifier, pop last element and join again
 * 
 * @param  {String} string
 * @param  {String} identifier
 * @return {String} result
 */

function pop (s, i) {
  return ('string' == typeof s ? s : '').split(i || '/').slice(0, -1).join(i || '/')
}

/**
 * Convert backward to forward slashes
 * 
 * @param  {String} string
 * @return {String} result
 */

function slashes (s) {
  return s.replace(/\\/g, '/')
}

/**
 * Return an array of only unique elements given another array
 * @param  {Array} array
 * @return {Array} result
 */

function unique (arr) {
  var o = {}
  arr.forEach(function (el) { o[el] = { type: typeof el } })
  var newarr = []
  for (var el in o) {
    newarr.push(o[el].type === 'number' ? Number(el) : el)
  }
  return newarr
}

/**
 * Strip from `b` a string with the length of `a`
 * @param  {String} a
 * @param  {String} b
 * @return {String} result
 */

function strip (a, b) {
  return b.substr(a.length + 1)
}

/**
 * Read a file in sync
 * 
 * @param  {String} filename
 * @return {String} file contents
 */

function read (filename) {
  return fs.readFileSync(normalize(filename), 'utf8')
}

/**
 * Recursively read a directory contents, optionally excluding filenames
 * 
 * @param  {String} dirname
 * @param  {Array} arr  Used internally to carry the result array
 * @param  {Array} excluded
 * @return {Array} list of file paths
 *
 * TODO: currently hardcoded to accept only some extensions
 */

function readdir (dirname, arr, excluded) {
  arr = arr || []
  try {
    fs.readdirSync(dirname)
      .filter(function (file) { return !~excluded.indexOf(file) && '.' != file[0] })
      .map(function (file) { return join(dirname, file) })
      .forEach(function (file) {
        if (fs.statSync(file).isDirectory()) {
          readdir(file, arr, excluded)
        }
        else {
          if (~['.js','.json','.css'].indexOf(extname(file))) {
            arr.push(file)
          }
        }
      })
  } catch (_) {}
  return arr
}

/**
 * Move dirs up until it finds filename
 * 
 * @param  {String} location
 * @param  {String} filename
 * @return {String} location
 */

function top (location, filename) {
  var found = null
  var pathname = null
  var pkg = {}

  location = slashes(location)
  filename = slashes(filename)

  while (!found) {
    pathname = join(location, filename)
    if (exists(pathname)) {
      found = location
    } else if (location !== '/' && location.substr(1) !== ':/') {
      location = dirname(location)
    } else {
      break
    }
  }

  return found
}

/**
 * Wrap a filename - script pair in require.register code
 * 
 * @param  {String} filename
 * @param  {String} script
 * @return {String} code string
 */

function wrap (filename, script) {
  var str = '\nrequire.register('
  str += JSON.stringify(filename)
  str += ',function(module,exports,require){\n'
  str += script + '\n'
  str += '});\n'
  return str
}

/**
 * Make a require
 * 
 * @param  {String} dependency
 * @param  {String} thing  One of many
 * @param  {String} parent  This module's parent
 * @return {Object} this
 */

function make (dep, thing, parent) {
  var self = this
  var root = this.root
  var mods = this.modules

  if (dep.substr(0, 1) == '.' && !thing) {
    return make.call(this, dep, dep)
  }

  /**
   * Actually register the module
   * 
   * @param  {Object} mod   a normalized module object
   * @param  {String} name  dependency name
   * @param  {String} alias
   */

  function process (mod, name, alias) {
    var ext = extname(name)
    var filename = join(mod.paths[0] || '.', name)

    var script = read(join(mods.__root__, filename))

    // preprocess
    if ('.js' == ext) {}
    else if ('.css' == ext) {}
    else if ('.json' == ext) {
      script = 'module.exports = ' + script
    }
    else {
      script = 'module.exports = "' + script.replace(/"/g, '\\"').replace(/\r\n|\r|\n/g, '\\n') + '"'
    }

    // append
    self.register(filename, script)
    if ('.css' != ext) {
      if (mod.main == name) {
        self.alias(filename, join(pop(mod.paths[0]), mod.name))
      }
      if (alias) {
        self.alias(filename, alias)
      }
      if (mod.paths.length > 1) {
        for (var i = 1, len = mod.paths.length; i < len; i++) {
          self.alias(filename, join(mod.paths[i], name))
        }
      }
    }
  }

  if ('string' === typeof thing) {
    // passing path
    if (!~thing.indexOf(' ')) {
      var filename = this.resolve(thing)

      if (filename) {
        make.call(self, filename, null, parent)
        if (mods[filename].name == mods.__name__) {
          self.alias(join(mods[filename].paths[0], mods[filename].main), '.')
        }
        else {
          self.alias(join(pop(mods[filename].paths[0]), mods[filename].name, mods[filename].main), dep)
        }
        return this
      }

      filename = join(root, thing)
      var filenamejs = join(root, thing + '.js')
      var filenamejson = join(root, thing + '.json')

      if (exists(filename)) {}
      else if (exists(filenamejs)) filename = filenamejs
      else if (exists(filenamejson)) filename = filenamejson
      else throw new Error('file not found: ' + thing)

      process(mods[this.resolve(mods.__name__)], strip(root, filename), dep)

      return this
    }
    else {
      // pass code string
      this.register(dep, thing)
      return this
    }
  }

  // passing code
  else if (null != thing) {
    this.register(dep, 'module.exports = ' + toSource(thing))
    return this
  }

  var p = this.resolve(dep)
  if (!p) throw new Error('cannot resolve ' + (parent && parent.name) + ' ' + dep)
  
  var mod = mods[p]

  if (mod.files.length) mod.files.forEach(function (file) {
    process(mod, file)
  })

  if (mod.deps.length) {
    mod.deps.forEach(function (dep) {
      make.call(self, dep, null, mod)
    })
  }

  return this
}

/**
 * Generate exposed code
 * 
 * @param  {Mixed} name
 * @param  {Mixed} thing
 * @return {String} code
 */

function expose (name, thing) {
  var s
  if ('function' == typeof name) {
    s = '\n;(' + name + ')();\n'
  }
  else if ('undefined' != typeof thing) {
    s = '\nwindow["' + name + '"] = ' + toSource(thing) + ';\n'
  }
  else s = '\n;' + name + ';\n'
  return s
}

/**
 * Read and JSON.parse a file
 * 
 * @param  {String} filename
 * @return {Mixed} result
 */

function parseRead (filename) {
  var parsed
  try { parsed = JSON.parse(read(filename)) }
  catch (_) {}
  return parsed
}

/**
 * Generate an index of modules on a given dir
 * 
 * @param  {String} dir    
 * @param  {String} parent 
 * @param  {String} mods   (internal)
 * @param  {String} root   (internal)
 * @return {Object} modules index
 */

function index (dir, parent, mods, root) {
  dir = slashes(resolve(dir))
  root = root || ''
  mods = mods || {}

  function add (json, main, filename, modulePath, style) {
    if (!json.name) json.name = mods.__name__

    var key = modulePath.split('/').pop() + '@' + (json.version || '0.0.0')

    mods[key] = mods[key] || {
      name: json.name
    , main: main
    , version: json.version
    , paths: []
    , deps: []
    , files: []
    }

    mods[key].deps = unique(
      mods[key].deps.concat(
        Object.keys(json.dependencies || {})
          .filter(function (key) {
            return !~Object.keys(json.optionalDependencies || {}).indexOf(key)
          })
          .map(function (key) {
            return key + '@' + json.dependencies[key]
          })
      )
    )

    var modPath = !root ? '' : strip(root, modulePath)
    if (modPath && !~mods[key].paths.indexOf(modPath)) mods[key].paths.push(modPath)

    var reg = strip(modulePath, filename)
    if (!~mods[key].files.indexOf(reg)) mods[key].files.push(reg)
  }

  function readJson (style, modulePath) {
    var json = parseRead(join(modulePath, style.pkg))
    if (!json) return

    var files = json.files || []
    var main = json.browserify || json.main || 'index.js'
    var ext = extname(main)
    if (!ext) main = main + '.js'
    if ('./' == main.substr(0, 2)) main = main.substr(2)
    var mainfile = join(modulePath, main)
    if (exists(mainfile)) files.push(join(modulePath, main))
    files = files.concat(
      readdir(
        modulePath
      , null
      , [ 'node_modules', 'components', 'example', 'examples', 'test', 'bin', 'bench', 'build', 'build.js', 'build.css' ]
      )
    )
    unique(files
      .map(function (filename) {
        var ext = extname(filename)
        if (!ext) filename = filename + '.js'
        if ('./' == filename.substr(0, 2)) filename = filename.substr(2)
        return filename
      }))
      .forEach(function (filename) {
        add(json, main, filename, modulePath, style)
      })
    return json
  }

  each(styles, function (style) {
    var json = readJson(style, dir)

    if (json) {
      if (!root) {
        root = dir
        mods.__root__ = slashes(dir)
        mods.__name__ = json.name
        mods.__version__ = json.version
      }

      each(json.dependencies, function (val, key) {
        var modulePath, found = false, d = dir
        while (!found) {
          modulePath = join(d, style.path, style.pre ? style.pre(key) : key)
          if (exists(modulePath)) found = true
          else if (d.length) d = pop(d)
          else if (~key.indexOf(Object.keys(json.optionalDependencies || {}))) { return }
          else throw new Error('Module not found ' + key + ' in ' + json.name)
        }
        index(modulePath, join(key, style.path), mods, root)
      })
    }
  })

  return mods
}

/**
 * Generate a setup context
 * 
 * @param  {String} root dir
 * @return {Object} api
 */

var frequire = module.exports = function (dir) {
  var root = top(resolve(dir), 'package.json')
  var mods = index(root)

  /**
   * public api
   */

  return {
    clientRequire: clientRequire
  , js: ''
  , css: ''
  , registered: []
  , aliased: []
  , root: root
  , modules: mods

    /**
     * Create an frequire shim
     * 
     * @return {Object} frequire bundle
     */

  , shim: function (what) {
      var f = frequire(__dirname)
      f.require(what + '-shim')
      f.expose("require('" + what + "-shim')();")
      return f
    }

    /**
     * Shortcut for node shim
     * 
     * @return {Object} frequire bundle
     */

  , node: function () { return this.shim('node') }

    /**
     * Register a filename - script pair
     * 
     * @param  {String} filename 
     * @param  {String} script   
     */

  , register: function (filename, script) {
      if (~this.registered.indexOf(filename)) return
      this.registered.push(filename)

      var ext = extname(filename)
      if ('.css' == ext) {
        this.css = '/* stylesheet: ' + filename + ' */\n\n' + script + '\n\n' + this.css
      }
      else {
        this.js += wrap(filename, script)
      }
    }

    /**
     * Register an alias
     * 
     * @param  {String} from 
     * @param  {String} to   
     */

  , alias: function (from, to) {
      if (~this.aliased.indexOf(from + '::' + to)) return
      this.aliased.push(from + '::' + to)
      this.js += '\nrequire.alias(' + JSON.stringify(from) + ',' + JSON.stringify(to) + ');\n'
    }

    /**
     * Require deps
     * 
     * @param  {String} name 
     */

  , require: function (name) {
      var self = this

      if (Array.isArray(name)) {
        name.forEach(function (n) {
          if (Array.isArray(n)) self.require(n[0], n[1])
          else self.require(n)
        })
        return this
      }

      make.apply(this, arguments)
    }

    /**
     * Resolve a dep
     * 
     * @param  {String} dep
     * @return {String} resolved
     */

  , resolve: function (dep) {
      var parts = dep.split('@')
      var mods = this.modules
      var name = parts[0]
      var version = parts[1] || '*'

      if (dep in mods) return dep

      if ('.' == dep || './' == dep) return this.resolve(mods.__name__)

      if (~name.indexOf('/')) name = name.replace('/', '-')

      for (var k in mods) {
        if ((name == k.split('@')[0] || name == mods[k].name) && semver.satisfies(mods[k].version, version)) return k
      }

      for (var k in mods) {
        if (name == k.split('@')[0] || name == mods[k].name) return k
      }
    }

    /**
     * Make an expose
     * 
     * @param  {String} name  [description]
     * @param  {String} thing [description]
     * @return {Object} this
     */

  , expose: function (name, thing) {
      this.js += expose(name, thing)
      return this
    }

    /**
     * Returns a Connect/Express middleware
     * 
     * @param  {Object} opts
     * @return {Function} middleware fn
     */
    
  , middleware: function (opts) {
      var self = this

      if ('string' === typeof opts) opts = { name: opts }
      opts = opts || { name: 'wrapped' }
      return function (req, res, next) {
        if (req.url === '/' + opts.name + '.js') {
          res.setHeader('content-type', 'application/javascript')
          res.end(self.clientRequire + self.js)
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
            res.locals.exposed += expose(name, thing)
          }
          next()
        }
      }
    }
  }
}
