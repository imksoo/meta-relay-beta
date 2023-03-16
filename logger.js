const pino = require('pino')

module.exports.logger = pino({
  level: 'trace',
  transport: {
    targets: [
      /* {
        level: 'trace',
        target: 'pino/file',
        options: {
          destination: 'logs/out.log',
          mkdir: true
        }
      }, */
      {
        level: 'trace',
        target: './console-log.mjs'
      }
    ]
  }
})
