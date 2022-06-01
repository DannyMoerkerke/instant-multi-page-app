// const fs = require('fs');
// const path = require('path');

import fs from 'fs';
import path from 'path';

const SERVICE_WORKER = 'service-worker.js';
const INDEX = 'index.html';
const BUILD_DIR = path.resolve('dist');

const { resolve } = path;
const { readdir } = fs.promises;

async function* getEntries(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* getEntries(res);
    } else {
      yield res;
    }
  }
}

const getFiles = filePath => new Promise((resolve, reject) => {
  const isDir = (file) => new Promise((resolve, reject) => {
    const fullPath = path.join(filePath, file);

    fs.stat(fullPath, (err, stat) => {
      const f = fullPath.replace(`${BUILD_DIR}/`, ``);
      return resolve(stat && stat.isFile() ? `${f}` : getFiles(fullPath));
    });
  });

  fs.readdir(filePath, (err, entries) => {
    const f = entries.filter(file => !file.includes(SERVICE_WORKER)).map(file => isDir(file));

    Promise.all(f)
    .then((results) => results.filter(res => res))
    .then(files => resolve(files.sort()));
  });
});

const process = files => {
  const replacement = files.reduce((str, file) => {
    return `${str}
  '${file}',`;
  }, `const buildFiles = [`);

  const swFile = fs.readFileSync(path.resolve(SERVICE_WORKER), {encoding: 'utf8'});
  const search = `const buildFiles = [];`;

  fs.writeFileSync(path.resolve(BUILD_DIR, SERVICE_WORKER), swFile.replace(search, `${replacement}];`));
};

(async () => {
  const files = [];
  for await (const f of getEntries(BUILD_DIR)) {
    files.push(f.replace(BUILD_DIR, ''));
  }

  process(files);
})();
