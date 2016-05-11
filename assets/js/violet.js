$.fn.violet = function () {
  'use strict';
  var element = $(this),
    footer = element.find('tfoot tr'),
    dataRows = element.find('tbody tr');
  element.find('td').on('change', function (evt, text, originalContent) {
    var that = this,
        $this = $(this)
    if($this.find('input').length || $this.find('select').length){
      return false;
    }
    var _id = $this.data("id"),
        name = $this.data("name"),
        val = text,
        params = {}
    params[name] = val.trim()
    return new Promise(function(resolve, reject){
      ajaxUpdateTrafficplan(_id, params, function(result){
        if(result){
          resolve(result)
        }else{
          reject(result)
        }
      })
    })
  }).on('validate', function (evt, value) {
    var that = this,
        $this = $(this),
        type = ($this.data('type') || "text").toLowerCase()
    return !!value && value.trim().length > 0;
    switch(subkey) {
      case 'number':
        return !isNaN(parseFloat(value)) && Number.isInteger(parseFloat(value))
      case 'integer':
        return !isNaN(parseInt(value)) && Number.isInteger(parseInt(value))
      default:
        return true
    }
  }).on('focus', function(evt) {
    var that = this,
        $this = $(this)
    if($this.find('input').length || $this.find('select').length || $this.data('disabled')){
      return false;
    }
    return true
  })
  return this;
};
