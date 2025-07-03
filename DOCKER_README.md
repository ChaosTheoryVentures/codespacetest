# Docker Configuration for ML Workloads

This repository contains Docker configurations optimized for Machine Learning workloads using TensorFlow.js.

## Architecture Overview

The setup includes:
- **Node.js 18 LTS** application with TensorFlow.js support
- **PostgreSQL 15** for data persistence
- **Redis 7** for caching and session management
- **Nginx** reverse proxy for production (production only)
- **Multi-stage builds** for optimized images
- **Resource limits** and health checks
- **Security hardening** for production

## Quick Start

### Development
```bash
# Start development environment
docker-compose up

# Start with build
docker-compose up --build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f app

# Access database admin at http://localhost:8080
```

### Production
```bash
# Create environment file
cp .env.example .env
# Edit .env with your production values

# Start production environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Or use the production override
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

### Required Variables
- `DB_PASSWORD`: Database password
- `JWT_SECRET`: JWT signing secret
- `ENCRYPTION_KEY`: Encryption key for sensitive data

### Optional Variables
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`: Database configuration
- `REDIS_HOST`, `REDIS_PORT`: Redis configuration
- `TF_CPP_MIN_LOG_LEVEL`: TensorFlow logging level
- `UV_THREADPOOL_SIZE`: Node.js thread pool size

## Resource Limits

### Development
- **App**: 2 CPU cores, 4GB RAM
- **Database**: 1 CPU core, 2GB RAM
- **Redis**: 0.5 CPU cores, 512MB RAM

### Production
- **App**: 4 CPU cores, 8GB RAM
- **Database**: 2 CPU cores, 4GB RAM
- **Redis**: 1 CPU core, 1GB RAM
- **Nginx**: 0.5 CPU cores, 512MB RAM

## Security Features

### Production Security
- Non-root user execution
- Read-only filesystem
- Capability dropping
- Security options enabled
- Minimal Alpine base images
- SSL/TLS termination at Nginx
- Rate limiting
- Security headers

## Health Checks

All services include health checks:
- **App**: HTTP check on `/health` endpoint
- **Database**: PostgreSQL connection check
- **Redis**: Redis ping check
- **Nginx**: HTTP check on health endpoint

## Volume Mounts

### Development
- Source code mounted for hot reload
- Separate volumes for data, models, and logs
- Node modules volume for performance

### Production
- Read-only data volume
- Persistent model storage
- Log volume for monitoring

## Networking

Custom bridge network (`ml-network`) isolates containers with:
- Internal DNS resolution
- Subnet: 172.20.0.0/16
- No external access except through defined ports

## ML-Specific Optimizations

### TensorFlow.js Configuration
- `TF_CPP_MIN_LOG_LEVEL`: Reduces TensorFlow logging
- `UV_THREADPOOL_SIZE`: Optimizes Node.js thread pool
- `NODE_OPTIONS`: Increases memory allocation

### Build Tools
- Python 3, make, g++ for native bindings
- libc6-compat for Alpine compatibility
- Optimized npm install with cache cleaning

## File Structure

```
/workspaces/codespacetest/
├── Dockerfile                    # Multi-stage build
├── docker-compose.yml           # Development configuration
├── docker-compose.prod.yml      # Production configuration
├── docker-compose.override.yml  # Development overrides
├── .dockerignore                # Build exclusions
├── healthcheck.js              # Health check script
├── nginx.conf                  # Nginx configuration
├── init.sql                    # Database initialization
├── .env.example               # Environment template
└── DOCKER_README.md           # This file
```

## Commands

### Development
```bash
# Start all services
docker-compose up

# Rebuild images
docker-compose build

# Start specific service
docker-compose up app

# View logs
docker-compose logs -f

# Execute commands in container
docker-compose exec app npm test
docker-compose exec db psql -U postgres -d myapp

# Stop services
docker-compose down

# Remove volumes
docker-compose down -v
```

### Production
```bash
# Deploy production stack
docker-compose -f docker-compose.prod.yml up -d

# Scale app service
docker-compose -f docker-compose.prod.yml up -d --scale app=3

# Update single service
docker-compose -f docker-compose.prod.yml up -d --no-deps app

# View production logs
docker-compose -f docker-compose.prod.yml logs -f

# Production health check
docker-compose -f docker-compose.prod.yml ps
```

## Monitoring

### Health Checks
```bash
# Check container health
docker-compose ps

# View health check logs
docker inspect <container_id> | grep -A 10 Health
```

### Resource Usage
```bash
# Monitor resource usage
docker stats

# View container processes
docker-compose top
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   # Fix volume permissions
   sudo chown -R 1001:1001 ./data ./models ./logs
   ```

2. **Build Failures**
   ```bash
   # Clear build cache
   docker-compose build --no-cache
   
   # Prune unused images
   docker system prune -a
   ```

3. **Memory Issues**
   ```bash
   # Increase Docker memory limit
   # Update Docker Desktop settings or system resources
   ```

4. **Database Connection**
   ```bash
   # Check database logs
   docker-compose logs db
   
   # Test connection
   docker-compose exec app npm run db:test
   ```

## Best Practices

1. **Always use environment variables** for sensitive data
2. **Pin image versions** in production
3. **Monitor resource usage** and adjust limits
4. **Regular backup** of persistent volumes
5. **Update base images** regularly for security
6. **Use health checks** for all services
7. **Implement proper logging** and monitoring
8. **Test deployment** in staging environment

## SSL/TLS Setup

For production with SSL:

1. Generate certificates:
   ```bash
   mkdir ssl
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout ssl/key.pem -out ssl/cert.pem
   ```

2. Update nginx.conf paths if needed
3. Restart nginx service

## Scaling

### Horizontal Scaling
```bash
# Scale app instances
docker-compose -f docker-compose.prod.yml up -d --scale app=3

# Use load balancer
# Update nginx upstream configuration
```

### Vertical Scaling
```bash
# Update resource limits in compose files
# Restart services with new limits
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```