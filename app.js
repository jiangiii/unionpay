const Koa = require('koa')
const http = require('http')
const app = new Koa()
const server = require('koa-static')
const config = require('./config')
const cors = require('koa-cors')
const bodyparser = require('koa-bodyparser')

const index = require('./routes/index')

app.use(server('./src'))
app.use(cors())
app.use(bodyparser({
  enableTypes:['json', 'form', 'text']
}))
app.use(index.routes(), index.allowedMethods())

http.createServer(app.callback()).listen(config.PORT, ()=> {
  console.log('access to the address: http://localhost:3001')
})

module.exports = app