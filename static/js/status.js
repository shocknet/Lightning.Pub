$(() => {
    // Safe focus function
    const safeFocus = (selector) => {
        const element = $(selector)[0];
        if (element && element.focus) {
            element.focus();
        }
    };

    const populateStatus = async () => {
        try {
            const res = await fetch('/wizard/service_state');
            if (res.status !== 200) return;
            const s = await res.json();
            const name = s.source_name || s.provider_name || '';
            const relay = s.relay_url || (s.relays && s.relays[0]) || '';
            const admin = s.admin_npub || '';
            const avatar = s.avatar_url || 'img/pub_logo.png';

            const lndState = s.lnd_state;
            const watchdogOk = !!s.watchdog_ok;
            const relayConnected = !!s.relay_connected;

            $('#show-nodey-text').text(name || '—');
            $('#show-nostr-text').text(relay || '—');
            $('#adminNpub').text(admin || '—');
            const avatarImg = $('#avatarImg');
            if (avatarImg.length > 0) {
                avatarImg[0].setAttribute('src', avatar);
                avatarImg.parent().show();
            }

            const mkDot = (ok) => ok ? '<span class="green-dot">&#9679;</span>' : '<span class="yellow-dot">&#9679;</span>';
            const lndTxt = lndState === 2 ? 'Online' : (lndState === 1 ? 'Syncing' : 'Offline');
            $('#lndStatus').html(`${mkDot(lndState === 2)} ${lndTxt}`);
            $('#watchdog-status').html(`${mkDot(watchdogOk)} ${watchdogOk ? 'OK' : 'Alert'}`);
            $('#relayStatus').html(`${mkDot(relayConnected)} ${relayConnected ? 'Connected' : 'Disconnected'}`);
        } catch { /* noop */ }
    };

    // Load status on page load if we're on the status page
    setTimeout(() => {
        if ($('#page-status').length > 0 && ($('#page-status').is(':visible') || window.location.hash === '#page-status')) {
            populateStatus();
        }
    }, 100);

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
                avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : (s.avatar_url || "")
            }
            const res = await fetch('/wizard/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            if (res.status !== 200) return false
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
    $("#show-avatar").click(() => {
        $('.show-avatar').show()
        $('#avatarImg').parent().hide()
    });
    $("#show-nodey").click(() => {
        $('.show-nodey').show()
        $('#show-nodey-text').hide()
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
    $("#save-show-avatar").click(() => {
        var targetInputVal = $('input[name="show-avatar"]').val()
        const avatarUrl = targetInputVal && targetInputVal.trim() ? targetInputVal.trim() : ""
        postConfig({ avatar_url: avatarUrl }).then(ok => {
            if (ok) {
                $('#avatarImg').attr('src', avatarUrl || 'img/pub_logo.png');
            }
            $('.show-avatar').hide()
            $('#avatarImg').parent().show()
        })
    })
    $("#cancel-show-avatar").click(() => {
        $('.show-avatar').hide()
        $('#avatarImg').parent().show()
    })
    $("#cancel-show-nostr").click(() => {
        $('.show-nostr').hide()
        $('#show-nostr-text').show()
    })
});
