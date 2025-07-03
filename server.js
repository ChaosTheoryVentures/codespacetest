const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const http = require('http');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const tf = require('@tensorflow/tfjs-node');
const { v4: uuidv4 } = require('uuid');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nn_playground',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS models (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        architecture JSONB NOT NULL,
        weights JSONB NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS training_history (
        id SERIAL PRIMARY KEY,
        model_id UUID REFERENCES models(id) ON DELETE CASCADE,
        epoch INTEGER NOT NULL,
        loss FLOAT NOT NULL,
        accuracy FLOAT,
        val_loss FLOAT,
        val_accuracy FLOAT,
        metrics JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS datasets (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        data JSONB NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const trainLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit training requests
  message: 'Too many training requests, please try again later.'
});

app.use('/api', limiter);
app.use('/api/train', trainLimiter);

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Pre-built datasets
const preBuiltDatasets = {
  xor: {
    name: 'XOR Problem',
    type: 'classification',
    data: {
      inputs: [[0, 0], [0, 1], [1, 0], [1, 1]],
      outputs: [[0], [1], [1], [0]]
    },
    metadata: {
      inputShape: [2],
      outputShape: [1],
      samples: 4
    }
  },
  iris: {
    name: 'Iris Dataset',
    type: 'classification',
    data: {
      inputs: [
        [5.1, 3.5, 1.4, 0.2], [4.9, 3.0, 1.4, 0.2], [6.2, 3.4, 5.4, 2.3],
        [5.9, 3.0, 5.1, 1.8], [7.0, 3.2, 4.7, 1.4], [6.4, 3.2, 4.5, 1.5],
        [6.9, 3.1, 4.9, 1.5], [5.5, 2.3, 4.0, 1.3], [6.5, 2.8, 4.6, 1.5],
        [5.7, 2.8, 4.5, 1.3], [6.3, 3.3, 6.0, 2.5], [5.8, 2.7, 5.1, 1.9]
      ],
      outputs: [
        [1, 0, 0], [1, 0, 0], [0, 0, 1], [0, 0, 1], [0, 1, 0], [0, 1, 0],
        [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 0, 1], [0, 0, 1]
      ]
    },
    metadata: {
      inputShape: [4],
      outputShape: [3],
      samples: 12,
      classes: ['Setosa', 'Versicolor', 'Virginica']
    }
  },
  boston: {
    name: 'Boston Housing (Subset)',
    type: 'regression',
    data: {
      inputs: [
        [0.00632, 18.0, 2.31, 0, 0.538, 6.575, 65.2, 4.0900],
        [0.02731, 0.0, 7.07, 0, 0.469, 6.421, 78.9, 4.9671],
        [0.02729, 0.0, 7.07, 0, 0.469, 7.185, 61.1, 4.9671],
        [0.03237, 0.0, 2.18, 0, 0.458, 6.998, 45.8, 6.0622],
        [0.06905, 0.0, 2.18, 0, 0.458, 7.147, 54.2, 6.0622]
      ],
      outputs: [[24.0], [21.6], [34.7], [33.4], [36.2]]
    },
    metadata: {
      inputShape: [8],
      outputShape: [1],
      samples: 5
    }
  },
  mnist: {
    name: 'MNIST Digits (Subset)',
    type: 'classification',
    data: {
      inputs: [], // Will be populated with flattened 28x28 images
      outputs: [] // Will be populated with one-hot encoded labels
    },
    metadata: {
      inputShape: [784], // 28x28 flattened
      outputShape: [10],
      samples: 100
    }
  }
};

// Generate synthetic MNIST-like data for demo
function generateMNISTSubset() {
  const dataset = preBuiltDatasets.mnist;
  const samples = 100;
  
  for (let i = 0; i < samples; i++) {
    // Generate synthetic image data (random pixels for demo)
    const image = Array(784).fill(0).map(() => Math.random() * 0.1);
    const label = i % 10;
    const oneHot = Array(10).fill(0);
    oneHot[label] = 1;
    
    dataset.data.inputs.push(image);
    dataset.data.outputs.push(oneHot);
  }
  
  return dataset;
}

// Initialize MNIST subset
preBuiltDatasets.mnist = generateMNISTSubset();

// Active training sessions
const trainingSessions = new Map();

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get available datasets
app.get('/api/datasets', async (req, res) => {
  try {
    // Get custom uploaded datasets from database
    const customDatasets = await pool.query('SELECT id, name, type, metadata FROM datasets ORDER BY created_at DESC');
    
    // Combine pre-built and custom datasets
    const datasets = {
      prebuilt: Object.keys(preBuiltDatasets).map(key => ({
        id: key,
        name: preBuiltDatasets[key].name,
        type: preBuiltDatasets[key].type,
        metadata: preBuiltDatasets[key].metadata
      })),
      custom: customDatasets.rows
    };
    
    res.json(datasets);
  } catch (error) {
    console.error('Error fetching datasets:', error);
    res.status(500).json({ error: 'Failed to fetch datasets' });
  }
});

