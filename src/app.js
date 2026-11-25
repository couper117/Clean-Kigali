// Builds the Express app: middleware, routes, docs and error handling.
// It does not start listening, so tests can use it without opening a port.
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const config = require('./config/env');
const routes = require('./routes');

const app = express();

// Render puts a proxy in front of the app; trust it so req.ip is the real client.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
if (!config.isTest) app.use(morgan(config.logFormat));
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => {
  res.json({ name: 'Clean Kigali API', health: '/api/health' });
});

app.use('/api', routes);

module.exports = app;
