<h1>Lightning.Pub</h1>

![GitHub last commit](https://img.shields.io/github/last-commit/shocknet/Lightning.Pub?style=flat-square)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com) 
[![Chat](https://img.shields.io/badge/chat-on%20Telegram-blue?style=flat-square)](https://t.me/LightningPage)
[![Twitter Follow](https://img.shields.io/twitter/follow/ShockBTC?style=flat-square)](https://twitter.com/ShockBTC)

<p></p>

This is an alpha release of the Lightning.Page backend service, providing a wrapper for [LND](https://github.com/shocknet/lnd/releases) and more stuff to be announced later.<br>

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
* Change defaults in `defaults.js`
* Requires [Node.js](https://nodejs.org) 16

#### Steps:
1) Run [LND](https://github.com/shocknet/lnd/releases) - *Example mainnet startup*:

 ```
 ./lnd --bitcoin.active --bitcoin.mainnet --bitcoin.node=neutrino --neutrino.connect=neutrino.shock.network --routing.assumechanvalid --accept-keysend --allow-circular-route --feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json
 ```


2) Download and Install API

```
git clone https://github.com/shocknet/Lightning.Pub
cd Lightning.Pub
yarn install
```

3) Run with `yarn start -t` *(`-t` is recommended but [not required](#node-security))*
4) Connect with Dashboard


### Docker Usage
To run Lightning.Pub in a fully isolated environment you can use the Docker image
provided on the Docker Hub and easily interact with API's CLI interface and flags.

#### Prerequisites
To interact with Lightning.Pub's Docker image you need an instance of LND running and
also if your configs, LND related files and certificates are located on a local file system you'll need to mount **Docker Volumes** pointed to them while starting the container.

Example of listing available configuration flags:
```
docker run --rm shockwallet/Lightning.Pub:latest --help
```
Example of running an local instance with mounted volumes:
```
docker run -v /home/$USER/.lnd:/root/.lnd --network host shockwallet/Lightning.Pub:latest
```

### Node Security 

Lightning.Pub uses E2E encryption bootstrapped with PAKE.

There are advanced or testing scenarios where you may wish to bypass this security, to do so pass the env `TRUSTED_KEYS=false`

Communication between the wallet and Lightning.Pub is encrypted regardless of whether or not SSL is used, though an SSL equipped reverse proxy is recommended for better usability with front-ends. Running with `-t` enables the built-in SSL tunnel provider for ease of use and zero-configuration networking.