// Upload dataset
app.post('/api/upload-dataset', upload.single('dataset'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, type } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let data = { inputs: [], outputs: [] };

    if (fileExtension === '.csv') {
      // Parse CSV file
      const results = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (row) => results.push(row))
          .on('end', resolve)
          .on('error', reject);
      });

      // Assume last column is output, rest are inputs
      const keys = Object.keys(results[0]);
      const inputKeys = keys.slice(0, -1);
      const outputKey = keys[keys.length - 1];

      results.forEach(row => {
        const inputs = inputKeys.map(key => parseFloat(row[key]));
        const output = type === 'classification' 
          ? parseInt(row[outputKey]) 
          : parseFloat(row[outputKey]);
        
        data.inputs.push(inputs);
        data.outputs.push([output]);
      });
    } else if (fileExtension === '.json') {
      // Parse JSON file
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      const jsonData = JSON.parse(fileContent);
      
      if (jsonData.inputs && jsonData.outputs) {
        data = jsonData;
      } else {
        throw new Error('Invalid JSON format. Expected {inputs: [], outputs: []}');
      }
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Use CSV or JSON.' });
    }

    // Calculate metadata
    const metadata = {
      inputShape: [data.inputs[0].length],
      outputShape: [data.outputs[0].length],
      samples: data.inputs.length
    };

    // Save to database
    const id = uuidv4();
    await pool.query(
      'INSERT INTO datasets (id, name, type, data, metadata) VALUES ($1, $2, $3, $4, $5)',
      [id, name, type, JSON.stringify(data), JSON.stringify(metadata)]
    );

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ 
      success: true, 
      dataset: { id, name, type, metadata } 
    });
  } catch (error) {
    console.error('Error uploading dataset:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to upload dataset' });
  }
});

// Train neural network
app.post('/api/train', async (req, res) => {
  const sessionId = uuidv4();
  const { architecture, dataset, hyperparameters } = req.body;

  try {
    // Validate request
    if (!architecture || !dataset || !hyperparameters) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Set a timeout for training (5 minutes)
    const timeout = setTimeout(() => {
      if (trainingSessions.has(sessionId)) {
        trainingSessions.delete(sessionId);
        io.to(sessionId).emit('training-error', { error: 'Training timeout' });
      }
    }, 5 * 60 * 1000);

    // Start training session
    trainingSessions.set(sessionId, { 
      status: 'initializing', 
      timeout,
      startTime: Date.now()
    });

    res.json({ sessionId });

    // Load dataset
    let trainingData;
    if (preBuiltDatasets[dataset]) {
      trainingData = preBuiltDatasets[dataset].data;
    } else {
      const result = await pool.query('SELECT data FROM datasets WHERE id = $1', [dataset]);
      if (result.rows.length === 0) {
        throw new Error('Dataset not found');
      }
      trainingData = result.rows[0].data;
    }

    // Create model
    const model = tf.sequential();
    
    // Add layers based on architecture
    architecture.layers.forEach((layer, index) => {
      const config = {
        units: layer.units,
        activation: layer.activation
      };
      
      if (index === 0) {
        config.inputShape = architecture.inputShape;
      }
      
      if (layer.type === 'dense') {
        model.add(tf.layers.dense(config));
      } else if (layer.type === 'dropout') {
        model.add(tf.layers.dropout({ rate: layer.rate || 0.2 }));
      }
    });

    // Compile model
    model.compile({
      optimizer: hyperparameters.optimizer || 'adam',
      loss: hyperparameters.loss || 'meanSquaredError',
      metrics: hyperparameters.metrics || ['accuracy']
    });

    // Prepare data
    const xs = tf.tensor2d(trainingData.inputs);
    const ys = tf.tensor2d(trainingData.outputs);

    // Split data for validation (80/20 split)
    const splitIdx = Math.floor(trainingData.inputs.length * 0.8);
    const xTrain = xs.slice([0, 0], [splitIdx, -1]);
    const yTrain = ys.slice([0, 0], [splitIdx, -1]);
    const xVal = xs.slice([splitIdx, 0], [-1, -1]);
    const yVal = ys.slice([splitIdx, 0], [-1, -1]);

    // Update status
    trainingSessions.get(sessionId).status = 'training';
    io.to(sessionId).emit('training-started', { totalEpochs: hyperparameters.epochs });

    // Train model
    const history = await model.fit(xTrain, yTrain, {
      epochs: hyperparameters.epochs || 50,
      batchSize: hyperparameters.batchSize || 32,
      validationData: [xVal, yVal],
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          const progress = {
            epoch: epoch + 1,
            loss: logs.loss,
            accuracy: logs.acc,
            valLoss: logs.val_loss,
            valAccuracy: logs.val_acc,
            progress: ((epoch + 1) / hyperparameters.epochs) * 100
          };
          
          io.to(sessionId).emit('training-progress', progress);
        }
      }
    });

    // Save model
    const modelId = uuidv4();
    const modelData = await model.save(tf.io.withSaveHandler(async (artifacts) => {
      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: 'JSON',
          weightSpecsBytes: JSON.stringify(artifacts.weightSpecs).length,
          weightDataBytes: artifacts.weightData.byteLength
        }
      };
    }));

    // Get model architecture and weights
    const modelJson = {
      modelTopology: model.toJSON(),
      weightsManifest: [{
        paths: ['weights.bin'],
        weights: model.getWeights().map((w, i) => ({
          name: `weight_${i}`,
          shape: w.shape,
          dtype: w.dtype
        }))
      }]
    };

    // Save to database
    await pool.query(
      'INSERT INTO models (id, name, architecture, weights, metadata) VALUES ($1, $2, $3, $4, $5)',
      [
        modelId,
        `Model_${new Date().toISOString()}`,
        JSON.stringify(architecture),
        JSON.stringify(modelJson),
        JSON.stringify({
          dataset,
          hyperparameters,
          finalMetrics: history.history
        })
      ]
    );

    // Save training history
    for (let i = 0; i < history.history.loss.length; i++) {
      await pool.query(
        'INSERT INTO training_history (model_id, epoch, loss, accuracy, val_loss, val_accuracy) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          modelId,
          i + 1,
          history.history.loss[i],
          history.history.acc?.[i],
          history.history.val_loss?.[i],
          history.history.val_acc?.[i]
        ]
      );
    }

    // Clean up
    trainingSessions.delete(sessionId);
    clearTimeout(timeout);
    xs.dispose();
    ys.dispose();
    xTrain.dispose();
    yTrain.dispose();
    xVal.dispose();
    yVal.dispose();

    io.to(sessionId).emit('training-complete', { 
      modelId,
      finalMetrics: {
        loss: history.history.loss[history.history.loss.length - 1],
        accuracy: history.history.acc?.[history.history.acc.length - 1],
        valLoss: history.history.val_loss?.[history.history.val_loss.length - 1],
        valAccuracy: history.history.val_acc?.[history.history.val_acc.length - 1]
      }
    });

  } catch (error) {
    console.error('Training error:', error);
    if (trainingSessions.has(sessionId)) {
      clearTimeout(trainingSessions.get(sessionId).timeout);
      trainingSessions.delete(sessionId);
    }
    io.to(sessionId).emit('training-error', { error: error.message });
  }
});

