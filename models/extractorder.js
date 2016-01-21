'use strict';

var request = require("request")
var async = require("async")
var helpers = require("../helpers")
var recharger = require("../recharger")
var ChongRecharger = recharger.ChongRecharger
var config = require("../config")
var crypto = require('crypto')


// [0, '非正式'], [1, '空中平台'], [2, '华沃流量']
var Recharger = function(phone, value){
  // type = 0 or null
  this.phone = phone
  this.value = value

  this.options = {
    uri: config.yunma,
    method: 'GET',
    qs: {
      user_name: config.user,
      passwd: config.pwd,
      mobile: this.phone,
      num: (this.value / 50)
    }
  }

  this.then = function(callback){
    this.successCallback = callback
    return this
  }

  this.catch = function(callback){
   this.errCallback = callback
   return this
  }

 this.do = function(){

  var inerSuccessCallback = this.successCallback;
  var inerErrCallback = this.errCallback;

  request(this.options, function (error, res) {
    if (!error && res.statusCode == 200) {
      if(inerSuccessCallback){
        var values = res.body.split('\n')
        var data = {
          state: values[0],
          msg: values[1]
        }
        inerSuccessCallback.call(this, res, data)
      }
     }else{
      if(inerErrCallback){
        inerErrCallback.call(this, error)
      }
     }
   });

   return this
 }
 return this
}

var DefaultRecharger = function(phone, bid, orderId){
  // type = 1
  this.phone = phone
  this.bid = bid
  this.orderId = orderId

  this.did = config.did
  this.key = config.umeolKey
  this.time = (new Date()).getTime()
  this.preMd5Str = this.phone + this.did + this.time + this.key

  this.options = {
    uri: config.umeolRechargeUrl,
    method: 'GET',
    qs: {
      tel: this.phone,
      did: this.did,
      bid: this.bid,
      dorderid: this.orderId,
      timestamp: this.time,
      userkey: crypto.createHash('md5').update(this.preMd5Str).digest("hex")
    }
  }

  this.then = function(callback){
    this.successCallback = callback
    return this
  }

  this.catch = function(callback){
   this.errCallback = callback
   return this
  }

 this.do = function(){

  var inerSuccessCallback = this.successCallback;
  var inerErrCallback = this.errCallback;

  request(this.options, function (error, res) {
    if (!error && res.statusCode == 200) {
      if(inerSuccessCallback){
        var data = JSON.parse(res.body)
        inerSuccessCallback.call(this, res, data)
      }
     }else{
      if(inerErrCallback){
        inerErrCallback.call(this, error)
      }
     }
   });

   return this
 }
 return this
}

var HuawoRecharger = function(phone, packagesize, orderId, account, pwd, range){
  // type = 2
  this.phone = phone
  this.packagesize = packagesize
  this.orderId = orderId

  this.account = account || config.huawo_account

  var host = 'http://' + config.huawo_hostname

  this.signTime = helpers.strftime(new Date(), "YYYYMMDDHH")

  var md5Params = '{"username":"'+ helpers.toUnicode(this.account) +'","mobile":"'+ this.phone +'","packagesize":"'+ this.packagesize +'","password":"'+ config.huawo_pwd +'","signTime":"'+ this.signTime +'"}'

  this.sign = crypto.createHash('md5').update(md5Params).digest("hex")
  console.log(this.sign)

  var params = {
    username: this.account,
    mobile: this.phone,
    packagesize: this.packagesize + "",
    password: pwd || config.huawo_pwd,
    signTime: helpers.strftime(new Date(), "YYYYMMDDHH"),
    range: range,
    requestTime: helpers.strftime(new Date(), "YYYYMMDDHHmmss"),
    sign: this.sign,
    returnUrl: encodeURIComponent("http://" + config.hostname + "/huawoconfirm")
  }

  this.options = {
    uri: host,
    method: 'GET',
    qs: params
  }

  console.log(this.options)

  this.then = function(callback){
    this.successCallback = callback
    return this
  }

  this.catch = function(callback){
   this.errCallback = callback
   return this
  }

  this.do = function(){

  var inerSuccessCallback = this.successCallback;
  var inerErrCallback = this.errCallback;

  request(this.options, function (error, res) {
    if (!error && res.statusCode == 200) {
      if(inerSuccessCallback){
        console.log(res.body)
        var data = JSON.parse(res.body)
        inerSuccessCallback.call(this, res, data)
      }
     }else{
      if(inerErrCallback){
        inerErrCallback.call(this, error)
      }
     }
   });

   return this
 }
 return this
}





