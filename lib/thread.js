(function(global) {
  'use strict';

  var URL = global.URL || global.webkitURL
  var hasWorkers = isFn(global.Worker)

  function isFn(obj) {
    return typeof obj === 'function'
  }

  function toArr(args) {
    return Array.prototype.slice.call(args)
  }

  function defer(fn) {
    setTimeout(fn, 100)
  }

  function extend(target, origin) {
    for (var i in origin) {
      if (origin.hasOwnProperty(i)) {
        target[i] = origin
      }
    }
    return target
  }

  function clone(obj) {
    return extend({}, obj)
  }

  function getSource(fn) {
    return '(' + fn.toString() + ').call(self)'
  }

  function workerSrc() {
    var that = this
    var env = null

    function require(src) {
      if (Array.isArray(src)) {
        src.forEach(importScripts)
      } else {
        importScripts(src)
      }
    }

    function start(e) {
      var scripts = e.require
      if (scripts) {
        require(scripts)
      }
      env = e.env
    }

    function errorMessage(msg, err) {
      self.postMessage({
        type: 'run:error',
        id: msg.id,
        error: err
      })
    }

    function successMessage(msg, val) {
      self.postMessage({
        type: 'run:success',
        id: msg.id,
        value: val
      })
    }

    function done(msg) {
      return function(err, value) {
        if (err) {
          errorMessage(msg, err)
        } else {
          successMessage(msg, value)
        }
      }
    }

    function run(msg) {
      var src = msg.src
      var fn = eval(src)

      try {
        if (fn.length > 0) {
          fn.call(self, done(msg))
        } else {
          fn = fn.call(self)
          successMessage(msg, fn)
        }
      } catch (e) {
        errorMessage(msg, e)
      }
    }

    function onMessage(e) {
      var data = e.data
      switch (e.type) {
        case 'start':
          start(data)
          break
        case 'run':
          run(data)
          break
      }
      self.postMessage(env)
    }

    self.addEventListener('message', onMessage)
    self.addEventListener('error', function (err) {
      throw err
    })
  }

  function createWorker() {
    var blob = new Blob([getSource(workerSrc)], { type: 'text/javascript' })
    return URL.createObjectURL(blob)
  }

  function Thread(options) {
    this.errorListeners = []
    this.errorListeners = []
    this.options = extend(clone(this.default), options)
    this._create()
  }

  Thread.prototype.default = {
    require: [],
    env: {}
  }

  Thread.prototype._create = function () {
    var blob, src = getSource(workerSrc)

    if (!URL) {
      blob = 'data:application/javascript,' + encodeURIComponent(src)
    } else {
      try {
        blob = new Blob([src], { type: 'application/javascript' })
      } catch (e) { // Backwards-compatibility
        var BlobBuilder = global.BlobBuilder || global.WebKitBlobBuilder || global.MozBlobBuilder;
        blob = new BlobBuilder()
        blob.append(src)
        blob = blob.getBlob()
      }
      blob = URL.createObjectURL(blob)
    }

    if (hasWorkers) {
      this._worker = new Worker(blob)
    } else {
      this._worker = new FakeWorker(blob)
    }
    this._worker.postMessage(extend({
      type: 'start'
    }, this.options))
    this._worker.addEventListener('message', function (e) {
      if (e.type === 'error') {
        // to do
      }
    })

    return this
  }

  Thread.prototype.run = function(fn, env) {
    var task = new Task(this._worker)
    defer(function () {
      task.run(fn, env)
    })
    return task
  }

  function Task(worker) {
    this.id = generateUUID()
    this.worker = worker
    this.env = {}
    this.done = false
    this.errored = false
    this.errorListeners = []
    this.successListeners = []
    this.thenListeners = []

    this.worker.addEventListener('message', this._onMessage)
  }

  Task.prototype._onMessage = function onMessage(ev) {
    if (ev.id && ev.id === this.id) {
      if (ev.type === 'run:error') {
        worker.removeEventListener('message', onMessage)

        var pool = this.errorListeners

        (function recur() {
          var fn = pool.shift()
          fn(ev.error)
          if (pool.length) {
            recur()
          }
        }())
      } else if (ev.type === 'run:success') {
        worker.removeEventListener('message', onMessage)

        var pool = this.successListeners

        (function recur() {
          var fn = pool.shift()
          fn(ev.value)
          if (pool.length) {
            recur()
          }
        }())
      }
    }
  }

  Task.prototype.setEnv = function(env) {
    extend(this.env, env)
    return this
  }

  Task.prototype.run = function(fn, env) {
    if (!isFn(fn)) {
      throw new TypeError('first argument must be a function')
    }

    var env = extend({}, extend(this.env, env))

    this.worker.postMessage({
      id: this.id,
      type: 'run',
      env: env,
      src: fn.toString()
    })
  }

  Task.prototype.throw = function(fn) {
    if (isFn(fn)) {
      this.errorListeners.push(fn)
    }
  }

  Task.prototype.then = function(fn) {
    if (isFn(fn)) {
      this.thenListeners.push(fn)
    }
  }

  Task.prototype.finally = function(fn) {
    if (isFn(fn)) {
      this.successListeners.push(fn)
    }
  }

  function FakeWorker(blob) {
    this.listeners = {}
    this.blob = blob
    this._create()
  }

  FakeWorker.prototype._create = function () {
    var iframe = this.iframe = document.createElement('iframe')
    if (!iframe.style) iframe.style = {}
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
  }

  FakeWorker.prototype.addEventListener = function (type, fn) {
    var pool = this.listeners[type] = this.listeners[type] || []
    pool.push(fn)
  }

  FakeWorker.prototype.removeEventListener = function (type, fn) {
    var pool = this.listeners[type]
    if (pool) {
      if (isFn(fn)) {
        if (~index) {
          pool.splice(0, pool.length)
        }
      } else {
        var index = pool.indexOf(fn)
        if (~index) {
          pool.splice(index, 1)
        }
      }
    }
  }

  FakeWorker.prototype.postMessage = function (msg) {
    var win = this.iframe.contentWindow
    var wEval = win.eval, wExecScript = win.execScript;

    if (!wEval && wExecScript) {
        // win.eval() magically appears when this is called in IE:
        wExecScript.call(win, 'null')
        wEval = win.eval
    }

    //var res = wEval.call(win, this.code)
    //this.iframe.postMessage()
  }

  FakeWorker.prototype.terminate = function () {
    document.body.removeChild(iframe)
  }

  global.Thread = Thread

  global.thread = function(options) {
    return new Thread(options)
  }

  function generateUUID() {
    var d = new Date().getTime()
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random() * 16) % 16 | 0
      d = Math.floor(d / 16)
      return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16)
    })
    return uuid
  }

}(window))
