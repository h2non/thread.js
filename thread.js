/*! thread.js - v0.1 - MIT License - https://github.com/h2non/thread.js */
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.thread=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var _ = require('./utils')
var workerSrc = require('./worker')

var eventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent'
var messageEvent = eventMethod === 'attachEvent' ? 'onmessage' : 'message'
var addEventListener = window[eventMethod]
var removeEventListener = window[window.removeEventListener ? 'removeEventListener' : 'detachEvent']

module.exports = FakeWorker

function FakeWorker(id) {
  this.listeners = {}
  this.id = id
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
  if (eventMethod === 'attachEvent') type = 'on' + type;

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
  var win = this.iframe.contentWindow
  var wEval = win.eval, wExecScript = win.execScript
  if (!wEval && wExecScript) {
    // win.eval() magically appears when this is called in IE
    wExecScript.call(win, 'null')
    wEval = win.eval
  }
  return win
}

FakeWorker.prototype._initialize = function (msg) {
  var win = this._getWindow()
  win.eval.call(win, _.getSource(workerSrc))
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
      if (index > 0) {
        pool.splice(index, 1)
      }
    }
  }
}

FakeWorker.prototype.postMessage = function (msg) {
  var win = this._getWindow()
  msg.origin = getLocation()
  win.postMessage(msg, msg.origin)
}

FakeWorker.prototype.terminate = function () {
  this.listeners = null
  this._unsubscribeListeners()
  document.body.removeChild(this.iframe)
}

