// Fields of a category, checked by the shared validate() middleware.
const { validate, rules } = require('../middleware/validate');

const id = rules.id({ required: true });

const fields = {
  name: rules.text({ required: true, min: 3, max: 60 }),
  description: rules.text({ max: 500 }),
};

module.exports = {
  validateCategoryCreate: validate({ body: fields }),
  // PUT sends the whole category; a description left out is cleared.
  validateCategoryReplace: validate({ params: { id }, body: fields }, { mode: 'replace' }),
};
