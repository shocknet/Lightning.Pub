$(() => {
  $('input[name="backup-option"]').change(() => {
    const nextButton = $("#next-button");
    if ($('input[name="backup-option"]:checked').length > 0) {
      nextButton.removeClass("hidden-button");
    } else {
      nextButton.addClass("hidden-button");
    }
  });
});
