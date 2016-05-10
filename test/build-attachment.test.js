/* globals describe, it */

'use strict';

var expect = require('chai').expect;
var fs = require('fs');
var path = require('path');
var BuildAttachment = require('../');

describe('BuildAttachment', function () {
  var buildAttachment;
  var filename = path.join(__dirname, 'fixtures', 'test.txt');
  var text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n';

  it('should be defined', function () {
    expect(BuildAttachment).to.be.a('function');
  });

  describe('BuildAttachment()', function () {
    it('with default options', function () {
      buildAttachment = new BuildAttachment();

      expect(buildAttachment.contentTransferEncoding).to.equal('');
      expect(buildAttachment.contentDisposition).to.equal('attachment');
      expect(buildAttachment.filename).to.equal('');
      expect(buildAttachment.contentType).to.equal('');
      expect(buildAttachment.encoding).to.equal('');
      expect(buildAttachment.cid).to.equal('');
      expect(buildAttachment.headers).to.eql([]);
    });

    it('with custom options', function () {
      buildAttachment = new BuildAttachment({
        contentTransferEncoding: 'base64',
        contentDisposition: 'attachment-1',
        filename: 'text.txt',
        contentType: 'text/plain',
        encoding: 'utf-8',
        cid: 'cid:foo@bar.net',
        headers: [
          {
            key: 'X-Key-Name',
            value: 'val1'
          }
        ]
      });

      expect(buildAttachment.contentTransferEncoding).to.equal('base64');
      expect(buildAttachment.contentDisposition).to.equal('attachment-1');
      expect(buildAttachment.filename).to.equal('text.txt');
      expect(buildAttachment.contentType).to.equal('text/plain');
      expect(buildAttachment.encoding).to.equal('utf-8');
      expect(buildAttachment.cid).to.equal('cid:foo@bar.net');
      expect(buildAttachment.headers).to.eql([
        {
          key: 'X-Key-Name',
          value: 'val1'
        }
      ]);
    });

    it('with filename', function () {
      buildAttachment = new BuildAttachment({
        filename: 'page.html',
      });
      expect(buildAttachment.contentType).to.equal('text/html');
    });
  });

  it('should return instance to itself', function (done) {
    buildAttachment = new BuildAttachment();

    buildAttachment.setContent('hello world').build(function (err, attachment) {
      expect(attachment).to.equal(buildAttachment);
      done();
    });
  });

  it('should build string content', function (done) {
    new BuildAttachment().setContent('hello world').build(function (err, attachment) {
      expect(attachment.content.toString()).to.equal('hello world');
      done();
    });
  });

  it('should build stream content', function (done) {
    var content = fs.createReadStream(filename);
    new BuildAttachment().setContent(content).build(function (err, attachment) {
      expect(attachment.content.toString()).to.be.eql(text);
      done();
    });
  });

  it('should build path content', function (done) {
    new BuildAttachment().setContent({
      path: filename
    }).build(function (err, attachment) {
      expect(attachment.content.toString()).to.be.eql(text);
      done();
    });
  });

  it('should build href content', function (done) {
    new BuildAttachment().setContent({
      href: 'https://raw.githubusercontent.com/killmenot/nodemailer-build-attachment/master/test/fixtures/test.txt'
    }).build(function (err, attachment) {
      expect(attachment.content.toString()).to.be.eql(text);
      done();
    });
  });

  it('should build content to base64 string', function (done) {
    new BuildAttachment({
      contentTransferEncoding: 'base64'
    }).setContent('hello world').build(function (err, attachment) {
      expect(attachment.content.toString()).to.equal('aGVsbG8gd29ybGQ=');
      done();
    });
  });

  it('should build content with passed lineLength', function (done) {
    var options = {
      lineLength: 10
    };
    
    new BuildAttachment({
      contentTransferEncoding: 'base64'
    }).setContent('Lorem ipsum dolor sit amet').build(options, function (err, attachment) {
      expect(attachment.content.toString()).to.equal('TG9yZW0gaX\r\nBzdW0gZG9s\r\nb3Igc2l0IG\r\nFtZXQ=');
      done();
    });
  });
});
