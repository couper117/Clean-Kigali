// Checks report input before it reaches the database. Each check answers 400 with one
// entry per invalid field, in the standard error format, and passes on cleaned values.
const AppError = require('../utils/AppError');

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

module.exports = {
  validateCreateReport,
  validateListQuery,
  STATUSES,
  PRIORITIES,
  // Shared with the update checks (CK001-24).
  helpers: { text, id, coordinate, oneOf, phone, bodyOf, fail },
};
