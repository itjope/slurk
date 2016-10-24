const DataStore = require('./src/DataStore')
const Search = require('./src/Search')
const Slack = require('./src/Slack')

const SLACK_API_TOKEN = process.env.SLACK_API_TOKEN
const DB_FILE_PATH = process.env.DB_FILE_PATH || 'db.json'

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

/*
slack.on('ready', (e) => {
  console.log(`${e.botName} is ready to eat ${e.team}'s URLs!`)
  console.log(`Send a message to me, '@${e.botName} your search string', to search indexed URLs`)
})
*/
