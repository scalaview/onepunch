"use strict";
var express = require('express');
var admin = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var formidable = require('formidable')
var async = require("async")
var _ = require('lodash')
var moment = require('moment');
var sequelize = models.sequelize

admin.get("/order-report", function(req, res) {
  var timelist = []
  for(var i = 11; i >= 0 ; i --){
    timelist.push(moment().subtract('months', i).format("YYYY-MM"))
  }
  res.render("admin/salereport/index", { timelist: timelist })
})

admin.get("/sale-report", function(req, res) {
  var date = req.query.date,
      startDate = moment(date).startOf("month").format("YYYY-MM-DD"),
      endDate = moment(date).endOf("month").format("YYYY-MM-DD")
  async.waterfall([function(next){
    sequelize.query("select DATE(updatedAt) AS date, count(*) AS `count`, sum(total) AS `total`, sum(cost) AS `cost`, sum(total - cost) AS `profix` FROM `ExtractOrders` AS `ExtractOrder` WHERE `ExtractOrder`.`state` = :state and `ExtractOrder`.`updatedAt` BETWEEN :begin AND :end GROUP BY DATE(updatedAt)",
      { replacements: { state: models.ExtractOrder.STATE["FINISH"], begin: startDate, end: endDate }, type: sequelize.QueryTypes.SELECT }
    ).then(function(result) {
      if(require.length >= 1){
        next(null, result)
      }else{
        next(null, [])
      }
    }).catch(function(err){
      next(err)
    })
  }], function(err, result){
    if(err){
      console.log(err)
      res.json({error: 1, msg: err.message})
    }else{
      res.json({error: 0, result: result, msg: "success"})
    }
  })
})

module.exports = admin;