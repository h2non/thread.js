# thread.js [![Build Status](https://api.travis-ci.org/h2non/thread.js.svg?branch=master)][travis]

[![browser support](https://ci.testling.com/h2non/thread.js.png)](https://ci.testling.com/h2non/thread.js)

<table>
<tr>
<td><b>Stage</b></td><td>beta</td>
</tr>
</table>

**thread.js** is lightweight library that **simplifies JavaScript parallel computing in browser**
environments through a featured, simple and beautiful [programmatic API](#api)

It allows you to run tasks in a non-blocking real thread, including support for provisioning
the isolated thread scope in a simple way and allowing you to bind any type of value, including any serializable type, functions and remote scripts.
It also provides built-in support for creating pool of threads to distribute the
tasks load across multiple threads transparently

It uses [Web Workers](http://en.wikipedia.org/wiki/Web_worker) to create real threads,
but provides fallback support for older browsers based on an `iframe` hack.

Welcome to the multi-thread world in JavaScript. You could start reading some [examples](#basic-usage)

**Note**: the library is still in beta stage. A deep cross-browser testing is still pending.
Do not use it in production environments

## Installation

Via Bower package manager
```bash
$ bower install thread
```

```bash
$ component install h2non/thread.js
```

Or loading the script remotely (just for testing or development)
```html
<script src="//cdn.rawgit.com/h2non/thread.js/0.1.0-rc.1/thread.js"></script>
```

### Environments

Cross-browser support guaranteed passing tests in [Testling](https://ci.testling.com/)

- Chrome >= 5
- Firefox >= 3
- Safari >= 5
- Opera >= 10
- IE >= 8

### Basic usage

If `require` is available, you must use it to fetch the module.
Otherwise it will be available as global

```js
var thread = require('thread')
```

Create a new thread with custom scope and library dependencies
```js
var job = thread({
  env: { numbers: [1,2,3] },
  require: [
    'http://cdnjs.cloudflare.com/ajax/libs/lodash.js/2.4.1/lodash.js'
  ]
})
```

Synchronous example
```js
var task = job.run(function () {
  return _.sortBy(env.numbers, function (num) {
    return Math.sin(num)
  })
})
```

Asynchronous example
```js
var task = job.run(function (done) {
  doAsyncStuff(function () {
    var sorted = _.sortBy(env.numbers, function (num) {
      return Math.sin(num)
    })
    done(null, sorted)
  })
})
```

Consuming the computed task result
```js
task.then(function (array) {
  console.log(array) // -> [3, 1, 2]
}).catch(function (err) {
  console.log('Ups:', err.message)
})
```

## Web Workers resources

- [Basics](https://developer.mozilla.org/en-US/docs/Web/Guide/Performance/Using_web_workers)
- [HTML5Rocks Tutorial](http://www.html5rocks.com/es/tutorials/workers/basics/)
- [Functions available to workers as global scope](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Functions_and_classes_available_to_workers)

## API

### thread([options])
Return: `Thread` Alias: `thread.create`

Supported options:

- **env** `object` Custom environment to use in the isolated thread scope
- **require** `array` Path list of scripts to load
- **namespace** `string` Global namespace to allocate the scope environment. Default to `env`

#### Thread.run(fn, env, args)
Return: `Task` Alias: `exec`

Run a function in the thread context, optionally binding a custom context or passing function arguments

Binding a custom context
```js
thread().run(function (done) {
  done(null, this.x * 2)
}, { x: 2 }).then(function (result) {
  console.log(result) // -> 4
})
```

Passing arguments
```js
thread().run(function (num, done) {
  done(null, num * this.x)
}, { x: 2 }, [ 2 ]).then(function (result) {
  console.log(result) // -> 4
})
```

#### Thread.pool(num)
Return: `Thread`

Create a pool of threads and run tasks accross them

It implements a simple best availability orchestration algorithm to distribute tasks across multiple threads.
It will only create a new thread if it's required and there is not any other thread available

This feature is still beta and general improvements will be done in a future

```js
// create a pool with a maximum of 10 threads
var pool = thread({ env: { x: 2 } }).pool(10)
var count = 1

function runAsyncTask(num) {
  setTimeout(function () {
    pool.run(function (done) {
      return setTimeout(function () {
        done(null, env.x * 2)
      }, Math.random() * 1000)
    }).then(function (result) {
      console.log('Task:', num, '- Result:', result, '- Used threads:', pool.threadPool.length)
      if (count++ === 50) console.log('Tasks finished')
    })
  }, Math.random() * 5000)
}

for (var i = 0; i < 50; i += 1) {
  runAsyncTask(i)
}
```

#### Thread.require(sources)
Return: `Thread`

Add remote scripts, bind an object or functions to the thread isolated scope.
It will be exposed in the global namespace (default `env`)

Load remote script
```js
thread().require('http://cdn.rawgit.com/h2non/hu/0.1.1/hu.js')
```

Or multiple scripts
```js
thread().require([
  'http://cdn.rawgit.com/h2non/hu/0.1.1/hu.js',
  'http://cdn.rawgit.com/h2non/fw/0.1.2/fw.js'
])
```

Binding custom objects and primitives types
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

#### Thread.bind(obj)
Return: `Thread`

Bind a map of values to the isolated thread scope.
You can do the same passing an object to `require()`

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

#### Thread.flush()
Return: `Thread`

Flush the existent isolated thread scope

#### Thread.send(msg)
Return: `Thread`

Send a message directly to the current thread.
Useful for specific use cases, but it's preferably do not use it

#### Thread.kill()
Return: `Thread` Alias: `terminate`

Kill the thread current thread. All the cached data and config will be flushed

#### Thread.start([options])
Return: `Thread`

Start (or restart) the current thread.
If the thread was previously killed, you can reuse it calling this method

#### Thread.pending()
Return: `number`

Return the pending running tasks on the current thread

#### Thread.isRunning()
Return: `boolean`

Return `true` if the current thread has running tasks

### thread.Task(thread)
Return: `Task`

Create a new task in the given thread

Normally you don't need to call it directly, it will done via `Thread.run()` factory

#### Task.maxTaskDelay
Value: `number` Default: `5000`

The maximum amount of time that a task can take in miliseconds.
If the task computation exceed this, it will be exit as error

#### Task.then(successFn [, errorFn])
Return: `Task`

Add success and error (optionally) result handlers for the current task

#### Task.catch(errorFn)
Return: `Task`

Add an error handlers for the current task

#### Task.finally(finalFn)
Return: `Task`

Add a final handler for the current task.
It will be ejecuted when the task finished with `success` or `error` state

#### Task.flush()
Return: `Task`

Flush cached result data and set the initial task state

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
```bash
$ bower install
```

Generate browser bundle source
```bash
$ make browser
```

Run tests
```bash
$ make test
```

## License

[MIT](http://opensource.org/licenses/MIT) © Tomas Aparicio

[travis]: http://travis-ci.org/h2non/thread.js
[gemnasium]: https://gemnasium.com/h2non/thread.js
