# Cypress Tesults Reporter

Cypress Tesults Reporter is a library for uploading test results to Tesults from Cypress.

## Installation

`npm install cypress-tesults-reporter --save`

# Usage

```
const cypress = require('cypress')
const tesults = require('./cypress-tesults-reporter');

cypress.run({
  
})
.then((results) => {
  const args = {
      target: 'token',
  }
  tesults.results(results, args);
})
.catch((err) => {
  console.error(err)
})
```

## Documentation

Detailed documentation is available at https://www.tesults.com/docs.

Cypress specific documentation: https://www.tesults.com/docs?doc=cypress. 

## Support

help@tesults.com
