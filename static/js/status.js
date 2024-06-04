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
        $('.continue-button').attr('id', 'set-show-nostr');
    });
    $("#show-nodey").click(() => {
        $('.show-nodey').show()
        $('#show-nodey-text').hide()
        $('input[name="show-nodey"]').focus();
    });
    $("#save-show-nodey").click(() => {
        var targetInputVal = $('input[name="show-nodey"]').val()
        $('#show-nodey-text').text(targetInputVal)
        $('.show-nodey').hide()
        $('#show-nodey-text').show()
    })
    $("#cancel-show-nodey").click(() => {
        $('.show-nodey').hide()
        $('#show-nodey-text').show()
    })
    $(".continue-button").click((e) => {
        if($(".continue-button").prop('id') !== "set-show-nostr") {
            return
        }
        $('.continue-button').attr('id', '');
        $("#reset-box").hide();
        $('.show-nostr').show()
        $('#show-nostr-text').hide()
        $('input[name="show-nostr"]').focus();
    });
    $("#save-show-nostr").click(() => {
        var targetInputVal = $('input[name="show-nostr"]').val()
        $('#show-nostr-text').text(targetInputVal)
        $('.show-nostr').hide()
        $('#show-nostr-text').show()
    })
    $("#cancel-show-nostr").click(() => {
        $('.show-nostr').hide()
        $('#show-nostr-text').show()
    })
});
