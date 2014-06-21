# thread.js

[![Build Status](https://api.travis-ci.org/h2non/thread.js.svg?branch=master)][travis] [![Dependency Status](https://gemnasium.com/h2non/thread.js.svg)][gemnasium]

Tiny library to simplify parallel thread-based computing in the browser

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
<script src="//rawgithub.com/h2non/thread.js/master/thread.js"></script>
```

## Contributing

Wanna help? Cool! It will be really apreciated :)

`nar` is completely written in LiveScript language.
Take a look to the language [documentation][livescript] if you are new with it.
and follow the LiveScript language conventions defined in the [coding style guide][coding-style]

You must add new test cases for any new feature or refactor you do,
always following the same design/code patterns that already exist

### Development

Only [node.js](http://nodejs.org) is required for development

Clone/fork this repository
```
$ git clone https://github.com/h2non/nar.git && cd nar
```

Install dependencies
```
$ npm install
```

Compile code
```
$ make compile
```

Run tests
```
$ make test
```

## License

[MIT](http://opensource.org/licenses/MIT) © Tomas Aparicio
