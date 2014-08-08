var _ = exports
var toStr = Object.prototype.toString
var slice = Array.prototype.slice

exports.isFn = function isFn(obj) {
  return typeof obj === 'function'
}

exports.isObj = function isObj(o) {
  return o && toStr.call(o) === '[object Object]'
}

exports.isArr = function isArr(o) {
  return o && toStr.call(o) === '[object Array]'
}

exports.toArr = function toArr(args) {
  return slice.call(args)
}

exports.defer = function defer(fn) {
  setTimeout(fn, 1)
}

exports.bind = function bind(ctx, fn) {
  return function () { fn.apply(ctx, arguments) }
}

exports.each = function each(obj, fn) {
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

exports.extend = function extend(target) {
  var args = _.toArr(arguments).slice(1)
  _.each(args, function (obj) {
    _.each(obj, function (value, key) {
      target[key] = value
    })
  })
  return target
}

exports.clone = function clone(obj) {
  return _.extend({}, obj)
}

exports.getSource = function getSource(fn) {
  return '(' + fn.toString() + ').call(this)'
}

exports.fnName = function fnName(fn) {
  return fn.name || /\W*function\s+([\w\$]+)\(/.exec(fn.toString())[1]
}

exports.generateUUID = function generateUUID() {
  var d = new Date().getTime()
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random() * 16) % 16 | 0
    d = Math.floor(d / 16)
    return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16)
  })
  return uuid
}
