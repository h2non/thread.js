var _ = require('./utils')
var workerSrc = require('./worker')

var eventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent'
var messageEvent = eventMethod === 'attachEvent' ? 'onmessage' : 'message'
var addEventListener = window[eventMethod]
var removeEventListener = window[window.removeEventListener ? 'removeEventListener' : 'detachEvent']

module.exports = FakeWorker

function FakeWorker(id) {
  this.id = id
  this._terminated = false
  this.listeners = {}
  this._create()
  this._setupListeners()
  this._initialize()
}

FakeWorker.prototype._create = function () {
  var iframe = this.iframe = document.createElement('iframe')
  if (!iframe.style) iframe.style = {}
  iframe.style.display = 'none'
  iframe.id = 'thread-' + this.id
  document.body.appendChild(iframe)
}

FakeWorker.prototype._subscribeListeners = function (type) {
  var listeners = this.listeners
  if (eventMethod === 'attachEvent') type = 'on' + type

  function eventHandler(e) {
    if (e.data && e.data.owner === 'thread.js') {
      if (listeners[type]) {
        _.each(listeners[type], function (fn) {
          if (_.isFn(fn)) fn(e)
        })
      }
    }
  }

  this._eventHandler = eventHandler
  addEventListener(type, eventHandler)
}

FakeWorker.prototype._setupListeners = function () {
  this._subscribeListeners('message')
  this._subscribeListeners('error')
}

FakeWorker.prototype._unsubscribeListeners = function () {
  removeEventListener('error', this._eventHandler)
  removeEventListener('message', this._eventHandler)
}

FakeWorker.prototype._getWindow = function () {
  var win = null
  if (!this._terminated) {
    win = this.iframe.contentWindow
    var wEval = win.eval
    if (!wEval && win.execScript) {
      // win.eval() magically appears when this is called in IE
      win.execScript('null')
      wEval = win.eval
    }
  }
  return win
}

FakeWorker.prototype._initialize = function (msg) {
  var win = this._getWindow()
  if (win) win.eval.call(win, _.getSource(workerSrc))
}

FakeWorker.prototype.addEventListener = function (type, fn) {
  var pool = this.listeners[type] = this.listeners[type] || []
  if (_.isFn(fn)) pool.push(fn)
}

FakeWorker.prototype.removeEventListener = function (type, fn) {
  var index, pool = this.listeners[type]
  if (pool) {
    if (_.isFn(fn)) {
      pool.splice(0, pool.length)
    } else {
      index = pool.indexOf(fn)
      if (index >= 0) pool.splice(index, 1)
    }
  }
}

FakeWorker.prototype.postMessage = function (msg) {
  var win = this._getWindow()
  if (win) {
    msg.origin = _.getLocation()
    win.postMessage(msg, msg.origin)
  }
}

FakeWorker.prototype.terminate = function () {
  this.listeners = {}
  this._terminated = true
  this._unsubscribeListeners()
  document.body.removeChild(this.iframe)
}
