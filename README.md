## Description
The following error is thrown when there are two or more snowflake connections
open in parallel, with parallel queries being executed, and one of the
connections is closed. It seems that closing one connection also close all
other connections that were also open at the same time, causing pending queries
to fail.

```node
Error [ClientError]: Unable to perform operation using terminated connection.
    at createError (/snowflake-conn-error/node_modules/snowflake-sdk/lib/errors.js:539:15)
    at exports.createClientError (/snowflake-conn-error/node_modules/snowflake-sdk/lib/errors.js:354:10)
    at /snowflake-conn-error/node_modules/snowflake-sdk/lib/services/sf.js:1535:21
    at process.processTicksAndRejections (node:internal/process/task_queues:77:11) {
  code: 407002,
  sqlState: '08003',
  isFatal: true
}
```

## Reproduction steps
1. Install [`nvm`](https://github.com/nvm-sh/nvm)
2. Navigate to this folder
3. Run `nvm install`
4. Create `.env` file based on `.env.example`
   - Using the same connection solution in this example will not work outside
     our company context. I suggest replacing its implementation to connect to
     any other available Snowflake instance. Changing the options returned by
     `sf.client.js:getConnectionOptions()` should be enough.
5. Fill env variables values
6. Install dependencies: `npm install`
7. Reproduce issue: `npm start`

## Notes
For proof that terminating one connection terminates parallel ones, uncomment
lines `sf.client.js:21-23` to see that waiting for all queries to be executed
before terminating a connection "solves" the issue. 
