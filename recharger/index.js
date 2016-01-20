var request = require("request")
var async = require("async")
var helpers = require("../helpers")
var config = require("../config")
var crypto = require('crypto')
var models  = require('../models')

var ChongRecharger = function(client_id, client_secret, storeCallback, accessCallback){
  this.client_id = client_id
  this.client_secret = client_secret
  this.storeCallback = storeCallback
  this.accessCallback = accessCallback

  function getAccessToken(client_id, client_secret, storeCallback, accessCallback, successCallback, errCallback){

    function requireToken(client_id, client_secret, storeCallback, accessCallback, successCallback, errCallback){
      var params = {
        client_id: client_id,
        client_secret: client_secret,
        grant_type: "client_credential"
      }
      var host = "http://" + config.chong[rocess.env.NODE_ENV || "development"].hostname + "/v1/auth/token"
      var options = {
        uri: host,
        method: 'POST',
        qs: params
      }
      request(options, function (error, res) {
        if (!error && res.statusCode == 200) {
          if(successCallback){
            console.log(res.body)
            var data = JSON.parse(res.body)
            if(data.access_token){
              var now = (new Date()).getTime() + data.expires_in
              successCallback.call(this, res, {accessToken: data.access_token, expireTime: now})
              accessCallback({accessToken: data.access_token, expireTime: now})
            }else{
              successCallback.call(this, res, {accessToken: "", expireTime: 0})
            }
          }
         }else{
          if(errCallback){
            errCallback.call(this, error)
          }
         }
       });
    }

    if(storeCallback){
      storeCallback.call(this, function(err, token){
        if(!err){
          var now = (new Date()).getTime()
          if(now < token.expireTime){
            successCallback(token)
          }else{
            requireToken(client_id, client_secret, storeCallback, accessCallback, successCallback, errCallback)
          }
        }else{
          requireToken(client_id, client_secret, storeCallback, accessCallback, successCallback, errCallback)
        }
      })
    }else{
      requireToken(client_id, client_secret, storeCallback, accessCallback, successCallback, errCallback)
    }
  }
  this.getAccessToken = getAccessToken

  function _getProducts(access_token, successCallback, errCallback){
    var host = "http://" + config.chong[rocess.env.NODE_ENV || "development"].hostname + "/v1/product/lists"

    var options = {
          uri: host,
          method: "GET",
          qs: {
            access_token: access_token
          }
        }

    request(options, function (error, res) {
      if (!error && res.statusCode == 200) {
        if(successCallback){
          console.log(res.body)
          var data = JSON.parse(res.body)
          successCallback.call(this, res, data)
        }
      }else{
        if(errCallback){
          errCallback.call(this, error)
        }
      }
    });

  }

  this._getProducts = _getProducts

  this.getProducts = function(successCallback, errCallback){
    this.getAccessToken(this.client_id, this.client_secret, this.storeCallback, this.accessCallback, function(res, token){
      this._getProducts(token.access_token, successCallback, errCallback)
    }, function(err){
      errCallback(err)
    })
  }

  function _rechargeOrder(access_token, phone, productId, callbackUrl, successCallback, errCallback){
    function formatQueryParams(params, urlencode){
      var keys = Object.keys(params),
          i, len = keys.length;
      var tmpParams = []
      keys.sort();

      for (i = 0; i < len; i++) {
        var key = keys[i],
            value = params[key]
        if(urlencode){
          value = encodeURI(value)
        }
        tmpParams.push(key + "=" + value)
      }
      return tmpParams.join("&")
    }

    function sign(params){
      var formatParams = formatQueryParams(params, false),
          sha1Str = crypto.createHash('sha1').update(formatParams).digest('hex')
      return sha1Str.toUpperCase()
    }

    var host = "http://" + config.chong[rocess.env.NODE_ENV || "development"].hostname + "/v1/flow/recharge/order"

    var signParams = {
      callback_url: callbackUrl,
      client_id: config.chong[rocess.env.NODE_ENV || "development"].client_id,
      number: phone,
      product_id: productId
    }
    var sign = sign(signParams)

    signParams['sign'] = sign
    signParams['access_token'] = access_token

    var options = {
          uri: host,
          method: "POST",
          qs: signParams
        }

    request(options, function (error, res) {
      if (!error && res.statusCode == 200) {
        if(successCallback){
          console.log(res.body)
          var data = JSON.parse(res.body)
          successCallback.call(this, res, data)
        }
      }else{
        if(errCallback){
          errCallback.call(this, error)
        }
      }
    });
    return this
  }
  this._rechargeOrder = _rechargeOrder

  this.rechargeOrder = function(phone, productId, callbackUrl){
    this.phone = phone
    this.productId = productId
    this.callbackUrl = callbackUrl

    this.then = function(callback){
      this.successCallback = callback
      return this
    }

    this.catch = function(callback){
     this.errCallback = callback
     return this
    }

    this.do = function(){
      this.getAccessToken(this.client_id, this.client_secret, this.storeCallback, this.accessCallback, function(res, token){
        this._rechargeOrder(token.access_token, phone, productId, callbackUrl, this.successCallback, this.errCallback)
      }, function(err){
        errCallback(err)
      })
      return this
    }
    return this
  }

  return this
}

// helpers.storeCallback, helpers.accessCallback

function storeCallback(callback){
  models.DConfig.findOrCreate({
    where: {
      name: "chongAccessToken"
    },
    defaults: {
      value: "{}"
    }
  }).spread(function(accessToken) {
    if(accessToken.value.present()){
      callback(null, JSON.parse(accessToken.value))
    }else{
      callback(null, {accessToken: "", expireTime: 0})
    }
  }).catch(function(err) {
    callback(err)
  })
}

function accessCallback(token){
  models.DConfig.findOrCreate({
    where: {
      name: "chongAccessToken"
    },
    defaults: {
      value: "{}"
    }
  }).spread(function(accessToken) {
      accessToken.updateAttributes({
        value: JSON.stringify(token)
      }).then(function(accessToken) {
        return null;
      }).catch(function(err){
        return null;
      })
  }).catch(function(err) {
     return null;
  })
}


exports.ChongRecharger = ChongRecharger;
exports.accessCallback = accessCallback;
exports.storeCallback = storeCallback;