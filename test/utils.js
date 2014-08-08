var expect = require('chai').expect
var _ = require('../src/utils')

describe('utils', function () {

  describe('serializeMap', function () {
    var map = {
      name: 'John',
      get: function () { return this.name }
    }

    it('should map the name property', function () {
      expect(_.serializeMap(map).name).to.be.equal('John')
    })

    it('should serialize into string the fn method property', function () {
      var newMap = _.serializeMap(map)
      expect(newMap.get).to.be.empty
      expect(newMap.$$fn$$get).to.be.a('string')
    })
  })

  describe('fnName', function () {
    var namedFn = function Name() {}
    var unnamedFn = function () {}

    it('should return the function name', function () {
      expect(_.fnName(namedFn)).to.be.equal('Name')
    })

    it('should return an empty function name', function () {
      expect(_.fnName(unnamedFn)).to.be.equal('')
    })
  })

})
