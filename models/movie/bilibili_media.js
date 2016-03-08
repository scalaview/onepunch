'use strict';
module.exports = function(sequelize, DataTypes) {
  var BilibiliMedia = sequelize.define('BilibiliMedia', {
      avid: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      order: {
        type: DataTypes.INTEGER,
        defaultValue: 1
      },
      mid: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      cid: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      offsite: {
        type: DataTypes.STRING,
      },
      download: {
        type: DataTypes.STRING,
      },
      expires: {
        type: DataTypes.INTEGER,
      },
      display: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
  }, {
    tableName: 'douban_bilibili_medias',
    classMethods: {
      associate: function(models) {
        models.BilibiliMedia.belongsTo(models.BilibiliMovie, { foreignKey: 'avid' });
      }
    }
  });
  return BilibiliMedia;
};