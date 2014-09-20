var expect = chai.expect

describe('store', function () {

  before(function () {
    thread.killAll()
  })

  it('should create a thread', function (done) {
    thread().run(function (done) {
      setTimeout(done, 100)
    }).then(function () { done() })
  })

  it('should have a valid number of threads', function () {
    expect(thread.total()).to.be.equal(1)
  })

  it('should create another thread', function () {
    thread().run(function (done) {
      setTimeout(done, 100)
    })
  })

  it('should have a valid number of threads', function () {
    expect(thread.total()).to.be.equal(2)
  })

  it('should have a valid number of running threads', function () {
    expect(thread.running()).to.have.length(1)
  })

  it('should have a valid number of idle threads', function () {
    expect(thread.idle()).to.have.length(0)
  })

  it('should remove a thread', function () {
    var job = thread()
    expect(thread.total()).to.be.equal(3)
    job.kill()
    expect(thread.total()).to.be.equal(2)
  })

  it('should kill all threads', function () {
    var job = thread.killAll()
    expect(thread.total()).to.be.equal(0)
  })

})
