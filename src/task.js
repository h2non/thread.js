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

Task.intervalCheckTime = 500

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
  if (typeof this._timer === 'number') {
    clearInterval(self._timer)
    self._timer = null
  }
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

Task.prototype.bind = function (env) {
  _.extend(this.env, env)
  return this
}

Task.prototype.run = function (fn, env, args) {
  var maxDelay, tasks
  this.time = _.now()

  if (!_.isFn(fn)) throw new TypeError('first argument must be a function')
  if (_.isArr(env)) args = env

  env = _.serializeMap(_.extend({}, this.env, env))
  this.memoized = null

  maxDelay = this.thread.maxTaskDelay
  if (maxDelay > Task.intervalCheckTime) {
    initInterval(maxDelay, this)
  }

  tasks = this.thread._tasks
  if (tasks.indexOf(this) === -1) {
    tasks.push(this)
    this.finally(function () {
      tasks.splice(tasks.indexOf(this), 1)
    })
  }

  this.worker.postMessage({
    id: this.id,
    type: 'run',
    env: env,
    src: fn.toString(),
    args: args
  })

  return this
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
  if (_.isFn(errorFn)) {
    this.catch(errorFn)
  }
  return this
}

Task.prototype.catch = function (fn) {
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

Task.prototype.finally = function (fn) {
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
  this.memoized = this.thread =
    this.worker = this.env = this.listeners = null
}

Task.prototype.flushed = function () {
  return !this.thread && !this.worker
}

Task.create = function (thread) {
  return new Task(thread)
}

function initInterval(maxDelay, self) {
  var error, now = _.now()
  var timer = self._timer = setInterval(function () {
    if (self.memoized) {
      clearInterval(timer)
    } else {
      if ((_.now() - now) > maxDelay) {
        error = new Error('maximum task execution time exceeded')
        self.memoized = { type: 'run:error', error: error }
        self._trigger(error, 'error')
        self._trigger(error, 'end')
        clearInterval(timer)
        self._timer = null
      }
    }
  }, Task.intervalCheckTime)
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
