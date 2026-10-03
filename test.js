const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const tesults = require('tesults');
const reporter = require('./cypress-tesults-reporter');
const packageJson = require('./package.json');

const originalTesultsResults = tesults.results;
const originalOutputFile = process.env.TESULTS_OUTPUT_FILE;

function sampleResults() {
    return {
        runs: [
            {
                screenshots: [
                    { testId: 'pass-id', path: '/tmp/cypress-pass.png' }
                ],
                video: '/tmp/cypress-run.mp4',
                tests: [
                    {
                        testId: 'pass-id',
                        title: ['Suite A', 'passes'],
                        state: 'passed',
                        body: 'expect(true).to.equal(true)',
                        wallClockStartedAt: '2026-10-04T10:00:00.000Z',
                        wallClockDuration: 25
                    },
                    {
                        testId: 'fail-id',
                        title: ['Suite A', 'fails'],
                        state: 'failed',
                        displayError: 'AssertionError: expected true to be false'
                    }
                ]
            },
            {
                tests: [
                    {
                        title: ['Suite B', 'is pending'],
                        state: 'pending',
                        attempts: [
                            {
                                screenshots: [{ path: '/tmp/cypress-pending.png' }],
                                videoTimestamp: 42,
                                startedAt: '2026-10-04T10:01:00.000Z',
                                duration: 10
                            }
                        ]
                    }
                ]
            }
        ]
    };
}

function successfulResponse() {
    return {
        success: true,
        message: 'Results uploaded.',
        warnings: [],
        errors: []
    };
}

async function run() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cypress-tesults-reporter-'));

    try {
        const customFilesDir = path.join(tempDir, 'custom-files');
        const passFilesDir = path.join(customFilesDir, 'Suite A', 'passes');
        const buildFilesDir = path.join(customFilesDir, '[build]', 'build-123');
        fs.mkdirSync(passFilesDir, { recursive: true });
        fs.mkdirSync(buildFilesDir, { recursive: true });
        fs.writeFileSync(path.join(passFilesDir, 'browser.log'), 'browser output');
        fs.writeFileSync(path.join(buildFilesDir, 'build.log'), 'build output');

        let uploads = [];
        tesults.results = (data, callback) => {
            uploads.push(data);
            setImmediate(() => callback(undefined, successfulResponse()));
        };

        const localOutput = path.join(tempDir, 'nested', 'local-results.json');
        process.env.TESULTS_OUTPUT_FILE = localOutput;
        await reporter.results(sampleResults(), {
            files: customFilesDir,
            build_name: 'build-123',
            build_result: 'pass',
            build_description: 'Characterization build'
        });

        assert.strictEqual(uploads.length, 0, 'local-only mode must not upload');
        const localData = JSON.parse(fs.readFileSync(localOutput, 'utf8'));
        assert.strictEqual(localData.target, '');
        assert.deepStrictEqual(localData.metadata, {
            integration_name: 'cypress-tesults-reporter',
            integration_version: packageJson.version,
            test_framework: 'cypress'
        });
        assert.strictEqual(localData.results.cases.length, 4);

        const passingCase = localData.results.cases[0];
        assert.strictEqual(passingCase.suite, 'Suite A');
        assert.strictEqual(passingCase.name, 'passes');
        assert.strictEqual(passingCase.result, 'pass');
        assert.strictEqual(passingCase.rawResult, 'passed');
        assert.strictEqual(passingCase.start, Date.parse('2026-10-04T10:00:00.000Z'));
        assert.strictEqual(passingCase.end, passingCase.start + 25);
        assert.ok(passingCase.files.includes('/tmp/cypress-pass.png'));
        assert.ok(passingCase.files.includes('/tmp/cypress-run.mp4'));
        assert.ok(passingCase.files.includes(path.join(passFilesDir, 'browser.log')));

        const failingCase = localData.results.cases[1];
        assert.strictEqual(failingCase.result, 'fail');
        assert.strictEqual(failingCase.reason, 'AssertionError: expected true to be false');
        assert.deepStrictEqual(failingCase.refFiles, [{
            version: '1',
            type: 'local-run',
            num: 0,
            file: '/tmp/cypress-run.mp4'
        }]);

        const pendingCase = localData.results.cases[2];
        assert.strictEqual(pendingCase.result, 'unknown');
        assert.strictEqual(pendingCase.rawResult, 'pending');
        assert.deepStrictEqual(pendingCase.files, ['/tmp/cypress-pending.png']);
        assert.strictEqual(pendingCase['_Video timestamp'], '42ms');
        assert.strictEqual(pendingCase.duration, 10);

        const buildCase = localData.results.cases[3];
        assert.strictEqual(buildCase.suite, '[build]');
        assert.strictEqual(buildCase.name, 'build-123');
        assert.strictEqual(buildCase.result, 'pass');
        assert.ok(buildCase.files.includes(path.join(buildFilesDir, 'build.log')));

        delete process.env.TESULTS_OUTPUT_FILE;
        uploads = [];
        let callbackResult;
        const promiseResult = await reporter.results(sampleResults(), { target: 'target-token' }, (err, response) => {
            callbackResult = { err, response };
        });
        assert.strictEqual(uploads.length, 1);
        assert.strictEqual(uploads[0].target, 'target-token');
        assert.strictEqual(uploads[0].metadata.integration_version, packageJson.version);
        assert.strictEqual(callbackResult.err, undefined);
        assert.deepStrictEqual(callbackResult.response, successfulResponse());
        assert.deepStrictEqual(promiseResult, successfulResponse());

        const bothOutput = path.join(tempDir, 'both-results.json');
        process.env.TESULTS_OUTPUT_FILE = bothOutput;
        uploads = [];
        await reporter.results(sampleResults(), { target: 'target-token' });
        assert.strictEqual(uploads.length, 1);
        assert.strictEqual(uploads[0].target, 'target-token');
        assert.strictEqual(JSON.parse(fs.readFileSync(bothOutput, 'utf8')).target, '');

        const noArgsOutput = path.join(tempDir, 'no-args-results.json');
        process.env.TESULTS_OUTPUT_FILE = noArgsOutput;
        uploads = [];
        await reporter.results(sampleResults());
        assert.strictEqual(uploads.length, 0);
        assert.strictEqual(JSON.parse(fs.readFileSync(noArgsOutput, 'utf8')).target, '');

        delete process.env.TESULTS_OUTPUT_FILE;
        uploads = [];
        let validationError;
        await reporter.results(sampleResults(), undefined, (err) => {
            validationError = err;
        });
        assert.strictEqual(validationError, 'Error: results or args undefined');
        assert.strictEqual(uploads.length, 0);

        let uploadError;
        tesults.results = (data, callback) => {
            setImmediate(() => callback(new Error('network unavailable')));
        };
        await reporter.results(sampleResults(), { target: 'target-token' }, (err) => {
            uploadError = err;
        });
        assert.strictEqual(uploadError, 'Tesults library error, failed to upload.');

        process.env.TESULTS_OUTPUT_FILE = tempDir;
        await assert.rejects(
            reporter.results(sampleResults(), {}),
            /EISDIR|illegal operation on a directory/
        );

        console.log('All tests passed.');
    } finally {
        tesults.results = originalTesultsResults;
        if (originalOutputFile === undefined) {
            delete process.env.TESULTS_OUTPUT_FILE;
        } else {
            process.env.TESULTS_OUTPUT_FILE = originalOutputFile;
        }
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

run().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
