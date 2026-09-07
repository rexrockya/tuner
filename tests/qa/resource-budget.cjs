const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..'), docs = path.join(root, 'docs');
const html = fs.readFileSync(path.join(docs, 'index.html'), 'utf8');
const dom = new JSDOM(html), d = dom.window.document;
const files = ['index.html', ...Array.from(d.querySelectorAll('script[src],link[rel="stylesheet"]'), node => node.getAttribute('src') || node.getAttribute('href'))];
const rows = files.map(file => {
  assert.ok(!/^(?:https?:)?\/\//.test(file), 'Unexpected remote initial dependency: ' + file);
  const source = fs.readFileSync(path.join(docs, file.split('?')[0]), 'utf8').replaceAll('\r\n', '\n');
  return { file, rawBytes: Buffer.byteLength(source), gzip6Bytes: zlib.gzipSync(source, { level: 6 }).length };
});
const result = {
  method: 'Default tuner HTML + initial JS/CSS, normalized to committed LF and independently compressed with gzip level 6. Excludes favicon symmetrically with prior inventory; deferred feature resources and media are checked by boot.cjs. This is a resource budget, not network time.',
  resourceCount: rows.length,
  gzip6Bytes: rows.reduce((total, row) => total + row.gzip6Bytes, 0),
  budgetBytes: 120000,
  rows
};
dom.window.close();
assert.ok(result.gzip6Bytes <= result.budgetBytes, `Initial resource budget exceeded: ${result.gzip6Bytes} > ${result.budgetBytes}`);
console.log(process.argv.includes('--json') ? JSON.stringify(result, null, 2) : `PASS initial resource budget: ${result.gzip6Bytes} / ${result.budgetBytes} gzip bytes, ${result.resourceCount} resources`);
