module.exports = function () {
  ;['assert', 'child_process', 'events', 'fs', 'https', 'net', 'path', 'process'
  , 'querystring', 'stream', 'sys', 'tls', 'tty', 'url', 'util'].forEach(function (mod) {
    require.alias(require.resolve('lib/' + mod), mod) 
  })

  require.alias(require.resolve('buffer-browserify'), 'buffer')

  window.process = require('process')
  window.Buffer = require('buffer').Buffer
}
