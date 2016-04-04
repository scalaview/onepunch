var express = require('express');
var app = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")
var requireLogin = helpers.requireLogin
var request = require("request").defaults({jar: true})

app.get("/cmpower", requireLogin, function(req, res) {
  res.render("yiweixin/activities/cmpower")
})

app.post("/cmpower", requireLogin, function(req, res){
  var phone = req.body.phone
  res.locals.customer = req.customer
  console.log(phone)
  async.waterfall([function(next){
    var form = {
      "mobi": phone,
      "area": "荔湾",
      "building": "万科金域华府",
      "address": (Math.random().toFixed(1) * 10) + "栋" + (Math.random().toFixed(2) * 100) + "号房间"
    }
    request.post({url:'http://weili.cmpower.cn/h5/lighten_gz/register_login', form: form}, function(err, httpRes, body){
      if (!err && res.statusCode == 200) {
        var result = JSON.parse(body)
        console.log(result)
        console.log(httpRes.headers['set-cookie'])
        // { code: 0, msg: '登记成功', data: [] }
        if(result.code === 0) {
          next(null, httpRes.headers['set-cookie'])
        } else {
          next({code: 0, msg: result.msg})
        }
      }else{
        next(err)
      }
    })
  }, function(cookie, next){
    var options = {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie
        },
        uri: "http://weili.cmpower.cn/h5/lighten_gz/do_play",
        method: 'POST',
        qs: {
        }
      }
    request(options, function(err, httpRes, body){
      if (!err && httpRes.statusCode == 200) {
        var result = JSON.parse(body)
        console.log(result)
        // { code: 0, msg: '返回数据', data: { user_type: 3, award_id: 1 } }
        if(result.code == 0){
          switch(result.data.user_type) {
                  case 1: next(null, {code: 1, msg: "获得100M流量"});
                  case 2: next(null, {code: 1, msg: "获得1G流量"});
                  case 3: next(null, {code: 1, msg: "半年期南方都市报报纸"});
                  case 4: next(null, {code: 1, msg: "中兴天机MAX手机"});
                  case 5: next(null, {code: 0, msg: "很遗憾！您与奖品擦肩而过"});
                }
        }else{
          next({code: 0, msg: result.msg})
        }
      }else{
        next(err)
      }
    })
  }], function(err, data){
    if(err){
      console.log(err)
      res.json(err)
    }else{
      res.json(data)
    }
  })
})


module.exports = app;
