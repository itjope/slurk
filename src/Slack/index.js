const RtmClient = require('@slack/client').RtmClient
const WebClient = require('@slack/client').WebClient
const RTM_EVENTS = require('@slack/client').RTM_EVENTS
const RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.RTM;
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
      .filter(isURL)
      .map(url => url.replace(/<|>/g, ''))
      .map(url => url.split('|')[0])
  )

  const getURLParts = url => url.replace('https://', '').replace('http://', '').split('.').join(', ').split('/').join(', ')

  const extractBotCommand = text => text.replace(/<(.+?)>/g, '')

  const removeURL = text => text.replace(/<(.+?)>/g, '')

  const messageToDocs = (dataStore, message) => {
    const user = dataStore.getUserById(message.user)
    const team = dataStore.getTeamById(message.team)
    const channel = dataStore.getChannelById(message.channel)
    const docs = extractURLs(message.text).map(url => ({
      id: url,
      url: url,
      urlParts: getURLParts(url),
      user: user ? user.name : undefined,
      team: team ? team.name : undefined,
      channel: channel ? channel.name : undefined,
      timestamp: message.ts,
      service: message.attachments ? message.attachments[0].service_name : undefined,
      title: message.attachments ? message.attachments[0].title : undefined,
      text: message.text ? removeURL(message.text) : undefined,
      icon:  message.attachments ? message.attachments[0].service_icon : undefined,
      description: message.attachments ? message.attachments[0].text : undefined
    }))
    return docs
  }

  const handleMessage = (message) => {
    const docs = messageToDocs(rtmClient.dataStore, message)
    const saves = docs.map(options.search.saveDoc)
    return Promise.all(saves)
  }

  const createAttachmentFromDoc = (doc) => ({
    "fallback": doc.url,
    "title": doc.url,
    "text": doc.description,
    "author_name": doc.service,
    "author_icon": doc.icon,
    "footer": `@${doc.user} ${doc.text || ' '}`,
    "ts": doc.timestamp
  })

  const createResponse = (docs) => {
    const message = {
      username: 'Slurk',
      attachments: docs.map(createAttachmentFromDoc)
    }
    if (message.attachments.length < 1) {
      message.attachments = [{
        "title": "Not found"
      }]
    }
    return message
  }

  const isBotCommand = (text) => text && text.indexOf(`<@${rtmClient.activeUserId}>`) > -1

  const isMessageFromSlurk = (message) => message.user === rtmClient.activeUserId

  const addReaction = (message) => {
    const channel = message.channel
    const timestamp = message.ts
    if (channel && timestamp) {
      webClient.reactions.add('white_check_mark', { channel, timestamp })
    }
  }

  const handleMessageEvent = (m) => {

    const message = m.subtype === 'message_changed' ? m.message : m
    if (isMessageFromSlurk(message)) {
      console.log('Message from Slurk - Do nothing')
    } else if (message.type === 'message' && isURL(message.text)) {
      handleMessage(message).then(() => {
        addReaction(message)
        console.log('Saved/updated message', message.text)
      })
    } else if (isBotCommand(m.text)){
      console.log('Searching for: ', m.text)
      const searchString = extractBotCommand(m.text)
      options.search.search(searchString).then(docs => {
        const responseMessage = createResponse(docs)
        webClient.chat.postMessage(m.channel, `Search results for _${searchString}_`, responseMessage)
      }).catch(err => console.log(err))
    }
  }

  const start = () => {
    console.log('Rebuilding index...')
    options.search.loadDocs().then(numberOfDocs => {
      console.log(`Found ${numberOfDocs} docs.`)
      rtmClient.on(RTM_EVENTS.MESSAGE, handleMessageEvent)
      rtmClient.on(RTM_CLIENT_EVENTS.RTM_CONNECTION_OPENED, () => {
          console.log('Connected - Ready to slurk and search!')
      })
      rtmClient.start()
    }).catch(err => {
      console.log('Falled to recreate index', err)
    })
  }

  return {
    start: start
  }
}

module.exports = Slack