function getLocation() {
  return location.origin ||
    location.protocol + "//" + location.hostname + (location.port ? ':' + location.port : '')
}

},{"./utils":7,"./worker":8}],2:[function(require,module,exports){
var store = require('./store')
var Thread = require('./thread')

module.exports = ThreadFactory

function ThreadFactory(options) {
  return new Thread(options)
}

ThreadFactory.VERSION = '0.1.1'
ThreadFactory.create = ThreadFactory
ThreadFactory.Task = Thread.Task
ThreadFactory.Thread = Thread

ThreadFactory.total = store.total
ThreadFactory.running = store.running
ThreadFactory.idle = store.idle
ThreadFactory.flush = store.flush
ThreadFactory.killAll = ThreadFactory.terminateAll = store.killAll
ThreadFactory.killIdle = ThreadFactory.terminateIdle = store.killIdle

},{"./store":4,"./thread":6}],3:[function(require,module,exports){
var _ = require('./utils')

module.exports = pool

function pool(num, thread) {
  var threadRun = thread.run
  var threads = [ thread ]
  var options = thread.options
  var terminate = thread.terminate

  function findBestAvailableThread(offset) {
    var i, l, thread, pending
    for (i = 0, l = threads.length; i < l; i += 1) {
      thread = threads[i]
      pending = thread.pending()
      if (pending === 0 || pending < offset) {
        if (thread.terminated) {
          threads.splice(i, 1)
          l -= 1
        } else {
          return thread
        }
      }
    }
  }

  function newThread() {
    var thread = new pool.Thread(options)
    threads.push(thread)
    return thread
  }

  function runTask(thread, args) {
    var task
    if (thread === threads[0]) {
      task = threadRun.apply(thread, args)
    } else {
      task = thread.run.apply(thread, args)
    }
    return task
  }

  thread.run = thread.exec = function () {
    var args = arguments

    function nextThread(count) {
      var task, thread = findBestAvailableThread(count)
      if (thread) {
        task = runTask(thread, args)
      } else {
        if (threads.length < num) {
          task = runTask(newThread(), args)
        } else {
          task = nextThread(count + 1)
        }
      }
      return task
    }

    return nextThread(0)
  }

  thread.terminate = thread.kill = function () {
    _.each(threads, function (thread, i) {
      if (i === 0) terminate.call(thread)
      else thread.terminate()
    })
    threads.splice(0)
  }

  thread.threadPool = threads
  thread.isPool = true

  return thread
}

},{"./utils":7}],4:[function(require,module,exports){
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

store.killIdle = function () {
  _.each(store.idle(), function (thread) {
    thread.kill()
  })
}

},{"./utils":7}],5:[function(require,module,exports){
var _ = require('./utils')

module.exports = Task

function Task(thread, env) {
  this.id = _.generateUUID()
  this.thread = thread
  this.worker = thread.worker
  this.env = env || {}
  this.time = this.memoized = null
  this.listeners = {
    error: [],
    success: [],
    end: []
  }
  this._subscribe()
}

Task.intervalCheckTime = 200

Task.prototype._getValue = function (data) {
  return data.type === 'run:error' ? createError(data) : data.value
}

Task.prototype._trigger = function (value, type) {
  if (typeof this._timer === 'number') { clearTimer(this) }
  dispatcher(this, value)(this.listeners[type])
}

function dispatcher(self, value) {
  return function recur(pool) {
    var fn
    if (_.isArr(pool)) {
      fn = pool.shift()
      if (fn) {
        fn.call(self, value)
        if (pool.length) recur(pool)
      }
    }
  }
}

Task.prototype._subscribe = function () {
  this.worker.addEventListener('message', onMessage(this))
}

Task.prototype.bind = Task.prototype.set = function (env) {
  _.extend(this.env, env)
  return this
}

Task.prototype.run = Task.prototype.exec = function (fn, env, args) {
  var maxDelay, thread = this.thread

  if (!_.isFn(fn)) throw new TypeError('first argument must be a function')
  if (thread._terminated) throw new Error('cannot execute the task, the thread was terminated')
  if (_.isArr(env)) {
    args = env
    env = null
  }

  env = _.serializeMap(_.extend({}, this.env, env))
  this.memoized = null
  this.time = _.now()

  maxDelay = thread.maxTaskDelay
  if (maxDelay >= Task.intervalCheckTime) {
    initInterval(maxDelay, this)
  }
  if (thread._tasks.indexOf(this) === -1) {
    thread._tasks.push(this)
  }
  this['finally'](cleanTask(thread, this))

  this.worker.postMessage({
    id: this.id,
    type: 'run',
    env: env,
    src: fn.toString(),
    args: args
  })

  return this
}

function cleanTask(thread, task) {
  return function () {
    var index = thread._tasks.indexOf(task)
    thread._latestTask = _.now()
    if (index >= 0) thread._tasks.splice(index, 1)
  }
}

Task.prototype.then = function (fn, errorFn) {
  if (_.isFn(fn)) {
    if (this.memoized) {
      if (this.memoized.type === 'run:success')
        fn.call(this, this._getValue(this.memoized))
    } else {
      this.listeners.success.push(fn)
    }
  }
  if (_.isFn(errorFn)) { this['catch'](errorFn) }
  return this
}

Task.prototype['catch'] = function (fn) {
  if (_.isFn(fn)) {
    if (this.memoized) {
      if (this.memoized.type === 'run:error')
        fn.call(this, this._getValue(this.memoized))
    } else {
      this.listeners.error.push(fn)
    }
  }
  return this
}

Task.prototype['finally'] = function (fn) {
  if (_.isFn(fn)) {
    if (this.memoized) {
      fn.call(this, this._getValue(this.memoized))
    } else {
      this.listeners.end.push(fn)
    }
  }
  return this
}

Task.prototype.flush = function () {
  this.memoized = this.thread = null
  this.worker = this.env = this.listeners = null
}

Task.prototype.flushed = function () {
  return !this.thread && !this.worker
}

Task.create = function (thread) {
  return new Task(thread)
}

function createError(data) {
  var err = new Error(data.error)
  err.name = data.errorName
  err.stack = data.errorStack
  return err
}

function initInterval(maxDelay, self) {
  var error, now = _.now()
  self._timer = setInterval(function () {
    if (self.memoized) {
      clearTimer(self)
    } else {
      if ((_.now() - now) > maxDelay) {
        error = new Error('maximum task execution time exceeded')
        self.memoized = { type: 'run:error', error: error }
        self._trigger(error, 'error')
        self._trigger(error, 'end')
        clearTimer(self)
      }
    }
  }, Task.intervalCheckTime)
}

function clearTimer(self) {
  clearInterval(self._timer)
  self._timer = null
}

function onMessage(self) {
  return function handler(ev) {
    var data = ev.data
    var type = data.type

    if (data && data.id === self.id) {
      if (type === 'run:error' || type === 'run:success') {
        self.worker.removeEventListener('message', handler)
        self.memoized = ev.data

        data = self._getValue(data)
        self._trigger(data, type.split(':')[1])
        self._trigger(data, 'end')
      }
    }
  }
}

},{"./utils":7}],6:[function(require,module,exports){
var _ = require('./utils')
var workerSrc = require('./worker')
var Task = require('./task')
var FakeWorker = require('./fake-worker')
var pool = require('./pool')
var store = require('./store')

var URL = window.URL || window.webkitURL
var hasWorkers = _.isFn(window.Worker)
var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder

module.exports = Thread

function Thread(options) {
  this.terminated = false
  this.id = _.generateUUID()
  this.options = {}
  this._tasks = []
  this._latestTask = 0
  this._setOptions(options)
  this._create()
}

Thread.prototype.isPool = false
Thread.prototype.maxTaskDelay = 0
Thread.prototype.idleTime = 30 * 1000

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
      blob = new BlobBuilder()
      blob.append(src)
      blob = blob.getBlob()
    }
    blob = URL.createObjectURL(blob)
  }

  if (hasWorkers && URL) {
    this.worker = new Worker(blob)
  } else {
    this.worker = new FakeWorker(this.id)
  }

  store.push(this)

  this.send(_.extend({ type: 'start' }, {
    env: _.serializeMap(this.options.env),
    namespace: this.options.namespace
  }))
  this.worker.addEventListener('error', function (e) { throw e })
  this.require(this.options.require)

  return this
}

