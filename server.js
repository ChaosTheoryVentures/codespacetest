const express = require('express');
const { Client } = require('pg');

const app = express();
const port = 3000;

async function connectWithRetry() {
  const client = new Client({
    host: 'db',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'myapp'
  });

  for (let i = 0; i < 10; i++) {
    try {
      await client.connect();
      console.log('Connected to database');
      return client;
    } catch (err) {
      console.log(`Database connection attempt ${i + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error('Could not connect to database');
}

let client;

app.get('/', async (req, res) => {
  try {
    const result = await client.query('SELECT NOW()');
    res.json({ 
      message: 'Hello from Codespace Docker!', 
      time: result.rows[0].now,
      environment: 'codespace'
    });
  } catch (err) {
    res.json({ error: 'Database connection failed' });
  }
});

connectWithRetry().then(dbClient => {
  client = dbClient;
  app.listen(port, '0.0.0.0', () => {
    console.log(`App running on port ${port}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});