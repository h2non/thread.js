var _ = require('./utils')

var buf = []
var store = module.exports = {}

store.push = function (thread) {
  buf.push(thread)
}

store.remove = function (thread) {
  var index = buf.indexOf(thread)
  if (index >= 0) buf.splice(index, 1)
}

store.flush = function () {
  buf.splice(0)
}

store.total = function () {
  return buf.length
}

store.running = function () {
  var running = []
  _.each(buf, function (thread) {
    if (thread.running()) running.push(thread)
  })
  return running
}

store.idle = function () {
  var idle = []
  _.each(buf, function (thread) {
    if (thread.idle()) idle.push(thread)
  })
  return idle
}

store.killAll = function () {
  var arr = buf.slice()
  _.each(arr, function (thread) {
    thread.kill()
  })
}
