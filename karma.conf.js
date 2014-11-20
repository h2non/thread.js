module.exports = function(config) {
  var customLaunchers = {
    sl_chrome: {
      base: 'SauceLabs',
      browserName: 'chrome',
      platform: 'Windows 7',
      version: '36'
    },
    sl_firefox: {
      base: 'SauceLabs',
      browserName: 'firefox',
      version: '30'
    },
    sl_ios_safari: {
      base: 'SauceLabs',
      browserName: 'iphone',
      platform: 'OS X 10.9',
      version: '7.1'
    },
    sl_ie_10: {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      platform: 'Windows 7',
      version: '10'
    }
  }

  config.set({
    files: [
      'node_modules/chai/chai.js',
      'thread.js',
      'test/thread.js',
      'test/task.js',
      //'test/pool.js',
      'test/store.js'
    ],
    exclude: [
      'test/utils.js'
    ],
    frameworks: ['mocha'],
    sauceLabs: {
      testName: 'thread.js'
    },
    customLaunchers: customLaunchers,
    browsers: [
      'Chrome',
      'ChromeCanary',
      'Firefox',
      'PhantomJS',
      'Opera',
      'Safari'
    ], // Object.keys(customLaunchers)
    reports: ['progress', 'saucelabs'],
    singleRun: true
  })
}
