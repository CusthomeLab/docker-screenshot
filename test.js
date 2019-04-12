const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
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

    await page.waitFor(5000);

    /**
     * Define a window.onCustomEvent function on the page.
     */
    await page.exposeFunction('onCustomEvent', e => {
        console.log(`${e.type} fired`, e.detail || '');
    });

    /**
     * Attach an event listener to page to capture a custom event on page load/navigation.
     * @param {string} type Event name.
     * @return {!Promise}
     */
    function listenFor(type) {
        return page.evaluateOnNewDocument(type => {
            console.log('XXX', type, document, window);
            document.addEventListener(type, window.onCustomEvent);
        }, type);
    }

    await listenFor('screenshot'); // Listen for "app-ready" custom event on page load.

    // let target = 'https://html5test.com/';
    // let target='https://example.org/';
    let target='http://192.168.204.30:3000/screenshot/9a3ec24b-e9d7-4bd2-ade6-c3b722f90bee?defaultProducts=1';
    // let target = 'https://playground.babylonjs.com/frame.html#QYFDDP#1';
    // let target = 'http://playground.babylonjs.com/frame.html#PN1NNI#1';

    await page.goto(target);

    await page.waitFor(120000);

    await browser.close();
})();