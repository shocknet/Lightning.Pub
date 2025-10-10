$(() => {
    // Page sections
    const pages = {
        node: $('#page-node'),
        liquidity: $('#page-liquidity'),
        backup: $('#page-backup'),
        connect: $('#page-connect'),
        status: $('#page-status')
    };

    // Inputs
    const nodeNameInput = $("#nodeName");
    const relayUrlInput = $("#relayUrl");
    const avatarUrlInput = $("#avatarUrl");
    const avatarPreview = $("#avatarPreview");
    const customCheckbox = $("#customCheckbox");
    const automateLiquidityRadio = $("#automate");
    const manualLiquidityRadio = $("#manual");
    const backupNostrRadio = $("#backup");
    const manualBackupRadio = $("#manual-backup");

    // Buttons
    const toLiquidityBtn = $("#liquidityBtn");
    const toBackupBtn = $("#backupBtn");
    const toStatusBtn = $("#to-status");
    const finishBtn = $("#next-button");
    const backToNodeBtn = $("#back-to-node");
    const backToLiquidityBtn = $("#back-to-liquidity");

    // Error text
    const errorTextNode = $("#errorText");
    const errorTextLiquidity = $("#errorTextLiquidity");
    const errorTextBackup = $("#errorTextBackup");
    
    // Liquidity question mark
    $("#show-question").click(() => $("#question-content").show());
    $("#close-question").click(() => $("#question-content").hide());

    const showPage = (pageToShow) => {
        Object.values(pages).forEach(page => page.hide());
        pageToShow.show();
    };

    const populateStatus = async () => {
        try {
            const res = await fetch('/wizard/service_state');
            if (res.status !== 200) return;
            const s = await res.json();
            const name = s.source_name || s.provider_name || '';
            const relay = s.relay_url || (s.relays && s.relays[0]) || '';
            const admin = s.admin_npub || '';
            const avatar = s.avatar_url || (s.app_id ? `https://robohash.org/${encodeURIComponent(s.app_id)}.png?size=128x128&set=set3` : '');

            const lndState = s.lnd_state; // 0 OFFLINE, 1 SYNCING, 2 ONLINE (per enum)
            const watchdogOk = !!s.watchdog_ok;
            const relayConnected = !!s.relay_connected;

            $('#show-nodey-text').text(name || '—');
            $('#show-nostr-text').text(relay || '—');
            $('#adminNpub').text(admin || '—');
            if (avatar) { $('#avatarImg').attr('src', avatar); }

            const mkDot = (ok) => ok ? '<span class="green-dot">&#9679;</span>' : '<span class="yellow-dot">&#9679;</span>';
            const lndTxt = lndState === 2 ? 'Online' : (lndState === 1 ? 'Syncing' : 'Offline');
            $('#lndStatus').html(`${mkDot(lndState === 2)} ${lndTxt}`);
            $('#watchdog-status').html(`${mkDot(watchdogOk)} ${watchdogOk ? 'OK' : 'Alert'}`);
            $('#relayStatus').html(`${mkDot(relayConnected)} ${relayConnected ? 'Connected' : 'Disconnected'}`);
        } catch { /* noop */ }
    };

    // Navigation
    toLiquidityBtn.click(() => {
        const nodeName = nodeNameInput.val();
        const relayUrl = relayUrlInput.val();
        const useDefaultRelay = customCheckbox.prop('checked');
        if (!nodeName) {
            errorTextNode.text("Please enter a node name");
            return;
        }
        if (!useDefaultRelay && !relayUrl) {
            errorTextNode.text("Please enter a relay URL or check the default relay box");
            return;
        }
        errorTextNode.text("");
        showPage(pages.liquidity);
    });

    toBackupBtn.click(() => {
        if (!automateLiquidityRadio.prop('checked') && !manualLiquidityRadio.prop('checked')) {
            errorTextLiquidity.text('Please select an option');
            return;
        }
        errorTextLiquidity.text("");
        showPage(pages.backup);
    });

    backToNodeBtn.click(() => showPage(pages.node));
    backToLiquidityBtn.click(() => showPage(pages.liquidity));

    // Final submission
    finishBtn.click(async () => {
        if (!backupNostrRadio.prop('checked') && !manualBackupRadio.prop('checked')) {
            errorTextBackup.text('Please select an option');
            return;
        }
        errorTextBackup.text("");

        const relayUrl = customCheckbox.prop('checked') ? 'wss://relay.lightning.pub' : relayUrlInput.val();

        const req = {
            source_name: nodeNameInput.val(),
            relay_url: relayUrl,
            automate_liquidity: automateLiquidityRadio.prop('checked'),
            push_backups_to_nostr: backupNostrRadio.prop('checked'),
            avatar_url: avatarUrlInput.val()
        };

        try {
            const res = await fetch("/wizard/config", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req)
            });
            if (!res.ok) {
                const j = await res.json();
                throw new Error(j.reason || "Failed to start service");
            }
            // Move to in-page connect step
            showPage(pages.connect);
            // fetch and prepare connect info
            (async () => {
                const res = await fetch('/wizard/admin_connect_info');
                if (res.status !== 200) return;
                const j = await res.json();
                if (j.connect_info && j.connect_info.enrolled_npub) {
                    showPage(pages.status);
                    await populateStatus();
                    return;
                }
                const connectString = j.nprofile + ':' + j.connect_info.admin_token;
                const qrElement = document.getElementById('qrcode');
                const codebox = $('#codebox');
                const clickText = $('#click-text');
                const cs = $('#connectString');

                // Reset visual state
                codebox.removeClass('revealed');
                cs.text('');
                codebox.find('.qr-veil').show();
                clickText.show();
                if (qrElement) {
                    while (qrElement.firstChild) qrElement.removeChild(qrElement.firstChild);
                    // Pre-generate QR behind veil to entice reveal
                    new QRCode(qrElement, { text: connectString, colorDark: '#000000', colorLight: '#ffffff', width: 157, height: 157 });
                }

                // Reveal on click: show string below and remove veil/heading
                codebox.off('click').on('click', (e) => {
                    if (!codebox.hasClass('revealed')) {
                        e.preventDefault();
                        e.stopPropagation();
                        cs.text(connectString);
                        codebox.addClass('revealed');
                        
                        // Remove the veil from the DOM entirely to kill the blur
                        codebox.find('.qr-veil').remove();
                        
                        clickText.hide();
                        
                        // Unbind to allow text selection and normal behavior after reveal
                        codebox.off('click');
                        
                        // Force text to be selectable on top
                        cs.css({
                            'user-select': 'text',
                            '-webkit-user-select': 'text',
                            'pointer-events': 'auto'
                        });
                    }
                });
            })();
        } catch (err) {
            errorTextBackup.text(err.message);
        }
    });

    // Navigate from connect to status
    toStatusBtn && toStatusBtn.click(async () => {
        showPage(pages.status);
        await populateStatus();
    })

    const syncRelayState = () => {
        relayUrlInput.prop('disabled', customCheckbox.prop('checked'));
        if (customCheckbox.prop('checked')) {
            relayUrlInput.val('');
        }
    };

    customCheckbox.on('change', syncRelayState);
    relayUrlInput.on('input', () => {
        if (relayUrlInput.val()) {
            customCheckbox.prop('checked', false);
            syncRelayState();
        }
    });

    // Initial state load (no redirects; SPA only)
    console.log('Wizard script version: REVEAL_FIX_3 activated');
    fetch("/wizard/service_state").then(res => res.json()).then(state => {
        nodeNameInput.val(state.source_name);
        if (state.relay_url === 'wss://relay.lightning.pub') {
            customCheckbox.prop('checked', true);
        } else {
            relayUrlInput.val(state.relay_url);
        }
        const robo = state.app_id ? `https://robohash.org/${encodeURIComponent(state.app_id)}.png?size=128x128&set=set3` : ''
        if (state.avatar_url) {
            avatarUrlInput.val(state.avatar_url);
            avatarPreview.attr('src', state.avatar_url)
        } else if (robo) {
            avatarPreview.attr('src', robo)
        }
        if (robo) {
            avatarUrlInput.attr('placeholder', robo)
        }
        syncRelayState();

        if (state.automate_liquidity) {
            automateLiquidityRadio.prop('checked', true);
        } else {
            manualLiquidityRadio.prop('checked', true);
        }

        if (state.push_backups_to_nostr) {
            backupNostrRadio.prop('checked', true);
        } else {
            manualBackupRadio.prop('checked', true);
        }
    });
});
