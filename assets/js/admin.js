function ajaxUpdateTrafficplan(_id, params, callback){
    $.ajax({
      url: '/admin/trafficplan/' + _id,
      dataType: 'JSON',
      data: params,
      method: "POST"
    }).done(function(data){
      if(!data.err){
        toastr.success(data.message)
        callback && callback(true)
      }else{
        toastr.error(data.message)
        callback && callback(false)
      }
    }).fail(function(err){
      console.log(err)
      toastr.error('服务器错误')
      callback && callback(false)
    })
}

function formatData(result){
  var labels = [],
      countdatasets = {
        label: "订单数目",
        yAxisID: "y-axis-0",
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1,
        data: []
      },
      profixdatasets = {
        label: "毛利",
        yAxisID: "y-axis-1",
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1,
        data: []
      }

  for(let i=0; i < result.length; i++){
    let d = result[i]
    let myDate = new Date(d.date)
    labels.push(myDate.getFullYear() + "-" + (myDate.getMonth() + 1) + "-" + myDate.getDate())
    if(d.count >= 10){
      countdatasets.backgroundColor.push('rgba(255, 99, 132, 0.2)')
      countdatasets.borderColor.push('rgba(255,99,132,1)')
      countdatasets.data.push(d.count)
    }else{
      countdatasets.backgroundColor.push('rgba(54, 162, 235, 0.2)')
      countdatasets.borderColor.push('rgba(54, 162, 235, 1)')
      countdatasets.data.push(d.count)
    }
    profixdatasets.backgroundColor.push('rgba(153, 102, 255, 0.2)')
    profixdatasets.borderColor.push('rgba(153, 102, 255, 1)')
    profixdatasets.data.push(d.profix)
  }
  let data = {
    labels: labels,
    datasets: [countdatasets, profixdatasets]
  }
  return data
}

$(function(){
  window.barChart = null

  $(".select2").each(function(i, e) {
    var $select2 = $(e).select2({ width: 'resolve' });
    if($(e).find("option").is(":selected") && $(e).find("option:selected").val() != '' ){
      $select2.prop("disabled", $(e).hasClass("disabled"));
    }
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
    }else{
      params[$this.attr("name")] = "off"
    }
    ajaxUpdateTrafficplan(_id, params)
  })


  var source = $("#detail-template").html()
  if(source !== undefined && source !== ''){
    window.template = Handlebars.compile(source);
  }

  $("select[name='trafficPlanId']").on("change", function(e){
    var $this = $(this)
    $.ajax({
      url: '/admin//trafficplans/' + $this.val(),
      dataType: 'JSON',
      method: "GET"
    }).done(function(data){
      if(!data.err){
        var html = template(data.data)
        $("#detail").html(html)
      }else{
        toastr.error(data.message)
      }
    }).fail(function(err){
      console.log(err)
      toastr.error('服务器错误')
    })
  })

  $("#editOrNew").click(function(){
    var id = $("#trafficplan-select2 select[name='trafficPlanId']").val()
    if(id !== undefined && id !== ''){
      window.location.href = '/admin/affiliateconfig/trafficplan/'+ id +'/edit'
    }else{
      toastr.warning("choose a traffic plan")
    }
  })

  $(".cry").click(function(e){
    e.preventDefault();
    var r = confirm("Do you want to cry ?");
    if(r == true){
      var $this = $(this),
          _id = $this.data("id")
      $.ajax({
        url: '/admin/extractorder/' + _id + '/refund',
        dataType: 'JSON',
        method: "POST"
      }).done(function(data){
        if(!data.err){
          toastr.success(data.message)
          $this.remove()
        }else{
          toastr.error(data.message)
        }
      }).fail(function(err){
        console.log(err)
        toastr.error('服务器错误')
      })
    }
    e.stopPropagation();
  })

  $(document).on("click", ".timelist", function(){
    var $this = $(this),
        $timelist = $(".timelist")

    $(".timelist.btn-primary").removeClass("btn-primary").addClass("btn-default")
    $this.removeClass("btn-default").addClass("btn-primary")
    $.ajax({
      url: "/admin//sale-report",
      method: "GET",
      data: {
        date: $(".timelist.btn-primary").data("date")
      }
    }).done(function(result){
      if(window.barChart){
        window.barChart.destroy();
      }
      window.barChart = new Chart($("#myChart"), {
              type: "bar",
              data: formatData(result.result),
              fill: "false",
              options: {
                responsive: false,
                scales: {
                  xAxes: [{
                    stacked: true
                  }],
                  yAxes: [{
                    position: "left",
                    "id": "y-axis-0",
                    stacked: true,
                    ticks: {
                        stepSize: 1
                    }
                  },
                  {
                    position: "right",
                    "id": "y-axis-1",
                    stacked: true,
                    ticks: {
                        stepSize: 1
                    }
                  }]
                }
              }
          });
    }).fail(function(err){
      console.log(err)
    })
  })

})