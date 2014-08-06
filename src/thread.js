var _ = require('./utils')
var workerSrc = require('./worker')
var Task = require('./task')
var FakeWorker = require('./fake-worker')

var URL = window.URL || window.webkitURL
var hasWorkers = _.isFn(window.Worker)

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
      var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder
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

Thread.prototype._serializeMap = function (obj) {
  _.each(obj, function (fn, key) {
    if (_.isFn(fn))
      obj['$$fn$$' + key] = fn.toString()
    else
      obj[key] = fn
  })
  return obj
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
    this.send({ type: 'require:map', src: this._serializeMap(name) })
  }
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
  if (!_.isFn(fn)) {
    throw new TypeError('missing function argument')
  }

  if (fn instanceof Task) {
    task = fn
  } else {
    task = new Task(this)
  }

  tasks.push(task)
  task.finally(function () {
    tasks.splice(tasks.indexOf(task), 1)
  })
  _.defer(function () { task.run(fn, env, args) })
  return task
}

Thread.prototype.bind = Thread.prototype.push = function (env) {
  this.send({ type: 'env', data: this._serializeMap(env) })
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
