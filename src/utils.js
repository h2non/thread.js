var _ = exports
var toStr = Object.prototype.toString
var slice = Array.prototype.slice

exports.now = function () {
  return new Date().getTime()
}

exports.isFn = function (obj) {
  return typeof obj === 'function'
}

exports.isObj = function (o) {
  return o && toStr.call(o) === '[object Object]'
}

exports.isArr = function (o) {
  return o && toStr.call(o) === '[object Array]'
}

exports.toArr = function (args) {
  return slice.call(args)
}

exports.defer = function (fn) {
  setTimeout(fn, 1)
}

exports.bind = function (ctx, fn) {
  return function () { fn.apply(ctx, arguments) }
}

exports.each = function (obj, fn) {
  var i, l
  if (_.isArr(obj)) {
    for (i = 0, l = obj.length; i < l; i += 1) {
      fn(obj[i], i)
    }
  } else if (_.isObj(obj)) {
    for (i in obj) if (obj.hasOwnProperty(i)) {
      fn(obj[i], i)
    }
  }
}

exports.extend = function (target) {
  var args = _.toArr(arguments).slice(1)
  _.each(args, function (obj) {
    _.each(obj, function (value, key) {
      target[key] = value
    })
  })
  return target
}

exports.getSource = function (fn) {
  return '(' + fn.toString() + ').call(this)'
}

exports.fnName = function (fn) {
  return fn.name || (fn = /\W*function\s+([\w\$]+)\(/.exec(fn.toString()) ? fn[1] : '')
}

exports.serializeMap = function (obj) {
  if (_.isObj(obj)) {
    _.each(obj, function (fn, key) {
      if (_.isFn(fn)) {
        obj['$$fn$$' + key] = fn.toString()
        obj[key] = undefined
      }
    })
  }
  return obj
}

exports.generateUUID = function () {
  var d = new Date().getTime()
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0
    d = Math.floor(d / 16)
    return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16)
  })
  return uuid
}
