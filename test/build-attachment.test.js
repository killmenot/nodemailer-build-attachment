'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const path = require('path');
const BuildAttachment = require('../');

const filename = path.join(__dirname, 'fixtures', 'test.txt');
const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n';

describe('BuildAttachment', () => {
  let buildAttachment;

  describe('BuildAttachment()', () => {
    it('with default options', () => {
      buildAttachment = new BuildAttachment();

      expect(buildAttachment.contentTransferEncoding).equal('');
      expect(buildAttachment.contentDisposition).equal('attachment');
      expect(buildAttachment.filename).equal('');
      expect(buildAttachment.contentType).equal('');
      expect(buildAttachment.encoding).equal('');
      expect(buildAttachment.cid).equal('');
      expect(buildAttachment.headers).eql([]);
    });

    it('with custom options', () => {
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

      expect(buildAttachment.contentTransferEncoding).equal('base64');
      expect(buildAttachment.contentDisposition).equal('attachment-1');
      expect(buildAttachment.filename).equal('text.txt');
      expect(buildAttachment.contentType).equal('text/plain');
      expect(buildAttachment.encoding).equal('utf-8');
      expect(buildAttachment.cid).equal('cid:foo@bar.net');
      expect(buildAttachment.headers).eql([
        {
          key: 'X-Key-Name',
          value: 'val1'
        }
      ]);
    });

    it('with filename', () => {
      buildAttachment = new BuildAttachment({
        filename: 'page.html',
      });
      expect(buildAttachment.contentType).equal('text/html');
    });
  });

  it('should return instance to itself', (done) => {
    buildAttachment = new BuildAttachment();

    buildAttachment.setContent('hello world').build((err, attachment) => {
      expect(attachment).equal(buildAttachment);
      done();
    });
  });

  it('should build string content', (done) => {
    new BuildAttachment().setContent('hello world').build((err, attachment) => {
      expect(attachment.content.toString()).equal('hello world');
      done();
    });
  });

  it('should build stream content', (done) => {
    var content = fs.createReadStream(filename);
    new BuildAttachment().setContent(content).build((err, attachment) => {
      expect(attachment.content.toString()).be.eql(text);
      done();
    });
  });

  it('should build path content', (done) => {
    new BuildAttachment().setContent({
      path: filename
    }).build((err, attachment) => {
      expect(attachment.content.toString()).be.eql(text);
      done();
    });
  });

  it('should build href content', (done) => {
    new BuildAttachment().setContent({
      href: 'https://raw.githubusercontent.com/killmenot/nodemailer-build-attachment/master/test/fixtures/test.txt'
    }).build((err, attachment) => {
      expect(attachment.content.toString()).be.eql(text);
      done();
    });
  });

  it('should build content to base64 string', (done) => {
    new BuildAttachment({
      contentTransferEncoding: 'base64'
    }).setContent('hello world').build((err, attachment) => {
      expect(attachment.content.toString()).equal('aGVsbG8gd29ybGQ=');
      done();
    });
  });

  it('should build content with passed lineLength', (done) => {
    var options = {
      lineLength: 10
    };
    
    new BuildAttachment({
      contentTransferEncoding: 'base64'
    }).setContent('Lorem ipsum dolor sit amet').build(options, (err, attachment) => {
      expect(attachment.content.toString()).equal('TG9yZW0gaX\r\nBzdW0gZG9s\r\nb3Igc2l0IG\r\nFtZXQ=');
      done();
    });
  });
});
