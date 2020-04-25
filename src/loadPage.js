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

const processResources = (html, hostname, outDir) => {
  const dom = cheerio.load(html, { decodeEntities: false });
  const localResources = [];
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
  const pageWithLocalRes = dom.html();
  return { pageWithLocalRes, localResources };
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
  const listrTasks = new Listr([], { concurrent: true, exitOnError: false });
  return axios
    .get(pageUrl)
    .then(({ data }) => {
      log(`${pageUrl} download complete, processing resources`);
      const { pageWithLocalRes, localResources } = processResources(data, hostname, resourceDir);
      localResources
        .forEach((resource) => listrTasks.add({
          title: resource,
          task: () => download(resource, pageUrl, resourceDir),
        }));
      return pageWithLocalRes;
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
      return listrTasks.run();
    })
    .then(() => {
      log(`${pageUrl} successfully saved as ${filename}`);
      return filename;
    });
};
