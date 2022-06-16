'use strict';

import * as fs from 'fs';
import cliProgress from 'cli-progress';
import stream from 'stream';

/**
 * create transform stream for print file read progress
 * @param {string} filePath file path
 * @returns {stream.Transform}
 */
const createProgressTransformStream = (filePath) => {
  const size = fs.statSync(filePath).size;
  let bytesRead = 0;
  let count = 0;

  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(size, 0);

  return new stream.Transform({
    transform: function (chunk, _, done) {
      bytesRead += chunk.length;

      if (++count === 100) {
        progressBar.update(bytesRead);
        count = 0;
      }

      this.push(chunk);
      done();
    },
    flush: function (done) {
      progressBar.update(size);
      progressBar.stop();

      done();
    }
  });
};

export default createProgressTransformStream;
