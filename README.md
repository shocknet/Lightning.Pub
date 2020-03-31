This is an alpha release of the [ShockWallet](https://shockwallet.app) API.

For easy setup on your Laptop/Desktop, [a wizard is available here.](https://github.com/shocknet/wizard)


### Manual Installation
#### Notes:
* The service defaults to port `9835` 
* Looks for local LND in its default path 
* Default gun peer is `gun.shock.network`
* Change defaults in `defaults.js`
* Requires [Node.js](https://nodejs.org) 12

#### Steps:
1) Run [LND](https://github.com/lightningnetwork/lnd/releases) - *Example mainnet startup*:

 ```./lnd --bitcoin.active --bitcoin.mainnet --bitcoin.node=neutrino --neutrino.connect=neutrino.shock.network```


2) Download and Install API

```
git pull https://github.com/shocknet/api
cd api
yarn install
```

3) Run with `node main -h -c 0.0.0.0` // remove -c for testnet
4) Connect with ShockWallet
