var expect = chai.expect

describe('pool', function () {

  describe('basic pool', function () {
    var job = thread().pool(2)

    it('should create a delayed task', function () {
      job.run(function (done) {
        setTimeout(function () { done() }, 200)
      })
    })

    it('should use one unique thread', function () {
      expect(job.threadPool).to.have.length(1)
    })

    it('should create a second task', function () {
      job.run(function (done) {
        setTimeout(function () { done() }, 100)
      })
    })

    it('should use another new thread', function (done) {
      setTimeout(function () {
        expect(job.threadPool).to.have.length(2)
        done()
      }, 50)
    })

    it('should create a third task and allocate it in the first thread', function () {
      job.run(function (done) {
        setTimeout(function () { done() }, 100)
      })
    })

    it('should use an existent thread', function () {
      expect(job.threadPool).to.have.length(2)
    })

    it('should have a valid pending tasks', function () {
      expect(job.pending()).to.be.equal(2)
    })
  })

  describe('run tasks binding context', function () {
    var results = []
    var poolNum = 8
    var job = thread({ env: { x: 2 } }).pool(poolNum)
    var count = 0

    it('should run multiple tasks asynchronously', function (done) {
      (function runTask() {
        count += 1
        job.run(function (done) {
          var self = this
          setTimeout(function () {
            done(null, env.x * self.y)
          }, 100)
        }, { y: 2 }).then(function (value) {
          results.push(value)
          if (results.length === poolNum) done()
        })
        if (count < poolNum) setTimeout(runTask, 1)
      }())
    })

    it('should have a valid result', function () {
      expect(results).to.be.deep.equal([4, 4, 4, 4, 4, 4, 4, 4])
      expect(job.threadPool.length).to.be.equal(poolNum)
      expect(job.pending()).to.be.equal(0)
    })
  })

  describe('import scripts in pool of threads', function () {
    var results = []
    var poolNum = 4
    var count = 0
    var job = thread({ env: { x: 2 } }).pool(poolNum)
    job.require('http://cdn.rawgit.com/h2non/hu/0.1.1/hu.js')

    it('should run multiple tasks', function (done) {
      (function runTask() {
        count += 1
        job.run(function (done) {
          setTimeout(function () {
            done(null, hu.tail([4, 4][0]))
          }, 50)
        }).then(function (value) {
          results.push(value)
          if (count === results.length) done()
        })
        if (count < poolNum) setTimeout(runTask, 1)
      }())
    })

    it('should have a valid result', function () {
      expect(results).to.be.deep.equal([4, 4, 4, 4])
      expect(job.threadPool.length).to.be.equal(poolNum)
      expect(job.pending()).to.be.equal(0)
    })
  })

  describe('run tasks passing arguments', function () {
    var results = []
    var job = thread({ env: { x: 2 } }).pool(4)

    it('should run multiple tasks asynchronously', function (done) {
      (function runTask() {
        job.run(function (num, done) {
          setTimeout(function () {
            done(null, env.x * num)
          }, 50)
        }, [ 2 ]).then(function (value) {
          results.push(value)
          if (job.threadPool.length === 4 && results.length === 4) done()
        })
        if (job.threadPool.length < 4) setTimeout(runTask, 1)
      }())
    })

    it('should have a valid result', function () {
      expect(results).to.be.deep.equal([4, 4, 4, 4])
      expect(job.pending()).to.be.equal(0)
    })
  })

  describe('kill pool', function () {
    var job = thread().pool(4)
    job.run(function (done) { setTimeout(done, 200) })
    job.run(function (done) { setTimeout(done, 100) })

    it('should have a valid number of threads', function (done) {
      setTimeout(function () {
        expect(job.threadPool).to.have.length(2)
        done()
      }, 300)
    })

    it('should kill the pool', function () {
      job.kill()
      expect(job.threadPool).to.have.length(0)
    })
  })

})
