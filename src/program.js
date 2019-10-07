import program from 'commander';

import getPage from '.';

program
  .version('0.0.1', '-v, --version', 'Output the version number')
  .description('Download target page with all resources.')
  .arguments('<page url>')
  .option('-o, --output [dirpath]', 'Specify output directory.')
  .action((dirpath, pageUrl) => {
    getPage(pageUrl, dirpath);
  })
  .parse(process.argv);
