var _ = exports
var toStr = Object.prototype.toString
var slice = Array.prototype.slice
var hasOwn = Object.prototype.hasOwnProperty
var isArrayNative = Array.isArray

_.now = function () {
  return new Date().getTime()
}

_.isFn = function (obj) {
  return typeof obj === 'function'
}

_.isObj = function (o) {
  return (o && toStr.call(o) === '[object Object]') || false
}

_.isArr = function (o) {
  return o && (isArrayNative ? isArrayNative(o) : toStr.call(o) === '[object Array]') || false
}

_.toArr = function (args) {
  return slice.call(args)
}

_.defer = function (fn) {
  setTimeout(fn, 1)
}

_.each = function (obj, fn) {
  var i, l
  if (_.isArr(obj))
    for (i = 0, l = obj.length; i < l; i += 1) fn(obj[i], i)
  else if (_.isObj(obj))
    for (i in obj) if (hasOwn.call(obj, i)) fn(obj[i], i)
}

_.extend = function (target) {
  var args = _.toArr(arguments).slice(1)
  _.each(args, function (obj) {
    if (_.isObj(obj)) {
      _.each(obj, function (value, key) {
        target[key] = value
      })
    }
  })
  return target
}

_.getSource = function (fn) {
  return '(' + fn.toString() + ').call(this)'
}

_.fnName = function (fn) {
  return fn.name || (fn = /\W*function\s+([\w\$]+)\(/.exec(fn.toString()) ? fn[1] : '')
}

_.serializeMap = function (obj) {
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

_.uuid = function () {
  var uuid = '', i, random
  for (i = 0; i < 32; i++) {
    random = Math.random() * 16 | 0;
    if (i === 8 || i === 12 || i === 16 || i === 20) uuid += '-'
    uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16)
  }
  return uuid
}

_.getLocation = function () {
  return location.origin
    || location.protocol + "//" + location.hostname + (location.port ? ':' + location.port : '')
}
