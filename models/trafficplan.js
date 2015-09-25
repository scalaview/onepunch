'use strict';
module.exports = function(sequelize, DataTypes) {
  var TrafficPlan = sequelize.define('TrafficPlan', {
    providerId: { type: DataTypes.INTEGER, allowNull: false },
    value: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    name: { type: DataTypes.STRING, allowNull: false },
    cost: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0.00 },
    sortNum: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    display: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    type: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    bid: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    },
    instanceMethods: {
      className: function(){
        return "TrafficPlan"
      },
      provider: function(){
        return TrafficPlan.ProviderName[this.providerId]
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
    '非正式' : 0,
    '正式' : 1
  }

  return TrafficPlan;
};