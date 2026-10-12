const COMMUNITY_RELAY_URL = 'wss://relay.lightning.pub';

window.wizard = function () {
    return {
        step: 'welcome',
        history: ['welcome'],
        loading: true,
        error: null,

        // Form Data
        nodeName: '',
        avatarUrl: '',
        relayUrl: '',

        // Relay Data
        relayTier: 'free',
        customRelays: [{ url: '', state: 'idle', error: null }],
        useCustomRelay: false,
        automateLiquidity: null,

        // Liquidity / Backup
        liquidityChoice: 'manual',
        backupChoice: 'remote',
        backupHost: '',
        backupPort: 22,
        backupUser: '',
        backupPass: '',
        backupFingerprint: '',
        showLiquidityQuestion: false,

        // Connect
        connectStringRaw: '',
        qrRevealed: false,
        connectPollTimer: null,

        // Status
        serviceState: null,
        editingNodeName: false,
        editingAvatar: false,
        editingNostr: false,
        statusSaving: false,
        showResetBox: false,
        resetBoxContent: '',

        // BACKUP CHANGE: Restore flow state
        restoreIntent: '',
        restorePhrase: '',
        restorePhraseError: '',
        restoreSource: 'cloud',
        restoreSftpHost: '',
        restoreSftpPort: 22,
        restoreSftpUser: '',
        restoreSftpPass: '',
        restoreSftpFingerprint: '',
        restoreLocalPath: '',
        restoreError: '',
        restoreLoading: false,

        async init() {
            await this.loadState();
            document.body.classList.add('wizard-ready');

            window.addEventListener('popstate', (event) => {
                if (event.state && event.state.step) {
                    this.step = event.state.step;
                }
            });

            this.$watch('step', (s) => {
                if (s === 'connect') this.loadConnectInfo();
                if (s !== 'connect') this.stopConnectPoll();
            });

            document.addEventListener('click', (e) => {
                const btn = e.target.closest('.status-copy-btn');
                if (btn && btn.dataset.copyTarget) {
                    e.preventDefault();
                    this.copyTarget(btn.dataset.copyTarget);
                }
            });
        },

        async refreshServiceState() {
            const res = await fetch('/wizard/service_state');
            if (!res.ok) throw new Error('Failed to load state');
            const data = await res.json();
            this.serviceState = data;

            this.applyServiceFields(data);
            this.automateLiquidity = data.automate_liquidity;
            this.liquidityChoice = this.automateLiquidity === true ? 'automate' : 'manual';
            this.loadRemoteBackup(data.remote_backup, !!data.admin_npub);
            if (data.has_ongoing_recovery) {
                this.restoreIntent = 'restore';
            }
            return data;
        },

        async loadState() {
            this.loading = true;
            try {
                const data = await this.refreshServiceState();

                // Recovery-only mode keeps the wizard up to retry restore; do not send
                // the operator to status (config is refused until the checkpoint completes).
                if (data.has_ongoing_recovery && !window.location.hash) {
                    this.step = 'welcome';
                } else if (data.admin_npub && !window.location.hash) {
                    this.goTo('status');
                }
            } catch (e) {
                console.error('Error loading state', e);
                this.error = 'Failed to connect to backend.';
            } finally {
                this.loading = false;
                // Always apply hash so deep links and back button work (even when backend is down)
                if (window.location.hash) {
                    const hashStep = window.location.hash.substring(1).replace('page-', '');
                    if (['welcome', 'node', 'relay', 'liquidity', 'backup', 'connect', 'status',
                         'restore-intent', 'restore-phrase', 'restore-source', 'restore-nobackup', 'restore-lndonly'].includes(hashStep)) {
                        this.step = hashStep;
                    }
                }
            }
        },

        goTo(nextStep) {
            this.history.push(nextStep);
            this.step = nextStep;
            window.history.pushState({ step: nextStep }, '', `#page-${nextStep}`);
            window.scrollTo(0, 0);
        },

        goBack() {
            if (this.history.length > 1) {
                this.history.pop();
                const prevStep = this.history[this.history.length - 1];
                this.step = prevStep;
                window.history.replaceState({ step: prevStep }, '', `#page-${prevStep}`);
            } else {
                this.step = 'welcome';
            }
        },

        applyServiceFields(data) {
            this.nodeName = data?.source_name !== 'Error' ? (data?.source_name || '') : '';
            this.avatarUrl = data?.avatar_url || '';
            this.relayUrl = data?.relay_url || (data?.relays && data.relays[0]) || '';
            this.syncRelaySelectionFromSaved();
        },

        syncRelaySelectionFromSaved() {
            const saved = (this.relayUrl || '').trim();
            if (!saved || saved === COMMUNITY_RELAY_URL) {
                this.relayTier = 'free';
                this.customRelays = [{ url: '', state: 'idle', error: null }];
                return;
            }
            this.relayTier = 'custom';
            this.customRelays = [{ url: saved, state: 'valid', error: null }];
        },

        savedRelayUrl() {
            return this.serviceState?.relay_url || (this.serviceState?.relays && this.serviceState.relays[0]) || '';
        },

        statusRemoteBackup() {
            const rb = this.serviceState?.remote_backup;
            return {
                enabled: !!rb?.enabled,
                host: rb?.host || '',
                port: Number(rb?.port) || 22,
                user: rb?.user || '',
                pass: rb?.pass || '',
                host_fingerprint: rb?.host_fingerprint || '',
            };
        },

        startEditNodeName() {
            this.error = null;
            this.applyServiceFields(this.serviceState);
            this.editingNodeName = true;
        },

        startEditAvatar() {
            this.error = null;
            this.applyServiceFields(this.serviceState);
            this.editingAvatar = true;
        },

        startEditRelay() {
            this.error = null;
            this.applyServiceFields(this.serviceState);
            this.editingNostr = true;
        },

        cancelNodeName() {
            this.error = null;
            this.applyServiceFields(this.serviceState);
            this.editingNodeName = false;
        },

        cancelAvatar() {
            this.error = null;
            this.applyServiceFields(this.serviceState);
            this.editingAvatar = false;
        },

        cancelRelay() {
            this.error = null;
            this.applyServiceFields(this.serviceState);
            this.editingNostr = false;
        },

        async saveStatusConfig(updates) {
            const s = this.serviceState || {};
            const payload = {
                source_name: updates.source_name ?? (s.source_name !== 'Error' ? (s.source_name || '') : ''),
                relay_url: updates.relay_url ?? this.savedRelayUrl(),
                automate_liquidity: typeof s.automate_liquidity === 'boolean' ? s.automate_liquidity : false,
                remote_backup: this.statusRemoteBackup(),
                avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : (s.avatar_url || ''),
            };
            const res = await fetch('/wizard/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.status === 'ERROR') {
                throw new Error(data.reason || 'Failed to save config');
            }
            await this.refreshServiceState();
        },

        async saveNodeName() {
            const name = (this.nodeName || '').trim();
            if (!name) {
                this.error = 'Please enter a node name';
                return;
            }
            this.statusSaving = true;
            try {
                this.error = null;
                await this.saveStatusConfig({ source_name: name });
                this.editingNodeName = false;
            } catch (e) {
                this.error = e.message || 'Failed to save node name';
            } finally {
                this.statusSaving = false;
            }
        },

        async saveAvatar() {
            this.statusSaving = true;
            try {
                this.error = null;
                await this.saveStatusConfig({ avatar_url: (this.avatarUrl || '').trim() });
                this.editingAvatar = false;
            } catch (e) {
                this.error = e.message || 'Failed to save avatar';
            } finally {
                this.statusSaving = false;
            }
        },

        async saveRelay() {
            const url = (this.relayUrl || '').trim();
            if (!url) {
                this.error = 'Please enter a relay URL';
                return;
            }
            this.statusSaving = true;
            try {
                this.error = null;
                await this.saveStatusConfig({ relay_url: url });
                this.editingNostr = false;
            } catch (e) {
                this.error = e.message || 'Failed to save relay';
            } finally {
                this.statusSaving = false;
            }
        },

        addCustomRelay() {
            if (this.customRelays.length < 2) {
                this.customRelays.push({ url: '', state: 'idle', error: null });
            }
        },

        removeCustomRelay(index) {
            if (this.customRelays.length > 1) {
                this.customRelays.splice(index, 1);
            } else {
                // If only one, just clear it
                this.customRelays[0] = { url: '', state: 'idle', error: null };
            }
        },

        async validateRelay(index) {
            const relay = this.customRelays[index];
            if (!relay.url.trim()) {
                relay.state = 'idle';
                relay.error = null;
                return;
            }

            relay.state = 'validating';
            // Mock validation - in real app, might need a backend check or NIP-11 check
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (relay.url.startsWith('wss://') && relay.url.length > 10) {
                relay.state = 'valid';
                relay.error = null;
            } else {
                relay.state = 'invalid';
                relay.error = 'Invalid Relay URL (must start with wss:// and be > 10 chars)';
            }
        },

        // A first run defaults to the Lightning.Pub server; a configured node shows what it saved.
        loadRemoteBackup(rb, configured) {
            if (!rb) return;
            this.backupHost = rb.host || '';
            this.backupPort = rb.port || 22;
            this.backupUser = rb.user || '';
            this.backupFingerprint = rb.host_fingerprint || '';
            if (rb.enabled) {
                this.backupChoice = rb.host ? 'custom' : 'remote';
            } else {
                this.backupChoice = configured ? 'manual' : 'remote';
            }
        },

        remoteBackupPayload() {
            const custom = this.backupChoice === 'custom';
            return {
                enabled: !!this.serviceState?.has_seed && this.backupChoice !== 'manual',
                host: custom ? this.backupHost.trim() : '',
                port: custom ? (Number(this.backupPort) || 22) : 22,
                user: custom ? this.backupUser.trim() : '',
                pass: custom ? this.backupPass : '',
                host_fingerprint: custom ? this.backupFingerprint.trim() : '',
            };
        },

        get avatarPreview() {
            if (this.avatarUrl && this.avatarUrl.trim()) return this.avatarUrl;
            return this.serviceState?.app_id
                ? `https://robohash.org/${encodeURIComponent(this.serviceState.app_id)}.png?size=128x128&set=set3`
                : 'img/pub_logo.png';
        },

        get connectStringDisplay() {
            return this.qrRevealed ? this.connectStringRaw : '';
        },

        get lndStatusText() {
            if (!this.serviceState) return '—';
            const s = this.serviceState;
            if (s.lnd_status) return s.lnd_status;
            if (s.lnd_ready) return 'Active';
            return 'Disconnected';
        },

        async loadConnectInfo() {
            this.qrRevealed = false;
            this.connectStringRaw = '';
            const res = await fetch('/wizard/admin_connect_info');
            if (res.status !== 200) return;
            const j = await res.json();
            if (j.connect_info?.enrolled_npub) {
                this.goTo('status');
                return;
            }
            const str = (j.nprofile || '') + ':' + (j.connect_info?.admin_token || '');
            if (!str || str === ':') return;
            this.connectStringRaw = str;
            this.renderQr(str);
            this.startConnectPoll();
        },

        renderQr(str) {
            const el = document.getElementById('qrcode');
            if (!el || typeof QRCode === 'undefined') return;
            el.innerHTML = '';
            new QRCode(el, { text: str, colorDark: '#000000', colorLight: '#ffffff', width: 157, height: 157 });
        },

        startConnectPoll() {
            this.stopConnectPoll();
            this.connectPollTimer = setInterval(async () => {
                const res = await fetch('/wizard/admin_connect_info');
                if (res.status === 200) {
                    const j = await res.json();
                    if (j.connect_info?.enrolled_npub) {
                        this.stopConnectPoll();
                        this.goTo('status');
                    }
                }
            }, 2000);
        },

        stopConnectPoll() {
            if (this.connectPollTimer) {
                clearInterval(this.connectPollTimer);
                this.connectPollTimer = null;
            }
        },

        revealQr() {
            if (!this.qrRevealed) this.qrRevealed = true;
        },

        copyTarget(id) {
            const el = document.getElementById(id);
            if (!el) return;
            const text = el.getAttribute('href') && el.href !== '#' ? el.href : (el.textContent || '').trim();
            if (!text) return;
            navigator.clipboard.writeText(text).catch(() => {});
        },

        openResetBox(content) {
            this.resetBoxContent = content;
            this.showResetBox = true;
        },

        closeResetBox() {
            this.showResetBox = false;
        },

        getWizardRelayUrl() {
            if (this.relayTier === 'custom') {
                const valid = this.customRelays.find(r => r.state === 'valid');
                return valid ? valid.url : (this.customRelays[0]?.url || COMMUNITY_RELAY_URL);
            }
            return COMMUNITY_RELAY_URL;
        },

        async submitWizardConfig() {
            const payload = {
                source_name: this.nodeName?.trim() || '',
                relay_url: this.getWizardRelayUrl(),
                automate_liquidity: this.liquidityChoice === 'automate',
                remote_backup: this.remoteBackupPayload(),
                avatar_url: (this.avatarUrl || '').trim() || ''
            };
            const res = await fetch('/wizard/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.status === 'ERROR') {
                throw new Error(data.reason || 'Failed to save config');
            }
        },

        async finishBackup() {
            try {
                if (this.backupChoice === 'custom' && !this.backupHost.trim()) {
                    throw new Error('Enter your SFTP server host, or pick another option.');
                }
                await this.submitWizardConfig();
                this.error = null;
                document.getElementById('errorTextBackup').textContent = '';
                this.goTo('connect');
            } catch (e) {
                this.error = e.message;
                const el = document.getElementById('errorTextBackup');
                if (el) el.textContent = e.message;
            }
        },

        // BACKUP CHANGE: Restore flow handlers

        // Phrase validation is a UX gate only — catches typos before SFTP round-trip.
        // Derivation correctness does NOT depend on aezeed validity.
        // Future code must NOT couple this to any aezeed library.
        validateAndProceedPhrase() {
            const words = this.restorePhrase.trim().split(/\s+/);
            if (words.length !== 24) {
                this.restorePhraseError = `Expected 24 words, got ${words.length}. Check your phrase.`;
                return;
            }
            // TODO: optionally validate each word against the aezeed wordlist
            // and verify checksum. For now, word count is the UX gate.
            this.restorePhraseError = '';
            this.goTo('restore-source');
        },

        async executeRestore() {
            this.restoreError = '';
            this.restoreLoading = true;

            try {
                const payload = {
                    phrase: this.restorePhrase.trim(),
                };
                if (this.restoreSource === 'cloud') {
                    payload.source = { type: 'cloud', cloud: {} };
                } else if (this.restoreSource === 'ftp') {
                    if (!this.restoreSftpHost.trim()) {
                        this.restoreError = 'SFTP host is required.';
                        this.restoreLoading = false;
                        return;
                    }
                    const port = Number(this.restoreSftpPort) || 22;
                    if (!Number.isInteger(port) || port < 1 || port > 65535) {
                        this.restoreError = 'SFTP port must be between 1 and 65535.';
                        this.restoreLoading = false;
                        return;
                    }
                    if (!this.restoreSftpFingerprint.trim()) {
                        this.restoreError = 'Host key fingerprint is required for custom SFTP restore.';
                        this.restoreLoading = false;
                        return;
                    }
                    payload.source = {
                        type: 'ftp_host',
                        ftp_host: {
                            host: this.restoreSftpHost.trim(),
                            port,
                            host_fingerprint: this.restoreSftpFingerprint.trim(),
                        },
                    };

                    if (this.restoreSftpUser.trim() || this.restoreSftpPass.trim()) {
                        payload.creds_override = {
                            user: this.restoreSftpUser.trim(),
                            pass: this.restoreSftpPass.trim()
                        };
                    }
                } else if (this.restoreSource === 'local') {
                    if (!this.restoreLocalPath.trim()) {
                        this.restoreError = 'Path to local directory is required.';
                        this.restoreLoading = false;
                        return;
                    }
                    payload.source = { type: 'local_path', local_path: this.restoreLocalPath.trim() };
                }

                const res = await fetch('/wizard/restore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                const result = await res.json();
                if (result.success) {
                    this.goTo('node');
                } else {
                    this.restoreError = result.error || 'Restore failed.';
                    try {
                        await this.refreshServiceState();
                    } catch (e) {
                        console.error('Error refreshing state after restore failure', e);
                    }
                    // A committed restore that then failed is still resumable. Stay on
                    // this step with the real error instead of "No Backup Found".
                    if (!this.serviceState?.has_ongoing_recovery) {
                        this.goTo('restore-nobackup');
                    }
                }
            } catch (e) {
                this.restoreError = e.message || 'Restore request failed.';
            } finally {
                this.restoreLoading = false;
            }
        }
    };
};
