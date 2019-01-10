#!/usr/bin/env node

import program from 'commander';
import path from 'path';
import downloadPage from '..';
import getErrorMessage from '../error';
import render from '../render';

const getFullPath = (pathname = '') => path.resolve(process.cwd(), pathname);

program
  .version('1.0.0', '-v, --version')
  .description('Downloads a web-page and saves it to output dir.')
  .option('--output [dir]', 'output directory (default is current)')
  .arguments('<url>')
  .action((url) => {
    downloadPage(url, getFullPath(program.output), render)
      .then(filename => console.log(`Download complete.\nWeb-page '${url}' saved as '${filename}'`))
      .catch((error) => {
        console.error(getErrorMessage(error));
        process.exit(1);
      });
  })
  .parse(process.argv);
