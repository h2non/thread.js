# thread.js [![Build Status](https://api.travis-ci.org/h2non/thread.js.svg?branch=master)][travis]

[![browser support](https://ci.testling.com/h2non/thread.js.png)](https://ci.testling.com/h2non/thread.js)

<table>
<tr>
<td><b>Stage</b></td><td>beta</td>
</tr>
</table>

**thread.js** is a small library that **simplifies JavaScript parallel computing in browsers** environments.

It uses the [Web Workers API](http://en.wikipedia.org/wiki/Web_worker),
but provides fallback support for older browsers based on `iframe` hacking.

Welcome to the multi-thread world in JavaScript

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
<script src="//cdn.rawgit.com/h2non/thread.js/0.1.0-rc.0/thread.js"></script>
```

### Environments

Cross-browser support guaranteed thanks to passing tests in [Testling](https://ci.testling.com/)

- Chrome >= 5
- Firefox >= 3
- Safari >= 5
- Opera >= 10
- IE >= 8

### Basic usage

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

#### Thread.run(fn, env)
Return: `Task` Alias: `exec`

Run a function in the thread context, optionally passing a custom environment

#### Thread.require(sources)
Return: `Thread`

Add required scripts or functions to bind to the thread isolated context

#### Thread.bind(env)
Return: `Thread`

Bind a new context to the isolated thread

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

### thread.Task(thread)
Return: `Task`

Create a new task in the given thread

Normally you don't need to call it directly, it will done via `Thread.run()` factory

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
```
$ git clone https://github.com/h2non/thread.js.git && cd thread.js
```

Install dependencies
```
$ npm install
```

Generate browser bundle source
```
$ make browser
```

Run tests
```
$ make test
```

## License

[MIT](http://opensource.org/licenses/MIT) © Tomas Aparicio

[travis]: http://travis-ci.org/h2non/thread.js
[gemnasium]: https://gemnasium.com/h2non/thread.js
