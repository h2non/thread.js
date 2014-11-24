var _ = require('./utils')

module.exports = Task

function Task(thread, env) {
  this.id = _.uuid()
  this.thread = thread
  this.worker = thread.worker
  this.env = env || {}
  this.time = this.memoized = null
  this.listeners = { error: [], success: [], end: [] }
}

Task.intervalCheckTime = 200

Task.prototype.bind = Task.prototype.set = function (env) {
  _.extend(this.env, env)
  return this
}

Task.prototype.run = Task.prototype.exec = function (fn, env, args) {
  var thread = this.thread

  if (!thread || thread._terminated) {
    throw new Error('cannot execute the task. The thread was terminated')
  }
  if (!_.isFn(fn)) {
    throw new TypeError('first argument must be a function')
  }

  if (_.isArr(arguments[1])) args = arguments[1]
  if (_.isObj(arguments[2])) env = arguments[2]

  env = _.serializeMap(_.extend({}, this.env, env))
  this.memoized = null
  this.time = _.now()

  if (thread.maxTaskDelay >= Task.intervalCheckTime) {
    checkInterval(this, thread.maxTaskDelay)
  }
  if (thread._tasks.indexOf(this) === -1) {
    thread._tasks.push(this)
  }

  this['finally'](cleanTask(thread, this))

  addWorkerMessageListener(this)
  this._send(env, fn, args)

  return this
}

Task.prototype.then = Task.prototype.success = function (fn, errorFn) {
  if (_.isFn(fn)) pushStateHandler(this, 'success', fn)
  if (_.isFn(errorFn)) this['catch'](errorFn)
  return this
}

Task.prototype['catch'] = Task.prototype.error = function (fn) {
  if (_.isFn(fn)) pushStateHandler(this, 'error', fn)
  return this
}

Task.prototype['finally'] = Task.prototype.finish = function (fn) {
  if (_.isFn(fn)) {
    if (this.memoized)
      fn.call(null, getValue(this.memoized))
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

function checkInterval(task, maxDelay) {
  var now = _.now()
  task._timer = setInterval(function () {
    if (task.memoized) {
      clearTimer.call(task)
    } else {
      checkTaskDelay.call(task, now, maxDelay)
    }
  }, Task.intervalCheckTime)
}

Task.create = function (thread) {
  return new Task(thread)
}

function addWorkerMessageListener(task) {
  task.worker.addEventListener('message', onMessage(task))
}

function pushStateHandler(task, type, fn) {
  if (task.memoized) {
    if (task.memoized.type === ('run:' + type))
      fn.call(null, getValue(task.memoized))
  } else {
    task.listeners[type].push(fn)
  }
}

function dispathEvent(task, value, type) {
  if (typeof task._timer === 'number') clearTimer.call(task)
  dispatcher(task, value)(task.listeners[type])
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

function checkTaskDelay(time, maxDelay) {
  var error = null
  if ((_.now() - time) > maxDelay) {
    error = new Error('maximum task execution time exceeded')
    this.memoized = { type: 'run:error', error: error }
    dispathEvent(this, error, 'error')
    dispathEvent(this, error, 'end')
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

function onMessage(task) {
  return function handler(ev) {
    var data = ev.data
    if (data && data.id === task.id && isValidEvent(data.type)) {
      task.worker.removeEventListener('message', handler)
      task.memoized = data
      triggerMessage(task, data)
    }
  }
}

function triggerMessage(task, data) {
  var value = getValue(data)
  dispathEvent(task, value, data.type.split(':')[1])
  dispathEvent(task, value, 'end')
}

function getValue(data) {
  return data.type === 'run:error'
    ? createError(data)
    : data.value
}
