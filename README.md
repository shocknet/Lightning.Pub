This is an early test release of the [ShockWallet](shockwallet.app) API.

For easy setup on your Laptop/Desktop, [a wizard is available here.](https://github.com/shocknet/wizard)


### Manual Installation
#### Notes:
* The service defaults to port `9835` 
* Looks for local LND in its default path 
* Default gun peer is `gun.shock.network`
* Change defaults in `defaults.js`
* Requires [Node.js](https://nodejs.org) LTS

#### Steps:
1) Run [LND](https://github.com/lightningnetwork/lnd/releases) - *Example testnet startup*:

 ```./lnd --bitcoin.active --bitcoin.testnet --bitcoin.node=neutrino --neutrino.connect=faucet.lightning.community```


2) Download and Install API

```
git pull https://github.com/shocknet/api
cd api
yarn install
```

3) Run with `node main -h 0.0.0.0` 
4) Connect with ShockWallet
