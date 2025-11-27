#!/usr/bin/env node

import qrcode from 'qrcode-terminal';

const text = process.argv[2];

if (!text) {
  console.error('Usage: qr_generator.js <text>');
  process.exit(1);
}

qrcode.generate(text, { small: true }, (qr) => {
  console.log(qr);
});

