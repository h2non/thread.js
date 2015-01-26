var _ = require('./utils')

module.exports = threadPool

function threadPool(num, thread) {
  var threads = [ thread ]
  
  // decorate Thread interface
  thread.run = thread.exec = function () {
    return selectThread(thread, threads, arguments)(0)
  }

  thread.terminate = thread.kill = function () {
    _.each(threads, function (thread) {
      thread.terminate()
    })
    threads.splice(0)
  }

  thread.threadPool = threads
  thread.isPool = true

  return thread
}

function createThread(threads) {
  var options = threads[0].options
  return threads.push(new threadPool.Thread(options))
}

function runTaskInThread(thread, args) {
  return thread.run.apply(thread, args)
}

function selectThread(thread, threads, args) {
  return function newSelectRound(count) {
    var task, thread = findBestAvailableThread(threads, count)
    if (thread) {
      task = runTaskInThread(thread, args)
    } else {
      if (threads.length < num) {
        task = runTaskInThread(createThread(threads), args)
      } else {
        task = newSelectRound(count + 1)
      }
    }
    return task
  }
}

function findBestAvailableThread(threads, offset) {
  var thread, pending
  for (var i = 0, l = threads.length; i < l; i += 1) {
    thread = threads[i]
    pending = thread.pending()
    if (pending === 0 || pending < offset) {
      if (thread.terminated) {
        threads.splice(i, 1)
        l -= 1; i -= 1
      } else {
        return thread
      }
    }
  }
}
