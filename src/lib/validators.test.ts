import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidPostalCode,
  MAX_IMAGE_SIZE_BYTES,
  normalizeIndianPhone,
  sanitizeExternalUrl,
  slugify,
  validateProductImageFile,
} from './validators';

test('validateProductImageFile allows JPEG/PNG/WebP under 5MB and rejects others', () => {
  assert.equal(validateProductImageFile({ type: 'image/png', size: 1024, name: 'esp32.png' }).valid, true);
  assert.equal(validateProductImageFile({ type: 'image/webp', size: 2048, name: 'ic.webp' }).valid, true);
  assert.equal(validateProductImageFile({ type: 'image/svg+xml', size: 1024, name: 'bad.svg' }).valid, false);
  assert.equal(
    validateProductImageFile({ type: 'image/jpeg', size: MAX_IMAGE_SIZE_BYTES + 1, name: 'huge.jpg' }).valid,
    false
  );
});

test('sanitizeExternalUrl blocks javascript: and data: URLs', () => {
  assert.equal(sanitizeExternalUrl('https://www.ti.com/lit/ds/symlink/sn7400.pdf'), 'https://www.ti.com/lit/ds/symlink/sn7400.pdf');
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(sanitizeExternalUrl(''), null);
});

test('slugify and phone/PIN validators behave deterministically', () => {
  assert.equal(slugify('ESP32 DevKit V1 Wi-Fi + BLE!'), 'esp32-devkit-v1-wi-fi-ble');
  assert.equal(normalizeIndianPhone('9876543210'), '+919876543210');
  assert.equal(isValidPostalCode('560001'), true);
  assert.equal(isValidPostalCode('012345'), false);
});
