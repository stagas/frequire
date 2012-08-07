var express = require('express')
var app = express()

var f = require('../frequire')(require)

f.require([ 'emitter', 'jquery', 'tip', 'client' ])

f.expose(function () { require('client').start() })

app.use(f.middleware())
app.use(express.static(__dirname + '/public'))

app.listen(8080)
