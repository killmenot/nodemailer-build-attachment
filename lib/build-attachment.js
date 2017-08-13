'use strict';

var fs = require('fs');
var stream = require('stream');
var libmime = require('libmime');
var libbase64 = require('libbase64');
var PassThrough = stream.PassThrough;
var fetch = require('nodemailer-fetch');

// Required by nodemailer-fetch because it supports node 6+ only
// Array.prototype.includes
require('./includes-polyfill');

function BuildAttachment(options) {
  options = options || {};

  /**
   * @type {String}
   */
  this.contentTransferEncoding = options.contentTransferEncoding || '';

  /**
   * @type {String}
   */
  this.encoding = options.encoding || '';

  /**
   * @type {String}
   */
  this.cid = options.cid || '';

  /**
   * @type {Array}
   */
  this.headers = [].concat(options.headers || []);

  /**
   * @type {String}
   */
  this.contentDisposition = options.contentDisposition || 'attachment';

  /**
   * @type {String}
   */
  this.filename = options.filename || '';

  /**
   * @type {String}
   */
  this.contentType = (options.contentType || '').toString().toLowerCase().trim();

  if (this.filename && !this.contentType) {
    this.contentType = libmime.detectMimeType(this.filename.split('.').pop());
  }
}

BuildAttachment.prototype.getTransferEncoding = function () {
    var transferEncoding = false;
    var contentType = this.contentType;

    if (this.content) {
        transferEncoding = this.contentTransferEncoding;
        if (!transferEncoding || ['base64'].indexOf(transferEncoding) < 0) {
          if (/^text\//i.test(contentType)) {
            transferEncoding = 'base64';
          }
        }
    }

    return transferEncoding;
};

BuildAttachment.prototype.setContent = function (content) {
  this.content = content;
  return this;
};

BuildAttachment.prototype.stream = function (outputStream, options, callback) {
  var localStream;
  var contentStream;
  var transferEncoding = this.getTransferEncoding();

  if (this.content) {
    if (Object.prototype.toString.call(this.content) === '[object Error]') {
      // content is already errored
      return callback(this.content);
    }

    if (typeof this.content.pipe === 'function') {
      this._contentErrorHandler = function (err) {
        return callback(err);
      };
      this.content.removeListener('error', this._contentErrorHandler);
      this.content.once('error', this._contentErrorHandler);
    }

    if (['base64'].indexOf(transferEncoding) >= 0) {
      contentStream = new libbase64.Encoder(options);

      contentStream.pipe(outputStream, {
        end: false
      });
      contentStream.once('end', callback);
      contentStream.once('error', function (err) {
        return callback(err);
      });

      localStream = this._getStream(this.content);
      localStream.pipe(contentStream);
    } else {
      // anything that is not Base64 passes as-is
      localStream = this._getStream(this.content);
      localStream.pipe(outputStream, {
        end: false
      });
      localStream.once('end', callback);
    }

    localStream.once('error', function (err) {
      return callback(err);
    });
  } else {
    setImmediate(callback);
  }
};

BuildAttachment.prototype.createReadStream = function (options) {
    options = options || {};

    var outputStream = new PassThrough(options);

    this.stream(outputStream, options, function (err) {
      if (err) {
        outputStream.emit('error', err);
        return;
      }
      outputStream.end();
    });

    return outputStream;
};

BuildAttachment.prototype.build = function (options, callback) {
  var _self = this;
  var buf = [];
  var buflen = 0;
  var returned = false;
  var stream;

  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }

  stream = this.createReadStream(options);

  stream.on('readable', function () {
    var chunk;

    while ((chunk = stream.read()) !== null) {
      buf.push(chunk);
      buflen += chunk.length;
    }
  });

  stream.once('error', function (err) {
    if (returned) {
      return;
    }
    returned = true;

    return callback(err);
  });

  stream.once('end', function (chunk) {
    if (returned) {
      return;
    }
    returned = true;

    if (chunk && chunk.length) {
      buf.push(chunk);
      buflen += chunk.length;
    }

    _self.content = Buffer.concat(buf, buflen);

    return callback(null, _self);
  });
};

BuildAttachment.prototype._getStream = function (content) {
  var contentStream;

  if (typeof content.pipe === 'function') {
    // assume as stream
    return content;
  } else if (content && typeof content.path === 'string' && !content.href) {
    // read file
    return fs.createReadStream(content.path);
  } else if (content && typeof content.href === 'string') {
    // fetch URL
    return fetch(content.href);
  } else {
    // pass string or buffer content as a stream
    contentStream = new PassThrough();
    setImmediate(function () {
      contentStream.end(content || '');
    });
    return contentStream;
  }
};

module.exports = BuildAttachment;
