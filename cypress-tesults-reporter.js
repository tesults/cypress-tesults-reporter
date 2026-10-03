const tesults = require('tesults');
const fs = require("fs");
const path = require("path");
const integrationVersion = require('./package.json').version;

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

const processCallback = (err, response, callback) => {
    try {
        if (typeof callback !== 'function') {
            return
        }
        callback(err, response)
    } catch (err) {
        console.log('Error processing callback: ' + err)
    }
}

module.exports.results = function (results, args, callback) {
    const outputFileValue = process.env.TESULTS_OUTPUT_FILE;
    const outputFile = typeof outputFileValue === 'string' && outputFileValue.trim().length > 0
        ? outputFileValue
        : undefined;
    const options = args === undefined ? {} : args;

    return new Promise((resolve, reject) => {
    const finish = (err, response, rejectPromise) => {
        processCallback(err, response, callback);
        if (rejectPromise === true && err !== undefined) {
            reject(err instanceof Error ? err : new Error(String(err)));
        } else {
            resolve(response);
        }
    };

    if (results === undefined || (args === undefined && outputFile === undefined)) {
        processCallback("Error: results or args undefined", undefined, callback)
        resolve();
        return;
    }
    try {
        let data = {
            target: options.target === undefined ? "" : options.target,
            results: { cases: [] },
            metadata: {
                integration_name: "cypress-tesults-reporter",
                integration_version: integrationVersion,
                test_framework: "cypress"
            }
        }
        // test cases
        let firstCaseOfSuiteNum = 0
        if (results !== undefined) {
            if (results.runs !== undefined) {
                for (let i = 0; i < results.runs.length; i++) {
                    let run = results.runs[i];
                    if (run !== undefined) {
                        if (run.tests !== undefined) {
                            for (let j = 0; j < run.tests.length; j++) {
                                if (j === 0) {
                                    firstCaseOfSuiteNum = data.results.cases.length
                                }
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
                                        testCase.name = test.title[test.title.length - 1];
                                    }
                                    // result
                                    if (test.state === 'passed') {
                                        testCase.result = 'pass';
                                    } else if (test.state === 'failed') {
                                        testCase.result = 'fail';
                                    } else {
                                        testCase.result = 'unknown';
                                    }
                                    testCase.rawResult = test.state
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
                                                let attempt = test.attempts[test.attempts.length - 1]
                                                if (attempt.screenshots !== undefined) {
                                                    if (Array.isArray(attempt.screenshots)) {
                                                        for (let s = 0; s < attempt.screenshots.length; s++) {
                                                            testCase.files.push(attempt.screenshots[s].path)
                                                        }
                                                    }
                                                }
                                                if (attempt.videoTimestamp !== undefined) {
                                                    testCase["_Video timestamp"] = attempt.videoTimestamp + "ms"
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
                                    if (run.video) {
                                        if (j === 0) {
                                            testCase.files.push(run.video)
                                        } else {
                                            if (testCase.refFiles === undefined) {
                                                testCase.refFiles = []
                                            }
                                            testCase.refFiles.push(
                                                {
                                                    version: "1",
                                                    type: "local-run",
                                                    num: firstCaseOfSuiteNum,
                                                    file: run.video
                                                }
                                            )
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
                                    const files = caseFiles(options.files, testCase.suite, testCase.name);
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
                    }
                }
            }
        }
        // build case
        if (options.build_name !== undefined) {
            let buildCase = {
                suite: "[build]",
                name: options.build_name,
                desc: options.build_description,
                reason: options.build_reason,
                result: options.build_result,
                rawResult: options.build_result,
                files: caseFiles(options.files, "[build]", options.build_name)
            }
            if (buildCase.result !== "pass" && buildCase.result !== "fail") {
                buildCase.result = "unknown"
            }
            data.results.cases.push(buildCase)
        } else if (options.build !== undefined) {
            if (options.build.name !== undefined && options.build.result !== undefined) {
                let buildCase = options.build;
                if (buildCase.result !== 'pass' && buildCase !== 'fail') {
                    buildCase.result = 'unknown';
                }
                buildCase.suite = '[build]';
                data.results.cases.push(buildCase);
            }
        }
        // local output
        let outputError;
        if (outputFile !== undefined) {
            try {
                const outputData = { ...data, target: "" };
                fs.mkdirSync(path.dirname(outputFile), { recursive: true });
                fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
                console.log('Tesults results written to ' + outputFile);
            } catch (err) {
                outputError = err;
                console.log('Tesults error, failed to write results file.');
            }
        }

        if (options.target === undefined && outputFile !== undefined) {
            if (outputError !== undefined) {
                finish(outputError, undefined, true);
            } else {
                finish(undefined, undefined, false);
            }
            return;
        }

        // upload
        console.log('Tesults results uploading...');
        tesults.results(data, function (err, response) {
            if (err) {  
                const errMessage = "Tesults library error, failed to upload."
                console.log(errMessage)
                if (outputError !== undefined) {
                    finish(outputError, undefined, true);
                } else {
                    finish(errMessage, undefined, false);
                }
            } else {
              console.log('Success: ' + response.success);
              console.log('Message: ' + response.message);
              console.log('Warnings: ' + response.warnings.length);
              console.log('Errors: ' + response.errors.length);
              if (outputError !== undefined) {
                  finish(outputError, undefined, true);
              } else {
                  finish(undefined, response, false);
              }
            }
        });
    } catch (err) {
        const errMessage = "cypress-tesults-reporter error parsing results data from Cypress: " + err
        console.log(errMessage);
        finish(errMessage, undefined, outputFile !== undefined)
    }
    });
}
