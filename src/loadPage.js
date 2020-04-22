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

const localResources = [];

const processResources = (html, hostname, outDir) => {
  const dom = cheerio.load(html, { decodeEntities: false });
  Object.entries(resourcesMap)
    .forEach(([tag, src]) => {
      dom(`${tag}[${src}]`).each((index, element) => {
        const resource = dom(element).attr(src);
        log(`processing ${resource}`);
        if (isLocal(resource, hostname)) {
          dom(element).attr(src, path.join(outDir, toLocalName(resource)));
          localResources.push(resource);
        }
      });
    });
  log('resources processing is complete');
  return dom.html();
};

const download = (resource, pageUrl, outDir) => {
  const filename = path.join(outDir, toLocalName(resource));
  return axios
    .get(url.resolve(pageUrl, resource), { responseType: 'stream' })
    .then(({ data }) => data.pipe(createWriteStream(filename)))
    .then(() => log(`${resource} successfully downloaded`));
};

export default (pageUrl, outputDir) => {
  const { hostname, pathname } = url.parse(pageUrl);
  // console.log(`hostnasme: ${hostname}\npathname: ${pathname}\n outputDir: ${outputDir}`);
  const filename = path.join(outputDir, buildName('.html', hostname, pathname));
  const resourceDir = path.join(outputDir, buildName('_files', hostname, pathname));
  return axios
    .get(pageUrl)
    .then(({ data }) => {
      log(`${pageUrl} download complete, processing resources`);
      return processResources(data, hostname, resourceDir);
    })
    .then((pageWithLocalRes) => {
      log(`save downloaded page to ${filename}`);
      return fs.writeFile(filename, pageWithLocalRes, 'utf-8');
    })
    .then(() => {
      log(`make direcory ${resourceDir} `);
      return fs.mkdir(resourceDir);
    })
    .then(() => {
      log('download local resources');
      const tasks = localResources
        .map((resource) => ({
          title: resource,
          task: () => download(resource, pageUrl, resourceDir),
        }));
      const listrTasks = new Listr(tasks, { concurrent: true, exitOnError: false });
      /*      const promises = localResources.map((resource) => {
        const downloadTask = download(resource, pageUrl, resourceDir);
        listrTasks.add({
          title: resource,
          task: () => downloadTask,
        });
        return downloadTask.catch((error) => {
          log(`download ${resource} incomplete: ${error.message}`);
        });
      });
      */
      return listrTasks.run();
      //     return Promise.all(promises);
    })
    .then(() => {
      log(`${pageUrl} successfully saved as ${filename}`);
      return filename;
    });
};
