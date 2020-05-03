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
  const localResources = [];
  Object.entries(resourcesMap)
    .forEach(([tag, src]) => {
      dom(`${tag}[${src}]`).each((index, element) => {
        const resource = dom(element).attr(src);
        log(`processing ${resource}`);
        if (isLocal(resource, hostname)) {
          dom(element).attr(src, path.join(resourceDir, toLocalName(resource)));
          localResources.push(resource);
        }
      });
    });
  log('resources processing is complete');
  const pageWithLocalRes = dom.html();
  return { pageWithLocalRes, localResources };
};

const saveDownloadedPage = (filename, data) => {
  log(`save downloaded page to ${filename}`);
  return fs.writeFile(filename, data, 'utf-8');
};

const downloadResources = (resources, pageUrl, resourceDir) => {
  log(`make directory ${resourceDir} `);
  return fs.mkdir(resourceDir)
    .then(() => {
      const listrTasks = new Listr(
        resources.map((title) => ({
          title,
          task: () => download(title, pageUrl, resourceDir),
        })),
        { concurrent: true, exitOnError: false },
      );
      log('download local resources');
      return listrTasks.run();
    });
};

export default (pageUrl, outputDir) => {
  const { hostname, pathname } = url.parse(pageUrl);
  const filename = path.join(outputDir, buildName('.html', hostname, pathname));
  const resourceDir = path.join(outputDir, buildName('_files', hostname, pathname));
  return axios
    .get(pageUrl)
    .then(({ data }) => {
      log(`${pageUrl} download complete, processing resources`);
      return processResources(data, pageUrl, resourceDir);
    })
    .then(({ pageWithLocalRes, localResources }) => Promise.all([
      saveDownloadedPage(filename, pageWithLocalRes),
      downloadResources(localResources, pageUrl, resourceDir),
    ]))
    .then(() => {
      log(`${pageUrl} successfully saved as ${filename}`);
      return filename;
    });
};
