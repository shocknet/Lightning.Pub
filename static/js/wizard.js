$(() => {
    // Page sections
    const pages = {
        node: $('#page-node'),
        liquidity: $('#page-liquidity'),
        backup: $('#page-backup')
    };

    // Inputs
    const nodeNameInput = $("#nodeName");
    const relayUrlInput = $("#relayUrl");
    const customCheckbox = $("#customCheckbox");
    const automateLiquidityRadio = $("#automate");
    const manualLiquidityRadio = $("#manual");
    const backupNostrRadio = $("#backup");
    const manualBackupRadio = $("#manual-backup");

    // Buttons
    const toLiquidityBtn = $("#liquidityBtn");
    const toBackupBtn = $("#backupBtn");
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
            location.href = 'connect.html';
        } catch (err) {
            errorTextBackup.text(err.message);
        }
    });

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

    // Initial state load
    fetch("/wizard/state").then(res => res.json()).then(data => {
        if (data.admin_linked) {
            location.href = 'status.html';
        } else if (data.config_sent) {
            location.href = 'connect.html';
        } else {
            // Pre-populate from service state
            fetch("/wizard/service_state").then(res => res.json()).then(state => {
                nodeNameInput.val(state.source_name);
                if (state.relay_url === 'wss://relay.lightning.pub') {
                    customCheckbox.prop('checked', true);
                } else {
                    relayUrlInput.val(state.relay_url);
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
        }
    });
});
