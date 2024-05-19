$(() => {
  $("#show-question").click(() => {
    $("#question-content").show();
  });

  $("#close-question").click(() => {
    $("#question-content").hide();
  });
});