Thread.prototype.require = Thread.prototype['import'] = function (name, fn) {
  if (_.isFn(name)) {
    fn = name
    name = _.fnName(fn)
    if (!name) { throw new Error('Function must have a name') }
    this.send({ type: 'require:fn', src: fn.toString(), name: _.fnName(fn) })
  } else if (typeof name === 'string') {
    if (_.isFn(fn)) {
      this.send({ type: 'require:fn', src: fn.toString(), name: name })
    } else {
      if (_.isArr(this.options.require)) this.options.require.push(name)
      this.send({ type: 'require:file', src: name })
    }
  } else if (_.isArr(name)) {
    if (_.isArr(this.options.require)) this.options.require = this.options.require.concat(name)
    this.send({ type: 'require:file', src: name })
  } else if (_.isObj(name)) {
    this.send({ type: 'require:map', src: _.serializeMap(name) })
  }
  return this
}

Thread.prototype.run = Thread.prototype.exec = function (fn, env, args) {
  var task, index, self = this
  var tasks = self._tasks

  if (_.isArr(fn)) {
    args = fn
    fn = arguments[1]
  }
  if (_.isArr(env)) {
    args = env
    env = arguments[2]
  }

  if (fn instanceof Task) {
    task = fn
  } else {
    if (!_.isFn(fn)) throw new TypeError('missing function argument')
    task = new Task(this)
  }

  this._tasks.push(task)
  _.defer(function () { task.run(fn, env, args) })

  return task
}

Thread.prototype.bind = Thread.prototype.set = function (env) {
  this.send({ type: 'env', data: _.serializeMap(env) })
  return this
}

Thread.prototype.flush = function () {
  this.send({ type: 'flush' })
  this.options.env = {}
  return this
}

Thread.prototype.flushTasks = function () {
  _.each(this.tasks, function (task) {
    task.flush()
  })
  this._tasks.splice(0)
  return this
}

Thread.prototype.send = function (msg) {
  if (this.worker) {
    this.worker.postMessage(msg)
  }
}

Thread.prototype.pool = function (num) {
  return pool(num || 2, this)
}

pool.Thread = Thread

Thread.prototype.terminate = Thread.prototype.kill = function () {
  if (!this.terminated) {
    this.options = {}
    this.flushTasks().flush()
    this.terminated = true
    this.worker.terminate()
    store.remove(this)
  }
  return this
}

Thread.prototype.start = Thread.prototype.init = function (options) {
  if (this.terminated) {
    this._setOptions(options)
    this._create()
    this.terminated = false
  }
  return this
}

Thread.prototype.pending = function () {
  return this._tasks.length
}

Thread.prototype.running = function () {
  return this._tasks.length > 0
}

Thread.prototype.idle = Thread.prototype.sleep = function () {
  return !this.running() && !this.terminated
    && (this._latestTask === 0 || (_.now() - this._latestTask) > this.idleTime)
}

Thread.prototype.on = Thread.prototype.addEventListener = function (type, fn) {
  if (this.worker) {
    this.worker.addEventListener(type, fn)
  }
  return this
}

Thread.prototype.off = Thread.prototype.removeEventListener = function (type, fn) {
  if (this.worker && _.isFn(fn)) {
    this.worker.removeEventListener(type, fn)
  }
  return this
}

