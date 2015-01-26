var _ = require('./utils')

module.exports = threadPool

function threadPool(poolSize, thread) {
  var threads = [ thread ]

  thread._run = thread.run
  thread._terminate = thread.terminate

  // decorate the thread public interface
  thread.run = thread.exec = function () {
    return selectThread(thread, threads, poolSize, arguments)(0)
  }

  thread.terminate = thread.kill = function () {
    _.each(threads, function (thread) {
      if (thread._terminate) {
        thread._terminate()
      } else {
        thread.terminate()
      }
    })
    threads.splice(0)
  }

  thread.threadPool = threads
  thread.isPool = true

  return thread
}

function createThread(threads) {
  var mainThread = threads[0]
  var thread = new mainThread.constructor(mainThread.options)
  threads.push(thread)
  return thread
}

function runTaskInThread(thread, threads, args) {
  var run = thread === threads[0] ? '_run' : 'run'
  return thread[run].apply(thread, args)
}

function selectThread(thread, threads, poolSize, args) {
  return function newRound(busyThreads) {
    var task, thread = findBestAvailableThread(threads, busyThreads)
    if (thread) {
      task = runTaskInThread(thread, threads, args)
    } else {
      if (threads.length < poolSize) {
        task = runTaskInThread(createThread(threads), threads, args)
      } else {
        task = newRound(busyThreads + 1)
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
