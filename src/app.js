// Builds the Express app: middleware, routes, docs and error handling.
// It does not start listening, so tests can use it without opening a port.
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const config = require('./config/env');
const swaggerDocument = require('./docs/swagger');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Render puts a proxy in front of the app; trust it so req.ip is the real client.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
if (!config.isTest) app.use(morgan(config.logFormat));
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => {
  res.json({ name: 'Clean Kigali API', docs: '/api-docs', health: '/api/health' });
});

app.get('/api-docs.json', (req, res) => res.json(swaggerDocument));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'Clean Kigali API docs',
}));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
