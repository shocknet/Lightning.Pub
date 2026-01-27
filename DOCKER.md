# Docker Installation

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
  -e DATA_DIR=/app/data \
  -v /path/to/local/data:/app/data \
  -v $HOME/.lnd:/root/.lnd \
  ghcr.io/shocknet/lightning-pub:latest
```

Network host is used so the service can reach a local LND via localhost. LND is assumed to be under the users home folder, update these resources as needed.

## Getting the Connection String

After starting the container, you can get the connection string in several ways:

### Option 1: From the mounted data directory

If `DATA_DIR=/app/data` is set and the volume is mounted correctly, the connection string will be in:

```ssh
cat /path/to/local/data/admin.connect
```

The connection string format is: `nprofile1...:token`

### Option 2: Via API endpoint

Access the wizard endpoint to get connection info:

```ssh
curl http://localhost:1777/wizard/admin_connect_info
```

The response will include the `nprofile` and `admin_token`. Combine them as `nprofile:admin_token` to form the connection string.

### Option 3: From inside the container

If the files aren't in the mounted volume, check inside the container:

```ssh
docker exec lightning-pub cat /app/data/admin.connect
```

Or if `DATA_DIR` wasn't set, check the working directory:

```ssh
docker exec lightning-pub cat /app/admin.connect
```

### Troubleshooting

If `/data` folder is empty:
- Ensure `DATA_DIR=/app/data` environment variable is set in the docker run command
- Check container logs: `docker logs lightning-pub` to see where files are being written
- The logs will show the configured data directory path at startup
