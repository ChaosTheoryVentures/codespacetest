# Deployment Instructions

## GitHub Secrets Required

Add these secrets to your GitHub repository (Settings > Secrets and Variables > Actions):

```
HOST=your-server-ip
USERNAME=root
SSH_KEY=your-private-ssh-key
PORT=22 (optional, defaults to 22)
```

## What the deployment does:

1. **Tests** - Runs npm test to ensure code quality
2. **Builds** - Creates Docker image with the app
3. **Deploys** - SSH to your server and:
   - Stops any existing container
   - Pulls latest code
   - Builds new Docker image
   - Runs container on port 3001
   - Verifies deployment success

## After deployment:

Your neural network playground will be available at:
```
http://YOUR_SERVER_IP:3001
```

## Features included:

- ✅ Interactive neural network visualization
- ✅ Real-time training with TensorFlow.js  
- ✅ Dataset upload (CSV/JSON)
- ✅ Pre-built datasets (XOR, Iris, etc.)
- ✅ Model save/load (works without database)
- ✅ D3.js network diagrams
- ✅ Chart.js training metrics
- ✅ Mobile responsive design

## Manual deployment:

If you want to deploy manually:

```bash
# On your server
git clone https://github.com/ChaosTheoryVentures/codespacetest
cd codespacetest
docker build -t neural-network-playground .
docker run -d --name neural-network-playground --restart unless-stopped -p 3001:3001 neural-network-playground
```