if('serviceWorker' in navigator) {
  navigator.serviceWorker
  .register('./service-worker.js');

  navigator.serviceWorker.ready
  .then(registration => {
    if(registration.sync) {
      registration.sync.register('apiSync');
    }
  });
}
