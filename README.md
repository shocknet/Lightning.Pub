<h1>Lightning.Pub</h1>

![GitHub last commit](https://img.shields.io/github/last-commit/shocknet/Lightning.Pub?style=flat-square)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com) 
[![Chat](https://img.shields.io/badge/chat-on%20Telegram-blue?style=flat-square)](https://t.me/ShockBTC)
[![Twitter Follow](https://img.shields.io/twitter/follow/ShockBTC?style=flat-square)](https://twitter.com/ShockBTC)

<p></p>

`Pub` enables your Lightning node with public Web API's, providing a framework for permissionless applications that depend on Lightning. 
- As a wrapper for [`LND`](https://github.com/lightningnetwork/lnd/releases), `Pub` also offers node operators Enterprise-class management capabilities. 
- An optional SSL proxy service is included for ease of use through zero-configuration networking.<br>

#### This repository is under rapid iteration and should only be used in development.



---
<!-- - [Easy Installation](#easy-installation)-->
- [Manual Installation](#manual-installation)
- [Docker Usage](#docker-usage)
- [Node Security](#node-security)
<!--- - [Docker for Raspberry Pi](#docker-for-raspberry-pi) -->
---
<!--- - ### Easy Installation

For easy setup on your Laptop/Desktop, [a node wizard is available here.](https://github.com/shocknet/wizard)-->


### Manual Installation
#### Notes:
* The service defaults to port `9835` 
* Looks for local LND in its default path 
* Change defaults in `defaults.js`
* Requires [Node.js](https://nodejs.org) 16

#### Steps:
1) Run [LND](https://github.com/lightningnetwork/lnd/releases) - *Example mainnet startup*:

 ```
 ./lnd --bitcoin.active --bitcoin.mainnet --bitcoin.node=neutrino --neutrino.connect=neutrino.shock.network --routing.assumechanvalid --accept-keysend --allow-circular-route --feeurl=https://nodes.lightning.computer/fees/v1/btc-fee-estimates.json
 ```


2) Download and Install Lightning.Pub

```
git clone https://github.com/shocknet/Lightning.Pub
cd Lightning.Pub
yarn install
```

3) Run with `yarn start -t` *(`-t` is recommended but [not required](#node-security))*
4) Connect with Dashboard


### Docker Usage
To run `Pub` in a fully isolated environment you can use the Docker image
provided on the Docker Hub and easily interact with API's CLI interface and flags.

#### Prerequisites
To use `Pub` Docker images you will need an instance of LND running, and
also if your LND related files are located in a container file system, you'll need to mount **Docker Volumes** pointed to them while starting the container.

Example of listing available configuration flags:
```
docker run --rm shockwallet/Lightning.Pub:latest --help
```
Example of running an local instance with mounted volumes:
```
docker run -v /home/$USER/.lnd:/root/.lnd --network host shockwallet/Lightning.Pub:latest
```

### Node Security 

`Pub` administration API's use E2E encryption bootstrapped with PAKE to prevent interception by the proxy. There are advanced or testing scenarios where you may wish to bypass this security, to do so pass the env `TRUSTED_KEYS=false`

Communication between the administrator Dashboard and Lightning.Pub is otherwise encrypted, regardless of whether or not SSL is used, though an SSL equipped reverse proxy is recommended for better usability with web browsers. 

Running with `-t` enables the built-in SSL proxy provider for ease of use via zero-configuration networking.
