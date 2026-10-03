const cypress = require('cypress');
const os = require('os');
const path = require('path');
const tesults = require('..');

async function run() {
    const failing = process.argv[2] === 'fail';
    if (!process.env.TESULTS_OUTPUT_FILE) {
        process.env.TESULTS_OUTPUT_FILE = path.join(os.tmpdir(), 'cypress-tesults-results.json');
    }

    const results = await cypress.run({
        browser: 'chrome',
        configFile: path.join(__dirname, 'cypress.config.js'),
        headless: true,
        spec: failing
            ? 'test-e2e/specs/failing.cy.js'
            : 'test-e2e/specs/passing*.cy.js'
    });

    if (results.failures) {
        throw new Error(results.message);
    }

    await tesults.results(results, {});
    process.exitCode = results.totalFailed > 0 ? 1 : 0;
}

run().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
