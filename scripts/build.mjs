import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = ['index.html', 'style.css', 'app.js', 'worker.js', 'model.js', 'MODEL.md'];

export async function build(destination = path.join(root, 'dist')) {
  const sources = await Promise.all(files.map(file => readFile(path.join(root, file), 'utf8')));
  const hash = createHash('sha256');
  files.forEach((file, i) => hash.update(file).update(sources[i]));
  const version = hash.digest('hex').slice(0, 16);
  await rm(destination, {recursive: true, force: true});
  await mkdir(destination, {recursive: true});
  // One content version covers the page, worker and its numerical-model import.
  for (let i = 0; i < files.length; i++) {
    const content = sources[i].replace(/\?v=20261027-release-\d+/g, `?v=${version}`);
    await writeFile(path.join(destination, files[i]), content);
  }
  return destination;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await build();
  console.log(`Built ${files.length} static files.`);
}
