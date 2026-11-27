// Fields of a staff account, checked by the shared validate() middleware.
const { validate, rules } = require('../middleware/validate');

const ROLES = ['admin', 'officer'];
const id = rules.id({ required: true });

const common = {
  fullName: rules.text({ required: true, min: 3, max: 100 }),
  email: rules.email({ required: true }),
  role: rules.oneOf(ROLES, { required: true }),
  // The sector an officer covers; null for city-wide.
  sectorId: rules.id(),
};

module.exports = {
  validateUserList: validate({ query: { role: rules.oneOf(ROLES), isActive: rules.boolean() } }),
  validateUserCreate: validate({ body: { ...common, password: rules.password({ required: true }) } }),
  // PUT sends the whole account. Left out: sectorId is cleared, while password and
  // isActive stay as they are (they are never cleared).
  validateUserReplace: validate({
    params: { id },
    body: { ...common, password: rules.password(), isActive: rules.boolean() },
  }, { mode: 'replace' }),
  ROLES,
};
