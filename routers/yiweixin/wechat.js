var express = require('express');
var app = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var formidable = require('formidable')
var async = require("async")
var OAuth = require('wechat-oauth');
var config = require("../../config")
var wechat = require('wechat')
var WechatAPI = require('wechat-api');
var api = new WechatAPI(config.appId, config.appSecret);

var maxDepth = config.max_depth

var wechatConfig = {
  token: config.token,
  appid: config.appId,
  encodingAESKey: config.aesKey
}

app.use('/wechat', wechat(wechatConfig, function (req, res, next) {
  var menusKeys = config.menus_keys
  var message = req.weixin;
  console.log(message)

  if(message.Event === 'subscribe' && message.EventKey.indexOf('qrscene_') != -1 ) { // scan and subscribe
    subscribe(message, res)
  }else if (message.EventKey === menusKeys.button1) {
    res.reply('hehe');
  }else if (message.Event === 'unsubscribe') {
    unsubscribe(message, res)
  }else{
    res.reply([
      {
        title: '',
        description: '新手任务',
        picurl: 'http://mmbiz.qpic.cn/mmbiz/JkicEhnibw1DDgqib0QzeiaPEqzcpyn6Ak51LFHjlzCL2Xw392Y52pvc7yHYkzg1IeJWCkC2RicTSicicH9fwictAAkrVw/640?wx_fmt=jpeg&tp=webp&wxfrom=5',
        url: 'http://mp.weixin.qq.com/s?__biz=MzIyNTAxODU2NQ==&mid=207857350&idx=1&sn=103c09576aac256b672659a7205b675f&scene=0#rd'
      }
    ])
  }
}))


function unsubscribe(message, res) {
  var openid = message.FromUserName

  async.waterfall([function(next) {
    models.Customer.findOne({
      where: {
        wechat: openid
      }
    }).then(function (customer) {
      if(customer && customer.isSubscribe){
        customer.updateAttributes({
          isSubscribe: false
        }).then(function(customer) {
          next(null, customer)
        })
      }else{
        return
      }
    })
  }], function(err) {
    res.reply('取消关注成功')
  })

}

/*
{ ToUserName: '',
  FromUserName: '',
  CreateTime: '1448544827',
  MsgType: 'event',
  Event: 'subscribe',
  EventKey: 'qrscene_1',
  Ticket: 'gQEH8DoAAAAAAAAAASxodHRwOi8vd2VpeGluLnFxLmNvbS9xL20wUTlWbnptdzlHNlJ0Q0JoMmp1AAIEX7hWVgMEAAAAAA==' }
*/


function subscribe(message, res){
  var customerId = message.EventKey.replace('qrscene_', ''),
      openid = message.FromUserName

  async.waterfall([function(next) {
    models.Customer.findOne({
      where: {
        wechat: openid
      }
    }).then(function (customer) {
      if(customer && customer.isSubscribe){
        return
      }else if(customer && !customer.isSubscribe){
        customer.updateAttributes({
          isSubscribe: true
        }).then(function(customer) {
          return
        }).catch(function(err) {
          next(err)
        })
      }else{
        next(null, openid)
      }
    })
  }, function(openid, next) {
    api.getUser(openid, function(err, result) {
      if(err){
        next(err)
      }else{
        next(null, result)
      }
    });
  }, function(result, next) {
    models.Customer.findById(customerId).then(function(customer) {
      next(null, customer, result)
    })
  }, function(recommend, result, next) {
      // new customer

      models.Customer.build({
        password: '1234567',
        phone: "11111111111",
        username: result.nickname,
        wechat: result.openid,
        sex: result.sex + '',
        city: result.city,
        province: result.province,
        country: result.country,
        headimgurl: result.headimgurl,
        subscribeTime: new Date(parseInt(result.subscribe_time) * 1000),
        isSubscribe: true,
        ancestry: recommend
      }).save().then(function(customer) {
        next(null, customer, recommend)
      }).catch(function(err) {
        next(err)
      })
  }], function(err, newCustomer, recommend) {
    if(err){
      console.log(err)
      res.reply('')
    }else{
      models.MessageTemplate.findOrCreate({
        where: {
          name: "subscribe"
        },
        defaults: {
          content: "您好{{username}}，欢迎成为第{{id}}位用户"
        }
      }).spread(function(template) {
        var content = template.content.format({ username: newCustomer.username, id: newCustomer.id })
        sendSubscribeNotice(newCustomer, recommend)

        res.reply(content)
      }).catch(function(err) {
        res.reply('')
      })
    }
  })


}


function sendSubscribeNotice(newCustomer, recommend){

  async.waterfall([function(next) {
    models.MessageTemplate.findOrCreate({
        where: {
          name: "recommendNotice"
        },
        defaults: {
          content: "您推荐{{username}}成为第{{id}}位用户"
        }
      }).spread(function(template) {
        var content = template.content.format({ username: newCustomer.username, id: newCustomer.id })
        next(null, content)
      }).catch(function(err) {
        next(err)
      })
  }, function(content, next) {
    var articles = [
     {
       "title":"推荐成功",
       "description": content,
       "url": "http://" + config.hostname + '/slave?id=' + newCustomer.id,
       "picurl": newCustomer.headimgurl
     }];

    api.sendNews(recommend.wechat, articles, function(err, result) {
      if(err){
        next(err)
      }else{
        next(result)
      }
    });
  }], function(err, result) {
    if(err){
      console.log(err)
    }else{
      console.log(result)
    }
  })
}

module.exports = app;
