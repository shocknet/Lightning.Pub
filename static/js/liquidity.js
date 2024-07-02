$(() => {
  $("#show-question").click(() => {
    $("#question-content").show();
  });

  $("#close-question").click(() => {
    $("#question-content").hide();
  });

  $("#automate").click(() => {
    $('[data-group="service"]').prop("checked", false);
    $("#automate").prop("checked", true);
  });

  $("#manual").click(() => {
    $('[data-group="service"]').prop("checked", false);
    $("#manual").prop("checked", true);
  });
});
