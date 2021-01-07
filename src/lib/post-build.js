const fs = require('fs');
const path = require('path');

// import fs from 'fs';
// import path from 'path';

const SERVICE_WORKER = 'service-worker.js';
const INDEX = 'index.html';
const BUILD_DIR = path.resolve('dist');

const getFiles = filePath => new Promise((resolve, reject) => {
  const isDir = (file) => new Promise((resolve, reject) => {
    const fullPath = path.join(filePath, file);

    fs.stat(fullPath, (err, stat) => {
      const f = fullPath.replace(`${BUILD_DIR}/`, ``);
      return resolve(stat && stat.isFile() ? `${f}` : null);
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
  '/${file}',`;
  }, `const buildFiles = [`);

  const swFile = fs.readFileSync(path.resolve(SERVICE_WORKER), {encoding: 'utf8'});
  const search = `const buildFiles = [];`;

  fs.writeFileSync(path.resolve(BUILD_DIR, SERVICE_WORKER), swFile.replace(search, `${replacement}];`));
};

// process(BUILD_DIR)

Promise.all([
  getFiles(BUILD_DIR),
  getFiles(`${BUILD_DIR}/src/css`)
])
.then(([a, b]) => {
  process(a.concat(b));

  const [cssPath] = b;

  const indexFile = fs.readFileSync(path.resolve(BUILD_DIR, INDEX), {encoding: 'utf8'});
  const search = `<!-- STYLES -->`;
  const replacement = `<link rel="stylesheet" href="${cssPath}">`;

  fs.writeFileSync(path.resolve(BUILD_DIR, INDEX), indexFile.replace(search, replacement));
});
// console.log(`${BUILD_DIR}/src/css`);
