// Loads the OpenAPI document that Swagger UI shows at /api-docs.
// The document itself is written by hand in docs/swagger.yaml.
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const file = path.join(__dirname, '..', '..', 'docs', 'swagger.yaml');

module.exports = YAML.parse(fs.readFileSync(file, 'utf8'));