module.exports = function(sequelize, DataTypes) {
  var ExtractOrder = sequelize.define('ExtractOrder', {
    state: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    exchangerType: { type: DataTypes.STRING, allowNull: false },
    exchangerId: { type: DataTypes.INTEGER, allowNull: false },
    phone: {  type: DataTypes.STRING, allowNull: true },
    cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0.0 },
    extend: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    value: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    type: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    bid: { type: DataTypes.STRING, allowNull: true },
    customerId: { type: DataTypes.INTEGER, allowNull: true },
    chargeType: { type: DataTypes.STRING, allowNull: false, defaultValue: "balance" },
    transactionId: { type: DataTypes.INTEGER },
    paymentMethodId: { type: DataTypes.INTEGER },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0.0 },
    taskid: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        models.ExtractOrder.belongsTo(models.TrafficPlan, {
          foreignKey: 'exchangerId',
          scope: {
            sourceable: 'TrafficPlan'
          }
        });
        models.ExtractOrder.belongsTo(models.FlowTask, {
          foreignKey: 'exchangerId',
          scope: {
            sourceable: 'FlowTask'
          }
        });
        models.ExtractOrder.belongsTo(models.Customer, {
          foreignKey: 'customerId',
          scope: {
            sourceable: 'Customer'
          }
        });
        models.ExtractOrder.ChongRecharger = new ChongRecharger(models, config.chong[process.env.NODE_ENV || "development"].client_id, config.chong[process.env.NODE_ENV || "development"].client_secret, recharger.storeCallback, recharger.accessCallback)
      }
    },
    instanceMethods: {
      isDone: function() {
        return (this.state === ExtractOrder.STATE.SUCCESS)
      },
      className: function() {
        return "ExtractOrder";
      },
      getExchanger: function(conditions){
        return this['get' + this.exchangerType].call(this, conditions)
      },
      stateName: function(){
        if(this.state === ExtractOrder.STATE.INIT){
          return "待处理"
        }else if(this.state === ExtractOrder.STATE.SUCCESS){
          return "充值任务提交成功"
        }else if(this.state === ExtractOrder.STATE.FAIL){
          return "失败"
        }else if(this.state === ExtractOrder.STATE.PAID){
          return "付款成功"
        }else if(this.state === ExtractOrder.STATE.UNPAID){
          return "付款失败"
        }else if(this.state === ExtractOrder.STATE.REFUNDED){
          return "退款"
        }else if(this.state === ExtractOrder.STATE.FINISH){
          return "充值成功"
        }
      },
      autoRecharge: function(trafficPlan){
        var typeJson = trafficPlan.typeJson()
        if(trafficPlan.type == typeJson['空中平台']){
          return new DefaultRecharger(this.phone, this.bid, this.id)
        }else if(trafficPlan.type == typeJson['华沃广东']){
          return new HuawoRecharger(this.phone, this.bid, this.id, config.huawo_province_account, config.huawo_province_pwd, 1)
        }else if(trafficPlan.type == typeJson['华沃全国']){
          return new HuawoRecharger(this.phone, this.bid, this.id, config.huawo_account, config.huawo_pwd, 0)
        }else if(trafficPlan.type == typeJson['华沃红包']){
          return new HuawoRecharger(this.phone, this.bid, this.id, config.huawo_lucky_account, config.huawo_lucky_pwd, 0)
        }else if(trafficPlan.type == typeJson['曦和流量']){
          return ExtractOrder.ChongRecharger.rechargeOrder(this.phone, this.bid, "http://protchar.cn/fortest")
        }else{
          return new Recharger(this.phone, this.value)
        }
      },
      isPaid: function(){
        return (this.state === ExtractOrder.STATE.PAID)
      }
    }
  });

  ExtractOrder.STATE = {
    INIT: 0,
    PAID: 1,
    UNPAID: 2,
    SUCCESS: 3,
    FAIL: 4,
    REFUNDED: 5,
    FINISH: 6
  }

  return ExtractOrder;
};