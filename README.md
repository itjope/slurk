SLURK - Slack Bot
=====

Stores and indexes URL:s posted in Slack.

URL:s and "[unfurled](https://api.slack.com/docs/message-attachments#unfurling)" metadata are stored in plain JSON and indexed using [Elasticlunr.js](https://github.com/weixsong/elasticlunr.js) full-text search engine.

Usage
------
* Paste an URL to a channel where Slurk is active.
* Wait for Slurk to mark your message with a :white_check_mark:.
* Search by mention bot name followed with a search string. Example `@slurk software`.

Searchable fields:
* Message text
* URL Parts
* Service name  (unfurled)
* Description  (unfurled)
* Title  (unfurled)
* User

Setup
------

### Create Slack Bot integration

Go to [Create a Slack Bot](https://api.slack.com/bot-users) page and, if you haven't already, generate a token. This is your `SLACK_API_TOKEN`.

### Docker
```
docker run -d -name "slurk" -v /($pwd)/:/data -e "SLACK_API_TOKEN=abc123"  itjope/slurk
```

You can map the container's volumes to a directory on the host, so that the data is kept between runs of the container. This example uses your current directory, but that is in general not the correct place to store your persistent data!

### Node.js
```
npm install itjope/slurk

SLACK_API_TOKEN=abc123 DB_FILE_PATH=data/db.json npm start
```
