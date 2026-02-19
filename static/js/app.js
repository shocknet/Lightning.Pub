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
        backupEnabled: true,
        useCustomRelay: false,
        automateLiquidity: null,
        pushBackups: null,

        // Liquidity / Backup
        liquidityChoice: 'manual',
        backupChoice: 'manual',
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
        showResetBox: false,
        resetBoxContent: '',

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

        async loadState() {
            this.loading = true;
            try {
                const res = await fetch('/wizard/service_state');
                if (!res.ok) throw new Error('Failed to load state');
                const data = await res.json();
                this.serviceState = data;

                // Populate local state
                this.nodeName = data.source_name !== 'Error' ? (data.source_name || '') : '';
                this.avatarUrl = data.avatar_url || '';
                this.relayUrl = data.relay_url || (data.relays && data.relays[0]) || '';
                this.automateLiquidity = data.automate_liquidity;
                this.pushBackups = data.push_backups_to_nostr;
                this.liquidityChoice = this.automateLiquidity === true ? 'automate' : 'manual';
                this.backupChoice = this.pushBackups === true ? 'relay' : 'manual';

                // If we have an admin npub, might redirect to status
                if (data.admin_npub && !window.location.hash) {
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
                    if (['welcome', 'node', 'relay', 'liquidity', 'backup', 'connect', 'status'].includes(hashStep)) {
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

        // Actions
        saveNodeSettings() {
            if (!this.nodeName.trim()) return false;
            return true;
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

        get backupLocationText() {
            if (this.relayTier === 'free') {
                return 'Your encrypted backup syncs automatically to the community relay.';
            } else if (this.relayTier === 'premium') {
                return 'Your encrypted backup syncs automatically across the premium relay pool.';
            } else {
                const valid = this.customRelays.filter(r => r.state === 'valid');
                if (valid.length === 0) return 'Enter and validate your relay URLs above.';
                return `Your encrypted backup syncs automatically to: ${valid.map(r => r.url).join(', ')}`;
            }
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
                return valid ? valid.url : (this.customRelays[0]?.url || 'wss://relay.lightning.pub');
            }
            return 'wss://relay.lightning.pub';
        },

        async submitWizardConfig() {
            const payload = {
                source_name: this.nodeName?.trim() || '',
                relay_url: this.getWizardRelayUrl(),
                automate_liquidity: this.liquidityChoice === 'automate',
                push_backups_to_nostr: this.backupChoice === 'relay',
                avatar_url: (this.avatarUrl || '').trim() || ''
            };
            const res = await fetch('/wizard/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.reason || 'Failed to save config');
            }
        },

        async finishBackup() {
            try {
                await this.submitWizardConfig();
                this.error = null;
                document.getElementById('errorTextBackup').textContent = '';
                this.goTo('connect');
            } catch (e) {
                this.error = e.message;
                const el = document.getElementById('errorTextBackup');
                if (el) el.textContent = e.message;
            }
        }
    };
};
