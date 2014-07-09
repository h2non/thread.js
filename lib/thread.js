(function (global) {
  'use strict';

  var URL = global.URL || global.webkitURL

  if (!global.Worker) {
    throw new Error('This browser does not support Web Workers')
  }

  function isFn(obj) {
    return typeof obj === 'function'
  }

  function toArr(args) {
    return Array.prototype.slice.call(args)
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
    return fn.toString()
      .replace(/\}$/, '')
      .replace(/^(function [a-z]+\(\) \{\n)/i, '')
  }

  function workerSrc() {
    var that = this

    function require(src) {
      if (Array.isArray(src)) {
        src.forEach(importScripts)
      } else {
        importScripts(src)
      }
    }

    function start(e) {
      var scripts = e.scripts
      if (scripts) {
        require(scripts)
      }
      // to do
    }

    function run(e) {
      var src = e.src
      var ctx =

    }

    function onMessage(e) {
      var data = e.data

      switch (type) {
        case 'start':
          start(data)
          break
        case 'run':
          run(data)
          break
      }
    }

    self.onmessage = function (e) {
      var data = e.data

      if (data.url) {
        var url = data.url.href
        var index = url.indexOf('index.html')
        if (index != -1) {
          url = url.substring(0, index)
        }
        importScripts(url + 'engine.js')
      }

      console.log(e.data)
    }
  }

  function creatURLWorker() {
    var blob = new Blob([getSource(workerSrc)], { type: 'text/javascript' })
    return URL.createObjectURL(blob)
  }

  function Thread(options) {
    this.options = extend(clone(this.default), options)
    this._create()
  }

  Thread.prototype.default = {
    requires: [],
    env: {},
    namespace: 'env'
  }

  Thread.prototype._create = function () {
    if (URL) {
      createURLWorker()
    } else {
      throw new Error('URL object is not supported')
    }

    this._worker = new Worker(url)
    this._worker.postMessage('hi')
  }

  Thread.prototype.run = function (fn, env) {
    if (typeof fn !== 'function') {
      throw new TypeError('first argument must be a function')
    }

    this._worker.postMessage({
      type: 'run',
      env: env,
      src: fn.toString()
    })
  }

  Thread.prototype.throw = function () {

  }

  Thread.prototype.finally = function () {

  }

  global.Thread = Thread

  global.thread = function (options) {
    return new Thread(options)
  }

}(window))
