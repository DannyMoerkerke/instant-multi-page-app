const staticFiles = [
  'index.html',
  '/src/js/index.js',
  'src/css/styles.css',
  'src/img/IMG_0791.png',
  'src/img/IMG_0829.png',
  'src/img/IMG_0848.png',
  'src/img/IMG_0860.png',
  'src/img/IMG_0924.png',
  'src/img/IMG_0927.png',
  'src/img/IMG_0955.png',
  'src/img/IMG_0966.png',
  'src/img/service-worker.png',
  'src/img/readablestream.png',
  'src/templates/header.html',
  'src/templates/footer.html',
  'src/templates/home.html',
  'src/templates/home.js.html',
  'src/templates/readablestream.html',
  'src/templates/readablestream.js.html',
  'src/templates/serviceworker.html',
  'src/templates/serviceworker.js.html',
  'src/templates/contact.html',
  'src/templates/contact.js.html',
  'src/templates/images.html',
  'src/templates/images.js.html',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  // 'node_modules/@dannymoerkerke/material-webcomponents/src/material-dropdown.js',
  'https://fonts.gstatic.com/s/materialicons/v55/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2'
];

const filesToCache = [
  ...staticFiles,
];

const version = 53;
const cacheName = `html_cache`;
const debug = true;

const log = debug ? console.log.bind(console) : () => {};

const routes = [
  {
    url: '/',
    template: '/src/templates/home.html',
    script: '/src/templates/home.js.html'
  },
  {
    url: '/readablestream',
    template: '/src/templates/readablestream.html',
    script: '/src/templates/readablestream.js.html'
  },
  {
    url: '/serviceworker',
    template: '/src/templates/serviceworker.html',
    script: '/src/templates/serviceworker.js.html'
  },
  {
    url: '/images',
    template: '/src/templates/images.html',
    script: '/src/templates/images.js.html'
  },
  {
    url: '/blog',
    apiUrl: 'https://3jrnxopv87.execute-api.us-east-1.amazonaws.com/production/blogpostings/writer/danny',
    compile: data => {
      return `<main>
                <section id="content">
                  <h2>Blog</h2>
                  ${data.map(({title, intro, body}) => `<article>${title} ${intro} ${body}</article>`).join('')}
                </section>
              </main>`;
    }
  }
];

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

const getCachedHtmlResponse = ({url, compile, apiUrl}) => {
  log('finding cached HTML response', url);

  return new Promise((resolve, reject) => {
    openStore(IDBConfig.store)
    .then(store => {
      const cachedRequest = store.get(url);

      let html;

      cachedRequest.onsuccess = async () => {
        if(cachedRequest.result !== undefined) {
          log('found cached HTML response', cachedRequest);
          html = new Blob([cachedRequest.result.html], {type: 'text/html'});
        }
        else {
          log('compiling html response');

          const data = await (await fetch(apiUrl)).json();
          html = compile(data);

          cacheHtmlResponse({url, html});
        }

        return resolve(new Response(html, {headers: {'Content-Type': 'text/html'}}));
      };

      cachedRequest.onerror = e => {
        log('cached HTML response not found', e, cachedRequest.error);

        return reject(cachedRequest.error);
      };
    });
  });
};

const getStreamedHtmlResponse = (url, routeMatch) => {
  log('finding cached HTML response', url);

  const stream = new ReadableStream({
    async start(controller) {
      const pushToStream = stream => {
        const reader = stream.getReader();

        return reader.read().then(function process({value, done}) {
          if(done) {
            return;
          }
          controller.enqueue(value);
          return reader.read().then(process);
        });
      };

      const templates = [
        caches.match(headerTemplate),
        routeMatch.template ? caches.match(routeMatch.template) : getCachedHtmlResponse(routeMatch),
        caches.match(footerTemplate),
      ];

      if(routeMatch.script) {
        templates.push(caches.match(routeMatch.script));
      }

      const responses = await Promise.all(templates);

      for (const template of responses) {
        await pushToStream(template.body);
      }

      controller.close();
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

const isModuleRequest = ({credentials, mode}) => credentials !== 'include' && mode !== 'no-cors';

const fetchHandler = async e => {
  const {url, method} = e.request;
  const request = isModuleRequest(e.request) ? new Request(url, {credentials: 'include', mode: 'no-cors'}) : e.request;
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
