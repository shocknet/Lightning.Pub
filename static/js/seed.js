$(() => {
  $("#reveal-button").click(() => {
    $("#seed-box-container").removeClass("blur-filter");
  });

  $('#copied').click(() => {
    const checked = $("#copied").prop('checked');
    const nextButton = $("#next-button");
    if (checked) {
      nextButton.removeClass("hidden-button");
    } else {
      nextButton.addClass("hidden-button");
    }
  })
});
