const figlet = require('figlet')
const DataStore = require('./DataStore')
const Search = require('./Search')
const Slack = require('./Slack')

const SLACK_API_TOKEN = process.env.SLACK_API_TOKEN
const DB_FILE_PATH = process.env.DB_FILE_PATH

const slack = Slack({
  search: Search({
    type: 'elasticlunr',
    dataStore: DataStore({
      type: 'file',
      path: DB_FILE_PATH
    })
  }),
  token: SLACK_API_TOKEN,
})

figlet('SLURK', (err, data) => {
    console.log(data)
    slack.start()
})
