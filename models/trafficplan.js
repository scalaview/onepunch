'use strict';

var request = require("request")
var async = require("async")
var helpers = require("../helpers")
var config = require("../config")
var crypto = require('crypto')

module.exports = function(sequelize, DataTypes) {
  var TrafficPlan = sequelize.define('TrafficPlan', {
    providerId: { type: DataTypes.INTEGER, allowNull: false },
    value: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    name: { type: DataTypes.STRING, allowNull: false },
    cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    sortNum: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    display: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    type: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    bid: { type: DataTypes.STRING, allowNull: true },
    trafficGroupId: { type: DataTypes.INTEGER, allowNull: true },
    purchasePrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.0 },
    withOutDiscount: { type: DataTypes.VIRTUAL }
  }, {
    classMethods: {
      associate: function(models) {
        models.TrafficPlan.belongsTo(models.TrafficGroup, { foreignKey: 'trafficGroupId' });
      },
      getTrafficPlanByGroup: function(models, providerId, customer, coupons, pass){
        models.TrafficGroup.findAll({
          where: {
            providerId: providerId,
            display: true
          },
          order: [
            ['sortNum', 'ASC'],
            ['id', 'ASC']
           ]
        }).then(function(trafficgroups) {
          async.map(trafficgroups, function(trafficgroup, next) {
            trafficgroup.getTrafficPlans({
              where: {
                display: true
              },
              order: [
                ['sortNum', 'ASC'],
                ['id', 'ASC']
              ]
            }).then(function(trafficplans) {
              var data = null
              if(trafficplans.length > 0){
                trafficplans = helpers.applyCoupon(coupons, trafficplans, customer)
                data = {
                  name: trafficgroup.name,
                  trafficplans: trafficplans
                }
              }
              next(null, data)
            }).catch(function(err) {
              next(err)
            })
          }, function(err, result) {
            if(err){
              pass(err)
            }else{
              var data = []
              for (var i = 0; i < result.length; i++) {
                if(result[i])
                  data.push(result[i])
              };
              pass(null, data)
            }
          })
        })
      }
    },
    instanceMethods: {
      className: function(){
        return "TrafficPlan"
      },
      provider: function(){
        return TrafficPlan.ProviderName[this.providerId]
      },
      typeJson: function(){
        return TrafficPlan.TYPE;
      }
    },
    scopes: {
      forSelect: {
        where: {
          providerId: 0
        },
        order: [
          ['sortNum']
        ]
      }
    }
  });

  TrafficPlan.Provider = {
    '中国移动': 0,
    '中国联通': 1,
    '中国电信': 2
  }

  TrafficPlan.ProviderName = {
    0: '中国移动',
    1: '中国联通',
    2: '中国电信'
  }

  TrafficPlan.TYPE = {
    '非正式': 0,
    '空中平台': 1,
    '华沃红包': 2,
    '华沃广东': 3,
    '华沃全国': 4,
    '曦和流量': 5,
    '易流量': 6,
    '新号吧': 7,
    '龙速': 8
  }

  TrafficPlan.PROVIDERARRAY = Object.keys(TrafficPlan.Provider).map(function(k) { return [TrafficPlan.Provider[k], k] });

  TrafficPlan.TYPEARRAY = Object.keys(TrafficPlan.TYPE).map(function(k) { return [TrafficPlan.TYPE[k], k] });

  return TrafficPlan;
};