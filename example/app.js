var http = require('http')
var shoe = require('shoe')
var express = require('express')
var app = express()

// express settings

app.set('view engine', 'jade')
app.set('views', __dirname + '/views')

// frequire setup
var f = require('../frequire')(__dirname)

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

//require('fs').writeFileSync('mods.json', JSON.stringify(f.modules, null, '  '))

app.use(f.middleware())

// routes

app.get('/', function (req, res) {
  res.expose('foo', { some: 'value' }) // expose only on this response
  res.render('index')
})

app.get('/beep', function (req, res) {
  res.send('boop!')
})

var server = http.createServer(app)
server.listen(8080)

var sock = shoe(function (stream) {
  var iv = setInterval(function () {
    stream.write(Math.floor(Math.random() * 2))
  }, 250)

  stream.on('end', function () {
    clearInterval(iv)
  })

  stream.pipe(process.stdout, { end: false })
})
sock.install(server, '/invert')
