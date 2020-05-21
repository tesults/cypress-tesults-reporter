const tesults = require('tesults');

module.exports.results = function (results, args) {
    if (results === undefined || args === undefined) {
        return;
    }
    try {
        let data = {
            target: args.target,
            results: {cases: []}
        }
        // build case
        if (args.build !== undefined) {
            if (args.build.name !== undefined && args.build.result !== undefined) {
                let buildCase = args.build;
                if (buildCase.result !== 'pass' && buildCase !== 'fail' && buildCase !== 'unknown') {
                    buildCase.result = 'unknown';
                }
                buildCase.suite = '[build]';
                data.results.cases.push(buildCase);
            }
        }
        // test cases
        for (let i = 0; i < results.runs.length; i++) {
            let run = results.runs[i];
            for (let j = 0; j < run.tests.length; j++) {
                let test = run.tests[j];
                let testCase = {};
                // suite and name
                if (Array.isArray(test.title) !== true) {
                    continue;
                }
                let suite = [];
                for (let k = 0; k < test.title.length - 1; k++) {
                    suite.push(test.title[k]);
                }
                if (suite.length > 0) {
                    testCase.suite = suite.join(" - ");
                }
                testCase.name = test.title[test.title.length -1];
                // result
                if (test.state === 'passed') {
                    testCase.result = 'pass';
                } else if (test.state === 'failed') {
                    testCase.result = 'fail';
                } else {
                    testCase.result = 'unknown';
                }
                // reason
                if (testCase.result === 'fail') {
                    testCase.reason = test.error + " " + test.stack;
                }
                // files
                testCase.files = [];
                for (let k = 0; k < run.screenshots.length; k++) {
                    let screenshot = run.screenshots[k];
                    if (test.testId === screenshot.testId) {
                        testCase.files.push(screenshot.path);
                    }
                }
                // start, end
                try {
                    let date = new Date(test.wallClockStartedAt);
                    testCase.start = date.getTime();
                    testCase.end = testCase.start + test.wallClockDuration;
                } catch (ignore) {
                    // Ignore errors with start, end
                }
                data.results.cases.push(testCase);
            }
        }
        // upload
        console.log('Tesults results uploading...');
        tesults.results(data, function (err, response) {
            if (err) {
              console.log('Tesults library error, failed to upload.');
            } else {
              console.log('Success: ' + response.success);
              console.log('Message: ' + response.message);
              console.log('Warnings: ' + response.warnings.length);
              console.log('Errors: ' + response.errors.length);
            }
        });
    } catch (err) {
        console.log('cypress-tesults-reporter error parsing results data from Cypress: ' + err);
    }
}