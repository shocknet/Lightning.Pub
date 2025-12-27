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

    // Avatar preview update
    avatarUrlInput.on('input', function() {
        const url = $(this).val().trim();
        if (url) {
            avatarPreview.attr('src', url);
        } else {
            avatarPreview.attr('src', 'img/pub_logo.png');
        }
    });

    // Progress management
    const updateProgress = (step) => {
        for (let i = 1; i <= 4; i++) {
            const circle = $(`#step-${i}-circle`);
            circle.attr('data-step', i);
            circle.removeClass('active completed');
            if (i < step) {
                circle.addClass('completed');
            } else if (i === step) {
                circle.addClass('active');
            }
        }
    };

    const getCurrentStep = (pageId) => {
        const stepMap = {
            'page-node': 1,
            'page-liquidity': 2,
            'page-backup': 3,
            'page-connect': 4,
            'page-status': 4 // Status doesn't show progress
        };
        return stepMap[pageId] || 1;
    };

    const showPage = (pageToShow) => {
        Object.values(pages).forEach(page => page.hide());
        pageToShow.show();
        const pageId = pageToShow.attr('id');
        if (pageId !== 'page-status') {
            $('#progress-indicator').show();
            updateProgress(getCurrentStep(pageId));
        } else {
            // Hide progress on status page
            $('#progress-indicator').hide();
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
        if (!nodeName || !nodeName.trim()) {
            errorTextNode.text("Please enter a node name");
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

        // Default to managed relay (customCheckbox is checked by default)
        const relayUrl = customCheckbox.prop('checked') ? 'wss://relay.lightning.pub' : (relayUrlInput.val() || 'wss://relay.lightning.pub');

        const avatarUrl = avatarUrlInput.val();
        const req = {
            source_name: nodeNameInput.val(),
            relay_url: relayUrl,
            automate_liquidity: automateLiquidityRadio.prop('checked'),
            push_backups_to_nostr: backupNostrRadio.prop('checked'),
            avatar_url: avatarUrl && avatarUrl.trim() ? avatarUrl.trim() : undefined
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
                const cs = $('.qrcode-string');

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
                    }
                });

                // Poll for admin connection to auto-advance to status page
                const pollInterval = setInterval(async () => {
                    try {
                        const pollRes = await fetch('/wizard/admin_connect_info');
                        if (pollRes.status === 200) {
                            const pollData = await pollRes.json();
                            if (pollData.connect_info && pollData.connect_info.enrolled_npub) {
                                clearInterval(pollInterval);
                                showPage(pages.status);
                                await populateStatus();
                            }
                        }
                    } catch (err) {
                        // Ignore polling errors
                    }
                }, 2000); // Poll every 2 seconds
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

    // Relay defaults to managed relay, no UI needed

    // Initialize progress on load
    updateProgress(1);

    // Initial state load (no redirects; SPA only)
    console.log('Wizard script version: REVEAL_FIX_3 activated');
    fetch("/wizard/service_state").then(res => {
        if (!res.ok) {
            throw new Error(`Failed to load wizard state: ${res.status}`)
        }
        return res.json()
    }).then(state => {
        nodeNameInput.val(state.source_name);
        // Set relay defaults (hidden fields)
        if (state.relay_url === 'wss://relay.lightning.pub') {
            customCheckbox.prop('checked', true);
            relayUrlInput.val('wss://relay.lightning.pub');
        } else {
            customCheckbox.prop('checked', false);
            relayUrlInput.val(state.relay_url || 'wss://relay.lightning.pub');
        }
        if (state.avatar_url) {
            avatarUrlInput.val(state.avatar_url);
            avatarPreview.attr('src', state.avatar_url)
        } else {
            avatarPreview.attr('src', 'img/pub_logo.png')
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
    }).catch(err => {
        console.error('Failed to load wizard state:', err);
        errorTextNode.text('Failed to load wizard state. Please refresh the page.');
    });

    // Add back button handlers
    $("#back-to-backup").click(() => showPage(pages.backup));
    $("#back-to-connect").click(() => showPage(pages.connect));
});
