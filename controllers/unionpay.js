const moment = require('moment')
const jsrsasign = require('jsrsasign')
const path = require('path')
const pem = require('pem')
const config = require('../config')
const axios = require('axios')
const querystring = require("querystring");
const acpSignPfx = path.join(__dirname, '../config/acp_test_sign.pfx')
const qs = require('qs')
const merId = '700000000000001'

class unionpayController {

  /**
   * @description 支付
   * @author iii
   * @static
   * @param {*} ctx
   * @memberof unionpayController
   */
  static async payment(ctx) {

    console.log('into unionpay/payment params: ', ctx.request.body)

    const req = ctx.request.body
    const _amount = Number(req.amount)

    var _params = {
      // 版本号，全渠道默认值
      version: '5.1.0',
      // 字符集编码，可以使用UTF-8,GBK两种方式
      encoding: 'UTF-8',
      // 业务类型  000202: B2B
      bizType: '000202',
      // 订单发送时间，取系统时间，格式为YYYYMMDDhhmmss，必须取当前时间，否则会报txnTime无效
      txnTime: moment().format('YYYYMMDDhhmmss'),
      // 后台通知地址
      backUrl: 'http://127.0.0.1:3001/unionpay/respond',
      // 前台通知地址
      frontUrl: 'http://127.0.0.1:3001/unionpay/respond',
      // 交易币种（境内商户一般是156 人民币）
      currencyCode: '156',
      // 交易金额，单位分，不要带小数点
      txnAmt: String(_amount),
      // 交易类型 ，01：消费
      txnType: '01',
      // 交易子类型， 01：自助消费
      txnSubType: '01',
      //接入类型，0：直连商户
      accessType: '0',
      // 签名方法
      signMethod: '01',
      // 渠道类型 固定07
      channelType: '07',
      // 商户号码
      merId: merId,
      // 商户订单号，8-40位数字字母，不能含“-”或“_”，可以自行定制规则
      orderId: moment().format('YYYYMMDDhhmmssSSS')
      // 支付超时时间
      // payTimeout: moment().add(30, 'm').format('YYYYMMDDhhmmss')
    }

    let cert = await utils._getCert(acpSignPfx, {p12Password: '000000'})
    _params['certId'] = cert.certId

    let _beforeSign = await utils.keyValueStructure(_params, true)
    _beforeSign = jsrsasign.KJUR.crypto.Util.sha256(_beforeSign)
    _params.signature = await utils._signature(cert.key, _beforeSign)

    const result = await utils._createHtml('https://gateway.test.95516.com/gateway/api/frontTransReq.do', _params)

    ctx.body = result

  }

  /**
   * @description 查询支付状态
   * @author iii
   * @static
   * @memberof unionpayController
   */
  static async queryPayStatus(ctx) {

    console.log('into unionpay/queryPayStatus params: ', ctx.request.body)

    const req = ctx.request.body
    const txnTime = req.txnTime
    const orderId = req.orderId

    var _params = {
      // 版本号，全渠道默认值
      version: '5.1.0',
      // 字符集编码，可以使用UTF-8,GBK两种方式
      encoding: 'UTF-8',
      // 业务类型  
      bizType: '000202',
      // 交易类型
      txnType: '00',
      // 交易子类型
      txnSubType: '00',
      //接入类型，0：直连商户
      accessType: '0',
      // 签名方法
      signMethod: '01',
      // 商户号码
      merId: merId,
      // 被查询交易的交易时间
      txnTime: txnTime,
      // 商户代码merId、商户订单号orderId、订单发送时间txnTime三要素唯一确定一笔交易。
      orderId: orderId
    }

    let cert = await utils._getCert(acpSignPfx, {p12Password: '000000'})
    _params['certId'] = cert.certId

    let result
    let _beforeSign = await utils.keyValueStructure(_params, true)
    _beforeSign = jsrsasign.KJUR.crypto.Util.sha256(_beforeSign)
    _params.signature = await utils._signature(cert.key, _beforeSign)

    // const _html = await utils._createHtml('https://gateway.test.95516.com/gateway/api/queryTrans.do', _params)
    // _params = await utils.keyValueStructure(_params)

    axios({
      method: 'post',
      url: 'https://gateway.test.95516.com/gateway/api/queryTrans.do',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      data: qs.stringify(_params)
    })
    .then(function (response) {
      result = qs.parse(response.data)
      console.log(result)
      //TODO: to do something
    })
    .catch(function (error) {
      console.error(error)
      //TODO: to do something
    });

    ctx.body = result

  }

