-- Initialize database for ML workloads
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables for ML model management
CREATE TABLE IF NOT EXISTS models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    architecture JSONB,
    parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    file_path VARCHAR(500),
    metrics JSONB
);

-- Create tables for training sessions
CREATE TABLE IF NOT EXISTS training_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    dataset_name VARCHAR(255),
    hyperparameters JSONB,
    training_config JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending',
    loss_history JSONB,
    accuracy_history JSONB,
    final_metrics JSONB,
    error_message TEXT
);

-- Create tables for datasets
CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    file_path VARCHAR(500),
    size_bytes BIGINT,
    rows_count INTEGER,
    features_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    preprocessing_config JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_models_created_at ON models(created_at);
CREATE INDEX IF NOT EXISTS idx_models_status ON models(status);
CREATE INDEX IF NOT EXISTS idx_training_sessions_model_id ON training_sessions(model_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_status ON training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_datasets_name ON datasets(name);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_models_updated_at 
    BEFORE UPDATE ON models 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development
INSERT INTO datasets (name, description, rows_count, features_count, metadata) VALUES
    ('iris', 'Iris flower dataset for classification', 150, 4, '{"type": "classification", "classes": ["setosa", "versicolor", "virginica"]}'),
    ('boston_housing', 'Boston housing prices for regression', 506, 13, '{"type": "regression", "target": "price"}')
ON CONFLICT (name) DO NOTHING;