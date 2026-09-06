import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('production worker renders the tuner and room controls, not a starter skeleton', async () => {
  const { default: worker } = await import('../dist/server/index.js');
  const response = await worker.fetch(new Request('http://localhost/', {headers:{accept:'text/html'}}),
    {ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},
    {waitUntil(){},passThroughOnException(){}});
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/text\/html/);
  const html = await response.text();
  for (const text of ['zh-CN','开启麦克风','音频仅在本机处理','房间控制端','room-code','开始节拍']) assert.ok(html.includes(text),text);
  assert.doesNotMatch(html,/Your site is taking shape|Building your site|react-loading-skeleton|codex-preview/);
});

test('the public Pages frontend remains separate from the optional worker', async () => {
  const html = await readFile(new URL('../../docs/index.html',import.meta.url),'utf8');
  for (const page of ['tuner','lesson','sheet','metro','jam']) assert.ok(html.includes(`data-page="${page}"`));
  assert.ok(html.includes('score-catalog'));
  assert.doesNotMatch(html,/score-entry.js|录入乐谱/);
});
