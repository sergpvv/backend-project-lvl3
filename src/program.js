import program from 'commander';

import loadPage from '.';

program
  .version('0.0.1', '-v, --version', 'Output the version number')
  .description('Download target page with all resources.')
  .arguments('<url>')
  .option('-o, --output [dirpath]', 'Specify output directory.')
  .action((dirpath, url) => {
    loadPage(url, dirpath);
  })
  .parse(process.argv);
