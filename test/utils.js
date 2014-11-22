var expect = require('chai').expect
var _ = require('../src/utils')

describe('utils', function () {

  describe('isArr', function () {
    it('should be an array', function () {
      expect(_.isArr([])).to.be.true
      expect(_.isArr(new Array)).to.be.true
    })

    it('should not be an array', function () {
      expect(_.isArr({})).to.be.false
      expect(_.isArr(undefined)).to.be.false
      expect(_.isArr(null)).to.be.false
      expect(_.isArr('')).to.be.false
      expect(_.isArr(new Date)).to.be.false
      expect(_.isArr(10)).to.be.false
    })
  })

  describe('isObj', function () {
    it('should be an object', function () {
      expect(_.isObj({})).to.be.true
      expect(_.isObj(new Object)).to.be.true
    })

    it('should not be an object', function () {
      expect(_.isObj([])).to.be.false
      expect(_.isObj(undefined)).to.be.false
      expect(_.isObj(null)).to.be.false
      expect(_.isObj('')).to.be.false
      expect(_.isObj(new Date)).to.be.false
      expect(_.isObj(10)).to.be.false
    })
  })

  describe('isFn', function () {
    it('should be a function', function () {
      expect(_.isFn(function () {})).to.be.true
      expect(_.isFn(new Function)).to.be.true
    })

    it('should not be a function', function () {
      expect(_.isFn([])).to.be.false
      expect(_.isFn({})).to.be.false
      expect(_.isFn(undefined)).to.be.false
      expect(_.isFn(null)).to.be.false
      expect(_.isFn('')).to.be.false
      expect(_.isFn(new Date)).to.be.false
      expect(_.isFn(10)).to.be.false
    })
  })

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
