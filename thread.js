/*! thread.js - v0.1 - MIT License - https://github.com/h2non/thread.js */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.thread=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var _ = require('./utils')
var workerSrc = require('./worker')

var eventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent'
var messageEvent = eventMethod === 'attachEvent' ? 'onmessage' : 'message'
var addEventListener = window[eventMethod]

module.exports = FakeWorker

function FakeWorker(id) {
  this.listeners = {}
  this.id = id
  this._create()
  this._setupListeners()
  this._initialize()
}

FakeWorker.prototype._create = function() {
  var iframe = this.iframe = document.createElement('iframe')
  if (!iframe.style) iframe.style = {}
  iframe.style.display = 'none'
  iframe.id = 'thread-' + this.id
  document.body.appendChild(iframe)
}

FakeWorker.prototype._subscribeListeners = function(type) {
  var listeners = this.listeners
  if (eventMethod === 'attachEvent') type = 'on' + type;
  addEventListener(type, function(e) {
    if (e.data && e.data.owner === 'thread.js') {
      if (listeners[type]) {
        _.each(listeners[type], function(fn) { fn(e) })
      }
    }
  })
}

FakeWorker.prototype._setupListeners = function() {
  this._subscribeListeners('message')
  this._subscribeListeners('error')
}

FakeWorker.prototype._getWindow = function() {
  var win = this.iframe.contentWindow
  var wEval = win.eval, wExecScript = win.execScript
  if (!wEval && wExecScript) {
    // win.eval() magically appears when this is called in IE
    wExecScript.call(win, 'null')
    wEval = win.eval
  }
  return win
}

FakeWorker.prototype._initialize = function(msg) {
  var win = this._getWindow()
  win.eval.call(win, _.getSource(workerSrc))
  //win.postMessage('', getLocation())
}

FakeWorker.prototype.addEventListener = function(type, fn) {
  var pool = this.listeners[type] = this.listeners[type] || []
  pool.push(fn)
}

FakeWorker.prototype.removeEventListener = function(type, fn) {
  var pool = this.listeners[type]
  if (pool) {
    if (_.isFn(fn)) {
      pool.splice(0, pool.length)
    } else {
      var index = pool.indexOf(fn)
      if (~index) {
        pool.splice(index, 1)
      }
    }
  }
}

FakeWorker.prototype.postMessage = function(msg) {
  var win = this._getWindow()
  msg.origin = getLocation()
  win.postMessage(msg, msg.origin)
}

FakeWorker.prototype.terminate = function() {
  this.listeners = null
  document.body.removeChild(this.iframe)
}

