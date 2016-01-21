function ajaxUpdateTrafficplan(_id, params){
    $.ajax({
      url: '/admin/trafficplan/' + _id,
      dataType: 'JSON',
      data: params,
      method: "POST"
    }).done(function(data){
      if(!data.err){
        toastr.success(data.message)
      }else{
        toastr.error(data.message)
      }
    }).fail(function(err){
      console.log(err)
      toastr.error('服务器错误')
    })
  }

$(function(){
  $(".select2").each(function(i, e) {
    $(e).select2()
  })

  $('.remove').each(function(i, e) {
    $(e).click(function() {
      var $this = $(e),
          el = $this.data('el'),
          targer = '#remove'+el,
          $checkBox = $(targer)
      $checkBox.prop('checked', true)
      $this.parents('.help-block').remove()
    })
  })

  $(".editChoose").on("change", function(e){
    var $this = $(this),
        _id = $this.parent().data("id")
        params = {id: _id}

     params[$this.attr("name")] = $this.val()
     ajaxUpdateTrafficplan(_id, params)
  })

  $(".displaySwich").on("change", function(e){
    var $this = $(this),
        _id = $this.data("id"),
        params = {}

    if($this.prop("checked")){
      params[$this.attr("name")] = "on"
    }
    ajaxUpdateTrafficplan(_id, params)
  })

})