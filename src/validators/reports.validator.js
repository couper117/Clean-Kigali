// Checks report input before it reaches the database. Each check answers 400 with one
// entry per invalid field, in the standard error format, and passes on cleaned values.
const AppError = require('../utils/AppError');
const { validate, rules } = require('../middleware/validate');

const STATUSES = ['new', 'in_progress', 'resolved', 'rejected'];
const PRIORITIES = ['low', 'medium', 'high'];
// MTN (078, 079) and Airtel (072, 073) numbers, with or without +250.
const RWANDA_PHONE = /^(\+?250|0)7[2389]\d{7}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Small helpers. Each returns the cleaned value or records an error in `details`.

function text(details, field, value, { required = false, min = 1, max }) {
  if (value === undefined || value === null || value === '') {
    if (required) details.push({ field, message: `${field} is required` });
    return null;
  }
  if (typeof value !== 'string') {
    details.push({ field, message: `${field} must be text` });
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    details.push({ field, message: `${field} must be ${min} to ${max} characters` });
    return null;
  }
  return trimmed;
}

// Whole number >= 1. Accepts numbers and, for query strings, digit strings.
function id(details, field, value, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) details.push({ field, message: `${field} is required` });
    return null;
  }
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isInteger(number) || number < 1 || number > 2147483647) {
    details.push({ field, message: `${field} must be a whole number of 1 or more` });
    return null;
  }
  return number;
}

function coordinate(details, field, value, limit) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > limit) {
    details.push({ field, message: `${field} must be a number from -${limit} to ${limit}` });
    return null;
  }
  return value;
}

function oneOf(details, field, value, allowed) {
  if (value === undefined || value === null || value === '') return null;
  if (!allowed.includes(value)) {
    details.push({ field, message: `${field} must be one of ${allowed.join(', ')}` });
    return null;
  }
  return value;
}

function phone(details, field, value) {
  const cleaned = text(details, field, value, { max: 20 });
  if (cleaned === null) return null;
  const digits = cleaned.replace(/[\s-]/g, '');
  if (!RWANDA_PHONE.test(digits)) {
    details.push({ field, message: `${field} must be a Rwandan mobile number like 0788123456` });
    return null;
  }
  return digits;
}

