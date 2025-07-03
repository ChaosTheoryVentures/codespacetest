// Neural Network Visualization and Interaction Module
class NeuralNetworkVisualizer {
    constructor() {
        this.network = null;
        this.socket = null;
        this.charts = {};
        this.training = {
            isActive: false,
            isPaused: false,
            history: []
        };
        this.currentDataset = null;
        this.networkConfig = {
            layers: [
                { neurons: 2, activation: 'relu' },
                { neurons: 4, activation: 'relu' },
                { neurons: 3, activation: 'relu' },
                { neurons: 1, activation: 'sigmoid' }
            ]
        };
        
        this.init();
    }

    init() {
        this.initializeSocket();
        this.setupEventListeners();
        this.initializeCharts();
        this.drawNetwork();
    }

    // Socket.io initialization for real-time updates
    initializeSocket() {
        this.socket = io();
        
        this.socket.on('training-update', (data) => {
            this.updateTrainingMetrics(data);
        });
        
        this.socket.on('epoch-complete', (data) => {
            this.updateEpochProgress(data);
        });
        
        this.socket.on('training-complete', (data) => {
            this.onTrainingComplete(data);
        });
        
        this.socket.on('error', (error) => {
            this.showError(error.message);
        });
    }

    // D3.js Neural Network Visualization
    drawNetwork() {
        const container = d3.select('#network-diagram');
        container.selectAll('*').remove();
        
        const width = container.node().getBoundingClientRect().width;
        const height = 500;
        const margin = { top: 50, right: 50, bottom: 50, left: 50 };
        
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // Calculate positions for neurons
        const layers = this.networkConfig.layers;
        const layerWidth = (width - margin.left - margin.right) / (layers.length - 1);
        
        // Draw connections
        const connections = [];
        for (let i = 0; i < layers.length - 1; i++) {
            for (let j = 0; j < layers[i].neurons; j++) {
                for (let k = 0; k < layers[i + 1].neurons; k++) {
                    connections.push({
                        source: { layer: i, neuron: j },
                        target: { layer: i + 1, neuron: k },
                        weight: Math.random() * 2 - 1
                    });
                }
            }
        }
        
        // Draw connection lines
        const connectionGroup = svg.append('g').attr('class', 'connections');
        
        connectionGroup.selectAll('.connection')
            .data(connections)
            .enter()
            .append('line')
            .attr('class', 'connection')
            .attr('x1', d => margin.left + d.source.layer * layerWidth)
            .attr('y1', d => this.getNeuronY(d.source.layer, d.source.neuron, layers, height, margin))
            .attr('x2', d => margin.left + d.target.layer * layerWidth)
            .attr('y2', d => this.getNeuronY(d.target.layer, d.target.neuron, layers, height, margin))
            .attr('stroke', d => d.weight > 0 ? '#4CAF50' : '#F44336')
            .attr('stroke-width', d => Math.abs(d.weight) * 2)
            .attr('opacity', 0.6);
        
        // Draw neurons
        const neuronGroup = svg.append('g').attr('class', 'neurons');
        
        layers.forEach((layer, layerIndex) => {
            for (let neuronIndex = 0; neuronIndex < layer.neurons; neuronIndex++) {
                const x = margin.left + layerIndex * layerWidth;
                const y = this.getNeuronY(layerIndex, neuronIndex, layers, height, margin);
                
                const neuron = neuronGroup.append('g')
                    .attr('class', 'neuron')
                    .attr('transform', `translate(${x}, ${y})`);
                
                neuron.append('circle')
                    .attr('r', 20)
                    .attr('fill', '#2196F3')
                    .attr('stroke', '#1976D2')
                    .attr('stroke-width', 2)
                    .on('mouseover', function() {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr('r', 25);
                        
                        // Show activation value tooltip
                        const tooltip = d3.select('body').append('div')
                            .attr('class', 'neuron-tooltip')
                            .style('opacity', 0);
                        
                        tooltip.transition()
                            .duration(200)
                            .style('opacity', .9);
                        
                        tooltip.html(`Layer: ${layerIndex}<br/>Neuron: ${neuronIndex}<br/>Activation: ${(Math.random()).toFixed(3)}`)
                            .style('left', (d3.event.pageX + 10) + 'px')
                            .style('top', (d3.event.pageY - 28) + 'px');
                    })
                    .on('mouseout', function() {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr('r', 20);
                        
                        d3.selectAll('.neuron-tooltip').remove();
                    });
                
                neuron.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', '.35em')
                    .attr('fill', 'white')
                    .attr('font-size', '12px')
                    .text(neuronIndex + 1);
            }
        });
        
        // Add layer labels
        layers.forEach((layer, i) => {
            svg.append('text')
                .attr('x', margin.left + i * layerWidth)
                .attr('y', margin.top / 2)
                .attr('text-anchor', 'middle')
                .attr('font-size', '14px')
                .attr('font-weight', 'bold')
                .text(i === 0 ? 'Input' : i === layers.length - 1 ? 'Output' : `Hidden ${i}`);
        });
    }

