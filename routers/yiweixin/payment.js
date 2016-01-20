var express = require('express');
var app = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")
var requireLogin = helpers.requireLogin
var config = require("../../config")
var fs        = require('fs');
var payment = helpers.payment;
var maxDepth = config.max_depth
var _ = require('lodash')

app.get('/payment', requireLogin, function(req, res) {
  var customer = req.customer
  async.waterfall([function(next){
    if(customer.levelId !== undefined){
        models.Level.findById(customer.levelId).then(function(level) {
          customer.level = level
        })
      }
      next(null, customer)
  }, function(customer, next) {
    models.Coupon.findAll({
      where: {
        isActive: true,
        expiredAt: {
          $gt: (new Date()).begingOfDate()
        }
      },
      order: [
              ['updatedAt', 'DESC']
             ]
    }).then(function(coupons) {
      next(null, coupons)
    }).catch(function(err) {
      next(err)
    })
  }], function(err, coupons) {
    if(err){
      console.log(err)
    }else{
      models.TrafficPlan.allOptions(function(trafficPlans){

        for (var i = coupons.length - 1; i >= 0; i--) {
          for (var j = trafficPlans.length - 1; j >= 0; j--) {
            if(coupons[i].trafficPlanId == trafficPlans[j].id){
              if(trafficPlans[j].coupon === undefined){
                trafficPlans[j].coupon = coupons[i]
              }else if(trafficPlans[j].coupon.updatedAt < coupons[i].updatedAt){
                trafficPlans[j].coupon = coupons[i]
              }
            }
          };
        };
        res.render('yiweixin/orders/payment', { customer: customer, trafficPlans: trafficPlans })
      }, function(err) {
        console.log(err)
      })
    }
  })


})

app.post('/pay', requireLogin, function(req, res) {
    var customer = req.customer,
        chargetype = (req.body.chargetype == "balance" ) ? models.Customer.CHARGETYPE.BALANCE : models.Customer.CHARGETYPE.SALARY

    async.waterfall([function(next){
      if(customer.levelId !== undefined){
        models.Level.findById(customer.levelId).then(function(level) {
          customer.level = level
        })
      }
      next(null, customer)
    }, function(customer, next) {
      models.PaymentMethod.findOne({ where: { code: req.body.paymentMethod.toLowerCase() } }).then(function(paymentMethod) {
        if(paymentMethod){
          next(null, paymentMethod);
        }else{
          res.json({ err: 1, msg: "找不到支付方式" })
        }
      }).catch(function(err){
        next(err)
      })
    }, function(paymentMethod, next){
      models.TrafficPlan.findById(req.body.flowId).then(function(trafficPlan){
        if(trafficPlan){
          next(null, paymentMethod, trafficPlan)
        }else{
          res.json({ err: 1, msg: "请选择正确的流量套餐" })
        }
      }).catch(function(err) {
        next(err)
      })
    }, function(paymentMethod, trafficPlan, next){
      models.Coupon.findAll({
        where: {
          trafficPlanId: trafficPlan.id,
          isActive: true,
          expiredAt: {
            $gt: (new Date()).begingOfDate()
          }
        },
        order: [
                ['updatedAt', 'DESC']
               ]
      }).then(function(coupons) {
        trafficPlan.coupon = coupons[0]
        next(null, paymentMethod, trafficPlan)
      }).catch(function(err) {
        next(err)
      })
    }, function(paymentMethod, trafficPlan, next){
      var discount = 1.00

      if(trafficPlan.coupon && trafficPlan.coupon.ignoreLevel && trafficPlan.coupon.discount > 0){
        discount = discount - trafficPlan.coupon.discount
      }else if(customer.level && customer.level.discount > 0){
        discount = discount - customer.level.discount
      }
      if(chargetype == models.Customer.CHARGETYPE.SALARY && customer.salary < (trafficPlan.price * discount)){
        res.json({ err: 1, msg: "分销奖励不足" })
        return
      }

      models.ExtractOrder.build({
        exchangerType: trafficPlan.className(),
        exchangerId: trafficPlan.id,
        phone: req.body.phone,
        cost: trafficPlan.cost,
        value: trafficPlan.value,
        bid: trafficPlan.bid,
        customerId: customer.id,
        chargeType: chargetype,
        paymentMethodId: paymentMethod.id,
        total: trafficPlan.price * discount
      }).save().then(function(extractOrder) {
        next(null, paymentMethod, trafficPlan, extractOrder)
      }).catch(function(err) {
        next(err)
      })
    }], function(error, paymentMethod, trafficPlan, extractOrder){
      if(error){
        console.log(error)
        res.json({ err: 1, msg: "server error" })
      }else{
        //TODO salary
        if(extractOrder.chargeType == models.Customer.CHARGETYPE.BALANCE){
          var ipstr = req.ip.split(':'),
          ip = ipstr[ipstr.length -1]

          var orderParams = {
            body: '流量套餐 ' + trafficPlan.name,
            attach: extractOrder.id,
            out_trade_no: config.hostname + (+new Date),
            total_fee:  Math.round(extractOrder.cost * 100),
            spbill_create_ip: ip,
            openid: customer.wechat,
            trade_type: 'JSAPI'
          };

          console.log(orderParams)
          payment.getBrandWCPayRequestParams(orderParams, function(err, payargs){
            if(err){
              console.log("payment fail")
              console.log(err)
              res.json({err: 1, msg: 'payment fail'})
            }else{
              console.log(payargs)
              res.json(payargs);
            }
          });
        }else{
          // charge by salary
          customer.reduceTraffic(models, extractOrder, function(){
            res.json({err: 0, msg: '付款成功'})

            extractOrder.updateAttributes({
              state: models.ExtractOrder.STATE.PAID
            }).then(function(extractOrder){
              autoCharge(extractOrder, trafficPlan, function(err, trafficPlan, extractOrder){
                if(err){
                  console.log(err)
                  // refund
                  customer.refundTraffic(models, extractOrder, err, function(customer, extractOrder, flowHistory){
                  }, function(err){
                    console.log(err)
                  })
                }else{
                  console.log("充值成功")
                }
              })
            })
          }, function(err){
            console.log(err)
            res.json({err: 1, msg: '付款失败'})
          })
        }
      }
    })
})


