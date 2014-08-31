var _ = require('./utils')

module.exports = pool

function pool(num, thread) {
  var threadRun = thread.run
  var threads = [ thread ]
  var options = thread.options
  var terminate = thread.terminate

  function findBestAvailableThread(offset) {
    var i, l, thread, pending
    for (i = 0, l = threads.length; i < l; i += 1) {
      thread = threads[i]
      pending = thread.pending()
      if (pending === 0 || pending < offset) {
        if (thread.terminated()) {
          threads.splice(i, 1)
          l -= 1
        } else {
          return thread
        }
      }
    }
  }

  function newThread() {
    var thread = new pool.Thread(options)
    threads.push(thread)
    return thread
  }

  function runTask(thread, args) {
    var task
    if (thread === threads[0]) {
      task = threadRun.apply(thread, args)
    } else {
      task = thread.run.apply(thread, args)
    }
    return task
  }

  thread.run = thread.exec = function () {
    var args = arguments

    function nextThread(count) {
      var task, thread = findBestAvailableThread(count)
      if (thread) {
        task = runTask(thread, args)
      } else {
        if (threads.length < num) {
          task = runTask(newThread(), args)
        } else {
          task = nextThread(count + 1)
        }
      }
      return task
    }

    return nextThread(0)
  }

  thread.terminate = thread.kill = function () {
    _.each(threads, function (thread, i) {
      if (i === 0) terminate.call(thread)
      else thread.terminate()
    })
    threads.splice(0)
  }

  thread.threadPool = threads
  thread.isPool = true

  return thread
}
