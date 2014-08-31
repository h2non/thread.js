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
  this._terminated = false
  this.id = _.generateUUID()
  this.options = {}
  this._tasks = []
  this._latestTask = null
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
  if (!this._terminated) {
    this.options = {}
    this.flushTasks().flush()
    this._terminated = true
    this.worker.terminate()
    store.remove(this)
  }
  return this
}

Thread.prototype.start = Thread.prototype.init = function (options) {
  if (this._terminated) {
    this._setOptions(options)
    this._create()
    this._terminated = false
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
  return !this.running() && !this.terminated() && (_.now() - this._latestTask) > this.idleTime
}

Thread.prototype.terminated = function () {
  return this._terminated
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
