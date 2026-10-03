const { defineConfig } = require('cypress');

module.exports = defineConfig({
    video: true,
    screenshotOnRunFailure: true,
    e2e: {
        supportFile: false,
        specPattern: 'test-e2e/specs/**/*.cy.js'
    }
});
