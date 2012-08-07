var fs = require('fs')
var toSource = require('tosource')

var requireManager = fs.readFileSync(__dirname + '/require.js')

module.exports = function (_require) {
  var wrapped = requireManager
  return {
    require: function (name, thing) {
      var regName = name
      if ('string' === typeof thing) name = thing
      else if (thing !== undefined) {
        wrapped += wrap(name, 'module.exports = ' + toSource(thing))
        return this
      }
      var script = fs.readFileSync(_require.resolve(name), 'utf8')
      wrapped += wrap(regName, script)
      return this
    }
  , expose: function (name, thing) {
      if ('function' === typeof name) {
        wrapped += '\n;(' + name + ')();\n'
      }
      else wrapped += '\nwindow["' + name + '"] = ' + toSource(thing) + ';\n'
      return this
    }
  , middleware: function (opts) {
      if ('string' === typeof opts) opts = { pathname: opts }
      opts = opts || { pathname: '/wrapped.js' }
      return function (req, res, next) {
        if (req.url === opts.pathname) {
          res.setHeader('content-type', 'application/javascript')
          res.end(wrapped)
          return
        }
        else next()
      }
    }
  }
}

function wrap (name, script) {
  var str = '\n// package ' + name + '\n'
  str += 'require.register("' + name + '", function(module, exports, require){\n'
  str += script + '\n'
  str += '});\n'
  return str
}
