#!/usr/bin/env node

import program from 'commander';
import loadPage from '..';
import version from '../../package.json';

program
  .version(version, '-v, --version', 'Output the version number')
  .description('Load web-page with all resources and save hier local in html file.')
  .arguments('<url>')
  .option('-o, --output [dir]', 'Specify save directory.', process.cwd())
  .action((url) => {
    loadPage(url, program.output)
      .then((filename) => {
        console.log(`${url} successfully saved as ${filename}`);
      })
      .catch(({ message }) => {
        console.error(message);
        process.exit(1);
      });
  })
  .parse(process.argv);
