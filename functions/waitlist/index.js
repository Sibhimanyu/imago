'use strict';
/* Advanced I/O entry for the waitlist. CORS is left to Catalyst's
   Authorized Domains (the gallery's origin), so no CORS headers here. */
const catalyst = require('zcatalyst-sdk-node');
const { handle, MAX_BODY } = require('./waitlist');

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { if (body.length <= MAX_BODY) body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', () => resolve(''));
  });
}

module.exports = async (req, res) => {
  const body = req.method === 'POST' ? await readBody(req) : '';
  const out = await handle({ method: req.method, body: body }, (row) =>
    catalyst.initialize(req, { scope: 'admin' }).datastore().table('Waitlist').insertRow(row));
  res.writeHead(out.status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(out.body));
};