function date(details, field, value) {
  if (value === undefined || value === '') return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (typeof value !== 'string' || !DATE.test(value) || Number.isNaN(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== value) {
    details.push({ field, message: `${field} must be a date like 2026-11-30` });
    return null;
  }
  return value;
}

function bodyOf(req) {
  return req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
}

function fail(details) {
  return new AppError(400, 'Some fields are not valid', details);
}

// POST /api/reports (public). Status, priority and assignment are set by staff later.
function validateCreateReport(req, res, next) {
  const body = bodyOf(req);
  const details = [];

  const report = {
    title: text(details, 'title', body.title, { required: true, min: 3, max: 120 }),
    description: text(details, 'description', body.description, { required: true, min: 10, max: 2000 }),
    categoryId: id(details, 'categoryId', body.categoryId, { required: true }),
    sectorId: id(details, 'sectorId', body.sectorId, { required: true }),
    locationDetails: text(details, 'locationDetails', body.locationDetails, { max: 255 }),
    latitude: coordinate(details, 'latitude', body.latitude, 90),
    longitude: coordinate(details, 'longitude', body.longitude, 180),
    reporterName: text(details, 'reporterName', body.reporterName, { max: 100 }),
    reporterPhone: phone(details, 'reporterPhone', body.reporterPhone),
  };
  if ((report.latitude === null) !== (report.longitude === null) && !details.some((d) => /itude/.test(d.field))) {
    details.push({ field: 'latitude', message: 'Send latitude and longitude together, or neither' });
  }

  if (details.length) return next(fail(details));
  req.body = report;
  next();
}

// GET /api/reports query string: filters and pages. Puts the result in req.filters
// (Express 5 does not allow replacing req.query).
const LIST_PARAMS = ['status', 'priority', 'categoryId', 'sectorId', 'assignedTo', 'from', 'to', 'page', 'limit'];

function validateListQuery(req, res, next) {
  const details = [];
  const q = {};
  for (const key of LIST_PARAMS) {
    if (Array.isArray(req.query[key])) details.push({ field: key, message: `Send ${key} only once` });
    else q[key] = req.query[key];
  }

  const filters = {
    status: oneOf(details, 'status', q.status, STATUSES),
    priority: oneOf(details, 'priority', q.priority, PRIORITIES),
    categoryId: id(details, 'categoryId', q.categoryId),
    sectorId: id(details, 'sectorId', q.sectorId),
    assignedTo: id(details, 'assignedTo', q.assignedTo),
    from: date(details, 'from', q.from),
    to: date(details, 'to', q.to),
    page: id(details, 'page', q.page) ?? 1,
    limit: id(details, 'limit', q.limit) ?? 20,
  };
  if (filters.limit > 100) details.push({ field: 'limit', message: 'limit must be from 1 to 100' });
  if (filters.from && filters.to && filters.from > filters.to) {
    details.push({ field: 'to', message: 'to must be the same day as from or later' });
  }

  if (details.length) return next(fail(details));
  req.filters = filters;
  next();
}

// /api/reports/:id -> req.reportId as a number.
function validateReportId(req, res, next) {
  const details = [];
  const reportId = id(details, 'id', req.params.id, { required: true });
  if (details.length) return next(fail(details));
  req.reportId = reportId;
  next();
}

// /api/reports/track/:reference -> req.reference in capitals (residents may type ck-7f3k2a).
function validateReference(req, res, next) {
  const reference = String(req.params.reference).trim().toUpperCase();
  if (!/^CK-[A-Z0-9]{6}$/.test(reference)) {
    return next(fail([{ field: 'reference', message: 'reference must look like CK-7F3K2A' }]));
  }
  req.reference = reference;
  next();
}

// Fields staff can edit, and how each is checked. Status is not here: it changes only
// through PATCH /api/reports/{id}/status, which records who changed it and why.
const EDITABLE = {
  title: (d, v) => text(d, 'title', v, { required: true, min: 3, max: 120 }),
  description: (d, v) => text(d, 'description', v, { required: true, min: 10, max: 2000 }),
  categoryId: (d, v) => id(d, 'categoryId', v, { required: true }),
  sectorId: (d, v) => id(d, 'sectorId', v, { required: true }),
  priority: (d, v) => {
    if (v === undefined || v === null || v === '') d.push({ field: 'priority', message: 'priority is required' });
    return oneOf(d, 'priority', v, PRIORITIES);
  },
  locationDetails: (d, v) => text(d, 'locationDetails', v, { max: 255 }),
  latitude: (d, v) => coordinate(d, 'latitude', v, 90),
  longitude: (d, v) => coordinate(d, 'longitude', v, 180),
  reporterName: (d, v) => text(d, 'reporterName', v, { max: 100 }),
  reporterPhone: (d, v) => phone(d, 'reporterPhone', v),
  // null unassigns the report.
  assignedTo: (d, v) => id(d, 'assignedTo', v),
};

// PUT sends the whole report: fields left out are cleared (or refused if required).
// PATCH sends only the fields to change.
function reportUpdate({ partial }) {
  return function validateReportUpdate(req, res, next) {
    const body = bodyOf(req);
    const sent = (field) => Object.hasOwn(body, field);
    const details = [];
    const changes = {};

    if (sent('status')) {
      details.push({ field: 'status', message: 'Change the status with PATCH /api/reports/{id}/status, so the change is recorded' });
    }
    for (const [field, check] of Object.entries(EDITABLE)) {
      if (partial && !sent(field)) continue;
      changes[field] = check(details, body[field]);
    }
    if (sent('latitude') !== sent('longitude') || (changes.latitude === null) !== (changes.longitude === null)) {
      if (!details.some((d) => /itude/.test(d.field))) {
        details.push({ field: 'latitude', message: 'Send latitude and longitude together, or neither' });
      }
    }
    if (partial && Object.keys(changes).length === 0 && details.length === 0) {
      details.push({ field: 'body', message: `Send at least one of: ${Object.keys(EDITABLE).join(', ')}` });
    }

    if (details.length) return next(fail(details));
    req.body = changes;
    next();
  };
}

// PATCH /api/reports/:id/status. A note is required when rejecting, so the
// resident can see why.
const checkStatus = validate({
  body: {
    status: rules.oneOf(STATUSES, { required: true }),
    note: rules.text({ max: 500 }),
  },
});

function validateStatusChange(req, res, next) {
  checkStatus(req, res, (err) => {
    if (err) return next(err);
    if (req.body.status === 'rejected' && !req.body.note) {
      return next(fail([{ field: 'note', message: 'Say why the report is rejected' }]));
    }
    next();
  });
}

module.exports = {
  validateCreateReport,
  validateListQuery,
  validateReportId,
  validateReference,
  validateReportReplace: reportUpdate({ partial: false }),
  validateReportPatch: reportUpdate({ partial: true }),
  validateStatusChange,
  STATUSES,
  PRIORITIES,
};
