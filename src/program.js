import program from 'commander';

import loadPage from '.';

program
  .version('0.0.4', '-v, --version', 'Output the version number')
  .description('Load web-page with all resources and save hier local in html file.')
  .arguments('<url>')
  .option('-o, --output [dir]', 'Specify save directory.')
  .action((url) => {
    loadPage(url, program.output || process.cwd())
      .then((filename) => {
        console.log(`${url} saved as ${filename}`);
      })
      .catch(({ message }) => {
        console.error(message);
        process.exit(1);
      });
  })
  .parse(process.argv);
