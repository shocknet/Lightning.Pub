$(() => {
  $("#backup").click(() => {
    const checked = $("#backup").prop("checked");
    const nextButton = $("#next-button");
    if (checked) {
      nextButton.removeClass("hidden-button");
    } else {
      nextButton.addClass("hidden-button");
    }
  });
});
