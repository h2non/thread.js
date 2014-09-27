var _ = require('./utils')

module.exports = Task

function Task(thread, env) {
  this.id = _.uuid()
  this.thread = thread
  this.worker = thread.worker
  this.env = env || {}
  this.time = this.memoized = null
  this.listeners = { error: [], success: [], end: [] }
  this._subscribe()
}

Task.intervalCheckTime = 200

Task.prototype._getValue = function (data) {
  return data.type === 'run:error' ? createError(data) : data.value
}

Task.prototype._trigger = function (value, type) {
  if (typeof this._timer === 'number') clearTimer.call(this)
  dispatcher(this, value)(this.listeners[type])
}

Task.prototype._subscribe = function () {
  this.worker.addEventListener('message', onMessage(this))
}

Task.prototype.bind = Task.prototype.set = function (env) {
  _.extend(this.env, env)
  return this
}

Task.prototype.run = Task.prototype.exec = function (fn, env, args) {
  var thread = this.thread

  if (thread._terminated)
    throw new Error('cannot execute the task, the thread was terminated')
  if (!_.isFn(fn))
    throw new TypeError('first argument must be a function')

  if (_.isArr(arguments[1]))
    args = arguments[1]
  if (_.isObj(arguments[2]))
    env = arguments[2]

  env = _.serializeMap(_.extend({}, this.env, env))
  this.memoized = null
  this.time = _.now()

  if (thread.maxTaskDelay >= Task.intervalCheckTime)
    this._checkInterval(thread.maxTaskDelay)
  if (thread._tasks.indexOf(this) === -1)
    thread._tasks.push(this)

  this['finally'](cleanTask(thread, this))
  this._send(env, fn, args)

  return this
}

Task.prototype._addHandler = function (type, fn) {
  if (this.memoized) {
    if (this.memoized.type === ('run:' + type))
      fn.call(null, this._getValue(this.memoized))
  } else {
    this.listeners[type].push(fn)
  }
}

Task.prototype.then = function (fn, errorFn) {
  if (_.isFn(fn)) this._addHandler('success', fn)
  if (_.isFn(errorFn)) this['catch'](errorFn)
  return this
}

Task.prototype['catch'] = function (fn) {
  if (_.isFn(fn)) this._addHandler('error', fn)
  return this
}

Task.prototype['finally'] = function (fn) {
  if (_.isFn(fn)) {
    if (this.memoized)
      fn.call(null, this._getValue(this.memoized))
    else
      this.listeners.end.push(fn)
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

Task.prototype._send = function (env, fn, args) {
  this.worker.postMessage({
    id: this.id,
    type: 'run',
    env: env,
    src: fn.toString(),
    args: args
  })
}

Task.prototype._checkInterval = function (maxDelay) {
  var self = this, now = _.now()
  self._timer = setInterval(function () {
    if (self.memoized) {
      clearTimer.call(self)
    } else {
      checkTaskDelay.call(self, now, maxDelay)
    }
  }, Task.intervalCheckTime)
}

Task.create = function (thread) {
  return new Task(thread)
}

function dispatcher(self, value) {
  return function recur(pool) {
    var fn = null
    if (_.isArr(pool)) {
      fn = pool.shift()
      if (fn) {
        fn.call(null, value)
        if (pool.length) recur(pool)
      }
    }
  }
}

function createError(data) {
  var err = new Error(data.error)
  err.name = data.errorName
  err.stack = data.errorStack
  return err
}

function cleanTask(thread, task) {
  return function () {
    var index = thread._tasks.indexOf(task)
    thread._latestTask = _.now()
    if (index >= 0) thread._tasks.splice(index, 1)
  }
}

function checkTaskDelay(now, maxDelay) {
  var error = null
  if ((_.now() - now) > maxDelay) {
    error = new Error('maximum task execution time exceeded')
    this.memoized = { type: 'run:error', error: error }
    this._trigger(error, 'error')
    this._trigger(error, 'end')
    clearTimer.call(this)
  }
}

function clearTimer() {
  clearInterval(this._timer)
  this._timer = null
}

function isValidEvent(type) {
  return type === 'run:error' || type === 'run:success'
}

function onMessage(self) {
  return function handler(ev) {
    var value, data = ev.data
    if (data && data.id === self.id) {
      if (isValidEvent(data.type)) {
        self.worker.removeEventListener('message', handler)
        self.memoized = data
        value = self._getValue(data)
        self._trigger(value, data.type.split(':')[1])
        self._trigger(value, 'end')
      }
    }
  }
}
