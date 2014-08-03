# thread.js [![Build Status](https://api.travis-ci.org/h2non/thread.js.svg?branch=master)][travis] [![Dependency Status](https://gemnasium.com/h2non/thread.js.svg)][gemnasium]

[![browser support](https://ci.testling.com/h2non/thread.js.png)](https://ci.testling.com/h2non/thread.js)

<table>
<tr>
<td><b>Stage</b></td><td>beta</td>
</tr>
</table>

**thread.js** is a small library that **simplifies parallel computing in JavaScript browser** environments

It uses the [Web Workers API](http://en.wikipedia.org/wiki/Web_worker),
but provides fallback support for older browsers

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
<script src="//cdn.rawgit.com/h2non/thread.js/0.1.0/thread.js"></script>
```

### Environments

Cross-browser support guaranteed passing tests in [Testling](https://ci.testling.com/)

- Chrome >= 5
- Firefox >= 3
- Safari >= 5
- Opera >= 10
- IE >= 8

### Basic usage

```js
var thread = new Thread({
  end: { x: 2 },
  require: [
    './js/util.js',
    'http://cdn.rawgit.com/h2non/hu/0.1.1/hu.js'
  ]
})

var task = thread.run(function (done) {
  get('/api/user/age', function (err, age) {
    if (err) {
      done(err)
    } else {
      done(null, env.x + age)
    }
  })
})

task.then(function (sum) {
  console.log(sum) // -> 26
})
```

### Web Workers resources

- [Web Workers basics](https://developer.mozilla.org/en-US/docs/Web/Guide/Performance/Using_web_workers)
- [Web Workers tutorial](http://www.html5rocks.com/es/tutorials/workers/basics/)
- [Functions available to workers as global scope](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Functions_and_classes_available_to_workers)

### API

#### new Thread([options])

```js
var thread = new Thread({
  end: { x: 2 },
  require: [
    './js/util.js',
    'http://cdn.rawgit.com/h2non/hu/0.1.1/hu.js'
  ]
})
```

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
