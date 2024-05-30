$(() => {
  let backup; let manual_backup;
  $("#backup").click(() => {
    backup = $("#backup").prop("checked");
    $('#manual-backup').prop("checked",false);
    const nextButton = $("#next-button");
    if (backup) {
      nextButton.removeClass("hidden-button");
    } else {
      nextButton.addClass("hidden-button");
    }
  });
  $("#manual-backup").click(()=>{
      manual_backup = $('#manual-backup').prop("checked");
      $("#backup").prop("checked",false);
      const nextButton = $("#next-button");
      if(manual_backup) {
        nextButton.removeClass("hidden-button");
      } else {
        nextButton.addClass("hidden-button");
      };
  });
});
