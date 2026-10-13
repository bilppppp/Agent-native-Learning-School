export function resolveTeachOrigin(options, settings, parsePort) {
  if (options.origin !== undefined && options.port !== undefined) {
    throw new Error('--origin and --port cannot be used together.');
  }
  if (options.origin !== undefined) {
    return parseTeachOrigin(options.origin);
  }
  return `http://localhost:${parsePort(options.port || settings.port)}`;
}

export function teachProgressUrl(origin, student) {
  return `${origin}/api/progress/${student}`;
}

export function teachProfileUrl(origin, student) {
  return `${origin}/api/profile/${student}`;
}

export function teachModeWriteError({ origin, student, status, cause }) {
  const url = teachProfileUrl(origin, student);
  if (status !== undefined) {
    return new Error(`Could not save teaching mode at ${url}: HTTP ${status}`);
  }
  const detail = (cause && cause.message) || 'request failed';
  return new Error(`Could not save teaching mode at ${url}: ${detail}.`);
}

export function teachAccessError({ origin, student, status, cause }) {
  const url = teachProgressUrl(origin, student);
  const detail = status !== undefined
    ? `HTTP ${status}`
    : (cause && cause.message) || 'request failed';
  const message = `Cannot access this student at ${url}: ${detail}.`;
  if (status === 503 || !isLocalOrigin(origin)) return new Error(message);
  return new Error(`${message} Start the School and enroll on its website first.`);
}

function isLocalOrigin(origin) {
  return origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
}

function parseTeachOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw invalidTeachOrigin(value);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw invalidTeachOrigin(value);
  }
  if (parsed.username !== '' || parsed.password !== '') {
    throw invalidTeachOrigin(value);
  }
  if (value !== parsed.origin && value !== `${parsed.origin}/`) {
    throw invalidTeachOrigin(value);
  }
  return parsed.origin;
}

function invalidTeachOrigin(value) {
  return new Error(`Invalid --origin: ${JSON.stringify(value)}`);
}
