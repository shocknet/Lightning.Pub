<h1>Lightning.Pub</h1>

![GitHub last commit](https://img.shields.io/github/last-commit/shocknet/Lightning.Pub?style=flat-square)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com) 
[![Chat](https://img.shields.io/badge/chat-on%20Telegram-blue?style=flat-square)](https://t.me/LightningPage)
[![Twitter Follow](https://img.shields.io/twitter/follow/MyLightningPage?style=flat-square)](https://twitter.com/ShockBTC)

<p></p>

This is an alpha release of the Lightning.Page backend service, providing a wrapper for [LND](https://github.com/shocknet/lnd/releases) and a daemon for a decentralized social graph over [GUN](https://gun.eco/).<br>

Run this service on your Lightning node and connect with a mobile device or desktop browser.

---
- [Easy Installation](#easy-installation)
- [Manual Installation](#manual-installation)
- [Docker Usage](#docker-usage)
- [Node Security](#node-security)
<!--- - [Docker for Raspberry Pi](#docker-for-raspberry-pi) -->
---
### Easy Installation

For easy setup on your Laptop/Desktop, [a node wizard is available here.](https://github.com/shocknet/wizard)


### Manual Installation
#### Notes:
* The service defaults to port `9835` 
* Looks for local LND in its default path 
* Default gun peer is `gun.shock.network`
* Change defaults in `defaults.js`
* Requires [Node.js](https://nodejs.org) 14

#### Steps:
1) Run [LND](https://github.com/shocknet/lnd/releases) - *Example mainnet startup*:

 ```
 ./lnd --bitcoin.active --bitcoin.mainnet --bitcoin.node=neutrino --neutrino.connect=neutrino.shock.network --routing.assumechanvalid --accept-keysend --allow-circular-route --feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json
 ```


2) Download and Install API

```
git clone https://github.com/shocknet/api
cd api
yarn install
```

3) Run with `yarn start -t` *(`-t` is recommended but [not required](#node-security))*
4) Connect with Lightning.Page


### Docker Usage
To run ShockAPI in a fully isolated environment you can use the Docker image
provided on the Docker Hub and easily interact with API's CLI interface and flags.

#### Prerequisites
To interact with ShockAPI's Docker image you need an instance of LND running and
also if your configs, LND related files and certificates are located on a local file system you'll need to mount **Docker Volumes** pointed to them while starting the container.

Example of listing available configuration flags:
```
docker run --rm shockwallet/api:latest --help
```
Example of running an local instance with mounted volumes:
```
docker run -v /home/$USER/.lnd:/root/.lnd --network host shockwallet/api:latest
```

<!---
### Docker for Raspberry Pi

* [Instructions](https://gist.github.com/boufni95/3f4e1f19cf9525c3b7741b7a29f122bc)
-->

### Node Security 

Lightning.Page authenticates to the API with the keys of the `GUN` user. Where the API itself typically has full macaroon access to LND, we've implemented an extra security measure at user enrollment to whitelist these keys and prevent rogue authentication.

If installing the ShockAPI onto a pre-existing LND node instance, the decryption passphrase must be proven at user enrollment. This requires LND to be in a locked state when creating the user, and the `GUN` password to be synchronized with the LND decryption phrase. 

The API will verify the defined `GUN` password unlocks LND before completing enrollment, and can thus be used in the future to directly unlock LND from Lightning.Page. This will restrict authentication to only this `GUN` key. Changing or adding alternative users will require repeating this **"lock and enroll"** process.

There are advanced or testing scenarios where you may wish to bypass this sync and whitelist mechanism, to do so pass the env `TRUSTED_KEYS=false`

_New LND nodes will automatically use the `GUN` user password as their decryption phrase upon creation._

Communication between the wallet and API is encrypted regardless of whether or not SSL is used, though an SSL equipped reverse proxy is recommended for better usability with the wallet PWA. Running with `-t` enables the built-in SSL tunnel provider for ease of use and zero-configuration networking.

