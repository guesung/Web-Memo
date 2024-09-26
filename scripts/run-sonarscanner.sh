#!/bin/bash

token=$SONAR_TOKEN
url="http://localhost:9000"
project="web-memo"

docker run \
    --rm \
    --net host \
    -e SONAR_HOST_URL=$url \
    -v ${PWD}:/usr/src \
    sonarsource/sonar-scanner-cli \
    --debug \
    -Dsonar.projectKey=$project \
    -Dsonar.sonar.sourceEncoding=UTF-8 \
    -Dsonar.sonar.host.url=$url \
    -Dsonar.sources=/usr/src \
    -Dsonar.login=$token