#!/bin/bash

# Create the asymmetric keys for generating and verifying JWTs.
#
# This will create the RSA secret and the PEM file for you and
# copy the files over to each service. Auth will need both files

cd "$(dirname "$0")"

set -e

cd ..

if [ ! -f ../jwt-secret ]; then
  echo -e " ⚠️\t\x1B[33mCreating JWT RSA Keys\x1B[39m"
  ssh-keygen -t rsa -b 2048 -N "" -f "../jwt-secret"
  ssh-keygen -f "../jwt-secret.pub" -e -m pem > "../jwt-secret.pem"
fi
