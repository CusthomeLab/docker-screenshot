/**
 * @see https://github.com/GoogleChrome/puppeteer/issues/422
 */

'use strict';

const express = require('express');
const puppeteer = require('puppeteer');
const parseDataURL = require("data-urls");

// Constants
const SCREENSHOT_PORT = 8080;
const SCREENSHOT_HOST = '0.0.0.0';

// App
const app = express();

app.use(express.json({limit: '50mb'}));

app.get('/', (req, res) => {
    res.send('Screen shot maker is ready to rock !\n');
});

app.get('/screenshot', async (req, res) => {


    let target='http://localhost:3000/screenshot/'+req.query.lotId+'?defaultProducts=0&decorativeProducts=0&size=528';

    console.log('Making sreenshot for : ' + target);
    let start = Date.now();

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
        args: [
            '--remote-debugging-port=9222',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });
    const page = await browser.newPage();

    /**
     * Define a window.onCustomEvent function on the page.
     */
    await page.exposeFunction('onCustomEvent', async e => {
        console.log(`${e.type} fired`);

        await page.waitFor(120000);

        browser.close();

        const screenshotDataURI = parseDataURL(e.detail.dataURI);

        res.type('png');

        res.writeHead(200, {
            'Content-Type': screenshotDataURI.mimeType.toString(),
            // 'Content-Length': screenshotDataURI.body.length // FIXME:
        });


        res.write(screenshotDataURI.body,'binary');
        res.end(null, 'binary');


    });

    /**
     * Attach an event listener to page to capture a custom event on page load/navigation.
     * @param {string} type Event name.
     * @return {!Promise}
     */
    function listenFor(type) {
        return page.evaluateOnNewDocument(type => {
            document.addEventListener(type, e => {
                window.onCustomEvent({type, detail: e.detail});
            });
        }, type);
    }

    await listenFor('screenshotTaken');

    await page.goto(target, {waitUntil: 'networkidle0'});

});

app.listen(SCREENSHOT_PORT, SCREENSHOT_HOST);
console.log(`Running on http://${SCREENSHOT_HOST}:${SCREENSHOT_PORT}`);