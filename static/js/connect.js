$(() => {
    $("#codebox").click(() => {
        const divText = $("#click-text").text();
        if(divText == "Click to copy"){
            var copytext = $("#qrcode")[0].title;
            var $temp = $("<textarea>");
            $("body").append($temp);
            $temp.val(copytext).select();
            document.execCommand("copy");
            $temp.remove();
        } else {
            $("#click-text").text("Click to copy");
            $("#qrcode").css({
                'filter': 'blur(0px)'
            });
        };
    });
  });
  