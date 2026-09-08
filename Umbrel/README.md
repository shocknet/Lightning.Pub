# Umbrel packaging (reference)

Modern Umbrel App Store reference package for Lightning.Pub.

The previous `Umbrel/` files targeted a dead image tag (`lightning.pub:umbrel-works`)
and Umbrel conventions from ~2024. This rewrite is meant to be copied into
[`getumbrel/umbrel-apps`](https://github.com/getumbrel/umbrel-apps) as `lightning-pub/`
once validated on a real Umbrel (LND dependency + wizard UI).

## Runtime shape

| Piece | Value |
| --- | --- |
| Image | `ghcr.io/shocknet/lightning-pub:0.0.40` (multi-arch amd64/arm64) |
| LND | Umbrel `lightning` app via `${APP_LIGHTNING_NODE_*}` + macaroon/cert mount |
| API | `PORT=1776` |
| Wizard UI | `WIZARD=true`, listens on `PORT+1` → **1777** (proxied by Umbrel `app_proxy`) |
| Data | `${APP_DATA_DIR}/data` → `/data` (`DATA_DIR`, sqlite DBs) |

## Known follow-ups before App Store merge

1. **Prebuild the Docker image** so the container does not `tsc` on every start, then run as `user: "1000:1000"`.
2. Sideload/test on Umbrel OS 1.x with Lightning Node unlocked; confirm wizard + ShockWallet admin connect.
3. Pick a final store `port` (currently `40176`) and fill `submission` with the umbrel-apps PR URL.
4. Optional: whitelist narrow HTTP paths if companion clients must hit Pub without Umbrel auth cookies.
5. Optional LNURL/`SERVICE_URL` docs for operators with a public domain.