function getLocation() {
  return location.origin ||
    location.protocol + "//" + location.hostname + (location.port ? ':' + location.port : '')
}

},{"./utils":5,"./worker":6}],2:[function(require,module,exports){
var Thread = require('./thread')

module.exports = ThreadFactory

function ThreadFactory(options) {
  return new Thread(options)
}

ThreadFactory.VERSION = '0.1.0'
ThreadFactory.create = ThreadFactory
ThreadFactory.Task = Thread.Task
ThreadFactory.Thread = Thread

},{"./thread":4}],3:[function(require,module,exports){
var _ = require('./utils')

module.exports = Task

function Task(thread) {
  this.id = _.generateUUID()
  this.thread = thread
  this.worker = thread._worker
  this.env = {}
  this.memoized = null
  this.listeners = {
    error: [],
    success: [],
    end: []
  }
  this._subscribe()
}

Task.prototype._buildError = function (data) {
  var err = new Error(data.error)
  err.name = data.errorName
  err.stack = data.errorStack
  return err
}

Task.prototype._getValue = function (data) {
  return data.type === 'run:error' ? this._buildError(data) : data.value
}

Task.prototype._trigger = function (value, type) {
  (function recur(pool) {
    var fn = pool.shift()
    if (fn) {
      fn(value)
      if (pool.length) recur(pool)
    }
  })(this.listeners[type])
}

Task.prototype._subscribe = function () {
  var self = this
  this.worker.addEventListener('message', onMessage)

  function onMessage(ev) {
    var dispatch
    var data = ev.data
    var type = data.type
    var list = self.listeners

    if (data && data.id === self.id) {
      if (type === 'run:error' || type === 'run:success') {
        self.worker.removeEventListener('message', onMessage)
        self.memoized = ev.data

        data = self._getValue(data)
        self._trigger(data, type.split(':')[1])
        self._trigger(data, 'end')
      }
    }
  }
}

Task.prototype.setEnv = function (env) {
  _.extend(this.env, env)
  return this
}

Task.prototype.run = function (fn, env) {
  var self = this

  if (!_.isFn(fn)) {
    throw new TypeError('first argument must be a function')
  }

  var env = _.extend({}, this.env, env)
  this.memoized = null

  var maxDelay = this.thread.maxTaskDelay
  if (maxDelay > 250) {
    var now = new Date().getTime()
    var timer = setInterval(function () {
      if (self.memoized) {
        return clearInterval(timer)
      }
      if ((new Date().getTime() - now) > maxDelay) {
        var error = new Error('maximum task execution exceeded')
        self.memoized = { type: 'run:error', error: error }
        self._trigger(error, 'error')
        self._trigger(error, 'end')
        clearInterval(timer)
      }
    }, 250)
  }

  this.worker.postMessage({
    id: this.id,
    type: 'run',
    env: env,
    src: fn.toString()
  })

  return this
}

Task.prototype.then = function (fn, errorFn) {
  if (_.isFn(fn)) {
    if (this.memoized) {
      if (this.memoized.type === 'run:success')
        fn(this._getValue(this.memoized))
    } else {
      this.listeners.success.push(fn)
    }
  }
  if (_.isFn(errorFn)) {
    this.catch(errorFn)
  }
  return this
}

Task.prototype.catch = function (fn) {
  if (_.isFn(fn)) {
    if (this.memoized) {
      if (this.memoized.type === 'run:error')
        fn(this._getValue(this.memoized))
    } else {
      this.listeners.error.push(fn)
    }
  }
  return this
}

Task.prototype.finally = function (fn) {
  if (_.isFn(fn)) {
    if (this.memoized) {
      fn(this._getValue(this.memoized))
    } else {
      this.listeners.end.push(fn)
    }
  }
  return this
}

Task.prototype.flush = function () {
  this.memoized = this.worker = this.env = null
}

Task.create = function (options) {
  return new Task(options)
}

},{"./utils":5}],4:[function(require,module,exports){
var _ = require('./utils')
var workerSrc = require('./worker')
var Task = require('./task')
var FakeWorker = require('./fake-worker')

var global = window
var URL = global.URL || global.webkitURL
var hasWorkers = _.isFn(global.Worker)

module.exports = Thread

function Thread(options) {
  this.options = {}
  this._terminated = false
  this.maxTaskDelay = 5 * 1000
  this.id = _.generateUUID()
  this._setOptions(options)
  this._create()
}

Thread.prototype._setOptions = function (options) {
  this.options.namespace = 'env'
  this.options.require = []
  this.options.env = {}
  _.extend(this.options, options)
  return this
}

Thread.prototype._create = function () {
  var blob, src = _.getSource(workerSrc)

  if (URL) {
    try {
      blob = new Blob([src], { type: 'text/javascript' })
    } catch (e) {
      var BlobBuilder = global.BlobBuilder || global.WebKitBlobBuilder || global.MozBlobBuilder;
      blob = new BlobBuilder()
      blob.append(src)
      blob = blob.getBlob()
    }
    blob = URL.createObjectURL(blob)
  }

  if (hasWorkers && URL) {
    this._worker = new Worker(blob)
  } else {
    this._worker = new FakeWorker(this.id)
  }

  this.send(_.extend({ type: 'start' }, this.options))
  this._worker.addEventListener('error', function (e) { throw e })

  return this
}

Thread.prototype.require = function (name, fn) {
  if (_.isFn(name)) {
    fn = name
    name = _.fnName(fn)
    if (!name) { throw new Error('Function must have a name') }
    this.send({ type: 'require:fn', src: fn.toString(), name: _.fnName(fn) })
  } else if (typeof name === 'string') {
    if (_.isFn(fn)) {
      this.send({ type: 'require:fn', src: fn.toString(), name: name })
    } else {
      this.send({ type: 'require:file', src: name })
    }
  } else if (_.isObj(name)) {
    _.each(name, function (fn, key) {
      if (_.isFn(fn)) { name[key] = fn.toString() }
    })
    this.send({ type: 'require:map', src: name })
  }
}

Thread.prototype.run = Thread.prototype.exec = function (fn, env) {
  var task
  if (fn instanceof Task) {
    task = fn
  } else {
    task = new Task(this)
  }
  _.defer(function () { task.run(fn, env) })
  return task
}

Thread.prototype.bind = function (env) {
  this.send({ type: 'env', data: env })
  return this
}

Thread.prototype.send = function (msg) {
  if (this._worker) {
    this._worker.postMessage(msg)
  }
}

Thread.prototype.terminate = Thread.prototype.kill = function () {
  if (!this._terminated) {
    this.options = {}
    this._terminated = true
    this._worker.terminate()
  }
  return this
}

Thread.prototype.start = function (options) {
  if (this._terminated) {
    this._setOptions(options)
    this._terminated = false
    this._create()
  }
  return this
}

Thread.Task = Task

},{"./fake-worker":1,"./task":3,"./utils":5,"./worker":6}],5:[function(require,module,exports){
var _ = exports
var toStr = Object.prototype.toString

exports.isFn = function isFn(obj) {
  return typeof obj === 'function'
}

exports.isObj = function isObj(o) {
  return o && toStr.call(o) === '[object Object]'
}

exports.isArr = function isArr(o) {
  return o && toStr.call(o) === '[object Array]'
}

exports.toArr = function toArr(args) {
  return Array.prototype.slice.call(args)
}

exports.defer = function defer(fn) {
  setTimeout(fn, 1)
}

exports.bind = function bind(ctx, fn) {
  return function () { fn.apply(ctx, arguments) }
}

exports.each = function each(obj, fn) {
  var i, l
  if (_.isArr(obj)) {
    for (i = 0, l = obj.length; i < l; i += 1) {
      fn(obj[i], i)
    }
  } else if (_.isObj(obj)) {
    for (i in obj) if (obj.hasOwnProperty(i)) {
      fn(obj[i], i)
    }
  }
}

exports.extend = function extend(target) {
  var args = _.toArr(arguments).slice(1)
  _.each(args, function (obj) {
    _.each(obj, function (value, key) {
      target[key] = value
    })
  })
  return target
}

exports.clone = function clone(obj) {
  return _.extend({}, obj)
}

exports.getSource = function getSource(fn) {
  return '(' + fn.toString() + ').call(this)'
}

exports.fnName = function fnName(fn) {
  return fn.name || /\W*function\s+([\w\$]+)\(/.exec(fn.toString())[1]
}

exports.generateUUID = function generateUUID() {
  var d = new Date().getTime()
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random() * 16) % 16 | 0
    d = Math.floor(d / 16)
    return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16)
  })
  return uuid
}

},{}],6:[function(require,module,exports){
module.exports = worker

function worker() {
  var self = self || this

  function evalExpr(expr) {
    var fn = null
    eval('fn = ' + expr)
    return fn
  }

  (function isolated() {
    var namespace = 'env'
    var isWorker = self.document === undefined
    var toStr = Object.prototype.toString
    var eventMethod = self.addEventListener ? 'addEventListener' : 'attachEvent'
    var messageEvent = eventMethod === 'attachEvent' ? 'onmessage' : 'message'
    var importFn = isWorker ? importScripts : appendScripts
    var ready = false
    var queue, origin, scriptsLoad, intervalId = null
    self.addEventListener = self[eventMethod]

    function isObj(o) {
      return o && toStr.call(o) === '[object Object]'
    }

    function isArr(o) {
      return o && Array.isArray ? Array.isArray(o) : toStr.call(o) === '[object Array]'
    }

    function each(obj, fn) {
      var i, l
      if (isArr(obj)) {
        if (obj.forEach) {
          obj.forEach(fn)
        } else {
          for (i = 0, l = obj.length; i < l; i += 1) {
            fn(obj[i], i)
          }
        }
      } else if (isObj(obj)) {
        for (i in obj) if (obj.hasOwnProperty(i)) {
          fn(obj[i], i)
        }
      }
    }

    function waitReady() {
      var dom = self.document

      if (dom.readyState === 'complete') {
        ready = true
      } else {
        self.document.onreadystatechange = function() {
          if (document.readyState === 'complete') {
            ready = true
          }
        }
      }
    }

    function appendScript(src) {
      var head = document.getElementsByTagName('head')[0]
      var script = document.createElement('script')
      script.type = 'text/javascript'
      script.src = src
      scriptsLoad.push(script)

      script.onload = script.onreadystatechange = function() {
        if (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete') {
          scriptsLoad.splice(scriptsLoad.indexOf(script), 1)
        }
        script.onload = script.onreadystatechange = null
      }

      head.appendChild(script)
    }

    function appendScripts() {
      var args = Array.prototype.slice.call(arguments)
      for (var i = 0; i < args.length; i += 1) {
        if (args[i]) appendScript(args[i])
      }
    }

    function scriptsLoadTimer() {
      intervalId = setInterval(function() {
        if (ready && !scriptsLoad.length) {
          clearInterval(intervalId)
          each(queue, function (fn) { fn() })
          queue = []
          intervalId = null
        }
      }, 50)
    }

    function loadScripts(src) {
      if (isArr(src)) {
        importFn.apply(self, src)
      } else {
        importFn(src)
      }
      if (!isWorker && !intervalId) {
        scriptsLoadTimer()
      }
    }

    function require(src) {
      if (isArr(src) || typeof src === 'string') {
        loadScripts(src)
      } else if (isObj(src)) {
        each(src, function (value, name) {
          requireFn(name, value)
        })
      }
    }

    function requireFn(name, fn) {
      eval('self[namespace][name] = ' + fn)
    }

    function postMessage(msg) {
      if (isWorker) {
        self.postMessage(msg)
      } else {
        msg.owner = 'thread.js'
        self.parent.postMessage(msg, origin)
      }
    }

    function sendError(msg, err) {
      postMessage({
        type: 'run:error',
        id: msg.id,
        error: err.message || err,
        errorName: err.name || null,
        errorStack: err.stack || null
      })
    }

    function sendSuccess(msg, val) {
      postMessage({
        type: 'run:success',
        id: msg.id,
        value: val
      })
    }

    function done(msg) {
      return function(err, value) {
        if (err) {
          sendError(msg, err)
        } else {
          sendSuccess(msg, value)
        }
      }
    }

    function process(msg) {
      var fn = evalExpr(msg.src)
      if (fn.length > 0) {
        fn.call(self, done(msg))
      } else {
        fn = fn.call(self)
        sendSuccess(msg, fn)
      }
    }

    function run(msg) {
      function doJob() {
        try {
          process(msg)
        } catch (e) {
          sendError(msg, e)
        }
      }

      if (!isWorker && (!ready || scriptsLoad.length)) {
        queue.push(doJob)
      } else {
        doJob()
      }
    }

    function start(e) {
      if (e.require) {
        require(e.require)
      }
      if (e.origin) {
        origin = e.origin
      }

      namespace = e.namespace || namespace
      self[namespace] = e.env || {}
    }

    function extendEnv(data) {
      if (isObj(data.env)) {
        extend(self[namespace], data.env)
      }
    }

    function onMessage(ev) {
      var data = ev.data
      if (data.origin) {
        origin = data.origin
      }

      switch (data.type) {
        case 'start': start(data); break
        case 'run': run(data); break
        case 'env': extendEnv(data); break
        case 'require:fn': requireFn(data.name, data.src); break
        case 'require:file':
        case 'require:map': require(data.src); break
      }
    }

    if (!isWorker) {
      // initialize
      scriptsLoad = []
      queue = []
      waitReady()
    }

    self.addEventListener(messageEvent, onMessage)
    self.addEventListener('error', function (err) {
      throw err
    })
  })()
}

},{}]},{},[2])(2)
});