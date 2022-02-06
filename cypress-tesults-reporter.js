const tesults = require('tesults');
const fs = require("fs");
const path = require("path");

const caseFiles = (filesDir, suite, name) => {
    const files = [];
    if (filesDir !== undefined && filesDir !== null) {
        try {
            const filesPath = path.join(filesDir, suite, name);
            fs.readdirSync(filesPath).forEach(function (file) {
                if (file !== '.DS_Store') { // Exclude os files
                    files.push(path.join(filesPath, file));
                }
            });
        }
        catch (err) { 
            if (err.code === 'ENOENT') {
                // Normal scenario where no files present
            } else {
                console.log('Tesults error reading case files: ' + err);
            }
        }
    }
    return files;
}

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
        if (results !== undefined) {
            if (results.runs !== undefined) {
                for (let i = 0; i < results.runs.length; i++) {
                    let run = results.runs[i];
                    if (run !== undefined) {
                        if (run.tests !== undefined) {
                            for (let j = 0; j < run.tests.length; j++) {
                                let test = run.tests[j];
                                if (test !== undefined) {
                                    let testCase = {};
                                    // suite and name
                                    if (Array.isArray(test.title) !== true) {
                                        continue;
                                    }
                                    let suite = [];
                                    if (test.title !== undefined) {
                                        for (let k = 0; k < test.title.length - 1; k++) {
                                            suite.push(test.title[k]);
                                        }
                                    }
                                    if (suite.length > 0) {
                                        testCase.suite = suite.join(" - ");
                                    }
                                    if (test.title !== undefined) {
                                        testCase.name = test.title[test.title.length -1];
                                    }
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
                                        if (test.error !== undefined && test.stack !== undefined) {
                                            testCase.reason = test.error + " " + test.stack
                                        } else if (test.displayError !== undefined) {
                                            testCase.reason = test.displayError
                                        }
                                    }
                                    // files
                                    testCase.files = [];
                                    if (run.screenshots !== undefined) {
                                        for (let k = 0; k < run.screenshots.length; k++) {
                                            let screenshot = run.screenshots[k];
                                            if (test.testId === screenshot.testId) {
                                                testCase.files.push(screenshot.path);
                                            }
                                        }
                                    } else if (test.attempts !== undefined) {
                                        if (Array.isArray(test.attempts)) {
                                            if (test.attempts.length > 0) {
                                                let attempt = test.attempts[test.attempts.length -1]
                                                if (attempt.screenshots !== undefined) {
                                                    if (Array.isArray(attempt.screenshots)) {
                                                        for (let s = 0; s < attempt.screenshots.length; s++) {
                                                            testCase.files.push(attempt.screenshots[s].path)
                                                        }
                                                    }
                                                }
                                                if (attempt.videoTimestamp !== undefined) {
                                                    if (j !== 0) {
                                                        testCase["_Video timestamp"] = attempt.videoTimestamp + "ms (Video available to view in the first test case of the spec)"
                                                    }
                                                }
                                                if (attempt.startedAt !== undefined) {
                                                    testCase.start = (new Date(attempt.startedAt)).getTime()
                                                }
                                                if (attempt.duration !== undefined) {
                                                    testCase.duration = attempt.duration
                                                }
                                            }
                                        }
                                    }
                                    if (run.video !== undefined) {
                                        if (j === 0) {
                                            testCase.files.push(run.video)
                                        }
                                    }
                                    if (test.body !== undefined) {
                                        testCase["_Body"] = test.body
                                    }
                                    // start, end
                                    if (test.wallClockStartedAt !== undefined && test.wallClockDuration !== undefined) {
                                        try {
                                            let date = new Date(test.wallClockStartedAt);
                                            testCase.start = date.getTime();
                                            testCase.end = testCase.start + test.wallClockDuration;
                                        } catch (ignore) {
                                            // Ignore errors with start, end
                                        }
                                    }
                                    // Custom files
                                    const files = caseFiles(args.files, testCase.suite, testCase.name);
                                    if (files.length > 0) {
                                        for (let i = 0; i < files.length; i++) {
                                            let file = files[i]
                                            testCase.files.push(file)
                                        }
                                    }
                                    // Push to cases
                                    data.results.cases.push(testCase);
                                }
                            }
                        }
                        // build case
                        if (args.build_name !== undefined) {
                            let buildCase = {
                                suite: "[build]",
                                name: args.build_name,
                                desc: args.build_description,
                                reason: args.build_reason,
                                result: args.build_result,
                                files: caseFiles(args.files, "[build]", args.build_name)
                            }
                            if (buildCase.result !== "pass" && buildCase.result !== "fail") {
                                buildCase.result = "unknown"
                            }
                            data.results.cases.push(buildCase)
                        }
                    }
                }
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