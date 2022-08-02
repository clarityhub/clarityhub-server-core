#!/bin/bash

set -e

docker build ./fixtures/docker/local -t persato

docker run \
    -it \
    --rm \
    --publish 8000:8000 \
    --publish 4000:4000 \
    --network=clarityhub-network \
    --mount src="$(pwd)",target=/server,type=bind \
    --network-alias persato \
    --name persato \
    --entrypoint "test" \
    persato

echo $?