var expect, thread
if (typeof __testlingConsole !== 'undefined') {
  expect = require('chai').expect
  thread = require('../src/main')
} else {
  expect = browserRequire('chai').expect
  thread = browserRequire('thread')
}

describe('pool', function () {
  describe('pool of threads', function () {
    var task, results = []
    var job = thread({ env: { x: 2 } }).pool(4)

    it('should run multiple tasks', function () {
      while (job.threadPool.length !== 4) {
        task = job.run(function () {
          return env.x * this.y
        }, { y: 2 }).then(function (value) {
          results.push(value)
        })
      }
    })

    it('should have a valid result', function (done) {
      task.then(function () {
        expect(results).to.be.deep.equal([4,4,4,4])
        done()
      })
    })
  })
})
