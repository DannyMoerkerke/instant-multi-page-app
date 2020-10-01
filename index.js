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

import '/node_modules/@dannymoerkerke/material-webcomponents/src/material-dropdown.js';
