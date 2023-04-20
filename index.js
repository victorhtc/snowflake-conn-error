const UdhClient = require('./sf.client')

const udhClient = new UdhClient()

async function run () {
  await Promise.all([
    // First query waits right after connecting to ensure we have two
    // connections open in parallel and one disconnection happens before
    // one of the queries finishes
    udhClient.query('select 1', true),
    udhClient.query('select 2'),
  ])
  // An ugly solution is to ensure both queries are executed before any
  // disconnections. Uncomment udh.client.js:21-23 to see.
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
