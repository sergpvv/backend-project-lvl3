import { promises as fs, createWriteStream } from 'fs';
import axios from 'axios';
import { parse, resolve } from 'url';
import cheerio from 'cheerio';
import debug from 'debug';
import Listr from 'listr';
import getLocalNames, { isLocal, buildResourceFilename } from './utils';

const log = debug('page-loader');

const resourcesMap = { link: 'href', script: 'src', img: 'src' };

const download = ({ resource, filename }) => {
  log(`download ${resource}`);
  // console.log(`resource: ${resource}\nfilename: ${filename}`);
  return axios
    .get(resource, { responseType: 'stream' })
    .then(({ data }) => data.pipe(createWriteStream(filename)))
    .then(() => log(`${resource} successfully saved as ${filename}`));
};

const processResources = (html, pageUrl, outputDirectory) => {
  const { hostname } = parse(pageUrl);
  const dom = cheerio.load(html, { decodeEntities: false });
  /* const localResources = [];
  Object.entries(resourcesMap)
    .forEach(([tag, src]) => {
      dom(`${tag}[${src}]`).each((index, element) => {
        const resource = dom(element).attr(src);
        log(`processing ${resource}`);
        if (isLocal(resource, hostname)) {
          const filename = buildResourceFilename(outputDirectory, resource);
          dom(element).attr(src, filename);
          localResources.push({ resource: resolve(pageUrl, resource), filename });
        }
      });
    });
*/
  const getUrl = ({ name, attribs }) => attribs[resourcesMap[name]];
  const localResources = Object.entries(resourcesMap)
    .map(([tag, src]) => dom(`${tag}[${src}]`).toArray())
    .flat()
    .filter((element) => isLocal(getUrl(element), hostname))
    .map((element) => {
      const url = getUrl(element);
      log(`processing ${url}`);
      const resource = resolve(pageUrl, url);
      const filename = buildResourceFilename(outputDirectory, url);
      dom(element).attr(resourcesMap[element.name], filename);
      return { resource, filename };
    });
  log('resources processing is complete');
  const pageWithLocalRes = dom.html();
  return { pageWithLocalRes, localResources };
};

const saveDownloadedPage = (filename, data) => {
  log(`save downloaded page to ${filename}`);
  return fs.writeFile(filename, data, 'utf-8');
};

const downloadResources = (resources, pageUrl, resourcesDirectory) => {
  log(`make directory ${resourcesDirectory} `);
  return fs.mkdir(resourcesDirectory)
    .then(() => {
      const listrTasks = new Listr(
        resources.map(({ resource, filename }) => ({
          title: resource,
          task: () => download({ resource, filename }),
        })),
        { concurrent: true, exitOnError: false },
      );
      log('download local resources');
      return listrTasks.run();
    });
};

export default (pageUrl, outputDirectory) => {
  const { filename, resourcesDirectory } = getLocalNames(pageUrl, outputDirectory);
  return axios
    .get(pageUrl)
    .then(({ data }) => {
      log(`${pageUrl} download complete, processing resources`);
      return processResources(data, pageUrl, resourcesDirectory);
    })
    .then(({ pageWithLocalRes, localResources }) => Promise.all([
      saveDownloadedPage(filename, pageWithLocalRes),
      downloadResources(localResources, pageUrl, resourcesDirectory),
    ]))
    .then(() => {
      log(`${pageUrl} successfully saved as ${filename}`);
      return filename;
    });
};
