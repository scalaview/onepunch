var express = require('express')
var config = require("./config")
var myUtil = require("./my_util")
var menu = require("./menu")
var sign = require("./sign")
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })
var app = express()
var async = require("async")
var parseString = require('xml2js').parseString;
var accessToken = null
// var wechat = require('wechat')

// var config = {
//   token: config.token,
//   appid: config.appId,
//   encodingAESKey: config.aesKey
// };

var token = function(callback){
    if(accessToken != null && !accessToken.isExpired()){
      callback()
    }else{
      myUtil.getAccessToken(function(data){
        accessToken = data
        console.log(accessToken)
        callback()
      })
    }
  }

app.use(function(req, res, next) {
  var contentType = req.headers['content-type'] || ''
    , mime = contentType.split(';')[0];
  if (mime != 'text/xml') {
    return next();
  }

  var data = '';
  req.setEncoding('utf8');
  req.on('data', function(chunk) {
    data += chunk;
  });
  req.on('end', function() {
    parseString(data, function (err, result) {
      req.body = result
      next();
    });
  });
});
app.use(urlencodedParser)

app.set('port', process.env.PORT || 3000)

app.get('/', function (req, res) {
  res.send(req.query.echostr)
});

app.post('/', function(req, res) {
  console.log(req.body.xml)
  console.log(sign.sha(config.token, req.query.timestamp, req.query.nonce))
  res.send("ok")
})

app.get('/token', function(req, res) {
  async.waterfall([token,
    function(callback){
      console.log(accessToken)
      res.send(accessToken)
      callback()
    }], function(error, callback){
      console.log(error)
  })
})

app.get('/create-menus', function(req, res) {
  async.waterfall([token,
    function(callback){
      menu.createMenus(accessToken.getToken(), config.menus, function(status, error){
        if(status){
          res.send("create success")
        }else{
          res.send("create fail: code [" + error.errcode + "], mesg: [" + error.errmsg + "] ")
        }
    })}], function(error, callback){
      console.log(error)
    })
})


var server = app.listen(app.get('port'), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