var middleware = require('wechat-pay').middleware;
app.use('/paymentconfirm', middleware(helpers.initConfig).getNotify().done(function(message, req, res, next) {
  console.log(message)

  var extractOrderId = message.attach

  async.waterfall([function(next) {
    models.ExtractOrder.findById(extractOrderId).then(function(extractOrder) {
      if(extractOrder){
        next(null, extractOrder)
      }else{
        next(new Error('order not found'))
      }
    }).catch(function(err) {
      next(err)
    })
  }, function(extractOrder, next){
    if(message.result_code === 'SUCCESS' && !extractOrder.isPaid()){
      extractOrder.updateAttributes({
        state: models.ExtractOrder.STATE.PAID,
        transactionId: message.transaction_id
      }).then(function(extractOrder){
        next(null, extractOrder)
      })
    }else{
      next(new Error("pass"))
    }
  }, function(extractOrder, next) {
    models.Customer.findById(extractOrder.customerId).then(function(customer) {
      next(null, extractOrder, customer)
    }).catch(function(err) {
      next(err)
    })
  }, function(extractOrder, customer, next) {
    extractOrder.getExchanger().then(function(trafficPlan){
      next(null, extractOrder, customer, trafficPlan)
    }).catch(function(err){
      next(err)
    })
  }, function(extractOrder, customer, trafficPlan, next) {
    //do history
    customer.reduceTraffic(models, extractOrder, function(){
      next(null, extractOrder, customer)

      autoCharge(extractOrder, trafficPlan, function(err, trafficPlan, extractOrder){
        if(err){
          console.log(err)
          // refund
        }else{
          console.log("充值成功")
        }
      })
    }, function(err){
      next(err)
    }, extractOrder.chargeType)

  }, doOrderTotal, doAffiliate, autoAffiliate], function(err, extractOrder, customer){
    if(err){
      res.reply(err)
    }else{
      res.reply('success');
    }
  })
}));

function doAffiliate(extractOrder, customer, pass){
  pass(null, extractOrder, customer)

  async.waterfall([function(next) {
    extractOrder.getExchanger().then(function(trafficPlan){
      next(null, trafficPlan)
    }).catch(function(err){
      next(err)
    })
  }, function(trafficPlan, next) {
    models.AffiliateConfig.loadConfig(models, trafficPlan, function(configs) {
      if(configs.length <= 0){
        return
      }
      // var wrapped = configs.map(function (value, index) {
      //             return {index: value.level, value: value};
      //           });
      var configHash = {}
      _(configs).forEach(function(n) {
        configHash[n.level] = n
      }).value();

      var ll = customer.getAncestry()
      if(ll.length <= 0){
        return
      }
      var ancestryArr = []
      var end = (ll.length - 3) ? ll.length - 3 : 0

      for (var i = ll.length - 1; i >= end; i--) {
        ancestryArr.push(ll[i])
      };

      async.waterfall([function(next) {
        models.Customer.findAll({
          where: {
            id: {
              $in: ancestryArr
            }
          }
        }).then(function(ancestries) {
          var objHash = ancestries.map(function (value, index) {
            if(configHash[customer.ancestryDepth - value.ancestryDepth]){
              return {
                config: configHash[customer.ancestryDepth - value.ancestryDepth],
                customer: value
              }
            }
          }).compact()

          next(null, objHash)
        }).catch(function(err) {
          next(err)
        })
      }, function(objHash, next) {

        async.each(objHash, function(obj, callback) {
          var one =  obj.customer
          var confLine = obj.config

          var salary = (parseInt(confLine.percent) / 100) * trafficPlan.cost
          one.updateAttributes({
            salary: one.salary + salary
          }).then(function(o) {
            // add history
            one.takeFlowHistory(models, customer, salary, "从" + customer.username + "获得分销奖励 " + salary, models.FlowHistory.STATE.ADD , function() {
            }, function(err) {
            }, models.FlowHistory.TRAFFICTYPE.SALARY)
            callback()
          }).catch(function(err) {
            callback(err)
          })

        }, function(err) {
          if(err){
            next(err)
          }else{
            next(null)
          }
        })

      }], function(err) {

      })

    }, function(err) {})
  }], function(err) {

  })
}


