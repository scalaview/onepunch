var request = require("request")
var config = require("../config")
var crypto = require('crypto')
var parseString = require('xml2js').parseString;

function Longsu(){
  this.userid = config.longsu_userid
  this.pwd = config.longsu_pwd
  this.uri = 'http://api.gdliuliang.com/rest.aspx'

  var formatMessage = function (result) {
    var message = {};
    if (typeof result === 'object') {
      for (var key in result) {
        if (!(result[key] instanceof Array) || result[key].length === 0) {
          continue;
        }
        if (result[key].length === 1) {
          var val = result[key][0];
          if (typeof val === 'object') {
            message[key] = formatMessage(val);
          } else {
            message[key] = (val || '').trim();
          }
        } else {
          message[key] = [];
          result[key].forEach(function (item) {
            message[key].push(formatMessage(item));
          });
        }
      }
    }
    return message;
  };


  var nameDownCase = function(name){
      return name.toLowerCase();
  }

  this.getProducts = function(){
    var params = {
        userid: this.userid,
        pwd: this.pwd,
        method: 'gettype'
      },
      options = {
        uri: this.uri,
        method: 'POST',
        qs: params
      }
    console.log(options)
    return new Promise(function(resolve, reject) {
      request(options, function (error, res) {
        if (!error && res.statusCode == 200) {
          console.log(res.body)
          parseString(res.body.trim(), {
            trim: true,
            tagNameProcessors: [nameDownCase],
            attrNameProcessors: [nameDownCase],
            valueProcessors: [nameDownCase],
            attrValueProcessors: [nameDownCase]
          }, function (err, result) {
            if(err){
              reject(err)
            }else{
              var resultjson = formatMessage(result.result)
              console.log(resultjson);
              resolve(resultjson)
            }
          });
        }else{
          reject(error)
        }
       });
    })
  }


  this.createOrder = function(product_id, orderId, phone){
    var params = {
        userid: this.userid,
        pwd: this.pwd,
        method: 'insertorder',
        typeid: product_id,
        mobile: phone,
        othersoid: orderId,
        redirecturl: "http://{{hostname}}/longsuconfirm/".format({ hostname: config.hostname })
      },
      options = {
        uri: this.uri,
        method: 'POST',
        qs: params
      }
    console.log(options)
    return new Promise(function(resolve, reject) {
      request(options, function (error, res) {
        if (!error && res.statusCode == 200) {
          console.log(res.body)
          parseString(res.body.trim(), {
            trim: true,
            tagNameProcessors: [nameDownCase],
            attrNameProcessors: [nameDownCase],
            valueProcessors: [nameDownCase],
            attrValueProcessors: [nameDownCase]
          }, function (err, result) {
            if(err){
              reject(err)
            }else{
              var resultjson = formatMessage(result.result)
              console.log(resultjson);
              resolve(resultjson)
            }
          });
        }else{
          reject(error)
        }
       });
    })
  }
}





module.exports.Longsu = Longsu;