  /**
   * @description 支付响应回调
   * @author iii
   * @static
   * @param {*} ctx
   * @memberof unionpayController
   */
  static async respond(ctx) {

    console.log('into unionpay/respond params: ', ctx.request.body)

    const req = ctx.request.body
    const merId = req.merId
    const orderId = req.orderId
    const txnTime = req.txnTime

    if (merId === config.merId) {
      unionpayController.queryPayStatus(txnTime, orderId)
    }

    ctx.body = {
      merId,
      orderId,
      txnTime
    }

  }
  
}

class utils {
  /**
   * @description 获取证书信息
   * @author iii
   * @static
   * @param {*} acpSignPfx
   * @param {*} option
   * @returns 
   * @memberof unionpayController
   */
  static async _getCert(acpSignPfx, option) {

    return new Promise((resolve, reject) => {
      pem.readPkcs12(acpSignPfx, option, (err, pfx) => {
        if (err) {
          reject(err)
        } else {
          const c = new jsrsasign.X509();
          c.readCertPEM(pfx.cert);
          const serialNumberHex = c.getSerialNumberHex();
          const cert = {
            key: jsrsasign.KEYUTIL.getKey(pfx.key),
            cert: pfx.cert,
            certId: new jsrsasign.BigInteger(serialNumberHex, 16).toString()
          }
          resolve(cert)
        }
      })
    })
  }

  /**
   * @description 签名
   * @author iii
   * @static
   * @param {*} key
   * @param {*} joints
   * @returns 
   * @memberof unionpayController
   */
  static async _signature(key, joints) {

    return new Promise((resolve, reject) => {
      let signature
      const sign = new jsrsasign.Signature({alg: 'SHA256withRSA'});
      sign.init(key);
      sign.updateString(joints);
      signature = jsrsasign.hex2b64(sign.sign());
      resolve(signature)
    })
  }

  /**
   * @description 生成HTML
   * @author iii
   * @static 
   * @param {*} url
   * @param {*} _params
   * @returns 
   * @memberof unionpayController
   */
  static async _createHtml(url, _params) {

    return new Promise((resolve, reject) => {
      let _hiddenFields = ''
      for (let key in _params) {
        _hiddenFields += '<input type="hidden" name="' + key + '" value="' + _params[key] + '"/><br>'
      }

      let _structure = 
      `<!DOCTYPE html>
        <html lang="zh">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="ie=edge">
          <title></title>
        </head>
        <body onload="javascript:document.pay_form.submit();">
          <form name="pay_form" action="${url}" method="post">
          ${_hiddenFields}
          </form>
        </body>
      </html>`
      resolve(_structure)
    })
  }

  /**
   * @description key=value结构组装
   * @author iii
   * @static
   * @param {*} params
   * @param {*} sort
   * @param {*} encode
   * @returns 
   * @memberof utils
   */
  static async keyValueStructure(params, sort, encode) {

    if(sort){
      let tmp = new Object();
      let keys = Object.keys(params).sort();
      for(var i in keys){
          tmp[keys[i]] = params[keys[i]];
      }
      params = tmp;
    }

    if (encode)
        return querystring.stringify(params)
    else {
        let options = {}
        options.encodeURIComponent = function (str) {
            return str
        }
        return querystring.stringify(params, "&", "=", options = options)
    }
  }
}

module.exports = unionpayController