function autoVIP(extractOrder, customer, pass) {
  pass(null, extractOrder, customer)

  if(customer.levelId){
    models.Level.findById(customer.levelId).then(function(level) {
      if( level === undefined ||  level.code == 'normal'){
        setVip(extractOrder, customer)
      }
    })
  }else{
    setVip(extractOrder, customer)
  }
}

function setVip(extractOrder, customer){
  models.DConfig.findOrCreate({
    where: {
      name: "vipLimit"
    },
    defaults: {
      name: 'vipLimit',
      value: 1
    }
  }).spread(function(dConfig) {
    if(customer.orderTotal > parseFloat(dConfig.value) ) {

      async.waterfall([function(next) {
        models.Level.findOne({
          where: {
            code: "vip"
          }
        }).then(function(level) {
          if(level){
            next(null, level)
          }
        }).catch(function(err) {
          next(err)
        })
      }, function(level, next) {
        customer.updateAttributes({
          levelId: level.id
        }).then(function(c) {
          next(null, c)
        }).catch(function(err) {
          next(err)
        })
      }], function(err, c) {
        if(err){
          console.log(err)
        }
      })
    }
  })
}


function autoAffiliate(extractOrder, customer, pass) {
  pass(null, extractOrder, customer)

  async.waterfall([function(next) {
    models.DConfig.findOrCreate({
      where: {
        name: 'affiliate'
      },
      defaults: {
        name: 'affiliate',
        value: 1
      }
    }).spread(function(dConfig) {
      next(null, dConfig)
    }).catch(function(err) {
      next(err)
    })
  }, function(dConfig, next){
    if(parseFloat(dConfig.value) < customer.orderTotal){
      customer.updateAttributes({
        isAffiliate: true
      }).then(function(customer){
        next(null)
      })
    }else{
      next(null)
    }
  }], function(err) {
    if(err){
      console.log(err)
    }
    return
  })
}

function doOrderTotal(extractOrder, customer, pass) {
  pass(null, extractOrder, customer)

  customer.updateAttributes({
    orderTotal: customer.orderTotal + extractOrder.total
  }).catch(function(err) {
    console.log(err)
  })
}

function autoCharge(extractOrder, trafficPlan, next){
  extractOrder.autoRecharge(trafficPlan).then(function(res, data) {
      console.log(data)
      if(trafficPlan.type == models.TrafficPlan.TYPE['空中平台']){  // 正规空中充值
        if(data.status == 1 || data.status == 2){
          next(null, trafficPlan, extractOrder)
        }else{
          extractOrder.updateAttributes({
            state: models.ExtractOrder.STATE.FAIL
          })
          next(new Error(data.msg))
        }
      }else if(trafficPlan.type == models.TrafficPlan.TYPE['华沃红包'] || trafficPlan.type == models.TrafficPlan.TYPE['华沃全国'] || trafficPlan.type == models.TrafficPlan.TYPE['华沃广东']){
        if(data.code == 1 && data.taskid != 0){
          extractOrder.updateAttributes({
            state: models.ExtractOrder.STATE.SUCCESS,
            taskid: data.taskid
          }).then(function(extractOrder){
            next(null, trafficPlan, extractOrder)
          }).catch(function(err) {
            next(err)
          })
        }else{
          extractOrder.updateAttributes({
            state: models.ExtractOrder.STATE.FAIL
          })
          next(new Error(data.Message))
        }
      }else if(trafficPlan.type == models.TrafficPlan.TYPE['曦和流量']){
        if(data.errcode == 0){
          extractOrder.updateAttributes({
            state: models.ExtractOrder.STATE.SUCCESS,
            taskid: data.order.transaction_id
          }).then(function(extractOrder){
            next(null, trafficPlan, extractOrder)
          }).catch(function(err) {
            next(err)
          })
        }else{
          extractOrder.updateAttributes({
            state: models.ExtractOrder.STATE.FAIL
          })
          next(new Error(data.errmsg))
        }
      }else{
        if(data.state == 1){
          extractOrder.updateAttributes({
            state: models.ExtractOrder.STATE.SUCCESS
          }).then(function(extractOrder){
            next(null, trafficPlan, extractOrder)
          }).catch(function(err) {
            next(err)
          })
        }else{
          extractOrder.updateAttributes({
            state: models.ExtractOrder.STATE.FAIL
          })
          next(new Error(data.msg))
        }
      }
    }).catch(function(err){
      next(err)
    }).do()
}

module.exports = app;