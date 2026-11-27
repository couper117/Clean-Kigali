// Reusable request checks. A route lists the fields it expects and a rule for each:
//
//   router.post('/', validate({ body: {
//     name: rules.text({ required: true, max: 60 }),
//     description: rules.text({ max: 500 }),
//   } }), controller.create);
//
// Any invalid field answers 400 with one entry per field, in the standard error
// format. Cleaned values go to req.valid.params, req.valid.query and req.valid.body
// (and req.body). Fields not listed are dropped.
//
// Modes, for the body:
//   'create'  (default) required fields must be sent; optional ones may be left out
//   'replace' (PUT)     same, and optional fields left out are cleared (set to null)
//   'patch'   (PATCH)   any listed field may be sent, at least one must be
const AppError = require('../utils/AppError');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Each rule: { required, nullable, check(value, field) -> { value } or { error } }.
// nullable: null is allowed and clears the value (and PUT clears it when left out).
const rules = {
  text({ required = false, min = 1, max = 255 } = {}) {
    return {
      required,
      nullable: !required,
      check(value, field) {
        if (typeof value !== 'string') return { error: `${field} must be text` };
        const trimmed = value.trim();
        if (trimmed.length === 0 && !required) return { value: null };
        if (trimmed.length < min || trimmed.length > max) {
          return { error: `${field} must be ${min} to ${max} characters` };
        }
        return { value: trimmed };
      },
    };
  },

  email({ required = false } = {}) {
    return {
      required,
      nullable: false,
      check(value, field) {
        if (typeof value !== 'string' || value.trim().length > 254 || !EMAIL.test(value.trim())) {
          return { error: `${field} must be a valid email address` };
        }
        // Stored in lower case; login also compares in lower case.
        return { value: value.trim().toLowerCase() };
      },
    };
  },

  // Not trimmed: spaces may be part of a password. bcrypt reads only 72 bytes.
  password({ required = false, min = 8, max = 72 } = {}) {
    return {
      required,
      nullable: false,
      check(value, field) {
        if (typeof value !== 'string' || value.length < min || value.length > max) {
          return { error: `${field} must be ${min} to ${max} characters` };
        }
        return { value };
      },
    };
  },

  // Whole number 1 .. 2147483647 (PostgreSQL INT). Digit strings are accepted for
  // params and query strings.
  id({ required = false, nullable = !required } = {}) {
    return {
      required,
      nullable,
      check(value, field) {
        const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
        if (!Number.isInteger(number) || number < 1 || number > 2147483647) {
          return { error: `${field} must be a whole number of 1 or more` };
        }
        return { value: number };
      },
    };
  },

  oneOf(allowed, { required = false } = {}) {
    return {
      required,
      nullable: false,
      check(value, field) {
        if (!allowed.includes(value)) return { error: `${field} must be one of ${allowed.join(', ')}` };
        return { value };
      },
    };
  },

  // true/false, or 'true'/'false' in a query string.
  boolean({ required = false } = {}) {
    return {
      required,
      nullable: false,
      check(value, field) {
        if (value === true || value === 'true') return { value: true };
        if (value === false || value === 'false') return { value: false };
        return { error: `${field} must be true or false` };
      },
    };
  },
};

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

// Checks one part of the request (params, query or body) against its rules.
function checkPart(source, schema, mode, details) {
  const out = {};
  for (const [field, rule] of Object.entries(schema)) {
    const value = source[field];
    const sent = Object.hasOwn(source, field) && value !== undefined && value !== '';

    if (Array.isArray(value)) {
      details.push({ field, message: `Send ${field} only once` });
    } else if (!sent) {
      if (rule.required && mode !== 'patch') details.push({ field, message: `${field} is required` });
      else if (mode === 'replace' && rule.nullable) out[field] = null;
    } else if (value === null) {
      if (rule.nullable) out[field] = null;
      else details.push({ field, message: rule.required ? `${field} is required` : `${field} cannot be null` });
    } else {
      const result = rule.check(value, field);
      if (result.error) details.push({ field, message: result.error });
      else out[field] = result.value;
    }
  }
  return out;
}

function validate({ params = {}, query = {}, body = null } = {}, { mode = 'create' } = {}) {
  return function validateRequest(req, res, next) {
    const details = [];
    const valid = {
      params: checkPart(req.params || {}, params, 'create', details),
      query: checkPart(req.query || {}, query, 'create', details),
    };
    if (body) {
      valid.body = checkPart(plainObject(req.body), body, mode, details);
      if (mode === 'patch' && details.length === 0 && Object.keys(valid.body).length === 0) {
        details.push({ field: 'body', message: `Send at least one of: ${Object.keys(body).join(', ')}` });
      }
    }

    if (details.length) return next(new AppError(400, 'Some fields are not valid', details));
    // Add to what an earlier validate() on the same route found, never replace it.
    const before = req.valid || {};
    req.valid = {
      params: { ...before.params, ...valid.params },
      query: { ...before.query, ...valid.query },
    };
    if (body || before.body) req.valid.body = body ? valid.body : before.body;
    if (body) req.body = valid.body;
    next();
  };
}

// The usual /:id parameter.
const idParam = validate({ params: { id: rules.id({ required: true }) } });

module.exports = { validate, rules, idParam };
