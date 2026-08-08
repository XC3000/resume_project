import * as assert from 'assert';
import { normaliseLog } from './normaliser';

const logSamples = [
  // 1. Node.js stack trace (Timestamps, absolute paths, line/col numbers)
  {
    input: `2026-08-08T20:41:46.123Z - Error: Something went wrong
    at bootstrap (/Users/richard/Documents/personal/resume_project/apps/api/src/main.ts:11:9)
    at Object.<anonymous> (/Users/richard/Documents/personal/resume_project/apps/api/src/main.ts:25:4)`,
    expected: `- Error: Something went wrong
 at bootstrap ()
 at Object.<anonymous> ()`
  },
  
  // 2. Python traceback (File paths, line numbers)
  {
    input: `Traceback (most recent call last):
  File "/usr/local/lib/python3.9/site-packages/django/core/handlers/exception.py", line 47, in inner
    response = get_response(request)
  File "/home/user/workspace/app/views.py", line 125, in get_profile
    user = User.objects.get(id=profile_id)
ValueError: Field 'id' expected a number but got 'abc'.`,
    expected: `Traceback (most recent call last):
 File "", , in inner
 response = get_response(request)
 File "", , in get_profile
 user = User.objects.get(id=profile_id)
ValueError: Field 'id' expected a number but got 'abc'.`
  },

  // 3. Database connection error with timestamp, host, and port info
  {
    input: `[2026-08-08 20:45:00] FATAL: pool connection failed: Connection refused (127.0.0.1:5432) after 10000ms`,
    expected: `[] FATAL: pool connection failed: Connection refused (127.0.0.1) after 10000ms`
  },

  // 4. TS Compiler/Linter error with relative path and line/col numbers
  {
    input: `src/main.ts:25:12 - error TS7006: Parameter 'req' implicitly has an 'any' type.`,
    expected: `- error TS7006: Parameter 'req' implicitly has an 'any' type.`
  },

  // 5. Segmentation fault / Memory dump (Hex pointers and standalone hex numbers)
  {
    input: `Segmentation fault at memory address 0x7ffee3b9a240 in thread 0x1a2b3c`,
    expected: `Segmentation fault at memory address in thread`
  },

  // 6. Application event log with UUID request IDs, timestamps, and process info
  {
    input: `[12:34:56.789] INFO [req_id=123e4567-e89b-12d3-a456-426614174000]: User login successful for user_id=9876`,
    expected: `[] INFO [req_id=]: User login successful for user_id=9876`
  }
];

function runTests() {
  console.log('Running Normaliser Unit Tests...');
  let passed = 0;

  for (let i = 0; i < logSamples.length; i++) {
    const sample = logSamples[i];
    try {
      const actual = normaliseLog(sample.input);
      assert.strictEqual(actual, sample.expected);
      console.log(`✓ Test ${i + 1} Passed`);
      passed++;
    } catch (error: any) {
      console.error(`✗ Test ${i + 1} Failed!`);
      console.error(`Input:    ${JSON.stringify(sample.input)}`);
      console.error(`Expected: ${JSON.stringify(sample.expected)}`);
      console.error(`Actual:   ${JSON.stringify(normaliseLog(sample.input))}`);
      console.error(error);
    }
  }

  console.log(`\nResult: ${passed}/${logSamples.length} tests passed.`);
  if (passed !== logSamples.length) {
    process.exit(1);
  }
}

runTests();
