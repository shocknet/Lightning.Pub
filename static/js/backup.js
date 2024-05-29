$(() => {
  let backup; let manual_backup;
  $("#backup").click(() => {
    backup = $("#backup").prop("checked");
    const nextButton = $("#next-button");
    if (backup || manual_backup) {
      nextButton.removeClass("hidden-button");
    } else {
      nextButton.addClass("hidden-button");
    }
  });
  $("#manual-backup").click(()=>{
      manual_backup = $('#manual-backup').prop("checked");
      const nextButton = $("#next-button");
      if(backup || manual_backup) {
        nextButton.removeClass("hidden-button");
      } else {
        nextButton.addClass("hidden-button");
      };
  });
});
