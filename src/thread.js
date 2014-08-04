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
  this._tasks = []
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
  if (!_.isFn(fn)) {
    throw new TypeError('you must pass a function argument')
  }

  if (fn instanceof Task) {
    task = fn
  } else {
    task = new Task(this)
  }
  this._tasks.push(task)
  task.finally(function () {

  })
  _.defer(function () { task.run(fn, env) })
  return task
}

Thread.prototype.bind = Thread.prototype.push = function (env) {
  this.send({ type: 'env', data: env })
  return this
}

Thread.prototype.flush = function () {
  this.send({ type: 'flush' })
  this.options.env = {}
  return this
}

Thread.prototype.flushTasks = function () {
  this._tasks.splice(0)
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

Thread.prototype.start = Thread.prototype.init = function (options) {
  if (this._terminated) {
    this._setOptions(options)
    this._terminated = false
    this._create()
  }
  return this
}

Thread.prototype.pending = function () {
  return this._tasks.length
}

Thread.prototype.isRunning = function () {
  return this._tasks.length > 0
}

Thread.Task = Task