// Make predictions
app.post('/api/predict', async (req, res) => {
  try {
    const { modelId, inputs } = req.body;
    
    if (!modelId || !inputs) {
      return res.status(400).json({ error: 'Model ID and inputs are required' });
    }

    // Load model from database
    const result = await pool.query('SELECT * FROM models WHERE id = $1', [modelId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const modelData = result.rows[0];
    
    // Recreate model from saved data
    const model = await tf.loadLayersModel({
      load: async () => {
        return {
          modelTopology: modelData.weights.modelTopology,
          weightSpecs: modelData.weights.weightsManifest[0].weights,
          weightData: new ArrayBuffer(0) // Simplified for demo
        };
      }
    });

    // Make prediction
    const inputTensor = tf.tensor2d([inputs]);
    const prediction = model.predict(inputTensor);
    const output = await prediction.array();
    
    inputTensor.dispose();
    prediction.dispose();

    res.json({ 
      prediction: output[0],
      modelName: modelData.name,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Failed to make prediction' });
  }
});

// Save model
app.post('/api/models/save', async (req, res) => {
  try {
    const { name, architecture, weights, metadata } = req.body;
    
    if (!name || !architecture || !weights) {
      return res.status(400).json({ error: 'Missing required model data' });
    }

    const id = uuidv4();
    await pool.query(
      'INSERT INTO models (id, name, architecture, weights, metadata) VALUES ($1, $2, $3, $4, $5)',
      [id, name, JSON.stringify(architecture), JSON.stringify(weights), JSON.stringify(metadata || {})]
    );

    res.json({ success: true, modelId: id });
  } catch (error) {
    console.error('Error saving model:', error);
    res.status(500).json({ error: 'Failed to save model' });
  }
});

// Get model
app.get('/api/models/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM models WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const model = result.rows[0];
    
    // Get training history
    const historyResult = await pool.query(
      'SELECT * FROM training_history WHERE model_id = $1 ORDER BY epoch',
      [id]
    );

    res.json({
      ...model,
      trainingHistory: historyResult.rows
    });
  } catch (error) {
    console.error('Error loading model:', error);
    res.status(500).json({ error: 'Failed to load model' });
  }
});

// Delete model
app.delete('/api/models/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM models WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ success: true, deleted: result.rows[0].name });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

// Get all models
app.get('/api/models', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, metadata, created_at FROM models ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-training-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Socket ${socket.id} joined training session ${sessionId}`);
  });

  socket.on('leave-training-session', (sessionId) => {
    socket.leave(sessionId);
    console.log(`Socket ${socket.id} left training session ${sessionId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await initDatabase();
    
    server.listen(PORT, () => {
      console.log(`Neural Network Playground Server running on port ${PORT}`);
      console.log(`WebSocket server ready for connections`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Clear all training sessions
  trainingSessions.forEach(session => {
    clearTimeout(session.timeout);
  });
  trainingSessions.clear();
  
  // Close database connection
  await pool.end();
  
  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };