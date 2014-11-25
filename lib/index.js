var store = require('./store')
var Thread = require('./thread')

module.exports = ThreadFactory
window.thread = window.thread || ThreadFactory

function ThreadFactory(options) {
  return new Thread(options)
}

ThreadFactory.VERSION = '0.1.11'
ThreadFactory.create = ThreadFactory
ThreadFactory.Task = Thread.Task
ThreadFactory.Thread = Thread

ThreadFactory.total = store.all
ThreadFactory.total = store.total
ThreadFactory.running = store.running
ThreadFactory.idle = store.idle
ThreadFactory.flush = store.flush
ThreadFactory.killAll = ThreadFactory.terminateAll = store.killAll
ThreadFactory.killIdle = ThreadFactory.terminateIdle = store.killIdle
