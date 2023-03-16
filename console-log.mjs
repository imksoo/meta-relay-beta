import build from 'pino-abstract-transport'

export default function (opts) {
  return build((source) => {
    source.on('data', (obj) => {
      console.log(JSON.stringify(obj))
    })
  })
}
