const version = 99;
const buildFiles = [];

const staticFiles = [
  'https://fonts.googleapis.com/icon?family=Material+Icons'
];

const filesToCache = [
  ...buildFiles,
  ...staticFiles,
];

const cacheName = `html_cache-${version}`;
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
    prerender: true,
    apiUrl: 'https://ry5z3rkdza.execute-api.us-east-1.amazonaws.com/production/blogpostings/writer/danny',
    compile: async () => {
      const data = await (await fetch('https://ry5z3rkdza.execute-api.us-east-1.amazonaws.com/production/blogpostings/writer/danny')).json();

      return `
        <main>
          <section id="content">
            <h2>Blog</h2>
            <p>
              <em>
                This page contains twelve of my blog posting which are fetched dynamically and then combined into
                one large HTML page while the Service Worker is installing. It is then served from IndexedDB for 
                subsequent renders.
              </em>
            </p>
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
    name: `pages-${version}`,
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

      [...db.objectStoreNames].filter((name) => name !== store.name).forEach((name) => db.deleteObjectStore(name));
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

const getCachedHtmlResponse = ({url, compile}) => {
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

          html = compile();

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

  e.waitUntil(
    caches.open(cacheName)
    .then(cache => cache.addAll(filesToCache))
  );

  // e.waitUntil(async function() {
  //   await createIndexedDB(IDBConfig);
  //
  //   const cache = await caches.open(cacheName);
  //   await cache.addAll(filesToCache);
  //
  //   for (const {url, compile} of routes.filter(({prerender}) => prerender)) {
  //     const html = await compile();
  //
  //     cacheHtmlResponse({url, html});
  //   }
  // }());
};

const activateHandler = e => {
  log('[ServiceWorker] Activate');

  e.waitUntil(async function() {
    const keyList = await caches.keys();
    await Promise.all(keyList.map(key => key !== cacheName ? caches.delete(key) : Promise.resolve()));
  }());
};

const isModuleRequest = ({credentials, mode}) => credentials !== 'include' && mode !== 'no-cors';

const fetchHandler = async e => {
  const {url, method} = e.request;
  const request = isModuleRequest(e.request) ? new Request(url, {credentials: 'include', mode: 'no-cors'}) : e.request;
  const {pathname} = new URL(url);
  const routeMatch = routes.find(({url}) => url === pathname);
  // log('[Service Worker] Fetch', url, method);

  if(routeMatch) {
    e.respondWith(getStreamedHtmlResponse(url, routeMatch));
  }
  else {
    // e.respondWith(
    //   caches.match(e.request, {ignoreSearch: true})
    //   .then(response => response ? response : fetch(e.request)
    //     .catch(err => console.error('fetch error:', err))
    //   )
    // );

    e.respondWith(
      // request.mode === 'navigate' ? caches.match(request) :
      caches.match(e.request)
      .then(response => {
        // response ? log('from cache', url) : log('not cached, fetching', url);
        return response ? response : fetch(e.request);
      })
      .catch(err => console.log('fetch error:', err, url))
    );
  }
};

self.addEventListener('install', installHandler);
self.addEventListener('activate', activateHandler);
self.addEventListener('fetch', fetchHandler);
