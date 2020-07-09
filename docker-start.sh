#!/bin/ash
node main -h 0.0.0.0 \
        -m admin.macaroon \
        -d tls.cert \
        -l $LND_ADDR