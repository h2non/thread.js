var _ = require('./utils')

module.exports = pool

function pool(num, thread) {
  var threadRun = thread.run
  var threads = [ thread ]
  var options = thread.options
  var terminate = thread.terminate

  function findBestAvailableThread(pending) {
    var i, l, thread
    for (i = 0, l = threads.length; i < l; i += 1) {
      thread = threads[i]
      if (thread.pending() <= pending) {
        return thread
      }
    }
  }

  function newThread() {
    var thread = new pool.Thread(options)
    threads.push(thread)
    return thread
  }

  thread.run = function () {
    var args = arguments
    var count = 0

    function runTask(thread) {
      var task
      if (thread === threads[0]) {
        task = threadRun.apply(thread, args)
      } else {
        task = thread.run.apply(thread, args)
      }
      return task
    }

    function nextThread(count) {
      var task, thread = findBestAvailableThread(count)

      if (thread) {
        task = runTask(thread)
      } else {
        if (threads.length < num) {
          task = runTask(newThread())
        } else {
          task = nextThread(count + 1)
        }
      }
      return task
    }

    return nextThread(count)
  }

  thread.terminate = thread.kill = function () {
    _.each(threads, function (thread, i) {
      if (i === 0) terminate()
      else thread.terminate()
    })
    threads.splice(0)
  }

  thread.threadPool = threads

  return thread
}
