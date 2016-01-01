'use strict';

var config = require("../config")
var async = require("async")
var maxDepth = config.max_depth

module.exports = function(sequelize, DataTypes) {
  var AffiliateConfig = sequelize.define('AffiliateConfig', {
    level: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    percent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    trafficPlanId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      },
      loadConfig: function(models, dataPlan, successCallBack, errCallBack) {
        async.waterfall([function(next) {
          models.AffiliateConfig.count({
            where: {
              dataPlanId: dataPlan.id
            }
          }).then(function(c) {
            if(c > 0){
              var params = {
                              trafficPlanId: trafficPlanId.id,
                              level: {
                                $lte: maxDepth
                              }
                            }
            }else{
              var params = {
                              dataPlanId: {
                                $eq: null
                              },
                              level: {
                                $lte: maxDepth
                              },
                              percent: {
                                $gt: 0
                              }
                            }
            }
            next(null, params)
          })
        }, function(params, next) {
          models.AffiliateConfig.findAll({
            where: params,
            order: [
              ['level']
            ]
          }).then(function(configs) {
            next(null, configs)
          }).catch(function(err) {
            next(err)
          })
        }], function(err, configs) {
          if(err){
            errCallBack(err)
          }else{
            successCallBack(configs)
          }
        })
      }
    }
  });
  return AffiliateConfig;
};