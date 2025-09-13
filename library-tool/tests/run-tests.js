import { spawn } from 'child_process';
import { join } from 'path';
import { performance } from 'perf_hooks';
import { readdir } from 'fs/promises';

// ANSI color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Function to get test files in a directory
async function getTestFiles(directory) {
    try {
        const files = await readdir(directory);
        return files
            .filter(file => file.endsWith('.test.js'))
            .map(file => join(directory, file));
    } catch (error) {
        console.error(`Error reading directory ${directory}: ${error.message}`);
        return [];
    }
}

// Test suite configuration
const testSuites = [
    {
        name: 'Unit Tests',
        directory: 'tests/unit',
        icon: '🧪',
        description: 'Testing individual components and functions'
    },
    {
        name: 'Integration Tests',
        directory: 'tests/integration',
        icon: '🔗',
        description: 'Testing component interactions and workflows'
    },
    {
        name: 'CLI Tests',
        directory: 'tests/cli',
        icon: '💻',
        description: 'Testing command-line interface functionality'
    },
    {
        name: 'Performance Tests',
        directory: 'tests/performance',
        icon: '⚡',
        description: 'Testing performance and load times'
    }
];

// Helper function to run a test suite
const runTestSuite = async (suite) => {
    return new Promise(async (resolve, reject) => {
        console.log(`\n${colors.cyan}${suite.icon} Running ${suite.name}...${colors.reset}`);
        console.log(`${colors.bright}${suite.description}${colors.reset}\n`);

        const startTime = performance.now();

        // Get test files for this suite
        const testFiles = await getTestFiles(suite.directory);

        if (testFiles.length === 0) {
            console.log(`${colors.yellow}No test files found in ${suite.directory}${colors.reset}`);
            resolve({ suite: suite.name, success: true, duration: 0 });
            return;
        }

        const child = spawn('node', ['--test', ...testFiles], {
            stdio: 'inherit',
            cwd: process.cwd(),
            shell: true
        });

        child.on('close', (code) => {
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            if (code === 0) {
                console.log(`\n${colors.green}✅ ${suite.name} passed${colors.reset} ${colors.bright}(${duration}s)${colors.reset}`);
                resolve({ suite: suite.name, success: true, duration: parseFloat(duration) });
            } else {
                console.log(`\n${colors.red}❌ ${suite.name} failed${colors.reset} ${colors.bright}(${duration}s)${colors.reset}`);
                reject({ suite: suite.name, success: false, duration: parseFloat(duration), code });
            }
        });

        child.on('error', (error) => {
            console.error(`\n${colors.red}💥 Error running ${suite.name}: ${error.message}${colors.reset}`);
            reject({ suite: suite.name, success: false, error: error.message });
        });
    });
};

// Function to run coverage report
const runCoverage = async () => {
    return new Promise(async (resolve, reject) => {
        console.log(`\n${colors.magenta}Generating coverage report...${colors.reset}\n`);

        // Get all test files
        const allTestFiles = [];
        for (const suite of testSuites) {
            const files = await getTestFiles(suite.directory);
            allTestFiles.push(...files);
        }

        if (allTestFiles.length === 0) {
            console.log(`\n${colors.yellow}⚠️  No test files found for coverage${colors.reset}`);
            resolve();
            return;
        }

        // Run coverage silently and only show the coverage table
        const child = spawn('npx', ['c8', '--reporter=text', '--reporter=html', 'node', '--test', ...allTestFiles], {
            stdio: ['inherit', 'pipe', 'pipe'],
            cwd: process.cwd(),
            shell: true
        });

        let coverageOutput = '';
        let showOutput = false;

        child.stdout.on('data', (data) => {
            const output = data.toString();
            coverageOutput += output;

            // Only show the coverage table (starts with dashes)
            if (output.includes('--------------|')) {
                showOutput = true;
            }

            if (showOutput) {
                process.stdout.write(output);
            }
        });

        child.stderr.on('data', (data) => {
            // Suppress test output, only show coverage errors
            const error = data.toString();
            if (error.includes('Error') || error.includes('Warning')) {
                process.stderr.write(error);
            }
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`\n${colors.green}✅ Coverage report generated${colors.reset}`);
                resolve();
            } else {
                console.log(`\n${colors.yellow}Coverage report completed with warnings${colors.reset}`);
                resolve(); // Don't fail the entire test run for coverage issues
            }
        });

        child.on('error', (error) => {
            console.error(`\n${colors.red}💥 Error generating coverage: ${error.message}${colors.reset}`);
            resolve(); // Don't fail the entire test run for coverage issues
        });
    });
};

