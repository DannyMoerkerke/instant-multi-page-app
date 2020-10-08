const process = require('child_process');

const cats = [
  'cat src/templates/header.html src/templates/home.html src/templates/footer.html src/templates/home.js.html > index.html',
  'cat src/templates/header.html src/templates/home.html src/templates/footer-build.html src/templates/home.js.html > src/index.html',

  'cat src/templates/header.html src/templates/blog.html src/templates/footer.html src/templates/blog.js.html > blog/index.html',
  'cat src/templates/header.html src/templates/blog.html src/templates/footer-build.html src/templates/blog.js.html > blog/index-build.html',

  'cat src/templates/header.html src/templates/images.html src/templates/footer.html src/templates/images.js.html > images/index.html',
  'cat src/templates/header.html src/templates/images.html src/templates/footer-build.html src/templates/images.js.html > images/index-build.html',

  'cat src/templates/header.html src/templates/readablestream.html src/templates/footer.html src/templates/readablestream.js.html > readablestream/index.html',
  'cat src/templates/header.html src/templates/readablestream.html src/templates/footer-build.html src/templates/readablestream.js.html > readablestream/index-build.html',

  'cat src/templates/header.html src/templates/serviceworker.html src/templates/footer.html src/templates/serviceworker.js.html > serviceworker/index.html',
  'cat src/templates/header.html src/templates/serviceworker.html src/templates/footer-build.html src/templates/serviceworker.js.html > serviceworker/index-build.html',
];


cats.forEach(command => process.execSync(command));