Thread.Task = Task

},{"./fake-worker":1,"./pool":3,"./store":4,"./task":5,"./utils":7,"./worker":8}],7:[function(require,module,exports){
var _ = exports
var toStr = Object.prototype.toString
var slice = Array.prototype.slice

exports.now = function () {
  return new Date().getTime()
}

exports.isFn = function (obj) {
  return typeof obj === 'function'
}

exports.isObj = function (o) {
  return o && toStr.call(o) === '[object Object]'
}

exports.isArr = function (o) {
  return o && toStr.call(o) === '[object Array]'
}

exports.toArr = function (args) {
  return slice.call(args)
}

exports.defer = function (fn) {
  setTimeout(fn, 1)
}

exports.bind = function (ctx, fn) {
  return function () { fn.apply(ctx, arguments) }
}

exports.each = function (obj, fn) {
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

exports.extend = function (target) {
  var args = _.toArr(arguments).slice(1)
  _.each(args, function (obj) {
    _.each(obj, function (value, key) {
      target[key] = value
    })
  })
  return target
}

exports.getSource = function (fn) {
  return '(' + fn.toString() + ').call(this)'
}

exports.fnName = function (fn) {
  return fn.name || (fn = /\W*function\s+([\w\$]+)\(/.exec(fn.toString()) ? fn[1] : '')
}

exports.serializeMap = function (obj) {
  if (_.isObj(obj)) {
    _.each(obj, function (fn, key) {
      if (_.isFn(fn)) {
        obj['$$fn$$' + key] = fn.toString()
        obj[key] = undefined
      }
    })
  }
  return obj
}

exports.generateUUID = function () {
  var d = new Date().getTime()
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0
    d = Math.floor(d / 16)
    return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16)
  })
  return uuid
}

},{}],8:[function(require,module,exports){
module.exports = worker

function worker() {
  var self = this

  function $$evalExpr(expr) {
    var fn = null
    eval('fn = ' + expr)
    return fn
  }

  (function isolated() {
    var namespace = 'env'
    var isWorker = self.document === undefined
    var toStr = Object.prototype.toString
    var slice = Array.prototype.slice
    var eventMethod = self.addEventListener ? 'addEventListener' : 'attachEvent'
    var messageEvent = eventMethod === 'attachEvent' ? 'onmessage' : 'message'
    var importFn = isWorker ? importScripts : appendScripts
    var ready = false
    var queue, origin, scriptsLoad, intervalId = null
    var fnRegex = /^\$\$fn\$\$/
    self.addEventListener = self[eventMethod]

    function isObj(o) {
      return o && toStr.call(o) === '[object Object]'
    }

    function isArr(o) {
      return o && Array.isArray ? Array.isArray(o) : toStr.call(o) === '[object Array]'
    }

    function mapFields(obj) {
      for (var key in obj) if (obj.hasOwnProperty(key)) {
        if (fnRegex.test(key)) {
          obj[key.replace('$$fn$$', '')] = $$evalExpr(obj[key])
          obj[key] = undefined
        } else {
          obj[key] = obj[key]
        }
      }
      return obj
    }

    function extend(origin, target) {
      var i, l, key, args = slice.call(arguments).slice(1)
      for (i = 0, l = args.length; i < l; i += 1) {
        target = args[i]
        if (isObj(target)) {
          target = mapFields(target)
          for (key in target) if (target[key] !== undefined) {
            origin[key] = target[key]
          }
        }
      }
      return origin
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
        dom.onreadystatechange = function() {
          if (dom.readyState === 'complete') {
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
      var i, l, args = slice.call(arguments)
      for (i = 0, l = args.length; i < l; i += 1) {
        if (args[i]) appendScript(args[i])
      }
    }

    function scriptsLoadTimer() {
      intervalId = setInterval(function () {
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
      if (fnRegex.test(name)) {
        name = name.replace('$$fn$$', '')
        fn = $$evalExpr(fn)
      }
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
      var args = msg.args || []
      var fn = $$evalExpr(msg.src)
      var ctx = isObj(msg.env) ? mapFields(msg.env) : self[namespace]

      if (fn.length === (args.length + 1)) {
        args.push(done(msg))
        fn.apply(ctx, args)
      } else {
        fn = fn.apply(ctx, args)
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
      if (e.require) { require(e.require) }
      if (e.origin) { origin = e.origin }
      namespace = e.namespace || namespace
      self[namespace] = mapFields(e.env || {})
    }

    function flush() {
      self[namespace] = {}
    }

    function extendEnv(data) {
      extend(self[namespace || namespace], data.env)
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
        case 'flush': flush(); break
      }
    }

    if (!isWorker) {
      scriptsLoad = []
      queue = []
      waitReady()
    }

    self.addEventListener(messageEvent, onMessage)
    self.addEventListener('error', function (err) { throw err })

  })()
}

},{}]},{},[2])(2)
});