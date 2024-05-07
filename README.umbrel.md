### Install multipass on the machine (Linux or MacOS)
```sh
snap install multipass
```

### Clone the umbrel from the repo and run it on the machine

https://github.com/getumbrel/umbrel

```sh
cd ~
git clone https://github.com/getumbrel/umbrel
cd umbrel
npm run vm:provision
```

### Install Bitcoin Node and Lightning Node on the UmbrelOS
Please input the http://umbrel-dev.local/ on your browser.

You can install following two apps on the app store.
- Bitcoin Node
- LIghtning Node


### Transfer the `lightning-pub` folder into the Umbrel virtual machine
```sh
multipass transfer -r <path-to-lignthing-pub> umbrel-dev:/home/ubuntu/umbrel/packages/umbreld/data/app-stores/getumbrel-umbrel-apps-github-53f74447/
```

You can get the path of lignthing-pub with following commands
```sh
cd <path-to-this-repo>
cd lightning-pub
pwd
```

### Install the package with docker-compose.yml and umbrel-app.yml files
Just check that following 2 files exists on the folder you transferred into Umbrel.

And then,

```sh
cd ~
cd umbrel
npm run vm:trpc apps.install.mutate -- --appId lightning-pub
```

### Open the app on the app store

You can run the app on the Umbrel.

To check if it's running, go to the following url on the browser.

http://umbrel-dev.local:8090/