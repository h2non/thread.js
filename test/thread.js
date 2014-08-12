var expect, thread
if (typeof __testlingConsole !== 'undefined') {
  expect = require('chai').expect
  thread = require('../src/main')
} else {
  expect = browserRequire('chai').expect
  thread = browserRequire('thread')
}

describe('thread', function () {

  function defer(fn, ms) { setTimeout(fn, 1) }

  describe('api', function () {
    it('should expose the thread factory', function () {
      expect(thread).to.be.a('function')
    })

    it('should expose the thread object', function () {
      expect(thread.Thread).to.be.a('function')
    })

    it('should expose the Task constructor', function () {
      expect(thread.Task).to.be.a('function')
    })

    it('should expose the version property', function () {
      expect(thread.VERSION).to.be.a('string')
    })
  })

  describe('sum numbers synchronously', function () {
    var task, job = thread()

    it('should run a task', function () {
      task = job.run(function () {
        return 2 + 2
      })
    })

    it('should have a valid result', function (done) {
      task.then(function (num) {
        expect(num).to.be.equal(4)
        done()
      })
    })
  })

  describe('sum numbers synchronously passing a context', function () {
    var task = null
    var job = thread({
      env: { x: 2 }
    })

    it('should run a task', function () {
      task = job.run(function () {
        return env.x + 2
      })
    })

    it('should have a valid result', function (done) {
      task.then(function (num) {
        expect(num).to.be.equal(4)
        done()
      })
    })
  })

  describe('sum numbers asynchronously passing a context with custom namespace', function () {
    var task = null
    var job = thread({
      namespace: 'global',
      env: { x: 2 }
    })

    it('should run a task', function () {
      task = job.run(function (done) {
        setTimeout(function () {
          done(null, global.x * 2)
        }, 50)
      })
    })

    it('should have a valid result', function (done) {
      task.then(function (num) {
        expect(num).to.be.equal(4)
        done()
      })
    })
  })

  describe('pass an error synchronously', function () {
    var task = null
    var job = thread({
      env: { error: true }
    })

    it('should run a task', function () {
      task = job.run(function () {
        throw 'error'
      })
    })

    it('should have a valid result', function (done) {
      task.catch(function (err) {
        expect(err.message).to.be.equal('error')
        done()
      })
    })
  })

  describe('pass an error asynchronously', function () {
    var task = null
    var job = thread({
      env: { error: true }
    })

    it('should run a task', function () {
      task = job.run(function (done) {
        setTimeout(function () {
          if (env.error) {
            done('message')
          }
        }, 50)
      })
    })

    it('should have a valid result', function (done) {
      task.catch(function (err) {
        expect(err.message).to.be.equal('message')
        done()
      })
    })
  })

  describe('import external script', function () {
    var task = null
    var job = thread({
      require: ['http://cdn.rawgit.com/h2non/hu/0.1.1/hu.js']
    })

    it('should run a task', function () {
      task = job.run(function () {
        return hu.reverse('hello')
      })
    })

    it('should have a valid result', function (done) {
      task.then(function (value) {
        expect(value).to.be.equal('olleh')
        done()
      })
    })
  })

  describe('import external script as string', function () {
    var task = null
    var job = thread({
      require: 'http://cdn.rawgit.com/h2non/hu/0.1.1/hu.js'
    })

    it('should run a task', function () {
      task = job.run(function () {
        return hu.reverse('hello')
      })
    })

    it('should have a valid result', function (done) {
      task.then(function (value) {
        expect(value).to.be.equal('olleh')
        done()
      })
    })
  })

  describe('pass function as require context', function () {
    var task = null
    var job = thread({
      env: {
        x: 2
      },
      require: {
        defer: defer
      }
    })

    it('should run a task', function () {
      task = job.run(function (done) {
        var y = this.y
        return env.defer(function () {
          done(null, env.x * y)
        })
      }, { y: 2 })
    })

    it('should have a valid result', function (done) {
      task.then(function (value) {
        expect(value).to.be.equal(4)
        done()
      })
    })
  })

  describe('pass function to worker via require', function () {
    var task = null
    var job = thread({
      env: { x: 2 }
    }).require('defer', defer)

    it('should run a task', function () {
      task = job.run(function (done) {
        var y = this.y
        return env.defer(function () {
          done(null, env.x * y)
        })
      }, { y: 2 })
    })

    it('should have a valid result', function (done) {
      task.then(function (value) {
        expect(value).to.be.equal(4)
        done()
      })
    })
  })

  describe('bind aditional context to the task', function () {
    var task = null
    var job = thread({
      env: { x: 2 }
    })

    it('should run a task', function () {
      task = job.run(function () {
        return env.x * this.y
      }, { y: 2 })
    })

    it('should have a valid result', function (done) {
      task.then(function (value) {
        expect(value).to.be.equal(4)
        done()
      })
    })

    it('should not exists the y context variable', function (done) {
      job.run(function () {
        return typeof this.y
      }).then(function (value) {
        expect(value).to.be.equal('undefined')
        done()
      })
    })
  })

  describe('passing arguments to the task', function () {
    var task = null
    var job = thread({
      env: { x: 2 }
    })

    it('should run a task', function () {
      task = job.run(function (num) {
        return env.x * this.y * num
      }, { y: 2 }, [2])
    })

    it('should have a valid result', function (done) {
      task.then(function (value) {
        expect(value).to.be.equal(8)
        done()
      })
    })
  })

  describe('passing arguments to the asynchronous task', function () {
    var task = null
    var job = thread({
      env: { x: 2 }
    })

    it('should run a task', function () {
      task = job.run(function (num, done) {
        done(null, env.x * this.y * num)
      }, { y: 2 }, [2])
    })

    it('should have a valid result', function (done) {
      task.then(function (value) {
        expect(value).to.be.equal(8)
        done()
      })
    })
  })

  describe('task compute time exceeded error', function () {
    var task = null
    var job = thread()
    job.maxTaskDelay = 800

    it('should run a task', function () {
      task = job.run(function (done) {
        setTimeout(done, 1500)
      })
    })

    it('should have a valid result', function (done) {
      task.catch(function (err) {
        expect(err.message).to.be.equal('maximum task execution time exceeded')
        done()
      })
    })
  })

  describe('number of running tasks', function () {
    var task = null
    var job = thread()

    it('should run multiple tasks', function () {
      job.run(function (done) {
        setTimeout(done, 200)
      })
      job.run(function (done) {
        setTimeout(done, 250)
      })
    })

    it('should have a valid number of tasks', function () {
      expect(job.pending()).to.be.equal(2)
    })

    it('should be running', function () {
      expect(job.running()).to.be.true
    })

    it('should not be running when tasks finished', function (done) {
      setTimeout(function () {
        expect(job.pending()).to.be.equal(1)
        expect(job.running()).to.be.true
        done()
      }, 300)
    })

    it('should kill the thread', function () {
      job.kill()
    })
  })

})
