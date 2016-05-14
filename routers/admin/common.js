var express = require('express');
var admin = express.Router();
var models  = require('../../models');
var formidable = require('formidable')
var helpers = require("../../helpers")
var fs        = require('fs');
var _ = require('lodash')
var async = require("async")
var config = require("../../config")
var sequelize = models.sequelize
var api = helpers.API

admin.get('/', function (req, res) {
  res.render('admin/home');
});

admin.post('/kindeditor/uploads', function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    if(err){
      res.send({ "error": 1, 'message': "server error" })
      return
    }else if(!files.imgFile.type.match('^image\/')){
      res.send({ "error": 1, 'message': "只允许上传图片" })
      return
    }else if(files.imgFile.size > config.maxfileuploadsize){
      res.send({ "error": 1, 'message': "超出最大文件限制" })
      return
    }
    var staticpath = '/public'
        dirpath = '/kindeditor/uploads',
        filename = helpers.fileUploadSync(files.imgFile, staticpath + dirpath),
        info = {
            "error": 0,
            "url": dirpath + "/" + filename
        };
    res.send(info)
  })
})

admin.post('/homeimage/uploads', function(req, res) {

  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    if(err){
      res.send({ "error": 1, 'message': "server error" })
      return
    }else if(!files.adimage.type.match('^image\/')){
      res.send({ "error": 1, 'message': "只允许上传图片" })
      return
    }else if(files.adimage.size > config.maxfileuploadsize){
      res.send({ "error": 1, 'message': "超出最大文件限制" })
      return
    }
    var staticpath = '/public'
        dirpath = '/uploads'
        files.adimage.name = "banner.png"
        filename = helpers.fileUploadSync(files.adimage, staticpath + dirpath, true),
        info = {
            "error": 0,
            "url": dirpath + "/" + filename
        };
    res.redirect("/admin")
  })
})

admin.get('/kindeditor/filemanager', function (req, res) {
  var dirpath = '/kindeditor/uploads',
      fspath = path.join(process.env.PWD, '/public' + dirpath),
      files = []
  fsss = fs.readdirSync(path.join(process.env.PWD, '/public' + dirpath))
    .filter(function(file) {
      return (file.indexOf('.') !== 0) && (file.match(/(\.image$|\.png$|\.gif$|\.jpg$)/i))
    })
    .forEach(function(file) {
      var refile = fs.statSync(fspath + '/' + file)
          splitd = file.split('.'),
          type = splitd[splitd.length - 1]

      files.push({
        is_dir: false,
        has_file: false,
        filesize: refile.size,
        dir_path: "",
        is_photo: true,
        filetype: type,
        filename: file,
        datetime: helpers.strftime(refile.birthtime)
      })
    })

    res.json({ moveup_dir_path: "",
        current_dir_path: dirpath,
        current_url: dirpath + '/',
        total_count:5,
        file_list: files
      })
})

admin.get('/today-profit' ,function(req, res){
  var begin = helpers.strftime((new Date()).begingOfDate()),
      end = helpers.strftime((new Date()).endOfDate())
  async.waterfall([function(next){
    sequelize.query("SELECT sum(`total`) AS `sum` FROM `ExtractOrders` AS `ExtractOrder` WHERE `ExtractOrder`.`state` = :state and `ExtractOrder`.`updatedAt` BETWEEN :begin AND :end ",
      { replacements: { state: models.ExtractOrder.STATE["FINISH"], begin: begin, end: end }, type: sequelize.QueryTypes.SELECT }
    ).then(function(result) {
      if(require.length >= 1){
        next(null, result[0].sum)
      }else{
        next(null, 0)
      }
    }).catch(function(err){
      next(err)
    })
  }, function(total, next){
    sequelize.query("SELECT sum(`cost`) AS `sum` FROM `ExtractOrders` AS `ExtractOrder` WHERE `ExtractOrder`.`state` = :state and `ExtractOrder`.`updatedAt` BETWEEN :begin AND :end ",
      { replacements: { state: models.ExtractOrder.STATE["FINISH"], begin: begin, end: end }, type: sequelize.QueryTypes.SELECT }
    ).then(function(result) {
      if(require.length >= 1){
        next(null, total, result[0].sum)
      }else{
        next(null, 0, 0)
      }
    }).catch(function(err){
      next(err)
    })
  }], function(err, total, totalCost){
    if(err){
      console.log(err)
      res.json({ code: 1, message: "fail" })
    }else{
      res.json({ code: 0, data: { total: total, cost: totalCost, profit: total - totalCost } })
    }
  })
})

admin.get("/getgroups", function(req, res){
  api.getGroups(function(err, data){
    if(err){
      console.log(err)
      res.json(err)
    }else{
      res.json(data)
    }
  });
})

admin.get("/moveusers", function(req, res){
  async.waterfall([function(next){
    models.Customer.findById(1).then(function(customer){
      next(null, customer)
    }).catch(function(err){
      next(err)
    })
  }, function(customer, next){
    api.moveUserToGroup(customer.wechat, 100, function(err, result){
      if(err){
        next(err)
      }else{
        next(null, result)
      }
    });
  }], function(err, result){
    if(err){
      console.log(err)
      res.json(err)
    }else{
      res.json(result)
    }

  })
})

admin.get("/sendtext", function(req, res){
  async.waterfall([function(next){
    models.Customer.findById(1).then(function(customer){
      next(null, customer)
    }).catch(function(err){
      next(err)
    })
  }, function(customer, next){
    var articles = [
      {
        "title":"Happy Day",
        "description":"测试",
        "url":"http://dwz.cn/3iz21k",
        "picurl":"https://mmbiz.qlogo.cn/mmbiz/qcVLspuLOGAT2HQUkMNXbxpUf0FDtR9qMBE0jgQRScZ8z5XEiadFBlN5U0zI6csw4bDBfvMC5tnHe2qpkx34Tzw/0?wx_fmt=jpeg"
      },
      {
        "title":"Happy Day",
        "description":"Is Really A Happy Day",
        "url":"http://dwz.cn/341ioz",
        "picurl":"https://mmbiz.qlogo.cn/mmbiz/qcVLspuLOGClkia7mFne4DNGhicWE2UnicwvPlZGWxdL9eQRWPcWYD0z3MuwmbrIAibIdowqymrz1XECd9p4Zic6BDw/0?wx_fmt=jpeg"
      }];
    api.sendNews(customer.wechat, articles, function(err, result){
      if(err){
        next(err)
      }else{
        next(null, result)
      }
    });
  }], function(err, result){
    if(err){
      console.log(err)
      res.json(err)
    }else{
      res.json(result)
    }

  })
})


module.exports = admin;