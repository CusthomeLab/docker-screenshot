# docker-screenshot

A container that expose a HTTP endpoint to take screenshot of a webpage. 
It use a puppeteer with the maximum Web GL capabilities that is possible inside a container. 

## How to make a screenshot

In fact this container does not take the screenshot for you... It listen for a custom DOM event called `screenshotTaken` that contain the actual screenshot. 

The opened web page have:
1. Generate an image (a screenshot or whatever else) 
2. Encode it in [a valid data URI](https://www.npmjs.com/package/data-urls)
3. Trigger a DOM `CustomEvent` that contain the data URI

### `screenshotTaken` custom event

```js
const screenshotDataURI = 'data:image/png;base64,...'

document.dispatchEvent(
  new CustomEvent('screenshotTaken', {
    detail: {
      dataURI: screenshotDataURI,
    },
  }),
)
```

## API

### `GET /screenshot`

Parameter:
- `target` (string): the web page to open

Load the web page given in the `target` parameter and return the screenshot contained in the `screenshotTaken` event of the target page (see the *How to make a screenshot* section for a detailed explanation). To respect the URL format the `target` parameter should be URL encoded.

Eg:
```
GET /screenshot?target=https%3A%2F%2Fplayground.babylonjs.com%2F%23FZTP31%231
```

The target page have 60 seconds to return the `screenshotTaken` event. The endpoint will return an error 500 after 60 seconds.

### `GET /capabilities/webgl.html`

*Only available in debug mode*

Expose the https://alteredqualia.com/tools/webgl-features/ webgl features detection page from inside the container.

### `GET /health`

Check the container status. Return a 200 HTTP status if everythings is ok.

## Environment variables

- `DEBUG` (boolean): Increase the log outputed by the container (`false` by default)
- `SENTRY_DSN` (string): The [sentry.io](https://sentry.io/) error reporting DSN (optional)
