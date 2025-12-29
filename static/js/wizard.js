$(() => {

    // Page sections
    const pages = {
        node: $('#page-node'),
        relay: $('#page-relay'),
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

    let currentAppId = '';

    // Buttons
    const toRelayBtn = $("#relayBtn");
    const toLiquidityBtn = $("#liquidityBtn");
    const toBackupBtn = $("#backupBtn");
    const finishBtn = $("#next-button");
    const backToNodeBtn = $("#back-to-node");
    const backToRelayBtn = $("#back-to-relay");
    const backToLiquidityBtn = $("#back-to-liquidity");
    const backToBackupBtn = $("#back-to-backup");
    const backToConnectBtn = $("#back-to-connect");
    const editSettingsBtn = $("#edit-settings");

    // Error text
    const errorTextNode = $("#errorText");
    const errorTextRelay = $("#errorTextRelay");
    const errorTextLiquidity = $("#errorTextLiquidity");
    const errorTextBackup = $("#errorTextBackup");
    
    const getAvatarFallback = (appId) => {
        return appId ? `https://robohash.org/${encodeURIComponent(appId)}.png?size=128x128&set=set3` : 'img/pub_logo.png';
    };

    // Liquidity question mark
    $("#show-question-liquidity").click(() => $("#question-content").show());
    $("#close-question").click(() => $("#question-content").hide());
    $("#show-question-watchdog").click((e) => {
        // Handled by link, but prevent default if needed
    });

    // Avatar preview update
    avatarUrlInput.on('input', function() {
        const url = (this.value || '').trim();
        if (url) {
            avatarPreview.attr('src', url);
        } else {
            avatarPreview.attr('src', getAvatarFallback(currentAppId));
        }
    });

    // Progress management
    const updateProgress = (step) => {
        for (let i = 1; i <= 5; i++) {
            const circles = $(`.step-${i}-circle`);
            circles.removeClass('active completed');
            if (i < step) {
                circles.addClass('completed');
            } else if (i === step) {
                circles.addClass('active');
            }
        }
    };

    const getCurrentStep = (pageId) => {
        const stepMap = {
            'page-node': 1,
            'page-relay': 2,
            'page-liquidity': 3,
            'page-backup': 4,
            'page-connect': 5,
            'page-status': 5
        };
        return stepMap[pageId] || 1;
    };

    // Browser history management
    const pageHistory = [];
    const navigateToPage = (pageToShow, addToHistory = true) => {
        Object.values(pages).forEach(page => page.hide());
        pageToShow.show();
        const pageId = pageToShow.attr('id');
        
        updateProgress(getCurrentStep(pageId));
        
        if (pageId === 'page-status') {
            populateStatus();
        }
        
        if (addToHistory) {
            pageHistory.push(pageId);
            window.history.pushState({ page: pageId }, '', `#${pageId}`);
        }
    };

    const showPage = (pageToShow) => {
        navigateToPage(pageToShow, true);
    };

    window.addEventListener('popstate', (e) => {
        if (pageHistory.length > 1) {
            pageHistory.pop();
            const prevPageId = pageHistory[pageHistory.length - 1];
            const prevPage = Object.values(pages).find(p => p.attr('id') === prevPageId);
            if (prevPage) {
                navigateToPage(prevPage, false);
                loadWizardState(1, 0); 
            }
        } else {
            navigateToPage(pages.node, false);
            loadWizardState(1, 0);
        }
    });

    const populateStatus = async () => {
        console.log('Populating status...');
        try {
            const res = await fetch('/wizard/service_state');
            if (res.status !== 200) {
                console.error('Failed to fetch status:', res.status);
                return;
            }
            const s = await res.json();
            console.log('Status data:', s);
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
            $('#avatar-url-text').text(avatar || '—');
            
            // Show avatar image if available
            const avatarImg = $('#avatarImg');
            if (avatarImg.length > 0) {
                if (avatar) {
                    avatarImg.attr('src', avatar);
                    // Show image when loaded, hide on error
                    avatarImg.off('error load').on('error', function() {
                        $(this).removeClass('show').hide();
                    }).on('load', function() {
                        $(this).addClass('show').show();
                    });
                    // If already loaded, show immediately
                    if (avatarImg[0].complete && avatarImg[0].naturalWidth > 0) {
                        avatarImg.addClass('show').show();
                    } else {
                        // Otherwise wait for load event
                        avatarImg.addClass('show');
                    }
                } else {
                    avatarImg.removeClass('show').hide();
                }
            }
            
            // Update status values with text only (dots are separate elements)
            const lndTxt = lndState === 2 ? 'Online' : (lndState === 1 ? 'Syncing' : 'Offline');
            const lndStatusEl = $('#lndStatus');
            lndStatusEl.text(lndTxt);
            const lndDot = lndStatusEl.siblings('.status-dot').first();
            if (lndDot.length) {
                lndDot.removeClass('status-dot-green status-dot-orange status-dot-red');
                if (lndState === 2) {
                    lndDot.addClass('status-dot-orange');
                } else if (lndState === 1) {
                    lndDot.addClass('status-dot-orange');
                } else {
                    lndDot.addClass('status-dot-red');
                }
            }
            
            const watchdogStatusEl = $('#watchdog-status');
            watchdogStatusEl.text(watchdogOk ? 'Ok' : 'Alert');
            const watchdogDot = watchdogStatusEl.siblings('.status-dot').first();
            if (watchdogDot.length) {
                watchdogDot.removeClass('status-dot-green status-dot-orange status-dot-red');
                watchdogDot.addClass(watchdogOk ? 'status-dot-green' : 'status-dot-red');
            }
            
            const relayStatusEl = $('#relayStatus');
            relayStatusEl.text(relayConnected ? 'Connected' : 'Disconnected');
            const relayDot = relayStatusEl.siblings('.status-dot').first();
            if (relayDot.length) {
                relayDot.removeClass('status-dot-green status-dot-orange status-dot-red');
                relayDot.addClass(relayConnected ? 'status-dot-green' : 'status-dot-red');
            }
            
            // Update invite link
            if (s.nprofile) {
                const inviteUrl = `https://my.shockwallet.app/#/sources?addSource=${s.nprofile}`;
                $('#inviteLinkHttp').attr('href', inviteUrl).text(inviteUrl);
            }
        } catch { /* noop */ }
    };

    function loadWizardState(retries = 3, delay = 500) {
        console.log('Loading wizard state...');
        return fetch("/wizard/service_state").then(res => {
            if (!res.ok) throw new Error(`Failed to load wizard state: ${res.status}`);
            return res.json();
        }).then(async state => {
            console.log('Wizard state loaded:', state);
            currentAppId = state.app_id || '';
            
            // Populate inputs - temporarily block selectionchange to avoid extension errors
            const blockSelectionChange = (e) => { e.stopImmediatePropagation(); };
            document.addEventListener('selectionchange', blockSelectionChange, true);
            
            try {
                if (state.source_name && state.source_name !== 'Error' && nodeNameInput.length > 0) {
                    nodeNameInput.val(state.source_name);
                }
                
                if (avatarUrlInput.length > 0) {
                    const url = state.avatar_url || getAvatarFallback(currentAppId);
                    avatarUrlInput.val(url);
                    avatarPreview.attr('src', url);
                }
            } finally {
                // Remove blocker after a tick to catch any async selectionchange
                setTimeout(() => {
                    document.removeEventListener('selectionchange', blockSelectionChange, true);
                }, 50);
            }

            if (automateLiquidityRadio.length > 0 && manualLiquidityRadio.length > 0) {
                if (state.automate_liquidity) {
                    automateLiquidityRadio[0].checked = true;
                    automateLiquidityRadio.trigger('change');
                } else {
                    manualLiquidityRadio[0].checked = true;
                    manualLiquidityRadio.trigger('change');
                }
            }

            if (backupNostrRadio.length > 0 && manualBackupRadio.length > 0) {
                if (state.push_backups_to_nostr) {
                    backupNostrRadio[0].checked = true;
                    backupNostrRadio.trigger('change');
                } else {
                    manualBackupRadio[0].checked = true;
                    manualBackupRadio.trigger('change');
                }
            }

            if (state.admin_npub && !window.location.hash.includes('page-')) {
                navigateToPage(pages.status, false);
            }
        }).catch(err => {
            if (retries > 0) {
                setTimeout(() => loadWizardState(retries - 1, delay), delay);
            }
        });
    }

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
            return res.ok;
        } catch { return false }
    }

    // Navigation buttons
    toRelayBtn.click(() => {
        if (!nodeNameInput.val()?.trim()) {
            errorTextNode.text("Please enter a node name");
            return;
        }
        errorTextNode.text("");
        showPage(pages.relay);
    });

    toLiquidityBtn.click(() => {
        errorTextRelay.text("");
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
    backToRelayBtn.click(() => showPage(pages.relay));
    backToLiquidityBtn.click(() => showPage(pages.liquidity));
    backToBackupBtn.click(() => showPage(pages.backup));
    backToConnectBtn.click(() => showPage(pages.connect));
    editSettingsBtn.click(async () => {
        await loadWizardState(1, 0);
        showPage(pages.node);
    });

    finishBtn.click(async () => {
        if (!backupNostrRadio.prop('checked') && !manualBackupRadio.prop('checked')) {
            errorTextBackup.text('Please select an option');
            return;
        }
        errorTextBackup.text("");

        const req = {
            source_name: nodeNameInput.val(),
            relay_url: customCheckbox.prop('checked') ? 'wss://relay.lightning.pub' : (relayUrlInput.val() || 'wss://relay.lightning.pub'),
            automate_liquidity: automateLiquidityRadio.prop('checked'),
            push_backups_to_nostr: backupNostrRadio.prop('checked'),
            avatar_url: avatarUrlInput.val()?.trim() || ""
        };

        try {
            const res = await fetch("/wizard/config", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req)
            });
            if (!res.ok) throw new Error((await res.json()).reason || "Failed to start service");
            
            showPage(pages.connect);
            const connRes = await fetch('/wizard/admin_connect_info');
            if (connRes.status !== 200) return;
            const j = await connRes.json();
            
            if (j.connect_info?.enrolled_npub) {
                showPage(pages.status);
                return;
            }

            const connectString = j.nprofile + ':' + j.connect_info.admin_token;
            const qrElement = document.getElementById('qrcode');
            if (qrElement) {
                qrElement.innerHTML = '';
                new QRCode(qrElement, { text: connectString, colorDark: '#000000', colorLight: '#ffffff', width: 157, height: 157 });
            }

            const codebox = $('#codebox');
            codebox.removeClass('revealed').find('.qr-veil').show();
            $('#click-text').show();
            $('.qrcode-string').text('');

            codebox.off('click').on('click', function() {
                if (!$(this).hasClass('revealed')) {
                    $('.qrcode-string').text(connectString);
                    $(this).addClass('revealed').find('.qr-veil').hide();
                    $('#click-text').hide();
                }
            });

            const pollInterval = setInterval(async () => {
                const pollRes = await fetch('/wizard/admin_connect_info');
                if (pollRes.status === 200 && (await pollRes.json()).connect_info?.enrolled_npub) {
                    clearInterval(pollInterval);
                    showPage(pages.status);
                }
            }, 2000);
        } catch (err) {
            errorTextBackup.text(err.message);
        }
    });

    // Status page edit handlers
    $("#show-reset").click(() => {
        $("#reset-content").text('Reset the administrator account if you lost access via the Dashboard.');
        $("#reset-box").show();
    });
    $("#close-reset-box").click(() => $("#reset-box").hide());
    
    $("#show-nostr").click(() => {
        $("#reset-content").text("Changing the Nostr relay may cause some clients to lose connection. We'll make one last update to the old relay to tell clients about the new relay.");
        $("#reset-box").show();
        $('.continue-button').attr('id', 'set-show-nostr');
    });

    $("#show-avatar").click(() => {
        const currentVal = $('#avatar-url-text').text();
        $('input[name="show-avatar"]').val(currentVal);
        $('.show-avatar').show();
        $('#avatar-display-container').hide();
    });

    $("#show-nodey").click(() => {
        const currentVal = $('#show-nodey-text').text();
        $('input[name="show-nodey"]').val(currentVal);
        $('.show-nodey').show();
        $('#show-nodey-text').parent().hide();
    });

    $("#save-show-nodey").click(function() {
        const val = $('input[name="show-nodey"]').val();
        postConfig({ source_name: val }).then(ok => {
            if (ok) $('#show-nodey-text').text(val);
            $('.show-nodey').hide();
            $('#show-nodey-text').parent().show();
        });
    });

    $("#cancel-show-nodey").click(() => {
        $('.show-nodey').hide();
        $('#show-nodey-text').parent().show();
    });

    $(".continue-button").click(function() {
        if ($(this).attr('id') === 'set-show-nostr') {
            $(this).attr('id', '');
            $("#reset-box").hide();
            const currentVal = $('#show-nostr-text').text();
            $('input[name="show-nostr"]').val(currentVal);
            $('.show-nostr').show();
            $('#show-nostr-text').parent().hide();
        }
    });

    $("#save-show-nostr").click(function() {
        const val = $('input[name="show-nostr"]').val();
        postConfig({ relay_url: val }).then(ok => {
            if (ok) $('#show-nostr-text').text(val);
            $('.show-nostr').hide();
            $('#show-nostr-text').parent().show();
        });
    });

    $("#save-show-avatar").click(function() {
        const val = $('input[name="show-avatar"]').val()?.trim() || "";
        postConfig({ avatar_url: val }).then(ok => {
            if (ok) {
                const avatarUrl = val || 'img/pub_logo.png';
                $('#avatar-url-text').text(avatarUrl);
                const avatarImg = $('#avatarImg');
                if (avatarUrl) {
                    avatarImg.attr('src', avatarUrl);
                    avatarImg.off('error load').on('error', function() {
                        $(this).removeClass('show').hide();
                    }).on('load', function() {
                        $(this).addClass('show').show();
                    });
                    if (avatarImg[0].complete && avatarImg[0].naturalWidth > 0) {
                        avatarImg.addClass('show').show();
                    } else {
                        avatarImg.addClass('show');
                    }
                } else {
                    avatarImg.removeClass('show').hide();
                }
            }
            $('.show-avatar').hide();
            $('#avatar-display-container').show();
        });
    });

    $("#cancel-show-avatar").click(() => {
        $('.show-avatar').hide();
        $('#avatar-display-container').show();
    });

    $("#cancel-show-nostr").click(() => {
        $('.show-nostr').hide();
        $('#show-nostr-text').parent().show();
    });

    // Copy button functionality
    $(document).on('click', '.status-copy-btn', function() {
        const targetId = $(this).data('copy-target');
        const targetElement = $('#' + targetId);
        let textToCopy = '';
        
        if (targetElement.is('a')) {
            textToCopy = targetElement.attr('href') || targetElement.text();
        } else {
            textToCopy = targetElement.text();
        }
        
        if (textToCopy && textToCopy !== '—' && textToCopy !== '#') {
            navigator.clipboard.writeText(textToCopy).then(() => {
                // Visual feedback could be added here
                console.log('Copied:', textToCopy);
            }).catch(err => {
                console.error('Failed to copy:', err);
            });
        }
    });

    // Initial load
    updateProgress(1);
    pageHistory.push('page-node');
    if (window.location.hash) {
        const hashPage = window.location.hash.substring(1);
        const hashPageElement = pages[hashPage.replace('page-', '')];
        if (hashPageElement) navigateToPage(hashPageElement, false);
    }

    loadWizardState();
});