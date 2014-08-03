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
