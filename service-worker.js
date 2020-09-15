self.importScripts('./routes.js');

const staticFiles = [
  'index.html',
  'routes.js',
  'src/js/index.js',
  'src/css/styles.css',
  'src/templates/header.html',
  'src/templates/footer.html',
  'src/templates/home.html',
  'src/templates/home.js.html',
  'src/templates/about.html',
  'src/templates/about.js.html',
  'src/templates/contact.html',
  'src/templates/contact.js.html'
];

const urls = [
  '/',
  '/about',
  '/contact',
];

const filesToCache = [
  ...staticFiles,
  ...urls
];

const version = 3;
const cacheName = `html_cache`;
const debug = true;

const log = debug ? console.log.bind(console) : () => {
};

// const routes = [
//   {
//     url: '/',
//     template: '/src/templates/home.html',
//     script: '/src/templates/home.js.html'
//   },
//   {
//     url: '/about',
//     template: '/src/templates/about.html',
//     script: '/src/templates/about.js.html'
//   },
//   {
//     url: '/contact',
//     template: '/src/templates/contact.html',
//     script: '/src/templates/contact.js.html'
//   }
// ];

const headerTemplate = '/src/templates/header.html';
const footerTemplate = '/src/templates/footer.html';

const IDBConfig = {
  name: 'templates_idb',
  version,
  store: {
    name: 'pages',
    keyPath: 'url'
  }
};

const createIndexedDB = ({name, version, store}) => {
  const request = self.indexedDB.open(name, version);

  return new Promise((resolve, reject) => {
    request.onupgradeneeded = e => {
      const db = e.target.result;

      if(!db.objectStoreNames.contains(store.name)) {
        db.createObjectStore(store.name, {keyPath: store.keyPath});
        log('create objectstore', store.name);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getStoreFactory = (dbName, version) => ({name}, mode = 'readonly') => {
  return new Promise((resolve, reject) => {

    const request = self.indexedDB.open(dbName, version);

    request.onsuccess = e => {
      const db = request.result;
      const transaction = db.transaction(name, mode);
      const store = transaction.objectStore(name);

      return resolve(store);
    };

    request.onerror = e => reject(request.error);
  });
};

const openStore = getStoreFactory(IDBConfig.name, version);

const cacheHtmlResponse = async response => {
  try {
    const store = await openStore(IDBConfig.store, 'readwrite');

    log('cache HTML response', response);
    store.add(response);
  }
  catch(error) {
    log('idb error', error);
  }
};

const getStreamedHtmlResponse = (url, routeMatch) => {
  log('finding cached HTML response', url);

  const stream = new ReadableStream({
    async start(controller) {
      const pushStream = stream => {
        const reader = stream.getReader();

        return reader.read().then(function process(result) {
          if(result.done) {
            return;
          }
          controller.enqueue(result.value);
          return reader.read().then(process);
        });
      };

      const [header, footer, content, script] = await Promise.all(
        [
          caches.match(headerTemplate),
          caches.match(footerTemplate),
          caches.match(routeMatch.template),
          caches.match(routeMatch.script)
        ]
      );

      await pushStream(header.clone().body);
      await pushStream(content.clone().body);
      await pushStream(footer.clone().body);
      await pushStream(script.clone().body);

      controller.close();

      // const html = `${await header.text()}${await content.text()}${await footer.text()}${await script.text()}`;
      // cacheHtmlResponse({url, html});
    }
  });


  return new Response(stream, {
    headers: {'Content-Type': 'text/html; charset=utf-8'}
  });
};

const installHandler = e => {
  log('[ServiceWorker] Install');

  self.skipWaiting();

  e.waitUntil(caches.open(cacheName)
  .then(cache => cache.addAll(filesToCache)));
};

const activateHandler = e => {
  log('[ServiceWorker] Activate');

  if(self.indexedDB) {
    createIndexedDB(IDBConfig);
  }

  e.waitUntil(async function() {
    const keyList = await caches.keys();
    await Promise.all(keyList.map(key => key !== cacheName ? caches.delete(key) : Promise.resolve()));
  }());

  return self.clients.claim();
};

const fetchHandler = async e => {
  const {request} = e;
  const {url, method} = request;
  const {pathname} = new URL(url);
  const routeMatch = routes.find(({url}) => url === pathname);

  log('[Service Worker] Fetch', url, method);

  if(routeMatch) {
    log('getting cached HTML response');
    e.respondWith(getStreamedHtmlResponse(url, routeMatch));
  }
  else {
    e.respondWith(
      // request.mode === 'navigate' ? caches.match(request) :
      caches.match(request)
      .then(response => {
        response ? log('from cache', url) : log('not cached, fetching', url, response);
        return response ? response : fetch(request);
      })
    );
  }
};

self.addEventListener('install', installHandler);
self.addEventListener('activate', activateHandler);
self.addEventListener('fetch', fetchHandler);
