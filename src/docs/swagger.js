// Swagger UI at /api-docs, reading the OpenAPI document from /api-docs.json.
// The document itself is written by hand in docs/swagger.yaml.
//
// Vercel runs the app as a function and does not serve files from node_modules
// (express.static is ignored there), so the Swagger UI scripts and styles come from
// the jsDelivr CDN at a fixed version. The page works the same locally and online.
const fs = require('node:fs');
const path = require('node:path');
const { Router } = require('express');
const helmet = require('helmet');
const YAML = require('yaml');

const file = path.join(__dirname, '..', '..', 'docs', 'swagger.yaml');
const document = YAML.parse(fs.readFileSync(file, 'utf8'));

const SWAGGER_UI = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.8';

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Clean Kigali API docs</title>
  <link rel="stylesheet" href="${SWAGGER_UI}/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_UI}/swagger-ui-bundle.js"></script>
  <script src="/api-docs/init.js"></script>
</body>
</html>`;

// Kept in its own file so the page needs no inline script.
const init = `window.ui = SwaggerUIBundle({
  url: '/api-docs.json',
  dom_id: '#swagger-ui',
  persistAuthorization: true,
});`;

const router = Router();

// Allow the CDN on this page only; the rest of the API keeps helmet's strict defaults.
router.use(helmet.contentSecurityPolicy({
  directives: {
    scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
    styleSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
  },
}));
router.get('/init.js', (req, res) => res.type('application/javascript').send(init));
router.get('/', (req, res) => res.type('html').send(page));

module.exports = { document, router };