    getNeuronY(layerIndex, neuronIndex, layers, height, margin) {
        const layer = layers[layerIndex];
        const neuronSpacing = (height - margin.top - margin.bottom) / (layer.neurons + 1);
        return margin.top + (neuronIndex + 1) * neuronSpacing;
    }

    // Animate connections during training
    animateConnections() {
        if (!this.training.isActive || this.training.isPaused) return;
        
        d3.selectAll('.connection')
            .transition()
            .duration(1000)
            .attr('opacity', function() {
                return Math.random() * 0.8 + 0.2;
            })
            .attr('stroke-width', function() {
                return Math.random() * 3 + 0.5;
            })
            .on('end', () => {
                if (this.training.isActive && !this.training.isPaused) {
                    this.animateConnections();
                }
            });
    }

    // Chart.js initialization for metrics
    initializeCharts() {
        // Loss chart
        const lossCtx = document.getElementById('loss-chart');
        if (lossCtx) {
            this.charts.loss = new Chart(lossCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Training Loss',
                        data: [],
                        borderColor: '#F44336',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        tension: 0.1
                    }, {
                        label: 'Validation Loss',
                        data: [],
                        borderColor: '#FF9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Loss'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Epoch'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });
        }
        
        // Accuracy chart
        const accuracyCtx = document.getElementById('accuracy-chart');
        if (accuracyCtx) {
            this.charts.accuracy = new Chart(accuracyCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Training Accuracy',
                        data: [],
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.1
                    }, {
                        label: 'Validation Accuracy',
                        data: [],
                        borderColor: '#00BCD4',
                        backgroundColor: 'rgba(0, 188, 212, 0.1)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 1,
                            title: {
                                display: true,
                                text: 'Accuracy'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Epoch'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });
        }
    }

    // Update training metrics in real-time
    updateTrainingMetrics(data) {
        const { epoch, loss, accuracy, valLoss, valAccuracy } = data;
        
        // Update charts
        if (this.charts.loss) {
            this.charts.loss.data.labels.push(epoch);
            this.charts.loss.data.datasets[0].data.push(loss);
            if (valLoss !== undefined) {
                this.charts.loss.data.datasets[1].data.push(valLoss);
            }
            this.charts.loss.update('none');
        }
        
        if (this.charts.accuracy) {
            this.charts.accuracy.data.labels.push(epoch);
            this.charts.accuracy.data.datasets[0].data.push(accuracy);
            if (valAccuracy !== undefined) {
                this.charts.accuracy.data.datasets[1].data.push(valAccuracy);
            }
            this.charts.accuracy.update('none');
        }
        
        // Update metric displays
        document.getElementById('current-loss').textContent = loss.toFixed(4);
        document.getElementById('current-accuracy').textContent = (accuracy * 100).toFixed(2) + '%';
        
        // Store in history
        this.training.history.push(data);
    }

    // Update epoch progress
    updateEpochProgress(data) {
        const { currentEpoch, totalEpochs, progress } = data;
        
        const progressBar = document.getElementById('epoch-progress');
        const progressText = document.getElementById('epoch-text');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute('aria-valuenow', progress);
        }
        
        if (progressText) {
            progressText.textContent = `Epoch ${currentEpoch} / ${totalEpochs}`;
        }
    }

    // Dataset handling
    handleDatasetUpload(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = this.parseDataset(e.target.result, file.name);
                this.currentDataset = data;
                this.visualizeDataset(data);
                this.showSuccess('Dataset loaded successfully');
            } catch (error) {
                this.showError('Failed to parse dataset: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    }

    parseDataset(content, filename) {
        const extension = filename.split('.').pop().toLowerCase();
        let data = [];
        
        if (extension === 'csv') {
            const lines = content.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => parseFloat(v.trim()));
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
        } else if (extension === 'json') {
            data = JSON.parse(content);
        } else {
            throw new Error('Unsupported file format');
        }
        
        return {
            data: data,
            features: Object.keys(data[0]).filter(k => k !== 'label' && k !== 'target'),
            labels: data.map(d => d.label || d.target),
            size: data.length
        };
    }

    visualizeDataset(dataset) {
        const previewContainer = document.getElementById('dataset-preview');
        if (!previewContainer) return;
        
        previewContainer.innerHTML = '';
        
        // Dataset info
        const info = document.createElement('div');
        info.className = 'dataset-info mb-3';
        info.innerHTML = `
            <h5>Dataset Information</h5>
            <p>Size: ${dataset.size} samples</p>
            <p>Features: ${dataset.features.join(', ')}</p>
            <p>Classes: ${[...new Set(dataset.labels)].join(', ')}</p>
        `;
        previewContainer.appendChild(info);
        
        // Data preview table
        const table = document.createElement('table');
        table.className = 'table table-sm table-hover';
        
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                ${dataset.features.map(f => `<th>${f}</th>`).join('')}
                <th>Label</th>
            </tr>
        `;
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        const previewSize = Math.min(10, dataset.size);
        for (let i = 0; i < previewSize; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `
                ${dataset.features.map(f => `<td>${dataset.data[i][f].toFixed(3)}</td>`).join('')}
                <td>${dataset.labels[i]}</td>
            `;
            tbody.appendChild(row);
        }
        table.appendChild(tbody);
        
        previewContainer.appendChild(table);
        
        // If 2D data, create scatter plot
        if (dataset.features.length === 2) {
            this.create2DVisualization(dataset);
        }
    }

    create2DVisualization(dataset) {
        const container = d3.select('#dataset-visualization');
        if (!container.node()) return;
        
        container.selectAll('*').remove();
        
        const width = container.node().getBoundingClientRect().width;
        const height = 400;
        const margin = { top: 20, right: 20, bottom: 40, left: 40 };
        
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const xScale = d3.scaleLinear()
            .domain(d3.extent(dataset.data, d => d[dataset.features[0]]))
            .range([margin.left, width - margin.right]);
        
        const yScale = d3.scaleLinear()
            .domain(d3.extent(dataset.data, d => d[dataset.features[1]]))
            .range([height - margin.bottom, margin.top]);
        
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        
        // Add axes
        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale));
        
        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale));
        
        // Add data points
        svg.selectAll('.data-point')
            .data(dataset.data)
            .enter()
            .append('circle')
            .attr('class', 'data-point')
            .attr('cx', d => xScale(d[dataset.features[0]]))
            .attr('cy', d => yScale(d[dataset.features[1]]))
            .attr('r', 5)
            .attr('fill', (d, i) => colorScale(dataset.labels[i]))
            .attr('opacity', 0.7)
            .on('mouseover', function(d, i) {
                const tooltip = d3.select('body').append('div')
                    .attr('class', 'data-tooltip')
                    .style('opacity', 0);
                
                tooltip.transition()
                    .duration(200)
                    .style('opacity', .9);
                
                tooltip.html(`${dataset.features[0]}: ${d[dataset.features[0]].toFixed(3)}<br/>
                            ${dataset.features[1]}: ${d[dataset.features[1]].toFixed(3)}<br/>
                            Label: ${dataset.labels[i]}`)
                    .style('left', (d3.event.pageX + 10) + 'px')
                    .style('top', (d3.event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.selectAll('.data-tooltip').remove();
            });
    }

    // Load pre-built datasets
    loadPrebuiltDataset(datasetName) {
        this.showLoading('Loading dataset...');
        
        fetch(`/api/datasets/${datasetName}`)
            .then(response => response.json())
            .then(data => {
                this.currentDataset = data;
                this.visualizeDataset(data);
                this.hideLoading();
                this.showSuccess(`${datasetName} dataset loaded successfully`);
            })
            .catch(error => {
                this.hideLoading();
                this.showError('Failed to load dataset: ' + error.message);
            });
    }

    // Model configuration
    updateNetworkArchitecture(layers) {
        this.networkConfig.layers = layers;
        this.drawNetwork();
    }

    addLayer(neurons = 4, activation = 'relu') {
        const outputLayer = this.networkConfig.layers.pop();
        this.networkConfig.layers.push({ neurons, activation });
        this.networkConfig.layers.push(outputLayer);
        this.drawNetwork();
        this.updateArchitectureUI();
    }

    removeLayer(index) {
        if (this.networkConfig.layers.length > 2) {
            this.networkConfig.layers.splice(index, 1);
            this.drawNetwork();
            this.updateArchitectureUI();
        }
    }

    updateArchitectureUI() {
        const container = document.getElementById('layer-config');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.networkConfig.layers.forEach((layer, index) => {
            if (index === 0 || index === this.networkConfig.layers.length - 1) return;
            
            const layerDiv = document.createElement('div');
            layerDiv.className = 'layer-config-item mb-2';
            layerDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <span class="me-2">Hidden Layer ${index}:</span>
                    <input type="number" class="form-control form-control-sm me-2" 
                           style="width: 80px" value="${layer.neurons}" 
                           min="1" max="100" 
                           onchange="nnViz.updateLayerNeurons(${index}, this.value)">
                    <select class="form-select form-select-sm me-2" style="width: 100px"
                            onchange="nnViz.updateLayerActivation(${index}, this.value)">
                        <option value="relu" ${layer.activation === 'relu' ? 'selected' : ''}>ReLU</option>
                        <option value="sigmoid" ${layer.activation === 'sigmoid' ? 'selected' : ''}>Sigmoid</option>
                        <option value="tanh" ${layer.activation === 'tanh' ? 'selected' : ''}>Tanh</option>
                    </select>
                    <button class="btn btn-sm btn-danger" onclick="nnViz.removeLayer(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(layerDiv);
        });
    }

    updateLayerNeurons(index, neurons) {
        this.networkConfig.layers[index].neurons = parseInt(neurons);
        this.drawNetwork();
    }

    updateLayerActivation(index, activation) {
        this.networkConfig.layers[index].activation = activation;
    }

    // Training controls
    startTraining() {
        if (!this.currentDataset) {
            this.showError('Please load a dataset first');
            return;
        }
        
        this.training.isActive = true;
        this.training.isPaused = false;
        this.training.history = [];
        
        // Reset charts
        if (this.charts.loss) {
            this.charts.loss.data.labels = [];
            this.charts.loss.data.datasets.forEach(dataset => dataset.data = []);
            this.charts.loss.update();
        }
        
        if (this.charts.accuracy) {
            this.charts.accuracy.data.labels = [];
            this.charts.accuracy.data.datasets.forEach(dataset => dataset.data = []);
            this.charts.accuracy.update();
        }
        
        // Get hyperparameters
        const hyperparameters = {
            learningRate: parseFloat(document.getElementById('learning-rate').value),
            epochs: parseInt(document.getElementById('epochs').value),
            batchSize: parseInt(document.getElementById('batch-size').value),
            optimizer: document.getElementById('optimizer').value,
            validationSplit: parseFloat(document.getElementById('validation-split').value)
        };
        
        // Send training request
        this.socket.emit('start-training', {
            dataset: this.currentDataset,
            architecture: this.networkConfig,
            hyperparameters: hyperparameters
        });
        
        // Start connection animation
        this.animateConnections();
        
        // Update UI
        document.getElementById('train-btn').disabled = true;
        document.getElementById('pause-btn').disabled = false;
        document.getElementById('stop-btn').disabled = false;
        
        this.showInfo('Training started...');
    }

    pauseTraining() {
        this.training.isPaused = !this.training.isPaused;
        
        if (this.training.isPaused) {
            this.socket.emit('pause-training');
            document.getElementById('pause-btn').innerHTML = '<i class="fas fa-play"></i> Resume';
            this.showInfo('Training paused');
        } else {
            this.socket.emit('resume-training');
            document.getElementById('pause-btn').innerHTML = '<i class="fas fa-pause"></i> Pause';
            this.animateConnections();
            this.showInfo('Training resumed');
        }
    }

    stopTraining() {
        this.training.isActive = false;
        this.training.isPaused = false;
        
        this.socket.emit('stop-training');
        
        // Update UI
        document.getElementById('train-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        document.getElementById('stop-btn').disabled = true;
        document.getElementById('pause-btn').innerHTML = '<i class="fas fa-pause"></i> Pause';
        
        this.showWarning('Training stopped');
    }

    onTrainingComplete(data) {
        this.training.isActive = false;
        this.training.isPaused = false;
        
        // Update UI
        document.getElementById('train-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        document.getElementById('stop-btn').disabled = true;
        
        // Show final metrics
        const finalMetrics = data.finalMetrics;
        this.showSuccess(`Training complete! Final accuracy: ${(finalMetrics.accuracy * 100).toFixed(2)}%`);
        
        // Enable prediction and save buttons
        document.getElementById('predict-btn').disabled = false;
        document.getElementById('save-model-btn').disabled = false;
    }

    // Prediction interface
    makePrediction() {
        const inputContainer = document.getElementById('prediction-inputs');
        const inputs = {};
        
        // Collect input values
        this.currentDataset.features.forEach(feature => {
            const input = document.getElementById(`pred-${feature}`);
            if (input) {
                inputs[feature] = parseFloat(input.value);
            }
        });
        
        // Send prediction request
        this.socket.emit('predict', { inputs });
        
        this.socket.once('prediction-result', (result) => {
            this.displayPredictionResult(result);
        });
    }

    displayPredictionResult(result) {
        const resultContainer = document.getElementById('prediction-result');
        if (!resultContainer) return;
        
        resultContainer.innerHTML = `
            <div class="alert alert-info">
                <h5>Prediction Result</h5>
                <p>Class: <strong>${result.class}</strong></p>
                <p>Confidence: <strong>${(result.confidence * 100).toFixed(2)}%</strong></p>
                <div class="mt-2">
                    <small>Probabilities:</small>
                    <div class="progress mt-1">
                        ${result.probabilities.map((prob, i) => `
                            <div class="progress-bar" role="progressbar" 
                                 style="width: ${prob * 100}%" 
                                 aria-valuenow="${prob * 100}" 
                                 aria-valuemin="0" aria-valuemax="100">
                                Class ${i}: ${(prob * 100).toFixed(1)}%
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Model persistence
    saveModel() {
        const modelName = prompt('Enter a name for the model:');
        if (!modelName) return;
        
        this.socket.emit('save-model', { name: modelName });
        
        this.socket.once('model-saved', (data) => {
            this.showSuccess(`Model saved as ${data.filename}`);
            this.updateSavedModelsList();
        });
    }

    loadModel() {
        const modelSelect = document.getElementById('saved-models');
        const modelName = modelSelect.value;
        
        if (!modelName) {
            this.showError('Please select a model to load');
            return;
        }
        
        this.socket.emit('load-model', { name: modelName });
        
        this.socket.once('model-loaded', (data) => {
            this.networkConfig = data.architecture;
            this.drawNetwork();
            this.showSuccess(`Model ${modelName} loaded successfully`);
            
            // Enable prediction
            document.getElementById('predict-btn').disabled = false;
        });
    }

    exportModel() {
        this.socket.emit('export-model');
        
        this.socket.once('model-exported', (data) => {
            // Create download link
            const blob = new Blob([JSON.stringify(data.model, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `model_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showSuccess('Model exported successfully');
        });
    }

    downloadTrainingHistory() {
        if (this.training.history.length === 0) {
            this.showError('No training history available');
            return;
        }
        
        const csv = this.convertHistoryToCSV(this.training.history);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `training_history_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('Training history downloaded');
    }

    convertHistoryToCSV(history) {
        if (history.length === 0) return '';
        
        const headers = Object.keys(history[0]).join(',');
        const rows = history.map(row => Object.values(row).join(','));
        
        return [headers, ...rows].join('\n');
    }

    updateSavedModelsList() {
        fetch('/api/models')
            .then(response => response.json())
            .then(models => {
                const select = document.getElementById('saved-models');
                if (!select) return;
                
                select.innerHTML = '<option value="">Select a model...</option>';
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = `${model.name} (${new Date(model.timestamp).toLocaleDateString()})`;
                    select.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Failed to fetch models:', error);
            });
    }

    // Event listeners setup
    setupEventListeners() {
        // Dataset upload
        const datasetUpload = document.getElementById('dataset-upload');
        if (datasetUpload) {
            datasetUpload.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleDatasetUpload(e.target.files[0]);
                }
            });
        }
        
        // Prebuilt datasets
        const prebuiltButtons = document.querySelectorAll('.prebuilt-dataset-btn');
        prebuiltButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dataset = e.target.dataset.dataset;
                this.loadPrebuiltDataset(dataset);
            });
        });
        
        // Architecture controls
        const addLayerBtn = document.getElementById('add-layer-btn');
        if (addLayerBtn) {
            addLayerBtn.addEventListener('click', () => this.addLayer());
        }
        
        // Training controls
        const trainBtn = document.getElementById('train-btn');
        if (trainBtn) {
            trainBtn.addEventListener('click', () => this.startTraining());
        }
        
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pauseTraining());
        }
        
        const stopBtn = document.getElementById('stop-btn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopTraining());
        }
        
        // Prediction
        const predictBtn = document.getElementById('predict-btn');
        if (predictBtn) {
            predictBtn.addEventListener('click', () => this.makePrediction());
        }
        
        // Model persistence
        const saveModelBtn = document.getElementById('save-model-btn');
        if (saveModelBtn) {
            saveModelBtn.addEventListener('click', () => this.saveModel());
        }
        
        const loadModelBtn = document.getElementById('load-model-btn');
        if (loadModelBtn) {
            loadModelBtn.addEventListener('click', () => this.loadModel());
        }
        
        const exportModelBtn = document.getElementById('export-model-btn');
        if (exportModelBtn) {
            exportModelBtn.addEventListener('click', () => this.exportModel());
        }
        
        const downloadHistoryBtn = document.getElementById('download-history-btn');
        if (downloadHistoryBtn) {
            downloadHistoryBtn.addEventListener('click', () => this.downloadTrainingHistory());
        }
        
        // Window resize handler
        window.addEventListener('resize', () => {
            this.drawNetwork();
            if (this.currentDataset && this.currentDataset.features.length === 2) {
                this.create2DVisualization(this.currentDataset);
            }
        });
    }

    // UI Helper methods
    showLoading(message) {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            loader.querySelector('.loading-message').textContent = message;
            loader.style.display = 'flex';
        }
    }

    hideLoading() {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'danger');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type) {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show`;
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        container.appendChild(notification);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 150);
        }, 5000);
    }
}

// Initialize the visualizer when DOM is ready
let nnViz;
document.addEventListener('DOMContentLoaded', () => {
    nnViz = new NeuralNetworkVisualizer();
    
    // Initialize UI
    nnViz.updateArchitectureUI();
    nnViz.updateSavedModelsList();
});

// Export for global access
window.NeuralNetworkVisualizer = NeuralNetworkVisualizer;