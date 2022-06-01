# Instant multi-page app

This is a demo of a instantly loading multi-page app, using modern web technology like Service Worker,
`ReadableStream` and CSS Containment.

The purpose is to demonstrate that a multi-page app can load just as fast as a single-page app, without all the
added complexity that a single-page app brings.

Each request is intercepted by the Service Worker which then constructs each page from a header, footer and the
page content. These parts are all separate HTML templates that are fetched separately and then put together to
form
a page.

To make sure that content is shown to the user as soon as possible, a ReadableStream is used to stream content to
the browser. This means that the browser doesn't need to wait for the whole response to arrive, but can start
rendering content as soon as it becomes available.

The Service Worker also caches all assets locally so these no longer need to be fetched from the network.

The result is that each page loads instantly, just like a single-page app, even though the browser performs a full
page reload for each page.

This effectively reduces single-page apps to a polyfill.

## How it works

The trick to making multi-page apps blazing fast is actually quite simple: *we utilize the browser's streaming HTML 
parser.*

The thing is that the browser renders HTML while it downloads. It doesn't need to wait for the whole response to arrive, 
but it can start rendering content as soon as it becomes available.


The `Response` object that is returned by `fetch` exposes a `ReadableStream` of the response contents in its `body` 
property, so we can access that and start streaming the response:

```
fetch('/some/url')
.then(response => response.body)
.then(body => {
  const reader = body.getReader(); // we can now read the stream!
}
```

A typical single-page app uses an app shell, which is actually the single page that the content is injected into. It 
usually consists of a header, footer and a content area in between where the content for each page is placed.

The problem is that any content that is added to the HTML page *after* it has loaded is bypassing the streaming HTML 
parser and is therefore slower to render. 

We can however benefit from browser streaming by having a Service Worker 
fetch all the content we need and have it stream everything to the browser.

To accomplish this, all pages are split into a header and a footer which are cached by the Service Worker. 

The Service Worker will then intercept any outgoing request, fetch the header and footer and then determine which body 
content it needs to fetch. This can be just a simple HTML template or a combination of a template and some data fetched 
from the network.

The Service Worker will then combine these parts to a full HTML page and return it to the browser. It's like server-side 
rendering, but it's all done on the client-side in a streaming manner, using a `ReadableStream`.

This means it can start rendering the header of the page while the content and footer are still downloading, 
giving a *huge* performance benefit.

The demo contains some simple text pages, a page with some large images and a page containing some postings from my 
blog which are dynamically fetched, combined into a large HTML page and then cached.

You will notice that even the large blog page and the page containing the large images load nearly instantly, even
though every page requires a full page reload.

This is how good browsers are at rendering the DOM *if we use the streaming HTML parser.*

## Running the demo

To run the demo, run `npm install` once and then `npm start` and view the demo on
[http://localhost:9090/](http://localhost:9090/)
