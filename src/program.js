import program from 'commander';

import loadPage from '.';

program
  .version('0.0.3', '-v, --version', 'Output the version number')
  .description('Load web-page with all resources and save hier local in html file.')
  .arguments('<url>')
  .option('-o, --output [dir]', 'Specify save directory.')
  .action((url) => {
    loadPage(url, program.output || process.cwd())
      .then((filename) => {
        console.log(`${url} saved as ${filename}`);
      })
      .catch((error) => {
        console.error(`${error.code}: ${error.message}`);
        console.log(JSON.stringify(error, null, '  '));
        process.exit(1);
      });
  })
  .parse(process.argv);
