'use strict';

const fs = require('fs');
const stream = require('stream');
const libmime = require('libmime');
const libbase64 = require('libbase64');
const PassThrough = stream.PassThrough;
const fetch = require('nodemailer-fetch');

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
  let transferEncoding = false;

  if (this.content) {
    transferEncoding = this.contentTransferEncoding;
    if (!transferEncoding || ['base64'].indexOf(transferEncoding) < 0) {
      if (/^text\//i.test(this.contentType)) {
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
  let localStream;
  let contentStream;

  if (this.content) {
    if (Object.prototype.toString.call(this.content) === '[object Error]') {
      // content is already errored
      setImmediate(() => callback(this.content));
      return;
    }

    if (typeof this.content.pipe === 'function') {
      this._contentErrorHandler = (err) => callback(err);
      this.content.removeListener('error', this._contentErrorHandler);
      this.content.once('error', this._contentErrorHandler);
    }

    const transferEncoding = this.getTransferEncoding();
    if (['base64'].indexOf(transferEncoding) >= 0) {
      contentStream = new libbase64.Encoder(options);

      contentStream.pipe(outputStream, {
        end: false
      });
      contentStream.once('end', callback);
      contentStream.once('error', (err) => callback(err));

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

    localStream.once('error', (err) => callback(err));
  } else {
    setImmediate(callback);
  }
};

BuildAttachment.prototype.createReadStream = function (options) {
  options = options || {};

  const outputStream = new PassThrough(options);

  this.stream(outputStream, options, (err) => {
    if (err) {
      outputStream.emit('error', err);
      return;
    }
    outputStream.end();
  });

  return outputStream;
};

BuildAttachment.prototype.build = function (options, callback) {
  const buf = [];
  let buflen = 0;
  let returned = false;

  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }

  const stream = this.createReadStream(options);

  stream.on('readable', () => {
    let chunk;

    while ((chunk = stream.read()) !== null) {
      buf.push(chunk);
      buflen += chunk.length;
    }
  });

  stream.on('error', (err) => {
    if (returned) {
      return;
    }
    returned = true;

    return callback(err);
  });

  stream.once('end', (chunk) => {
    if (returned) {
      return;
    }
    returned = true;

    if (chunk && chunk.length) {
      buf.push(chunk);
      buflen += chunk.length;
    }

    this.content = Buffer.concat(buf, buflen);

    return callback(null, this);
  });
};

BuildAttachment.prototype._getStream = function (content) {
  let contentStream;

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
    setImmediate(() => {
      contentStream.end(content || '');
    });
    return contentStream;
  }
};

module.exports = BuildAttachment;
