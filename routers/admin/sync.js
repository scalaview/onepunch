var express = require('express');
var admin = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")
var _ = require('lodash')
var crypto = require('crypto')
var config = require("../../config")
var request = require("request")

admin.get('/synclongsu', function(req ,res) {

  function getProviderId(providerType){
    //运营商类型 1：电信 2：移动 3：联通
    switch(providerType) {
      case "移动":
        return models.TrafficPlan.Provider["中国移动"]
      case "联通":
        return models.TrafficPlan.Provider["中国联通"]
      default:
        return models.TrafficPlan.Provider["中国电信"]
    }
  }

  function getValue(string){
    var y = /[M|G|m|g]/,
        end = y.exec(string)

    if(end.index + 1 <= string.length){
      var unit = string.substring(end.index, end.index + 1)
    }else{
      var unit = 'M'
    }
    var size = string.replace(/[^0-9]/ig,"")
    if(unit.toLowerCase() == 'g' ){
      return parseInt(size) * 1024
    }else{
      return parseInt(size)
    }
  }

  async.waterfall([function(next){
    models.ExtractOrder.Longsu.getProducts().then(function(data){
      if(data.resultcode === '0'){
        next(null, data)
      }else{
        next(new Error(data.message))
      }
    })
  }, function(data, pass){
      async.map(data.gettyperesponse.type, function(product, next){
        if(product.tname.indexOf("话费") != -1){
          next(null)
          return
        }

        models.TrafficPlan.findOne({
          where: {
            bid: product.typeid,
            type: models.TrafficPlan.TYPE["龙速"]
          }
        }).then(function(plan){
          var attr = {
            providerId: getProviderId(product.ttype),
            value: getValue(product.tname),
            name: product.tname.replace('.', ''),
            cost: (parseFloat(product.price) + 13.00).toFixed(2),
            display: false,
            type: models.TrafficPlan.TYPE["龙速"],
            bid: product.typeid,
            purchasePrice: product.price,
            is_exists: plan ? true : false,
            plan: plan
          }
          next(null, attr)
        })
      }, function(err, result){
        if(err){
          pass(err)
        }else{
          pass(null, result.compact())
        }
      })
  }], function(err, plans){
    if(err){
      console.log(err)
      req.flash('err', err.message)
    }else{
      req.flash('info', "sync success")
    }
    res.render("admin/sync/longsu", { plans: plans ? plans : [] })
  })

})

admin.get('/createlongsu', function(req, res) {
  var params = req.query

  async.waterfall([function(next){
    var defaultsAttr = {
        providerId: params.providerId,
        value: params.value,
        name: params.name,
        cost: params.cost,
        display: false,
        type: params.type,
        bid: params.bid,
        purchasePrice: params.purchasePrice
      }
    models.TrafficPlan.findOrCreate({
      where: {
        bid: params.bid,
        type: params.type
      },
      defaults: defaultsAttr
    }).spread(function(trafficPlan) {
      trafficPlan.updateAttributes(defaultsAttr).then(function(trafficPlan){
        next(null, trafficPlan)
      }).catch(function(err){
        next(err)
      })
    }).catch(function(err) {
      next(err)
    })
  }], function(err, trafficPlan){
    if(err){
      console.log(err)
      req.flash("err", err.message)
    }else{
      req.flash("success", trafficPlan.id + "create success")
    }
    res.redirect('/admin/synclongsu')
  })
})



admin.get('/syncliuliangshop', function(req ,res) {

  function getProviderId(providerType){
    //运营商类型 1：电信 2：移动 3：联通
    switch(providerType) {
      case "1":
        return models.TrafficPlan.Provider["中国电信"]
      case "2":
        return models.TrafficPlan.Provider["中国移动"]
      case "3":
        return models.TrafficPlan.Provider["中国联通"]
    }
  }

  models.ExtractOrder.ChongRecharger.getProducts().then(function(data){
    if(data.errcode == 0){
      async.each(data.products, function(product, next){
        models.TrafficPlan.findOrCreate({
          where: {
            bid: product.product_id
          },
          defaults: {
            providerId: getProviderId(product.provider_type),
            value: product.flow_value,
            name: product.name,
            cost: product.price,
            display: false,
            type: models.TrafficPlan.TYPE["曦和流量"],
            bid: product.product_id,
            purchasePrice: product.cost
          }
        }).spread(function(trafficPlan) {
          trafficPlan.updateAttributes({
            providerId: getProviderId(product.provider_type),
            value: product.flow_value,
            name: product.name,
            cost: product.price,
            display: false,
            type: models.TrafficPlan.TYPE["曦和流量"],
            bid: product.product_id,
            purchasePrice: product.cost
          }).then(function(trafficPlan){
            next(null)
          }).catch(function(err){
            next(err)
          })
        }).catch(function(err) {
          next(err)
        })
      }, function(err){
        if(err){
          res.send(err)
        }else{
          res.send(data)
        }
      })
    }else{
      res.send(data.errmsg)
    }
  }).catch(function(err){
    res.send(err)
  })
})

module.exports = admin;