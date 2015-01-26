var _ = require('./utils')
var workerSrc = require('./worker')
var Task = require('./task')
var FakeWorker = require('./fake-worker')
var pool = require('./pool')
var store = require('./store')

var Worker = window.Worker
var URL = window.URL || window.webkitURL
var hasWorkers = _.isFn(Worker) || (Worker && typeof Worker === 'object') || false
var isIE = (/MSIE (10|11)/).test(window.navigator.userAgent)
var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder

module.exports = Thread

function Thread(options) {
  this.id = _.uuid()
  this.terminated = false
  this.options = {}
  this._tasks = []
  this._latestTask = 0
  setOptions(this, options)
  createThread(this)
}

Thread.prototype.isPool = false
Thread.prototype.maxTaskDelay = 0
Thread.prototype.idleTime = 30 * 1000

Thread.prototype.defaults = {
  // customizable Worker external source to prevent security error in IE 10 & 11 :S
  evalPath: 'lib/eval.js',
  // enable/disable error exception throwing
  silent: false
}

Thread.prototype.constructor = Thread

Thread.prototype.run = Thread.prototype.exec = function (fn, env, args) {
  var task
  if (_.isArr(env)) {
    args = env
    env = arguments[2]
  }
  if (fn && fn instanceof Task) {
    task = fn
  } else {
    if (!_.isFn(fn)) throw new TypeError('first argument must be a function')
    task = new Task(this)
  }

  this._tasks.push(task)
  _.defer(function () { task.run(fn, env, args) })

  return task
}

Thread.prototype.require = Thread.prototype['import'] = function (name, fn) {
  if (_.isFn(name)) {
    fn = name
    name = _.fnName(fn)
    if (!name) throw new Error('function must be named')
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
    && (this._latestTask === 0
    || (_.now() - this._latestTask) > this.idleTime)
}

Thread.prototype.on = Thread.prototype.addEventListener = function (type, fn) {
  if (this.worker) this.worker.addEventListener(type, fn)
  return this
}

Thread.prototype.off = Thread.prototype.removeEventListener = function (type, fn) {
  if (this.worker && _.isFn(fn)) {
    this.worker.removeEventListener(type, fn)
  }
  return this
}

Thread.prototype.toString = function () {
  return '[object Thread]'
}

Thread.Task = Task

function setOptions(thread, options) {
  thread.options.namespace = 'env'
  thread.options.require = []
  thread.options.env = {}
  _.extend(thread.options, thread.defaults, options)
}

function createThread(thread) {
  var src = _.getSource(workerSrc)
  if (hasWorkers && URL) {
    if (isIE) {
      thread.worker = new Worker(thread.options.evalPath)
      thread.worker.postMessage(src)
    } else {
      thread.worker = new Worker(createBlob(src))
    }
  } else {
    thread.worker = new FakeWorker(thread.id)
  }

  if (!thread.options.silent) {
    thread.worker.addEventListener('error', function (e) { throw e })
  }

  thread.send({
    type: 'start',
    env: _.serializeMap(thread.options.env),
    namespace: thread.options.namespace,
    origin: _.getLocation()
  })

  thread.require(thread.options.require)
  store.push(thread)
}

function createBlob(src) {
  var blob = null
  try {
    blob = new Blob([src], { type: 'text/javascript' })
  } catch (e) {
    blob = new BlobBuilder()
    blob.append(src)
    blob = blob.getBlob()
  }
  return URL.createObjectURL(blob)
}
