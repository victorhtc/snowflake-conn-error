const axios = require('axios')
const snowflake = require('snowflake-sdk')

module.exports = class SfClient {
  constructor() {
    snowflake.configure({ ocspFailOpen: true })
  }

  async query(sql, wait) {
    try {
      const connection = await this.connect()
      try {
        if (wait) {
          await new Promise((resolve) => {
            setTimeout(() => resolve(connection), 1000)
          })
        }
        return await this.executeQuery(connection, sql)
      } finally {
        // await new Promise((resolve) => {
        //   setTimeout(() => resolve(connection), 2000)
        // })
        await this.disconnect(connection)
      }
    } catch (err) {
      console.log('Error running query in SF!')
      throw err
    }
  }

  async executeQuery(connection, sql) {
    sql = sql.trim()
    const statement = connection.execute({ sqlText: sql })
    const stream = statement.streamRows()

    const result = await new Promise((resolve, reject) => {
      const result = []
      try {
        stream.on('error', async (err) => {
          await this.cancelStatement(connection, statement)
          reject(err)
        })
        stream.on('data', (row) => result.push(row))
        stream.on('end', () => resolve(result))
      } catch (err) {
        reject(err)
      }
    })
    console.log('Query ran successfully')
    return result
  }

  async connect() {
    try {
      const connection = await new Promise((resolve, reject) => {
        this.getConnectionOptions()
          .then((options) => {
            const connection = snowflake.createConnection(options)
            connection.connect((err, conn) =>
              err ? reject(err) : resolve(conn)
            )
          })
          .catch((err) => reject(err))
      })
      console.log('Connected')
      return connection
    } catch (err) {
      console.log('Error connecting to SF!')
      throw err
    }
  }

  async disconnect(connection) {
    try {
      if (connection.isUp()) {
        await new Promise((resolve, reject) => {
          try {
            connection.destroy((err) => (err ? reject(err) : resolve()))
          } catch (err) {
            reject(err)
          }
        })
        console.log('Disconnected')
      } else {
        console.log('Not disconnecting because connection is already down')
      }
    } catch (err) {
      console.log('Error disconnecting from SF!')
    }
  }

  async cancelStatement(connection, statement) {
    try {
      if (connection.isUp()) {
        await new Promise((resolve, reject) => {
          try {
            statement.cancel((err) => (err ? reject(err) : resolve()))
          } catch (err) {
            reject(err)
          }
        })
        console.log('Statement canceled')
      } else {
        console.log('Statement not canceled since connection is down')
      }
    } catch (err) {
      console.log('Error canceling statement in SF!')
    }
  }

  async getConnectionOptions() {
    const {
      SF_HOST,
      SF_ACCOUNT,
      SF_USERNAME,
      SF_ROLE,
      SF_WAREHOUSE,
      SF_DATABASE
    } = process.env

    const token = await this.authenticate()
    return {
      accessUrl: `https://${SF_HOST}`,
      host: SF_HOST,
      account: SF_ACCOUNT,
      username: SF_USERNAME,
      authenticator: 'oauth',
      token,
      role: SF_ROLE,
      warehouse: SF_WAREHOUSE,
      database: SF_DATABASE
    }
  }

  async authenticate() {
    if (this.accessToken) return this.accessToken

    const {
      IDENTITY_PROVIDER_URL,
      IDENTITY_PROVIDER_CLIENT_ID,
      IDENTITY_PROVIDER_CLIENT_SECRET,
      SF_USERNAME,
      SF_PASSWORD
    } = process.env
    const response = await axios.post(
      IDENTITY_PROVIDER_URL,
      {
        client_id: IDENTITY_PROVIDER_CLIENT_ID,
        client_secret: IDENTITY_PROVIDER_CLIENT_SECRET,
        username: SF_USERNAME,
        password: SF_PASSWORD,
        grant_type: 'password',
        scope: 'SESSION:ROLE-ANY'
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }
      }
    )
    return this.accessToken = response.data.access_token
  }
}
