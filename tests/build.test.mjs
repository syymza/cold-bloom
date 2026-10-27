import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {build} from '../scripts/build.mjs';

test('publication artifact contains only reviewed static runtime files', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'cold-bloom-build-'));
  try {
    await build(directory);
    assert.deepEqual((await readdir(directory)).sort(), ['MODEL.md', 'app.js', 'index.html', 'model.js', 'style.css', 'worker.js']);
    for (const file of await readdir(directory)) {
      const content = await readFile(path.join(directory, file), 'utf8');
      assert.ok(content.length > 0);
      assert.ok(!content.includes('/Users/') && !content.includes('/tmp/'), `${file} contains a private local path`);
    }
    const html = await readFile(path.join(directory, 'index.html'), 'utf8');
    assert.match(html, /src="app\.js\?/);
    assert.match(html, /href="style\.css\?/);
    assert.match(html, /<summary>About Cold Bloom<\/summary>/);
    assert.match(html, /href="MODEL\.md"/);
    assert.ok(!html.includes('localhost') && !html.includes('127.0.0.1'));
    const version = html.match(/app\.js\?v=([a-f0-9]{16})/)[1];
    assert.ok((await readFile(path.join(directory, 'app.js'), 'utf8')).includes(`worker.js?v=${version}`));
    assert.ok((await readFile(path.join(directory, 'worker.js'), 'utf8')).includes(`model.js?v=${version}`));
    assert.ok(!html.includes('About this study'));
    assert.ok(!html.includes('rather than real-world temperatures'));
    assert.ok(!html.includes('id="save"') && !html.includes('id="pause"'));
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
