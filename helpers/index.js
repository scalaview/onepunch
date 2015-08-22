var fs = require('fs')
var path = require('path')
var config = require("../config")
var moment = require('moment')
var _ = require('lodash')
var handlebars = require('handlebars')

String.prototype.htmlSafe = function(){
  return new handlebars.SafeString(this.toString())
}

String.prototype.renderTemplate = function(options){
  if(!this.compileTemplate){
    this.compileTemplate = handlebars.compile(this.toString())
  }
  return this.compileTemplate(options)
}

String.prototype.format = String.prototype.renderTemplate

String.prototype.present = function(){
  return (this !== undefined) && (this.toString() !== undefined) && (this.toString() !== '')
}

String.prototype.toI = function(){
  try{
    return parseInt(this.toString())
  }catch(e){
    return this.toString()
  }
}

function fileUpload(file, successCallBack, errorCallBack){
  var origin_this = this,
      old_path = file.path,
      file_size = file.size,
      file_type = file.type,
      origin_file_name = file.name,
      file_name = Math.round((new Date().valueOf() * Math.random())) + "_" + origin_file_name,
      new_path = path.join(process.env.PWD, config.upload_path, file_name );

  fs.readFile(old_path, function(err, data) {
      fs.writeFile(new_path, data, function(err) {
          fs.unlink(old_path, function(err) {
              if (err) {
                errorCallBack(err)
              } else {
                successCallBack(file_name)
              }
          });
      });
  });
}

function fileUploadSync(file){
  var origin_this = this,
      old_path = file.path,
      file_size = file.size,
      file_type = file.type,
      origin_file_name = file.name,
      file_name = Math.round((new Date().valueOf() * Math.random())) + "_" + _.trim(origin_file_name, ' '),
      new_path = path.join(process.env.PWD, config.upload_path, file_name );

  var tmp_file = fs.readFileSync(old_path);
  fs.writeFileSync(new_path, tmp_file);
  return file_name
}

function isExpired(expiredAt){
  if(expiredAt !== undefined && (new Date() > expiredAt)){
    return true
  }else{
    return false
  }
}


function expiredStr(expiredAt){
  if(isExpired(expiredAt)){
    return "活动已结束"
  }else{
    return
  }
}

function flowSource(obj){
  if(obj.className() === 'Order'){
    return "购买流量币"
  }else{
    return "其他来源"
  }
}

function strftime(dateTime, format){
  var result = moment()
  if(dateTime){
    result = moment(dateTime)
  }
  if( typeof format === 'string'){
    return result.format(format)
  }else{
    return result.format('YYYY-MM-DD HH:mm:ss')
  }
}

function sizeFormat(apkSize){
  if(apkSize){
    if(apkSize > 1024000){  // MB
      return _.round(apkSize/ 1000000, 2) + "MB"
    }else if(apkSize > 1000) { //KB
      return _.round(apkSize/ 1000, 2) + "KB"
    }
  }
}

function imgDiv(images){
  if(images instanceof Array){
    var length = images.length,
        source = ['<div class="col-xs-{{interval}} col-md-{{interval}}">',
          '<img class="img-responsive" src="{{img}}">',
        '</div>'].join(''),
        template = handlebars.compile(source),
        html = []

    if(length === 3){
      var interval = 4
    }else if(length === 2){
      var interval = 5
    }else{
      var interval = 12
    }

    for (var i = 0; i < images.length; i++) {
      html.push( template({ img: images[i], interval: interval }) )
    };
    return html.join('').htmlSafe()
  }
}

function apkImages(apk) {
  var fields = ['image01', 'image02', 'image03'],
      images = []
  for (var i = 0; i < fields.length; i++) {
    if(apk[fields[i]]){
      images.push( apk[fields[i]] )
    }
  };

  return imgDiv(images)
}

function fullPath(filePath){
  return process.env.PWD + "/public" + filePath
}

function section (name, options) {
  if (!this._sections) {
    this._sections = {};
  }
  this._sections[name] = options.fn(this);
  return null;
}


function hostname(){
  return config.hostname
}

function hostUrl(){
  return "http://" + config.hostname
}

function taskLink(task) {
  if(task.actionUrl){
    return task.actionUrl
  }else{
    return "/tasks/" + task.id
  }
}

function selectTag(options, collection, selected) {
  var source = [
        '<select {{#if options.class}} class="{{options.class}}" {{/if}} {{#if options.id}} id="{{options.id}}" {{/if}} {{#if options.name}} name="{{options.name}}" {{/if}} {{#if options.disabled}} disabled {{/if}} >',
        '{{items}}',
        '</select>'
      ].join(""),
      optionSource = '<option {{#if value}} value="{{value}}" {{/if}} {{selected}}>{{name}}</option>',
      template = handlebars.compile(source),
      optionSourceTemplate = handlebars.compile(optionSource)

  optionHtml = []

  if(collection instanceof Array){
    if(options.includeBlank){
      optionHtml.push(optionSourceTemplate())
    }
    for (var i = 0; i < collection.length ; i++) {
      if(collection[i] instanceof Array){
        var data = { value: collection[i][0], name: collection[i][1], selected: selected === collection[i][0] ? "selected" : null }
      }else if(collection[i] instanceof Object){
        var data = { value: collection[i].value, name: collection[i].name, selected: selected ===  collection[i].value ? "selected" : null }
      }
      optionHtml.push(optionSourceTemplate(data))
    };

    var html = template({ options: options,  items: optionHtml.join("").htmlSafe() })
    return html.htmlSafe()
  }else{
    return template({ options: options }).htmlSafe()
  }
}

