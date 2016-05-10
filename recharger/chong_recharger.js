var request = require("request")
var async = require("async")
var helpers = require("../helpers")
var config = require("../config")
var crypto = require('crypto')



function ChongRecharger(models){
  this.models = models
  this.client_id = config.chong[process.env.NODE_ENV || "development"].client_id
  this.client_secret = config.chong[process.env.NODE_ENV || "development"].client_secret
  this.hostname = config.chong[process.env.NODE_ENV || "development"].hostname
  this.callbackUrl = "http://"+ this.hostname +"/liuliangshopconfirm"

  var that = this

  this.storeCallback = function(callback){
    that.models.DConfig.findOrCreate({
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

  this.accessCallback = function(token){
    that.models.DConfig.findOrCreate({
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


  this.formatQueryParams = function(params, urlencode){
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

  this.sign = function(params){
    var formatParams = that.formatQueryParams(params, false),
        sha1Str = crypto.createHash('sha1').update(formatParams).digest('hex')
    return sha1Str.toUpperCase()
  }


}


ChongRecharger.prototype.requireToken = function(){
  var that = this
  var params = {
        client_id: that.client_id,
        client_secret: that.client_secret,
        grant_type: "client_credential"
      },
      uri = "http://" + that.hostname + "/v1/auth/token",
      options = {
        uri: uri,
        method: 'POST',
        qs: params
      }
  return new Promise(function(resolve, reject){
    request(options, function (error, res) {
      if (!error && res.statusCode == 200) {
        console.log(res.body)
        var data = JSON.parse(res.body)
        if(data.access_token){
          var now = (new Date()).getTime() + data.expires_in * 1000
          that.accessCallback({accessToken: data.access_token, expireTime: now})
          resolve({accessToken: data.access_token, expireTime: now})
        }else{
          reject(new Error("access_token not found"))
        }
      }else{
        reject(error)
      }
    });
  })
}


ChongRecharger.prototype.getAccessToken = function(_storeCallback){
  var that = this
  var storeCallback = _storeCallback || that.storeCallback

  return new Promise(function(resolve, reject){
    if(storeCallback){
      storeCallback(function(err, token){
        if(!err){

          var now = (new Date()).getTime()
          if(now < token.expireTime){
            resolve(token)
          }else{
            that.requireToken().then(function(token){
              resolve(token)
            }).catch(function(err){
              reject(err)
            })
          }
        }else{
          that.requireToken().then(function(token){
            resolve(token)
          }).catch(function(err){
            reject(err)
          })
        }
      })
    }else{
      that.requireToken().then(function(token){
        resolve(token)
      }).catch(function(err){
        reject(err)
      })
    }
  })

}


ChongRecharger.prototype._getProducts = function(access_token, successCallback, errCallback){
  var that = this
  var uri = "http://" + this.hostname + "/v1/product/lists"
  var options = {
        uri: uri,
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
        successCallback.call(that, data)
      }
    }else{
      if(errCallback){
        errCallback.call(that, error)
      }
    }
  });
}

ChongRecharger.prototype.getProducts = function(){
  var that = this

  return new Promise(function(resolve, reject){
    that.getAccessToken().then(function(token){
      that._getProducts(token.accessToken, function(data){
        resolve(data)
      }, function(err){
        reject(err)
      })
    }).catch(function(err){
      reject(err)
    })
  })

}


ChongRecharger.prototype._rechargeOrder = function(access_token, phone, productId, successCallback, errCallback){
  var that = this,
      uri = "http://" + this.hostname + "/v1/flow/recharge/order",
      signParams = {
        callback_url: this.callbackUrl,
        client_id: this.client_id,
        number: phone,
        product_id: productId
      },
      sign = that.sign(signParams)
    signParams['sign'] = sign
    signParams['access_token'] = access_token
  var options = {
        uri: uri,
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
}



ChongRecharger.prototype.createOrder = function(phone, productId){
  var that = this

  return new Promise(function(resolve, reject){
    that.getAccessToken().then(function(token){
      that._rechargeOrder(token.accessToken, phone, productId, function(data){
        resolve(data)
      }, function(err){
        reject(err)
      })
    }).catch(function(err){
      reject(err)
    })
  })
}


module.exports.ChongRecharger = ChongRecharger;