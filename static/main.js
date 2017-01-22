$("#judgeButton").click(function(){
    var username = $("#input-7").val();
    if(username == "") {
      return;
    }
    $(".loader").show();
    $.ajax({url: "/"+username, success: function(result){
      console.log(result);
    }, error: function(err) {
      $(".loader").hide();
    }, complete: function() {
      $(".loader").hide();
    }});
});
