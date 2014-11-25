self.onmessage = function (ev) {
  self.onmessage = null
  eval(ev.data)
}
