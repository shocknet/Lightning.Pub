# Umbrel packaging

Reference files for packaging Lightning.Pub as an Umbrel app.

Copy this directory into [`getumbrel/umbrel-apps`](https://github.com/getumbrel/umbrel-apps) as `lightning-pub/` after it has been tested on Umbrel with the Lightning Node app installed and unlocked.

## How it runs on Umbrel

| Piece | Value |
| --- | --- |
| Image | `ghcr.io/shocknet/lightning-pub:0.0.40` (linux/amd64 and linux/arm64) |
| Lightning backend | Umbrel Lightning Node (LND), via mounted cert/macaroon and gRPC address |
| HTTP API | port `1776` inside the container |
| Browser UI | wizard on port `1777` (`PORT + 1`), exposed through Umbrel `app_proxy` |
| Persistent data | host `${APP_DATA_DIR}/data` mounted at `/data` |

## Before submitting to the Umbrel App Store

1. Change the Docker image so TypeScript is compiled at build time, not on every container start. Then run the container as `user: "1000:1000"`.
2. Install this package on Umbrel, open the wizard, and confirm ShockWallet can connect with the admin string.
3. Confirm Pub data is still present after a container restart.
4. Set the final App Store `port` if `40176` needs to change, and put the umbrel-apps PR URL in `submission`.
5. If external clients must call Pub HTTP without Umbrel login cookies, add a narrow `PROXY_AUTH_WHITELIST`.
6. Document optional LNURL / `SERVICE_URL` setup for operators who have a public HTTPS domain.
