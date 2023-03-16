import { logger } from './logger.js'

import { WebSocket, WebSocketServer } from 'ws'
import stringify from 'json-stable-stringify'

const relay = new WebSocketServer({ port: 8080 })
const upstream = new WebSocket('wss://relay.nostr.wirednet.jp')

const MAX_HISTORY_SIZE = 1000
const REMOVAL_RATIO = 0.2

relay.on('connection', (downstream, request) => {
  logger.info('downstream open')
  const remoteIp = request.socket.remoteAddress
  const fowardedIpList = request.headers['x-forwarded-for'].split(',')

  const messages = new Set()
  let totalMessages = 0
  let suppressedMessages = 0
  let mutedMessages = 0

  upstream.on('error', logger.error)
  upstream.on('open', () => {
    logger.info('upstream open')
  })
  upstream.on('message', (data) => {
    const msg = JSON.parse(data)
    // logger.info({ remoteIp, fowardedIpList, data: JSON.stringify(msg) }, 'upstream.on(message)')

    ++totalMessages
    const eventJSON = stringify(msg)
    if (!messages.has(eventJSON)) {
      messages.add(eventJSON)
      if (eventJSON.indexOf('avive.world') > 0 || eventJSON.indexOf('lnbc') > 0 || eventJSON.indexOf('web3') > 0 || eventJSON.indexOf('海外留学生') > 0 || eventJSON.indexOf('交流') > 0) {
        logger.info('mute keyword detects in message.')
        ++mutedMessages
      } else {
        downstream.send(eventJSON)
      }
    } else {
      logger.info('duplicate message suppressed.')
      ++suppressedMessages
    }

    if (messages.size > MAX_HISTORY_SIZE) {
      logger.trace('message history size = ' + messages.size)
      const numToRemove = Math.floor(messages.size * REMOVAL_RATIO)
      for (let i = 0; i < numToRemove; ++i) {
        messages.delete(messages.values().next().value)
      }
      logger.info('message reduced. numToRemove=' + numToRemove)
      logger.trace('message history size = ' + messages.size)
    }

    logger.info({ suppressedMessages, mutedMessages, totalMessages })
  })

  downstream.on('error', logger.error)
  downstream.on('message', (data) => {
    const msg = JSON.parse(data)
    logger.info({ remoteIp, fowardedIpList, data: JSON.stringify(msg) }, 'downstream.on(message)')

    /* 冗長化の意味でEVENTを複数のリレーに飛ばすのはそのうちやりたい
    if (msg[0] === 'EVENT') {
      logger.error('ignore EVENT writes.')
    } else {
      upstream.send(JSON.stringify(msg))
    } // */
    upstream.send(JSON.stringify(msg))
  })
})
