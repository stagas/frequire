var express = require('express')
var app = express()

var f = require('../frequire')(__dirname)

f.require([ 'emitter', 'jquery', 'tip', 'client' ])
f.require('relative', './relative.js')

f.expose(function () { require('client').start() })

app.set('view engine', 'jade')
app.use(f.middleware())

app.get('/', function (req, res) {
  res.expose('foo', { some: 'value' })
  res.render('index')
})

app.listen(8080)
