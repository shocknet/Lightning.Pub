$(() => {
    const postConfig = async (updates) => {
        try {
            const stateRes = await fetch('/wizard/service_state')
            if (stateRes.status !== 200) return false
            const s = await stateRes.json()
            const body = {
                source_name: updates.source_name ?? (s.source_name || s.provider_name || ''),
                relay_url: updates.relay_url ?? (s.relay_url || (s.relays && s.relays[0]) || ''),
                automate_liquidity: s.automate_liquidity || false,
                push_backups_to_nostr: s.push_backups_to_nostr || false,
                avatar_url: s.avatar_url || ''
            }
            const res = await fetch('/wizard/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            if (res.status !== 200) return false
            const j = await res.json().catch(() => ({}))
            if (j && j.status && j.status !== 'OK') return false
            return true
        } catch { return false }
    }
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
        postConfig({ source_name: targetInputVal }).then(ok => {
            if (ok) {
                $('#show-nodey-text').text(targetInputVal)
            }
            $('.show-nodey').hide()
            $('#show-nodey-text').show()
        })
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
        postConfig({ relay_url: targetInputVal }).then(ok => {
            if (ok) {
                $('#show-nostr-text').text(targetInputVal)
            }
            $('.show-nostr').hide()
            $('#show-nostr-text').show()
        })
    })
    $("#cancel-show-nostr").click(() => {
        $('.show-nostr').hide()
        $('#show-nostr-text').show()
    })
});
