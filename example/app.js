var express = require('express')
var app = express()

var f = require('../frequire')(require)

// Modules with relative paths
// they'll be required with the same name
f.require('./a')
f.require('./foo')

// This can't be resolved by require so we give it a path
f.require('x', 'deep/node_modules/x')

// This is in node_modules so it resolves as is
f.require('deep')

 // Woo, just send some code to be required!
f.require('multiply', function (a, b) { return a*b })

// JSON files also
f.require('./config')

// Anything else will be returned as a string
f.require('./snippet.html')
f.require('./style.css')

// Just pollute the window global
f.expose('start', function () {
  var foo = require('./foo')
  var mul = require('multiply')
  var deep = require('deep')
  var snippet = require('./snippet.html')
  var style = require('./style.css')
  var config = require('./config')
  foo()
  console.log(mul(5, 5))
  console.log(deep())
  document.write(snippet)
  var css = document.createElement('style')
  css.innerHTML = style
  document.head.appendChild(css)
  alert(config.welcome)
})

// Expose a function to be self-executed
f.expose(function () {
  start()
})

app.use(f.middleware())
app.use(express.static(__dirname + '/public'))

app.listen(8080)
