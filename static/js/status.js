$(() => {
    $("#show-reset").click(() => {
        $("#reset-content").text('Reset the administrator account if you lost access via the Dashboard.');
        $("#reset-box").show();
    });
    $("#close-reset-box").click(() => {
        $("#reset-box").hide();
    });
    $("#show-nostr").click(() => {
        $("#reset-content").text("Changing the Nostr relay may cause some clients to lose connection. We'll make one last update to the old relay to tell clients about the new relay.");
        $("#reset-box").show();
    });
});
