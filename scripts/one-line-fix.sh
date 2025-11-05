#!/bin/bash
# ONE-LINE FIX for Docker Compose 'ContainerConfig' Error
# Run this on your Digital Ocean server when you get the error

docker-compose down --remove-orphans && docker container prune -f && docker-compose up --build -d
