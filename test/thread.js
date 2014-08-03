var expect, thread
if (typeof __testlingConsole !== 'undefined') {
  expect = require('chai').expect
  thread = require('../src/main.js')
} else {
  expect = browserRequire('chai').expect
  thread = browserRequire('thread')
}

describe('thread', function () {

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

  describe('long computation delay error', function () {
    var task = null
    var job = thread()

    it('should run a task', function () {
      task = job.run(function (done) {
        setTimeout(function () {
          done()
        }, 1500)
      })
    })

    it('should have a valid result', function (done) {
      task.catch(function (err) {
        expect(err.message).to.be.equal('maximum task execution exceeded')
        done()
      })
    })
  })

})