// Main test runner function
async function runAllTests() {
    console.log(`${colors.bright}${colors.blue}🚀 Starting Tradux Test Suite${colors.reset}\n`);
    console.log(`${colors.bright}Testing library functionality, CLI commands, and performance${colors.reset}\n`);
    console.log('='.repeat(60));

    const results = [];
    const overallStartTime = performance.now();

    // Run each test suite
    for (const suite of testSuites) {
        try {
            const result = await runTestSuite(suite);
            results.push(result);
        } catch (error) {
            results.push(error);
        }
    }

    const overallEndTime = performance.now();
    const totalDuration = ((overallEndTime - overallStartTime) / 1000).toFixed(2);

    // Generate summary
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bright}${colors.blue}📋 Test Results Summary${colors.reset}\n`);

    const passed = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    results.forEach(result => {
        const icon = result.success ? '✅' : '❌';
        const color = result.success ? colors.green : colors.red;
        const duration = result.duration ? `(${result.duration}s)` : '';

        console.log(`${icon} ${color}${result.suite}${colors.reset} ${colors.bright}${duration}${colors.reset}`);
    });

    console.log(`\n${colors.bright}Total: ${results.length} suites, ${passed.length} passed, ${failed.length} failed${colors.reset}`);
    console.log(`${colors.bright}Duration: ${totalDuration}s${colors.reset}\n`);

    // Run coverage if all tests passed (skip if --no-coverage flag)
    if (failed.length === 0) {
        const skipCoverage = process.argv.includes('--no-coverage');

        if (skipCoverage) {
            console.log(`${colors.green}🎉 All tests passed! Skipping coverage analysis...${colors.reset}`);
        } else {
            console.log(`${colors.green}🎉 All tests passed! Running coverage analysis...${colors.reset}`);
            await runCoverage();
        }

        console.log(`\n${colors.green}${colors.bright}All tests completed successfully!${colors.reset}`);
        console.log(`${colors.bright}Your Tradux library is ready for production! ${colors.reset}\n`);

        process.exit(0);
    } else {
        console.log(`\n${colors.red}${colors.bright}💥 Some tests failed. Please review the output above.${colors.reset}\n`);

        // Show failed suites
        failed.forEach(failure => {
            console.log(`${colors.red}   • ${failure.suite}${colors.reset}`);
            if (failure.code) {
                console.log(`${colors.bright}     Exit code: ${failure.code}${colors.reset}`);
            }
            if (failure.error) {
                console.log(`${colors.bright}     Error: ${failure.error}${colors.reset}`);
            }
        });

        console.log(`\n${colors.yellow}💡 Tip: Run individual test suites to debug issues:${colors.reset}`);
        console.log(`${colors.bright}   npm run test:unit${colors.reset}`);
        console.log(`${colors.bright}   npm run test:integration${colors.reset}`);
        console.log(`${colors.bright}   npm run test:cli${colors.reset}\n`);

        process.exit(1);
    }
}

// Handle process interruption
process.on('SIGINT', () => {
    console.log(`\n\n${colors.yellow}⚠️  Test run interrupted by user${colors.reset}`);
    process.exit(130);
});

process.on('SIGTERM', () => {
    console.log(`\n\n${colors.yellow}⚠️  Test run terminated${colors.reset}`);
    process.exit(143);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error(`\n${colors.red}💥 Uncaught exception: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`\n${colors.red}💥 Unhandled rejection at: ${promise}, reason: ${reason}${colors.reset}`);
    process.exit(1);
});

// Export for potential programmatic use
export { runAllTests, runTestSuite, testSuites };

// Run if this file is executed directly
const scriptPath = process.argv[1].replace(/\\/g, '/');
const expectedUrl = `file:///${scriptPath}`;

if (import.meta.url === expectedUrl) {
    runAllTests();
}
