module.exports = function(config) {
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
    browsers: [
      'Chrome',
      'ChromeCanary',
      'Firefox',
      'PhantomJS',
      'Opera',
      'Safari'
    ],
    reports: ['progress'],
    singleRun: true
  })
}
