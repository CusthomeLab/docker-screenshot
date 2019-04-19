const http = require('http')
const httpProxy = require('http-proxy')

const IN_PORT = 8000
const TARGET = 'http://config3d.magelan.com.armand.local'

httpProxy
  .createProxyServer({
    target: TARGET,
  })
  .listen(IN_PORT)

console.log(`Rewrite HTTP traffic from 0.0.0.0:${IN_PORT} to ${TARGET}`)
