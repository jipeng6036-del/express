'use strict';
const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const http = require('node:http');
const path = require('node:path');
const vm = require('node:vm');
const express = require(path.join(process.argv[2], 'node_modules/express'));

const factories = {
  uint16: () => new Uint16Array([0xaaaa, 0x0102, 0x0304, 0xbbbb]).subarray(1, 3),
  dataview: () => new DataView(new Uint8Array([170, 0, 255, 128, 187]).buffer, 1, 3),
  bigint: () => new BigInt64Array([-1n, 0x0102030405060708n]),
  realm: () => vm.runInNewContext('new Uint16Array([0x0102, 0x0304])'),
  large: () => new Uint16Array(1001).fill(0x0102),
  empty: () => new DataView(new ArrayBuffer(4), 2, 0),
  bytes: () => new Uint8Array([0, 255, 128]),
  buffer: () => Buffer.from([170, 0, 255, 187]).subarray(1, 3)
};

async function main () {
  const app = express();
  const inputs = {};
  const expected = {};
  for (const [name, create] of Object.entries(factories)) {
    inputs[name] = create();
    expected[name] = Buffer.from(Buffer.from(inputs[name].buffer, inputs[name].byteOffset, inputs[name].byteLength));
  }
  app.use((req, res) => {
    const [, mode, name] = req.url.split('/');
    app.set('etag', mode === 'noetag' ? false : 'weak');
    if (mode === 'chunked') res.set('Transfer-Encoding', 'chunked');
    res.send(inputs[name]);
  });
  app.use((err, req, res, next) => res.status(500).end(err.code || err.message));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const agent = new http.Agent({ keepAlive: false });
  const results = [];
  try {
    for (const name of Object.keys(factories)) {
      for (const mode of ['weak', 'noetag', 'chunked', 'head', 'fresh']) {
        app.set('etag', 'weak');
        const expectedTag = app.get('etag fn')(expected[name]);
        const response = await new Promise((resolve, reject) => {
          const req = http.request({ host: '127.0.0.1', port: server.address().port,
            path: '/' + mode + '/' + name, method: mode === 'head' ? 'HEAD' : 'GET', agent,
            headers: mode === 'fresh' ? { 'If-None-Match': expectedTag } : {} }, res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('error', reject);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
          });
          req.setTimeout(5000, () => req.destroy(new Error('request timeout')));
          req.on('error', reject);
          req.end();
        }).catch(error => ({ status: null, headers: {}, body: Buffer.alloc(0), transportError: error.code || error.message }));
        const noBody = mode === 'head' || mode === 'fresh';
        const expectedLength = mode === 'chunked' || mode === 'fresh' ? undefined : String(expected[name].length);
        const ok = response.status === (mode === 'fresh' ? 304 : 200) &&
          response.body.equals(noBody ? Buffer.alloc(0) : expected[name]) &&
          response.headers['content-length'] === expectedLength &&
          response.headers.etag === (mode === 'noetag' ? undefined : expectedTag);
        results.push({ name, mode, ok, status: response.status, bytes: response.body.length,
          expectedBytes: noBody ? 0 : expected[name].length,
          contentLength: response.headers['content-length'] || null,
          etagMatches: response.headers.etag === (mode === 'noetag' ? undefined : expectedTag),
          transportError: response.transportError || null });
      }
    }
  } finally {
    agent.destroy();
    await new Promise(resolve => server.close(resolve));
  }
  assert.equal(results.length, 40);
  console.log(JSON.stringify({ node: process.version, installedModule: require.resolve(path.join(process.argv[2], 'node_modules/express')),
    total: results.length, passed: results.filter(x => x.ok).length, failed: results.filter(x => !x.ok).length, results }, null, 2));
}
main().catch(err => { console.error(err); process.exitCode = 1; });
