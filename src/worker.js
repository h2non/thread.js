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
    self.addEventListener = self[eventMethod]

    function isObj(o) {
      return o && toStr.call(o) === '[object Object]'
    }

    function isArr(o) {
      return o && Array.isArray ? Array.isArray(o) : toStr.call(o) === '[object Array]'
    }

    function extend(origin, target) {
      var i, l, key, args = slice.call(arguments).slice(1)
      for (i = 0, l = args.length; i < l; i += 1) {
        target = args[i]
        if (isObj(target)) {
          for (key in target) if (target.hasOwnProperty(key)) {
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
      var i, l, args = Array.prototype.slice.call(arguments)
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
      var ctx = isObj(msg.env) ? msg.env : self[namespace]

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
      if (e.require) {
        require(e.require)
      }
      if (e.origin) {
        origin = e.origin
      }

      namespace = e.namespace || namespace
      self[namespace] = e.env || {}
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
      }
    }

    if (!isWorker) {
      scriptsLoad = []
      queue = []
      waitReady()
    }

    self.addEventListener(messageEvent, onMessage)
    self.addEventListener('error', function (err) {
      throw err
    })
  })()
}
