/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(p, parent, orig){
  var path = require.resolve(p, parent)
  var fn = require.modules[path]

  // lookup failed
  if (null == path) {
    orig = orig || p
    parent = parent || 'root'
    throw new Error('failed to require "' + orig + '" from "' + parent + '"')
  }

  // perform real require()
  // by invoking the module's
  // registered function
  var mod = fn.module = fn.module || {}
  if (!mod.exports) {
    mod.exports = {}
    mod.client = mod.component = true
    fn.call(mod.exports, mod, mod.exports, require.relative(path))
  }

  return mod.exports
}

/**
 * Registered modules.
 */

require.modules = {}

/**
 * Aliases.
 */

require.aliases = {}

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path, parent){
  var prefixes = ['node_modules/', 'components/', 'client/', 'server/', 'deps/']
  var suffixes = ['.js', '.json', '/index.js', '/index.json']

  parent = parent ? parent.split('/').slice(0, -1).join('/') : ''
  path = require.normalize(parent, path)    

  var mod

  function check (_path) {
    if (require.aliases[_path]) return require.aliases[_path]
    if (require.modules[_path]) return _path

    if (require.aliases[parent + '/' + _path]) return require.aliases[parent + '/' + _path]
    if (require.modules[parent + '/' + _path]) return parent + '/' + _path
  }

  if (check(path)) return check(path)

  var p
  for (var si = 0, slen = suffixes.length; si < slen; si++) {
    p = path + suffixes[si]
    if (check(p)) return check(p)

    for (var pi = 0, plen = prefixes.length; pi < plen; pi++) {
      p = prefixes[pi] + path
      if (check(p)) return check(p)

      p = prefixes[pi] + path + suffixes[si]
      if (check(p)) return check(p)
    }
  }

  if (parent && parent.split('/').length) return require.resolve(path, parent)
}

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = []

  if (null == path) return curr

  // foo
  if ('.' != path.charAt(0)) return path

  curr = curr.split('/')
  path = path.split('/')

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop()
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i])
    }
  }

  return curr.concat(segs).join('/')
}

/**
 * Register module at `path` with callback `fn`.
 *
 * @param {String} path
 * @param {Function} fn
 * @api private
 */

require.register = function(path, fn){
  require.modules[path] = fn
}

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to){
  var fn = require.modules[from]
  if (!fn) throw new Error('failed to alias "' + from + '", it does not exist')
  require.aliases[to] = from
}

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {

  /**
   * The relative require() itself.
   */

  function fn(p){
    var path = fn.resolve(p, parent)
    return require(path, parent, p)
  }

  /**
   * Resolve relative to the parent.
   */

  fn.resolve = function(path){
    return require.resolve(path, parent)
  }

  /**
   * Alias.
   */

  fn.alias = function(from, to){
    return require.alias(from, to)
  }

  /**
   * Check if module is defined at `path`.
   */

  fn.exists = function(path){
    return !! require.modules[fn.resolve(path)]
  }

  return fn
}
