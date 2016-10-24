const RtmClient = require('@slack/client').RtmClient
const WebClient = require('@slack/client').WebClient
const RTM_EVENTS = require('@slack/client').RTM_EVENTS
const MemoryDataStore = require('@slack/client').MemoryDataStore

const Slack = opt => {
  const options = Object.assign({
    token: null,
    search: null
  }, opt)

  const rtmClient = new RtmClient(options.token, {
    logLevel: 'error',
    dataStore: new MemoryDataStore()
  })

  const webClient = new WebClient(options.token)

  const isURL = text => text && text.indexOf('<http') > -1
  const extractURLs = text => (
    text.match(/<(.+?)>/g)
      .map(url => url.replace(/<|>/g, ''))
      .map(url => url.split('|')[0])
  )

  const extractBotCommand = text => text.replace(/<(.+?)>/g, '')

  const messageToDocs = (dataStore, message) => {
    const user = dataStore.getUserById(message.user)
    const team = dataStore.getTeamById(message.team)
    const channel = dataStore.getChannelById(message.channel)
    const docs = extractURLs(message.text).map(url => ({
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

  const handleMessage = (message) => {
    const docs = messageToDocs(rtmClient.dataStore, message)
    docs.forEach(options.search.saveDoc)
  }

  const createAttachmentFromDoc = (doc) => ({
    "fallback": doc.url,
    "title": doc.url,
    "text": doc.description,
    "author_name": doc.service,
    "author_icon": doc.icon,
    "footer": doc.user,
    "ts": doc.timestamp
  })

  const createResponse = (docs) => {
    const message = {
      username: 'Slurk',
      attachments: docs.map(createAttachmentFromDoc)
    }
    if (message.attachments.length < 1) {
      message.attachments = [{
        "title": "No match"
      }]
    }
    return message
  }

  const isBotCommand = (text) => text && text.indexOf(`<@${rtmClient.activeUserId}>`) > -1

  const handleMessageEvent = (m) => {
    // console.log(JSON.stringify(m, null, 4))

    if (m.type === 'message' && m.subtype === 'message_changed' && isURL(m.message.text)) {
      handleMessage(m.message)
    } else if (m.type === 'message' && isURL(m.text)) {
      handleMessage(m)
    } else if (isBotCommand(m.text)){
      const searchString = extractBotCommand(m.text)
      options.search.search(searchString).then(docs => {
        const responseMessage = createResponse(docs)
        webClient.chat.postMessage(m.channel, `Search results for _${searchString}_`, responseMessage)
      }).catch(err => console.log(err))
    }
  }
  console.log('Rebuilding index...')
  options.search.loadDocs().then(numberOfDocs => {
    console.log(numberOfDocs, 'docs in index')

    rtmClient.on(RTM_EVENTS.MESSAGE, handleMessageEvent)
    rtmClient.start()
    console.log('Bot is ready')

  }).catch(err => {
    console.log('Falled to recreate index', err)
  })
}

module.exports = Slack
