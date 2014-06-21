describe('Thread', function () {

  it('should have support for Web Workers', function () {
    expect(window.Worker).to.be.an('object')
  })

})
