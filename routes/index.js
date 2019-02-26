const Router = require('koa-router')
const UnionpayController = require('../controllers/unionpay')

const router = new Router({
  prefix: ''
})

router.post('/unionpay/payment', UnionpayController.payment)
router.post('/unionpay/respond', UnionpayController.respond)
router.post('/unionpay/queryPayStatus', UnionpayController.queryPayStatus)

module.exports = router