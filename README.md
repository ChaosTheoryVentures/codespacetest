# Neural Network Playground

An interactive web-based neural network visualizer built with TensorFlow.js, featuring real-time training visualization, drag-and-drop dataset upload, and configurable network architectures.

## Features

### Core Functionality
- **Interactive Neural Network Visualizer**: Dynamic network diagram with animated training
- **Real-time Training**: Live loss/accuracy charts with WebSocket updates
- **Dataset Management**: Upload CSV/JSON files or use pre-built datasets
- **Configurable Architecture**: Adjust layers, neurons, and activation functions
- **Model Persistence**: Save/load trained models with training history
- **Prediction Interface**: Test trained models with new data

### Pre-built Datasets
- XOR Problem (4 samples)
- Iris Classification (150 samples)
- Boston Housing (506 samples)
- Synthetic 2D datasets (circles, spirals)

### Technical Features
- **Backend**: Node.js + Express + TensorFlow.js + Socket.io
- **Frontend**: Vanilla JavaScript + D3.js + Chart.js
- **Database**: PostgreSQL for model storage
- **Containerized**: Docker + Docker Compose
- **CI/CD**: GitHub Actions pipeline

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 15+
- Docker and Docker Compose (optional)

### Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Start PostgreSQL** (if not using Docker):
   ```bash
   # Install PostgreSQL and create database
   createdb neural_network_playground
   ```

4. **Run the application**:
   ```bash
   npm start
   # or for development with nodemon:
   npm run dev
   ```

5. **Open your browser**: Navigate to `http://localhost:3000`

### Docker Setup

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

2. **Access the application**: `http://localhost:3000`

3. **Database admin**: `http://localhost:8080` (Adminer)

### Production Deployment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Usage Guide

### 1. Configure Neural Network
- **Add/Remove Layers**: Use the layer management interface
- **Neurons per Layer**: Adjust the number of neurons
- **Activation Functions**: Choose from relu, sigmoid, tanh, linear

### 2. Prepare Dataset
- **Upload CSV/JSON**: Drag and drop files or use file picker
- **Pre-built Datasets**: Select from XOR, Iris, Boston Housing, etc.
- **Data Preview**: View first 10 samples and basic statistics

### 3. Set Training Parameters
- **Learning Rate**: Typically 0.001 to 0.1
- **Epochs**: Number of training iterations
- **Batch Size**: Number of samples per batch
- **Optimizer**: Adam, SGD, RMSprop

### 4. Train Model
- **Start Training**: Click "Start Training" button
- **Monitor Progress**: Watch real-time loss/accuracy charts
- **View Network**: See animated data flow through network
- **Stop/Pause**: Control training process

### 5. Test Predictions
- **Input Data**: Enter values for prediction
- **View Results**: See predictions with confidence scores
- **Export Model**: Download trained model as JSON

### 6. Model Management
- **Save Models**: Store trained models with custom names
- **Load Models**: Restore previously saved models
- **Export Training History**: Download metrics as CSV

## API Endpoints

### Training
- `POST /api/train` - Train neural network
- `POST /api/predict` - Make predictions

### Datasets
- `POST /api/upload-dataset` - Upload custom dataset
- `GET /api/datasets` - List all datasets

### Models
- `POST /api/models/save` - Save trained model
- `GET /api/models` - List saved models
- `GET /api/models/:id` - Load specific model
- `DELETE /api/models/:id` - Delete model

### Health
- `GET /api/health` - Application health check

## WebSocket Events

### Client to Server
- `start-training` - Begin training process
- `stop-training` - Stop training
- `predict` - Make prediction
- `save-model` - Save trained model
- `load-model` - Load saved model

### Server to Client
- `training-progress` - Training metrics update
- `training-complete` - Training finished
- `prediction-result` - Prediction response
- `model-saved` - Model save confirmation
- `model-loaded` - Model load confirmation
- `error` - Error messages

## Development

### Project Structure
```
├── server.js                 # Express server with ML endpoints
├── public/
│   ├── index.html            # Main application interface
│   ├── js/
│   │   └── neural-network.js # Frontend ML visualization
│   └── css/
│       └── styles.css        # Responsive styling
├── package.json              # Dependencies and scripts
├── Dockerfile               # Container configuration
├── docker-compose.yml       # Development environment
├── docker-compose.prod.yml  # Production environment
└── .github/workflows/       # CI/CD pipeline
    └── deploy.yml
```

### Environment Variables
```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/neural_network_playground

# TensorFlow.js
TENSORFLOW_JS_BACKEND=cpu
TENSORFLOW_JS_THREAD_POOL_SIZE=4

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100
```

### Docker Configuration

The application includes optimized Docker configurations:

- **Development**: Hot reload, debugging, Adminer
- **Production**: Nginx proxy, SSL/TLS, resource limits
- **Security**: Non-root user, minimal attack surface
- **Performance**: Multi-stage builds, caching

### CI/CD Pipeline

GitHub Actions workflow includes:

- **Code Quality**: ESLint, Prettier, security audit
- **Testing**: Multi-version Node.js testing
- **Security**: Vulnerability scanning, CodeQL analysis
- **Deployment**: Staging and production environments
- **Monitoring**: Health checks, notifications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/your-username/neural-network-playground/issues)
- Documentation: Check this README and inline comments

## Educational Use

This playground is designed for educational purposes to help understand:
- Neural network architectures
- Training dynamics and optimization
- Overfitting and regularization
- Data preprocessing and visualization
- Model evaluation and testing

Perfect for students, educators, and anyone interested in machine learning concepts!