var expect, thread
if (typeof __testlingConsole !== 'undefined') {
  expect = require('chai').expect
  thread = require('../src/main')
} else {
  expect = browserRequire('chai').expect
  thread = browserRequire('thread')
}

describe('task', function () {

  describe('bind custom environment to the asynchronous task', function () {
    var worker = thread({ env: { x: 2 } })
    var task = new thread.Task(worker)

    it('should bind custom values', function () {
      task.bind({ y: 2 })
    })

    it('should run a task', function () {
      task.run(function (num, done) {
        done(null, env.x * this.y * num)
      }, [2])
    })

    it('should have a valid result', function (done) {
      task.then(function (value) {
        expect(value).to.be.equal(8)
        done()
      })
    })
  })

  describe('bind custom functions to the asynchronous task', function () {
    var worker = thread({ env: { x: 2 } })
    var task = new thread.Task(worker)

    it('should bind custom values', function () {
      task.bind({
        y: 2,
        pow: function (x, y) { return Math.pow(x, y) }
      })
    })

    it('should run a task', function () {
      task.run(function (num, done) {
        done(null, this.pow(env.x, this.y) * num)
      }, [2])
    })

    it('should have a valid result', function (done) {
      task.then(function (value) {
        expect(value).to.be.equal(8)
        done()
      }, function (err) {
        console.error(err)
      })
    })
  })

})
