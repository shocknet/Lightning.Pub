# Docker Installation

> [!WARNING]  
> The Docker deployment method is currently unmaintained and may not work as expected. Help is wanted! If you are a Docker enjoyer, please consider contributing to this deployment method.

1. Pull the Docker image:

```ssh
docker pull ghcr.io/shocknet/lightning-pub:latest
```

2. Run the Docker container:

```ssh
docker run -d \
  --name lightning-pub \
  --network host \
  -p 1776:1776 \
  -p 1777:1777 \
  -v /path/to/local/data:/app/data \
  -v $HOME/.lnd:/root/.lnd \
  ghcr.io/shocknet/lightning-pub:latest
```
Network host is used so the service can reach a local LND via localhost. LND is assumed to be under the users home folder, update this location as needed.
