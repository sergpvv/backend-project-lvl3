import { promises as fs, createWriteStream } from 'fs';
import axios from 'axios';
import url from 'url';
import path from 'path';
import cheerio from 'cheerio';
import debug from 'debug';
import Listr from 'listr';
import { buildName, isLocal, toLocalName } from './utils';

const log = debug('page-loader');

const resourcesMap = { link: 'href', script: 'src', img: 'src' };

const download = (resource, pageUrl, outDir) => {
  const filename = path.join(outDir, toLocalName(resource));
  return axios
    .get(url.resolve(pageUrl, resource), { responseType: 'stream' })
    .then(({ data }) => data.pipe(createWriteStream(filename)))
    .then(() => log(`${resource} successfully downloaded`));
};

const processResources = (html, pageUrl, resourceDir) => {
  const { hostname } = url.parse(pageUrl);
  const dom = cheerio.load(html, { decodeEntities: false });
  const resourceLoadingTasks = [];
  Object.entries(resourcesMap)
    .forEach(([tag, src]) => {
      dom(`${tag}[${src}]`).each((index, element) => {
        const resource = dom(element).attr(src);
        log(`processing ${resource}`);
        if (isLocal(resource, hostname)) {
          dom(element).attr(src, path.join(resourceDir, toLocalName(resource)));
          resourceLoadingTasks
            .push({
              title: resource,
              task: () => download(resource, pageUrl, resourceDir),
            });
        }
      });
    });
  log('resources processing is complete');
  const pageWithLocalRes = dom.html();
  return { pageWithLocalRes, resourceLoadingTasks };
};

export default (pageUrl, outputDir) => {
  const { hostname, pathname } = url.parse(pageUrl);
  const filename = path.join(outputDir, buildName('.html', hostname, pathname));
  const resourceDir = path.join(outputDir, buildName('_files', hostname, pathname));
  return axios
    .get(pageUrl)
    .then(({ data }) => {
      log(`${pageUrl} download complete, processing resources`);
      const {
        pageWithLocalRes,
        resourceLoadingTasks,
      } = processResources(data, pageUrl, resourceDir);
      /*
      const listrTasks = new Listr(
        resourceLoadingTasks,
        { concurrent: true, exitOnError: false },
      );

      return Promise.all([
        [`saving page to ${filename}`, fs.writeFile, [filename, pageWithLocalRes, 'utf-8']],
        [`make direcory ${resourceDir}`, fs.mkdir, [resourceDir]],
        ['download local resources', listrTasks.run, []],
      ]
        .map(([message, func, args]) => (() => {
          log(message);
          return func(...args);
        })()));
*/
      const savePageWithLocalRes = () => {
        log(`save downloaded page to ${filename}`);
        return fs.writeFile(filename, pageWithLocalRes, 'utf-8');
      };
      const makeResourcesDirtory = () => {
        log(`make direcory ${resourceDir}`);
        return fs.mkdir(resourceDir);
      };
      const downloadResources = () => {
        log('download local resources');
        const listrTasks = new Listr(
          resourceLoadingTasks,
          { concurrent: true, exitOnError: false },
        );
        return listrTasks.run();
      };
      return Promise.all([
        savePageWithLocalRes(),
        makeResourcesDirtory(),
        downloadResources(),
      ]);
    })
    .then(() => {
      log(`${pageUrl} successfully saved as ${filename}`);
      return filename;
    });
};
