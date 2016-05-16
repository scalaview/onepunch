var request = require("request")
var config = require("../config")
var crypto = require('crypto')

function Xinhaoba(orderId, phone, prodid, num){
	this.loginname = config.xinhaoba_loginname
	this.apiKey = config.xinhaoba_apikey
}

Xinhaoba.prototype.createOrder = function(orderId, phone, prodid, num){

  var uri = 'http://api.xinhaoba.com/commoninterface.do',
      checkParams = "api_key={{apiKey}}&prodid={{prodid}}&submitorderid={{orderId}}&phone={{phone}}&num={{num}}".format({
        apiKey: this.apiKey,
        prodid: prodid,
        orderId: orderId,
        phone: phone,
        num: num
      })

  var check = crypto.createHash('md5').update(checkParams).digest("hex").toLowerCase()

  var params = {
        cmd: "recharge",
        loginname: this.loginname,
        prodid: prodid,
        submitorderid: orderId,
        phone: phone,
        num: num,
        custname: phone + "_" + orderId,
        check: check
      },
      options = {
        uri: uri,
        method: 'GET',
        qs: params
      }
  console.log(options)
  return new Promise(function(resolve, reject) {
    request(options, function (error, res, body) {
      if (!error && res.statusCode == 200) {
        console.log(body)
        var data = JSON.parse(body.trim())
        resolve(data)
      }else{
        reject(error)
      }
     });
  })
}

Xinhaoba.prototype.orderDetail = function(submitorderid, sysorderid, prodid, phone){

  var uri = "http://api.xinhaoba.com/commoninterface.do",
      checkParams = "api_key={{apiKey}}&prodid={{prodid}}&submitorderid={{submitorderid}}&sysorderid={{sysorderid}}&phone={{phone}}".format({
        apiKey: this.apiKey,
        prodid: prodid,
        submitorderid: submitorderid,
        sysorderid: sysorderid,
        phone: phone
      })
  var check = crypto.createHash('md5').update(checkParams).digest("hex").toLowerCase()
  var params = {
        cmd: "query",
        loginname: this.loginname,
        prodid: prodid,
        submitorderid: submitorderid,
        sysorderid: sysorderid,
        phone: phone,
        check: check
      },
      options = {
        uri: uri,
        method: 'GET',
        qs: params
      }
  console.log(options)
  return new Promise(function(resolve, reject) {
    request(options, function (error, res, body) {
      if (!error && res.statusCode == 200) {
        console.log(body)
        var data = JSON.parse(body.trim())
        resolve(data)
      }else{
        reject(error)
      }
     });
  })
}


module.exports.Xinhaoba = Xinhaoba;