function offset(page, prePage){
  if(page > 0){
    return (page - 1) * prePage
  }
  return 0
}

function addParams(href, params){
  var subFix = '';
  for(var key in params){
    subFix = subFix + '&' + key + '=' + params[key]
  }

  if(href.indexOf('?') !== -1 ){
    return href + subFix
  }else{
    return (subFix.length > 0) ? href + "?" + subFix.substring(1, subFix.length) : href
  }
}




function pagination(result, href){

  function isFirst(){
    return (currentPage == 1)
  }

  function isLast(){
    return currentPage == totalpages
  }

  var source = [
  '<div class="row">',
    '<div class="col-sm-12">',
      '<div class="pull-right dataTables_paginate paging_simple_numbers" id="dataTables-example_paginate">',
        '<ul class="pagination">',
          '{{items}}',
        '</ul>',
      '</div>',
    '</div>',
  '</div>'].join(""),
    item = ['<li class="paginate_button {{ status }} {{disabled}}" tabindex="0">',
              '<a href="{{link}}">{{text}}</a>',
            '</li>'].join(''),
    template = handlebars.compile(source),
    itemTemplate = handlebars.compile(item),

    total = result.count,
    page = result.page,
    perPage = result.perPage,
    totalpages = (total % perPage) == 0 ? (total / perPage) : parseInt(total / perPage) + 1,
    currentPage = result.currentPage,
    items = []

  if(total <= perPage){ return }

  for (var i = 0; i < totalpages ; i++) {
    var data;
    if(i == 0){
      data = { status: 'previous', disabled: isFirst() ? 'disabled' : null, link: isFirst() ? "#" : addParams(href, {page: 1}), text: "上一页"  }
      items.push(itemTemplate(data))
    }

    data = { status: (currentPage == (i + 1)) ? "active" : null, link: addParams(href, {page: i+1}), text: (i+1)}
    items.push(itemTemplate(data))

    if(i == (totalpages-1)){
      data = { status: 'next', disabled: isLast() ? 'disabled' : null, link: isLast() ? "#" : addParams(href, {page: totalpages}), text: "下一页"  }
      items.push(itemTemplate(data))
    }
  };

  return template({ items: items.join("").htmlSafe() }).htmlSafe()
}

function setPagination(result, req){
  result.page = req.query.page || 1,
  result.perPage = req.query.perPage || 15,
  result.currentPage = req.query.page || 1
  return result
}

function isChecked(checked){
  if(typeof checked === 'boolean'){
    return checked ? "checked" : ""
  }else if(typeof checked === 'string'){
    try{
      return (parseInt(checked) === 1) ? "checked" : ''
    }catch(e){
    }
  }
}


// FlowHistory.STATE = {
//     ADD: 1,
//     REDUCE: 0
//   };
function amountType(type, amount){
  console.log(type + ": " + amount)
  if(type === 1 ){
    return ['<span class="btn-warning">+ ', amount, ' </span> '].join("").htmlSafe()
  }else if(type ===  0){
    return ['<span class="btn-info">- ', amount, ' </span> '].join("").htmlSafe()
  }
}

function flowhistorySourceLink(source, options){
  if(!source){
    return
  }
  var link = ['<a  {{#if class}} class="{{class}}" {{/if}} {{#if id}} id="{{id}}" {{/if}} {{#if href}} href="{{href}}" {{/if}}>',
                '{{#if text}} {{text}} {{/if}}',
              '</a>'].join("")
  options.text =  source.className() + ": " + source.id

  if(source.className() === "Order"){
    options.href = "/admin/orders/" + source.id + "/edit"
    return link.renderTemplate(options).htmlSafe()
  }else if(source.className() === "ExtractOrder"){
    options.href = "/admin/extractorder/" + source.id + "/edit"
    return link.renderTemplate(options).htmlSafe()
  }
}

function extractOrderLink(exchanger, options){
  if(!exchanger){
    return
  }
  var link = ['<a  {{#if class}} class="{{class}}" {{/if}} {{#if id}} id="{{id}}" {{/if}} {{#if href}} href="{{href}}" {{/if}}>',
              '{{#if text}} {{text}} {{/if}}',
            '</a>'].join("")
  options.text =  exchanger.className() + ": " + exchanger.id
  if(exchanger.className() === "TrafficPlan"){
    options.href = "/admin/trafficplans/" + exchanger.id + "/edit"
    return link.renderTemplate(options).htmlSafe()
  }else if(exchanger.className() === 'FlowTask'){
    options.href = "/admin/flowtasks/" + exchanger.id + "/edit"
    return link.renderTemplate(options).htmlSafe()
  }

}

exports.fileUpload = fileUpload;
exports.fileUploadSync = fileUploadSync;
exports.isExpired = isExpired;
exports.expiredStr = expiredStr;
exports.flowSource = flowSource;
exports.strftime = strftime;
exports.sizeFormat = sizeFormat;
exports.imgDiv = imgDiv;
exports.apkImages = apkImages;
exports.fullPath = fullPath;
exports.section = section;
exports.hostname = hostname;
exports.hostUrl = hostUrl;
exports.taskLink = taskLink;
exports.selectTag = selectTag;
exports.offset = offset;
exports.addParams = addParams;
exports.pagination = pagination;
exports.setPagination = setPagination;
exports.isChecked = isChecked;
exports.amountType = amountType;
exports.flowhistorySourceLink = flowhistorySourceLink;
exports.extractOrderLink = extractOrderLink;
