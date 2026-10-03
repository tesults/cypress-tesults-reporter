# Cypress Tesults Reporter

Cypress Tesults Reporter is a library for uploading test results to Tesults from Cypress, writing them to a local JSON file, or doing both in the same run.

## Installation

```sh
npm install --save-dev cypress-tesults-reporter
```

## Usage

Create a runner that uses the Cypress Module API:

```js
const cypress = require('cypress');
const tesults = require('cypress-tesults-reporter');

async function run() {
  const results = await cypress.run({
    // Cypress run options
  });

  if (results.failures) {
    throw new Error(results.message);
  }

  await tesults.results(results, {
    target: 'token'
  });

  process.exitCode = results.totalFailed > 0 ? 1 : 0;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

Replace `token` with your Tesults target token. Setting `process.exitCode` preserves Cypress's failed test outcome while allowing reporting to finish.

## Write results locally

Set `TESULTS_OUTPUT_FILE` to write the Tesults JSON payload without uploading it:

```sh
TESULTS_OUTPUT_FILE=./test-results/tesults-results.json node runner.js
```

Parent directories are created automatically. The local payload has an empty `target` value. When both `target` and `TESULTS_OUTPUT_FILE` are configured, the reporter writes the local payload and uploads the results to Tesults.

## GitHub Actions reporting

The [Test Automation Reporting for GitHub Actions](https://github.com/tesults/test-automation-reporting) action supplies `TESULTS_OUTPUT_FILE` automatically. The target token is optional:

```js
// runner.js
const cypress = require('cypress');
const tesults = require('cypress-tesults-reporter');

async function run() {
  const results = await cypress.run();

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
```

Place the action before the runner step:

```yaml
- name: Set up test automation reporting
  uses: tesults/test-automation-reporting@v1

- name: Run Cypress tests
  run: node runner.js
```

## Documentation

Detailed documentation is available at https://www.tesults.com/docs.

Cypress specific documentation: https://www.tesults.com/docs/cypress.

## Support

help@tesults.com
