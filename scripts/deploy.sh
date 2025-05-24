#!/bin/bash
set -e

# Configuration
APP_DIR=~/grape-shop-backend
DOCKER_COMPOSE_FILE=${APP_DIR}/docker-compose.yml
LOG_FILE=${APP_DIR}/deploy.log

# Log function
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a ${LOG_FILE}
}

# Create log file if doesn't exist
mkdir -p $(dirname ${LOG_FILE})
touch ${LOG_FILE}

log "Starting deployment process for Grape Shop API"

# Navigate to app directory
cd ${APP_DIR}

# Pull latest code from git
log "Pulling latest code from git repository"
git pull origin master

# Check if .env file exists
if [ ! -f "${APP_DIR}/.env" ]; then
    log "ERROR: .env file not found. Deployment aborted."
    exit 1
fi

# Stop and remove existing containers
log "Stopping and removing existing containers"
docker-compose down || log "No containers were running"

# Remove unused Docker images to free up space
log "Cleaning up unused Docker images"
docker image prune -af || log "No unused images to remove"

# Build and start containers
log "Building Docker images"
docker-compose build --no-cache

log "Starting Docker containers"
docker-compose up -d

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    log "Deployment completed successfully. Containers are running."
    
    # Show running containers
    log "Running containers:"
    docker-compose ps
else
    log "ERROR: Deployment failed. Containers are not running."
    
    # Show logs for debugging
    log "Container logs:"
    docker-compose logs
    exit 1
fi

log "Deployment process completed"