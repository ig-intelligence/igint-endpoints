$("#judgeButton").click(function(){
  var username = $("#input-7").val();

  if(username == "") {
    return;
  }

  $(".loader").show();
  var url = "/intel/"+username;
  $.ajax({url: url, success: function(result){

    console.log(result);

    var jsonData = JSON.parse(result);
    var htmlString = "";
    console.log(jsonData);
    for (var i = 0; i < jsonData.length; i++) {
      var item = "<p>"+jsonData[i]+"</p>";
      htmlString += item;
    }

    $(".results").html(htmlString);

  }, error: function(err) {
    $(".loader").hide();
  }, complete: function() {
    $(".loader").hide();
  }});
});
