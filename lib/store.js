var _ = require('./utils')

// ES5 shim for legacy browsers
function toInteger(num) {
  var n = +num
  if (n !== n) { // isNaN
      n = 0;
  } else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0)) {
      n = (n > 0 || -1) * Math.floor(Math.abs(n))
  }
  return n
}

if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function indexOf(sought /*, fromIndex */) {
    var self = Object(this)
    var length = self.length >>> 0

    if (!length) { return -1 }

    var i = 0
    if (arguments.length > 1) {
      i = toInteger(arguments[1])
    }

    // handle negative indices
    i = i >= 0 ? i : Math.max(0, length + i)
    for (; i < length; i++) {
      if (i in self && self[i] === sought) {
        return i
      }
    }
    return -1
  }
}
// end shim

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
