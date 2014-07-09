describe('Thread', function () {

  it('should have support for Web Workers', function () {
    expect(window.Worker).to.be.an('object')
  })

  it('should expose the Thread object constructor', function () {
    expect(window.Thread).to.be.a('function')
  })

  it('should expose the thread factory', function () {
    expect(window.thread).to.be.a('function')
  })

})
