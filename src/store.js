var _ = require('./utils')

var buf = []
var store = module.exports = {}

store.push = function (thread) {
  buf.push(thread)
}

store.all = function () {
  return buf.slice()
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

function getByStatus(type) {
  var typeBuf = []
  _.each(buf, function (thread) {
    if (thread[type]()) typeBuf.push(thread)
  })
  return typeBuf
}

store.running = function () {
  return getByStatus('running')
}

store.idle = function () {
  return getByStatus('idle')
}

store.killAll = function () {
  var arr = buf.slice()
  _.each(arr, function (thread) {
    thread.kill()
  })
}

store.killIdle = function () {
  _.each(store.idle(), function (thread) {
    thread.kill()
  })
}
