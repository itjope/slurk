const elasticlunr = require('elasticlunr')
const RtmClient = require('@slack/client').RtmClient
const WebClient = require('@slack/client').WebClient
const fs = require('fs')
var token = process.env.SLACK_API_TOKEN || '';
const RTM_EVENTS = require('@slack/client').RTM_EVENTS
const MemoryDataStore = require('@slack/client').MemoryDataStore

const SLACK_API_TOKEN = process.env.SLACK_API_TOKEN || ''
const searchIndex = elasticlunr()
const rtm = new RtmClient(SLACK_API_TOKEN, {
  logLevel: 'error',
  dataStore: new MemoryDataStore()
})
const webClient = new WebClient(token)

const init = () => {
  createIndex(searchIndex, 'id', getDocTemplate())
  loadDocsFromDisk(searchIndex, 'db.json')
  console.log('Index loaded')
  rtm.on(RTM_EVENTS.MESSAGE, handleMessageEvent)
  rtm.start()
  console.log('Listening for Slack messages')
}

const saveSearchIndexToDisk = (index) => (
  new Promise((resolve, reject) => {
    const docs = index.documentStore.docs
    console.log(docs)
    fs.writeFile('db.json', JSON.stringify(docs), (err) => {
      if (err) reject(err)
      resolve()
    })
  })
)

const loadDocsFromDisk = (index, file) => {
  const db = JSON.parse(fs.readFileSync(file, 'utf8'))
  Object.keys(db).forEach(key => {
    const doc = db[key]
    index.addDoc(doc)
  })
}

const getDocTemplate = () => ({
  id: null,
  url: null,
  urlParts: null,
  user: null,
  team: null,
  channel: null,
  timestamp: null,
  service: null,
  title: null,
  icon: null,
  description: null
})

const createIndex = (index, ref, docTemplate) => {
  index.setRef('id')
  Object.keys(getDocTemplate()).filter(key => key !== ref).forEach(key => {
    index.addField(key)
  })
}

const isURL = text => text && text.indexOf('<http') > -1
const extractURLs = text => (
  text.match(/<(.+?)>/g)
    .map(url => url.replace(/<|>/g, ''))
    .map(url => url.split('|')[0])
)

const extractBotCommand = text => text.replace(/<(.+?)>/g, '')

const messageToDocs = (message) => {
  const user = rtm.dataStore.getUserById(message.user)
  const team = rtm.dataStore.getTeamById(message.team)
  const channel = rtm.dataStore.getChannelById(message.channel)
  const docs = extractURLs(message.text).map(url => Object.assign(getDocTemplate(), {
    id: url,
    url: url,
    urlParts: url.replace('https://', '').replace('http://', '').split('.').join(', ').split('/').join(', '),
    user: user ? user.name : null,
    team: team ? team.name : null,
    channel: channel ? channel.name : null,
    timestamp: message.ts,
    service: message.attachments ? message.attachments[0].service_name : null,
    title: message.attachments ? message.attachments[0].title : null,
    icon:  message.attachments ? message.attachments[0].service_icon : null,
    description: message.attachments ? message.attachments[0].text : null
  }))
  return docs
}

const upsertDoc = index => doc => {
  const prevDoc = index.documentStore.getDoc(doc.id)
  if (prevDoc) {
    index.updateDoc(Object.assign(prevDoc, doc))
  } else {
    index.addDoc(doc)
  }
  console.log('doc upserted')
}

const handleMessage = (message) => {
  console.log('handleMessage', message)
  const docs = messageToDocs(message)
  docs.forEach(upsertDoc(searchIndex))
  saveSearchIndexToDisk(searchIndex).then(() => {
    console.log('Index saved to disk')
  }).catch((err) => {
    console.log('Failed to save index to disk', err)
  })
}

const createAttachmentFromDoc = (result) => ({
  "fallback": result.doc.url,
  "title": result.doc.url,
  "text": result.doc.description,
  "author_name": result.doc.service,
  "author_icon": result.doc.icon,
  "color": getColorFromScore(result.score),
  "footer": result.doc.user,
  "ts": result.doc.timestamp
})

const createResponse = (searchResults) => {
  const message = {
    username: 'Kurl',
    attachments: searchResults
      .map(searchResult => ({
        doc: searchIndex.documentStore.getDoc(searchResult.ref),
        score: searchResult.score
      }))
      .map(createAttachmentFromDoc)
  }
  if (message.attachments.length < 1) {
    message.attachments = [{
      "title": "No match"
    }]
  }
  return message
}

const isBotCommand = (text) => text && text.indexOf(`<@${rtm.activeUserId}>`) > -1

const getColorFromScore = (score) => {
  const colors = {
    green: '#03a30e',
    yellow: '#e4d01a',
    orange: '#d06638',
    red: '#c83232'
  }
  if (score > 0.6) return colors['green']
  if (score > 0.4) return colors['yellow']
  if (score > 0.2) return colors['orange']
  if (score) return colors['red']
}

handleMessageEvent = (m) => {
  // console.log(JSON.stringify(m, null, 4))

  if (m.type === 'message' && m.subtype === 'message_changed' && isURL(m.message.text)) {
    handleMessage(m.message)
  } else if (m.type === 'message' && isURL(m.text)) {
    handleMessage(m)
  } else if (isBotCommand(m.text)){
    // console.log(JSON.stringify(m, null, 4))
    const searchString = extractBotCommand(m.text)
    const searchResults = searchIndex.search(searchString)
    const responseMessage = createResponse(searchResults)
    webClient.chat.postMessage(m.channel, `Search results for _${searchString}_`, responseMessage)
  }
}

init()
/*
var mockedMessages = [{
    "type": "message",
    "channel": "D2SSB3FNG",
    "user": "U0FKWT3QX",
    "text": "<https://github.com/vuejs/vue>",
    "ts": "1477142243.000030",
    "team": "T0FKUCCAE"
},
{
    "type": "message",
    "message": {
        "type": "message",
        "user": "U0FKWT3QX",
        "text": "<https://github.com/vuejs/vue>",
        "attachments": [
            {
                "service_name": "GitHub",
                "title": "vuejs/vue",
                "title_link": "https://github.com/vuejs/vue",
                "text": "vue - Simple yet powerful library for building modern web interfaces.",
                "fallback": "GitHub: vuejs/vue",
                "thumb_url": "https://avatars3.githubusercontent.com/u/6128107?v=3&s=400",
                "from_url": "https://github.com/vuejs/vue",
                "thumb_width": 200,
                "thumb_height": 200,
                "service_icon": "https://github.com/apple-touch-icon.png",
                "id": 1
            }
        ],
        "ts": "1477142243.000030"
    },
    "subtype": "message_changed",
    "hidden": true,
    "channel": "D2SSB3FNG",
    "previous_message": {
        "type": "message",
        "user": "U0FKWT3QX",
        "text": "<https://github.com/vuejs/vue>",
        "ts": "1477142243.000030"
    },
    "event_ts": "1477142243.459865",
    "ts": "1477142243.000031"
}]

mockedMessages.forEach(handleMessageEvent)

*/
