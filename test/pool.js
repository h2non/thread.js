var expect, thread
if (typeof __testlingConsole !== 'undefined') {
  expect = require('chai').expect
  thread = require('../src/main')
} else {
  expect = browserRequire('chai').expect
  thread = browserRequire('thread')
}

describe('pool', function () {

  describe('run tasks binding a context', function () {
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
      task.finally(function () {
        expect(results).to.be.deep.equal([4,4,4,4])
        expect(job.pending()).to.be.equal(0)
        done()
      })
    })
  })

  describe('run tasks passing arguments', function () {
    var task, results = []
    var job = thread({ env: { x: 2 } }).pool(4)

    it('should run multiple tasks', function () {
      while (job.threadPool.length !== 4) {
        task = job.run(function (num) {
          return env.x * num
        }, [ 2 ]).then(function (value) {
          results.push(value)
        })
      }
    })

    it('should have a valid result', function (done) {
      task.finally(function () {
        expect(results).to.be.deep.equal([4,4,4,4])
        expect(job.pending()).to.be.equal(0)
        done()
      })
    })
  })

  describe('run tasks asynchronously passing arguments', function () {
    var task, results = []
    var job = thread({ env: { x: 2 } }).pool(4)

    it('should run multiple tasks', function () {
      while (job.threadPool.length !== 4) {
        task = job.run(function (num, done) {
          return setTimeout(function () {
            done(null, env.x * num)
          }, 100)
        }, [ 2 ]).then(function (value) {
          results.push(value)
        })
      }
    })

    it('should have a valid result', function (done) {
      task.finally(function () {
        expect(results).to.be.deep.equal([4,4,4,4])
        expect(job.pending()).to.be.equal(0)
        done()
      })
    })
  })

})
