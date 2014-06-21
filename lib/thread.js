(function (global) {
  'use strict';

  var URL = global.URL || global.webkitURL;
  if (!URL) {
    throw new Error('This browser does not support Blob URLs');
  }
  if(!global.Worker) {
    throw new Error('This browser does not support Web Workers');
  }

  

}(window))
