import { promises as fs, createWriteStream } from 'fs';

import axios from 'axios';

import url from 'url';

import path from 'path';

import cheerio from 'cheerio';

import debug from 'debug';

const log = debug('page-loader');

const buildName = (ext, ...parts) => {
  const name = parts.join('').replace(/\W/g, '-');
  return `${name}${ext}`;
};

const isLocal = (uri, host) => {
  const { hostname } = url.parse(uri);
  return !hostname || hostname === host;
};

const toLocalName = (uri) => {
  const { pathname } = url.parse(uri);
  const { dir, ext, name } = path.parse(pathname);
  return buildName(ext, path.join(dir, name).slice(1));
};

const resourcesTagsAttributes = { link: 'href', script: 'src', img: 'src' };

const processResources = (html, hostname, outDir) => {
  const dom = cheerio.load(html, { decodeEntities: false });
  const localResources = [];
  Object.entries(resourcesTagsAttributes)
    .forEach(([tag, src]) => {
      dom(`${tag}[${src}]`).each((index, element) => {
        const resource = dom(element).attr(src);
        log(`${resource} processing`);
        if (isLocal(resource, hostname)) {
          dom(element).attr(src, path.join(outDir, toLocalName(resource)));
          localResources.push(resource);
          log(`${resource} is local resource`);
        }
      });
    });
  const pageWithLocalRes = dom.html();
  log('resources processing is complete');
  return { pageWithLocalRes, localResources };
};

const download = (resource, pageUrl, outDir) => {
  const uri = url.resolve(pageUrl, resource);
  const filename = path.join(outDir, toLocalName(resource));
  return axios.get(uri, { responseType: 'stream' })
    .then(({ data }) => {
      log(`${resource} is loaded`);
      return data.pipe(createWriteStream(filename));
    })
    .then(() => {
      log(`${resource} saved as ${filename}`);
    });
};

export default (pageUrl, outputDir) => {
  const { hostname, pathname } = url.parse(pageUrl);
  const filename = path.join(outputDir, buildName('.html', hostname, pathname));
  const resourceDir = path.join(outputDir, buildName('_files', hostname, pathname));
  return axios.get(pageUrl)
    .then(({ data }) => {
      log(`${pageUrl} is loaded`);
      const { pageWithLocalRes, localResources } = processResources(data, hostname, resourceDir);
      return fs.mkdir(resourceDir)
        .then(() => Promise.all(localResources.map(
          (resource) => download(resource, pageUrl, resourceDir),
        )))
        .then(() => {
          log('all local resources downloaded');
          return fs.writeFile(filename, pageWithLocalRes, 'utf-8');
        });
    })
    .then(() => {
      log(`${pageUrl} saved as ${filename}`);
      return filename;
    });
};
