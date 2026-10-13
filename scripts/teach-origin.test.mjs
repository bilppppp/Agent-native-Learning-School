import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTeachOrigin, teachAccessError, teachModeWriteError, teachProfileUrl, teachProgressUrl } from './teach-origin.mjs';

function parsePort(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1024 || n > 65535) {
    throw new Error('Port must be an integer from 1024 to 65535.');
  }
  return n;
}

describe('resolveTeachOrigin', () => {
  it('uses --origin when provided', () => {
    assert.equal(
      resolveTeachOrigin({ origin: 'https://school.example.com' }, { port: 4323 }, parsePort),
      'https://school.example.com',
    );
    assert.equal(
      resolveTeachOrigin({ origin: 'https://school.example.com/' }, { port: 4323 }, parsePort),
      'https://school.example.com',
    );
  });

  it('rejects --origin together with --port', () => {
    assert.throws(
      () => resolveTeachOrigin(
        { origin: 'https://school.example.com', port: '4323' },
        { port: 4321 },
        parsePort,
      ),
      /--origin and --port cannot be used together/,
    );
  });

  it('keeps localhost when --origin is omitted', () => {
    assert.equal(
      resolveTeachOrigin({}, { port: 4323 }, parsePort),
      'http://localhost:4323',
    );
    assert.equal(
      resolveTeachOrigin({ port: '4325' }, { port: 4323 }, parsePort),
      'http://localhost:4325',
    );
  });
});

describe('teachAccessError', () => {
  it('includes the address and status for 503 and does not ask to start a local School', () => {
    const origin = 'https://school.example.com';
    const student = 'curious-explorer-2019';
    const error = teachAccessError({ origin, student, status: 503 });
    const url = teachProgressUrl(origin, student);
    assert.match(error.message, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(error.message, /HTTP 503/);
    assert.doesNotMatch(error.message, /Start the School/i);
    assert.doesNotMatch(error.message, /本机/);
    assert.doesNotMatch(error.message, /enroll on its website first/i);
  });
});

describe('teachModeWriteError', () => {
  it('includes the profile address when there is no HTTP response and does not ask to start a local School', () => {
    const origin = 'https://school.example.com';
    const student = 'curious-explorer-2019';
    const error = teachModeWriteError({
      origin,
      student,
      cause: new TypeError('fetch failed'),
    });
    assert.equal(
      error.message,
      `Could not save teaching mode at ${teachProfileUrl(origin, student)}: fetch failed.`,
    );
    assert.doesNotMatch(error.message, /Start the School/i);
    assert.doesNotMatch(error.message, /本机/);
  });
});
