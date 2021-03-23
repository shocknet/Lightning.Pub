<h1>ShockAPI</h1>

![GitHub last commit](https://img.shields.io/github/last-commit/shocknet/api?style=flat-square)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com) 
[![Chat](https://img.shields.io/badge/chat-on%20Telegram-blue?style=flat-square)](https://t.me/Shockwallet)
[![Twitter Follow](https://img.shields.io/twitter/follow/ShockBTC?style=flat-square)](https://twitter.com/shockbtc)

<p></p>

This is an alpha release of the Shockwallet backend service.<br>

For easy setup on your Laptop/Desktop, [a wizard is available here.](https://github.com/shocknet/wizard)


### Manual Installation
#### Notes:
* The service defaults to port `9835` 
* Looks for local LND in its default path 
* Default gun peer is `gun.shock.network`
* Change defaults in `defaults.js`
* Requires [Node.js](https://nodejs.org) 14

#### Steps:
1) Run [LND](https://github.com/shocknet/lnd/releases) - *Example mainnet startup*:

(Neutrino example requires builds with experimental flags, our binaries include them.)

 ```./lnd --bitcoin.active --bitcoin.mainnet --bitcoin.node=neutrino --neutrino.connect=neutrino.shock.network --routing.assumechanvalid --accept-keysend --allow-circular-route --feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json```


2) Download and Install API

```
git clone https://github.com/shocknet/api
cd api
yarn install
```

3) Run with `yarn start`
4) Connect with Shockwallet *(Provide your nodes IP manually or scan QR from ShockWizard)*

### Docker for Raspberry Pi

* [Instructions](https://gist.github.com/boufni95/3f4e1f19cf9525c3b7741b7a29f122bc)
