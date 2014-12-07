# thread.js [![Build Status](https://api.travis-ci.org/h2non/thread.js.svg?branch=master)][travis] [![Stories in Ready](https://badge.waffle.io/h2non/thread.js.png?label=ready&title=Ready)](https://waffle.io/h2non/thread.js) [![Code Climate](https://codeclimate.com/github/h2non/thread.js/badges/gpa.svg)](https://codeclimate.com/github/h2non/thread.js) [![Version](https://img.shields.io/bower/v/thread.svg)] [![Gitter chat](https://badges.gitter.im/h2non/thread.js.png)](https://gitter.im/h2non/thread.js)

**thread.js** is lightweight, reliable and rich featured library that
**simplifies JavaScript parallel computing in browser** environments
through a clean and elegant [API](#api) with promise-based asynchronous handling.
You can run **tasks in a non-blocking real thread** in a really simple way,
with an elegant programatic aproach and great state handling

It provides awesome **features** such as **data binding serialization**, **cross-scope arguments passing**, **asynchronous tasks**, **require external sources** easly in the thread and includes built-in support for creating **pool of threads** to distribute the
task load across multiple workers transparently using a simple best availability task schedule availability algorithm

It uses [Web Workers](http://en.wikipedia.org/wiki/Web_worker) to create real threads,
but provides fallback support for older browsers based on an `iframe` hack (you can be safe in IE9)

Welcome to the multithreading world in the browser, now made simple and small (5KB gzipped)

Getting started with [basic usage](#basic-usage),
some [examples](https://github.com/h2non/thread.js/tree/master/examples) or [tests](https://github.com/h2non/thread.js/tree/master/test) and be aware about [threads limitations](#threads-limitations)

## Installation

Via [Bower](http://bower.io)
```bash
bower install thread
```
Via [Component](https://github.com/component/component)
```bash
component install h2non/thread.js
```

Or loading the script remotely
```html
<script src="//cdn.rawgit.com/h2non/thread.js/0.1.13/thread.js"></script>
```

## Environments

- Chrome >= 5
- Firefox >= 3
- Safari >= 5
- Opera >= 12
- IE >= 9 (IE8 is not officially supported, but it may work)
- PhantomJS >= 1.7
- SlimerJS >= 0.8

## Basic usage

If `require` is available, you must use it to fetch the module.
Otherwise it will be available as global

```js
var thread = require('thread')
```

Create a new thread with custom scope environment and import external libraries
```js
var worker = thread({
  env: { numbers: [1,2,3] },
  require: [
    'http://cdnjs.cloudflare.com/ajax/libs/lodash.js/2.4.1/lodash.js'
  ]
})
```

Running a synchronous task in the thread
```js
var task = worker.run(function () {
  return _.sortBy(env.numbers, function (num) {
    return Math.sin(num)
  })
})
```

Running an asynchronous task in the thread
```js
var task = worker.run(function (done) {
  doAsyncStuff(function () {
    var sorted = _.sortBy(env.numbers, function (num) {
      return Math.sin(num)
    })
    done(null, sorted)
  })
})
```

Consuming the computed result (promise-based API)
```js
task.then(function (array) {
  console.log(array) // -> [3, 1, 2]
}).catch(function (err) {
  console.log('Ups:', err.message)
}).finally(function (result) {
  console.log('Final result:', result) // -> [3, 1, 2]
})
```

#### Note about Internet Explorer usage

Since Microsoft makes a continuous effort to break the Web and its standards, due to a technical limitation in IE 10 and 11,
it is required to use an external script to create the thread properly.

You must customize the `evalPath` option when creating threads from IE.
The eval script is located in `lib/eval.js`

Common example with Bower:
```js
var worker = thread({
  evalPath: '/bower_components/thread.js/lib/eval.js' // default 'lib/eval.js'
})
```

If you use full URLs to load the `eval` script, be aware about cross-origin policy.
You must define the CORS headers properly in the server

## Web Workers resources

- [Basics](https://developer.mozilla.org/en-US/docs/Web/Guide/Performance/Using_web_workers)
- [HTML5Rocks Tutorial](http://www.html5rocks.com/es/tutorials/workers/basics/)
- [Custom scope in Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Functions_and_classes_available_to_workers)
- [Origin policy restrictions](http://www.html5rocks.com/en/tutorials/security/content-security-policy/)
- [Specification](http://www.whatwg.org/specs/web-apps/current-work/multipage/workers.html)

## Threads limitations

You should be aware of some limitations while using threads

Threads has its own isolated scope, so that means each thread has its own memory space.
That's means you must explicitly bind values or functions
to the thread in order to consum them inside the thread scope.
Any passed value to the thread scope will be cloned (it will be passed by value, not by reference),
so mutation is not possible between scopes since memory space has no synchronization

If you create a pool of threads, you must consider that threads in the pool are scope-isolated too.
In other words, it's not supported scope synchronization between threads in the pool.
That's usually positive because you cannot have side-effects between threads,
but you should be aware about global scope dependencies and mutation in your code in other to avoid inconsistency between threads

All values binded to the thread must be JSON-serializable, meaning only primitives types, raw objects and functions.
Same with return values from threads.

In modern browsers, there is possible to bind complex data type structures to the Worker scope using the Transferable interface which supports the [internal structure cloning algorithm](http://www.w3.org/html/wg/drafts/html/master/infrastructure.html#internal-structured-cloning-algorithm).
However, there are still some limitations: DOM nodes, native built-in functions and prototypes chains cannot be cloned and therefore, is not possible to bind them to the thread

Additionally, threads do not have access to the DOM API

## API

### thread([options])
Return: `thread` Alias: `thread.create`

Supported options:

- **env** `object` Custom environment to bind to the isolated thread scope
- **require** `string|array|object` Source path scripts to load or map of values/functions to bind
- **namespace** `string` Global namespace to allocate the scope environment. Default to `env`
- **evalPath** `string` Path to `eval.js` script, required in IE 10 & 11. Default to `lib/eval.js`
- **silent** `boolean` Enable/disable silent mode. If enabled, Worker errors will not throw an exception and you should subscribe to the `error` event to handle them properly. Default `false`

```js
thread({
  namespace: 'global',
  env: {
    x: 10,
    sqrt: function (n) {
      return Math.sqrt(Math.pow(n, n))
    }
  },
  require: [
    'http://cdn.rawgit.com/h2non/hu/0.1.1/hu.js'
  ]
})
```

#### thread#run(fn, env, args)
Return: `task` Alias: `exec`

Run the given function in the thread isolated scope.
You can optionally bind a custom context (as `map` of values) or passing function arguments
(as `array`) to be injected when the function will be invoked

Bind values must be serializable types (see [threads limitations](#threads-limitations))

Run a function and return the result synchronously (`return` statement required)
```js
thread().run(function () {
  return 2 * 2
}).then(function (result) {
  console.log(result) // -> 4
})
```

Binding a custom context and return the result asynchronously
```js
thread().run(function (done) {
  done(null, this.x * 2)
}, { x: 2 }).then(function (result) {
  console.log(result) // -> 4
})
```

Passing arguments and return the result asynchronously
```js
thread().run(function (num, done) {
  done(null, num * this.x)
}, { x: 2 }, [ 2 ]).then(function (result) {
  console.log(result) // -> 4
})
```

#### thread#pool(number)
Return: `thread`

Create a pool of a maximum number of threads and run tasks across them

It implements a simple best availability scheudle algorithm to transparently
distribute tasks across multiple workers.
It will only create a new thread if it's required and there is not any other thread available

This feature is still beta and major improvements will be done in future releases.
Any feedback will be really appreciated

```js
// create a pool with a maximum of 10 threads
var pool = thread({ env: { x: 2 } }).pool(10)
var count = 1
var tasks = 50

function runAsyncTask(num) {
  setTimeout(function () {
    pool.run(function (done) {
      setTimeout(function () {
        done(null, env.x * 2)
      }, Math.random() * 1000)
    }).then(function (result) {
      console.log('Task:', num)
      console.log('Result:', result)
      console.log('Used threads:', pool.threadPool.length)
      if (count++ === tasks) {
        console.log('Tasks finished')
        pool.kill() // kill all pool threads
      }
    })
  }, Math.random() * 1000)
}

for (var i = 0; i < tasks; i += 1) {
  runAsyncTask(i)
}
```

#### thread#bind(obj)
Return: `thread` Alias: `set`

Bind a map of values to the isolated thread scope.
You can do the same passing an object via `thread#require()`

Passed values will be exposed in the global namespace (default to `env`)

```js
var task = thread().bind({
  num: 4,
  list: [3,2,1],
  defer: function (fn) {
    setTimeout(fn, 1)
  }
})

task.run(function (done) {
  env.defer(function () {
    done(null, env.list.reverse().push(env.num))
  })
}).then(function (result) {
  console.log(result) // -> [1,2,3,4]
})
```

#### thread#require(sources)
Return: `thread` Alias: `import`

Load remote scripts from a valid URL, bind an object or functions to the thread isolated scope.
Passed values will be exposed in the global namespace (default to `env`)

Importing a remote script
```js
thread()
  .require('http://cdn.rawgit.com/h2non/hu/0.1.1/hu.js')
  .run(function () {
    return typeof hu === 'object'
  }).then(function (exists) {
    console.log(exists) // -> true
  })
```

Or multiple scripts
```js
thread().require([
  'http://cdn.rawgit.com/h2non/hu/0.1.1/hu.js',
  'http://cdn.rawgit.com/h2non/fw/0.1.2/fw.js'
])
```

Binding custom objects and primitives types (does the same as `bind()`)
```js
thread().require({
  list: [1,2,3,4,5],
  name: 'John',
  age: 28,
  time: new Date().getTime()
})
```

Binding functions
```js
thread().require({
  defer: function (fn) {
    setTimeout(fn, 1)
  },
  transform: function (arr) {
    return arr.reverse().filter(function (num) {
      return num > 1 && num < 100
    })
  }
})
```

Bind values will be available in the global namespace object (default to `env`)

#### thread#flush()
Return: `thread`

Flush the thread cached data and scope environment.
If you flush the data, you will need

```js
var worker = thread({ env: { x: 2 } }).flush()
console.log(Object.keys(worker.options.env).length) // -> 0
```

#### thread#flushTasks()
Return: `thread`

Flush running tasks promises and clean cached values

```js
var worker = thread()
worker.run(doLongTask)
worker.flushTasks()
console.log(worker.pending()) // -> 0
```

#### thread#send(msg)
Return: `thread`

Send a message directly to the current thread.
Useful for specific use cases, but it's preferably do not use it directly.
Use the `run()` abstraction instead

Be aware about passing non-serialize data types such as native JavaScript objects,
DOM nodes, objects with self-references... (see threads [limitations](https://github.com/h2non/thread.js#threads-limitations))

```js
var worker = thread()
worker.send({ type: 'msg', data: 'hello world' })
```

#### thread#kill()
Return: `thread` Alias: `terminate`

Kill the current thread. All the cached data, scope environment and config options will be flushed,
including in worker isolated scope

It's recommended you explicit kill any unused thread in order to avoid memory issues in long term computations

```js
var worker = thread()
worker.run(longTask).then(function () {
  worker.kill()
})
```

#### thread#start([options])
Return: `thread`

Start (or restart) the current thread.
If the thread was previously killed, you can reuse it calling this method

```js
var options = { env: { x: 2 } }
var worker = thread(options)
worker.kill() // explicit kill
worker.start(options) // explicit re-start, passing the same options
```

#### thread#pending()
Return: `number`

Return the pending running tasks on the current thread

```js
var worker = thread()
var task = worker.run(longAsyncTask)
worker.pending() // -> 1
task.then(function () {
  worker.pending() // -> 0
})
```

#### thread#running()
Return: `boolean`

Return `true` if the current thread has running tasks

```js
thread().run(longAsyncTask).running() // -> true
thread().run(tinySyncTask).running() // -> false
```

#### thread#idle()
Return: `boolean` Alias: `sleeping`

Return `true` if the current thread is in idle state.

A thread will be considered in idle state if its latest executed task exceeds from the [idleTime](#threadidletime).
By default, the idle time will be 30 seconds

```js
var worker = thread()
worker.idleTime = 1000 // set max 1 second
var task = worker.run(someTask)
setTimeout(function () {
  // after idle time exceeds, the thread will be in idle state
  worker.idle() // -> true
}, 2000)
```

#### thread#terminated
Type: `boolean`

Expose the thread run state

```js
thread().terminated // -> false
thread().kill().terminated // -> true
```

#### thread#on(type, handler)
Return: `thread` Alias: `addEventListener`

Add a custom worker event handler. By default you don't need to handle
events directly, use it only for exceptional specific purposes

Supported event are:

- **error**
- **message**

#### thread#off(type, handler)
Return: `thread` Alias: `removeEventListener`

Remove a worker event listener.
It's required to pass the original handler function in order to remove it

#### thread#maxTaskDelay
Type: `number` Default: `0`

The maximum amount of time that a task can take in miliseconds.
If the task computation time exceed, it will be exit as error.

By default this feature is disabled in order to avoid unnecessary computations

This value will be applied to every task which runs in the current thread or a pool of threads

```js
var worker = thread()
worker.maxTaskDelay = 1000
worker.run(function (done) {
  setTimeout(done, 2000)
}).catch(function (err) {
  console.log(err.message) // -> task execution time exceeded
})
```

#### thread#idleTime
Type: `number` Default: `30000`

The minimum time in milliseconds that a thread is considered in sleeping (idle) state

#### thread#isPool
Type: `boolean`

Check if the current `thread` instance is a pool of threads

```js
var pool = thread().pool(2)
pool.isPool // -> true
```

### thread.Task(thread [, env])
Return: `task`

Create a new task in the given thread

Normally you don't need to call it directly, it will done via `thread.run()` factory

```js
var worker = thread({ env: { x: 2 }})
var task = new thread.Task(worker, { y: 2 })
task.run(function () {
  return env.x * this.y
}).then(function (result) {
  console.log(result) // -> 4
})
```

#### Task#then(successFn [, errorFn])
Return: `task` Alias: `success`

Add success and error (optionally) result handlers for the current task

```js
var worker = thread()
vas task = new thread.Task(worker)
task.run(longAsyncTask).then(function (result) {
  console.log(result)
})
```

#### Task#catch(errorFn)
Return: `task` Alias: `error`

Add an error handlers for the current task

```js
var worker = thread()
vas task = new thread.Task(worker)
task.run(longAsyncTask).catch(function (err) {
  console.log(err)
})
```

#### Task#finally(finalFn)
Return: `task` Alias: `finish`

Add a final handler for the current task.
It will be ejecuted when the task finished with `success` or `error` state

```js
var worker = thread()
vas task = new thread.Task(worker)
task.run(longAsyncTask).finally(function (result) {
  console.log(result)
})
```

#### Task#bind(obj)
Return: `task`

Bind custom map environment to the current task scope

```js
var worker = thread()
vas task = new thread.Task(worker)
task.bind({ x: 2 })
task.run(function () {
  return this.x * 2
}).then(function (result) {
  console.log(result) // -> 4
})
```

#### Task#flush()
Return: `task`

Flush cached result data and set the initial task state

```js
var worker = thread()
vas task = new thread.Task(worker)
task.flush()
task.flushed() // -> true
```

#### Task#flushed()
Return: `boolean`

Return `true` if task data was already flushed

### Static members

#### thread.all()
Return: `array`

Return an array of created threads (running and idle)

#### thread.total()
Return: `number`

Return the total number of created threads  (running and idle)

#### thread.all()
Return: `array`

Return an array with all created threads

#### thread.running()
Return: `array`

Return an `array` of the running threads (are processing one or more tasks)

#### thread.idle()
Return: `array`

Return an `array` of the idle threads (thread which has no execute tasks for a long time)

#### thread.killAll()
Alias: `terminateAll`

Kill all the created threads (under `active` or `idle` state)

#### thread.killIdle()
Alias: `terminateIdle`

Kill all the threads under `idle` state

#### thread.flush()

Flush the built-in threads store manager (but they will not be killed)

#### thread.VERSION
Type: `string`

Current library semantic version

## Contributing

Wanna help? Cool! It will be appreciated :)

You must add new test cases for any new feature or refactor you do,
always following the same design/code patterns that already exist

### Development

Only [node.js](http://nodejs.org) is required for development

Clone the repository
```bash
$ git clone https://github.com/h2non/thread.js.git && cd thread.js
```

Install dependencies
```bash
$ npm install
```

Generate browser bundle source
```bash
$ make browser
```

Run tests
```bash
$ make test
```

See the [examples](https://github.com/h2non/thread.js/tree/master/examples)
```bash
$ ./node_modules/.bin/http-server
```

## License

[MIT](http://opensource.org/licenses/MIT) © Tomas Aparicio

[travis]: http://travis-ci.org/h2non/thread.js
[gemnasium]: https://gemnasium.com/h2non/thread.js
