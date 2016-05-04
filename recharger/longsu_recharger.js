var request = require("request")
var config = require("../config")
var crypto = require('crypto')

function Longsu(typeid, mobile, orderId){
	this.mobile = mobile
	this.orderId = orderId
	this.typeid = typeid
	this.userid = config.longsu_userid
	this.pwd = config.longsu_pwd
	this.redirecturl = config.longsu_redirecturl

	var uri = 'http://api.gdliuliang.com/rest.aspx'

	var params = {
	    	userid: this.userid,
	    	pwd: this.pwd,
	    	method: 'insertorder',
	    	typeid: this.typeid,
	    	mobile: this.mobile,
	    	orderId: this.orderId,
	    	redirecturl: this.redirecturl
	    }

	this.options = {
    uri: uri,
    method: 'POST',
    qs: params
  }
  console.log(this.options)

  this.then = function(callback){
    this.successCallback = callback
    return this
  }

  this.catch = function(callback){
   this.errCallback = callback
   return this
  }

	this.do = function(){

	  var inerSuccessCallback = this.successCallback;
	  var inerErrCallback = this.errCallback;

	  request(this.options, function (error, res) {
	    if (!error && res.statusCode == 200) {
	      if(inerSuccessCallback){
	        console.log(res.body)
	        var data = JSON.parse(res.body.trim())
	        inerSuccessCallback.call(this, res, data)
	      }
	     }else{
	      if(inerErrCallback){
	        inerErrCallback.call(this, error)
	      }
	     }
	   });

	   return this
	 }
 return this

}

module.exports.Longsu = Longsu;