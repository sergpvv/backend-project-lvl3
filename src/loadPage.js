import { promises as fs } from 'fs';

import axios from 'axios';

import url from 'url';

import path from 'path';

import cheerio from 'cheerio';

const buildName = (...parts) => parts.join('').replace(/\W/g, '-');

export default (pageUrl, outputDir) => {
  const { hostname, pathname } = url.parse(pageUrl);
  const filename = path.join(outputDir, `${buildname(hostname, pathname)}.html`);
  return axios.get(pageUrl)
    .then(({ data }) => data)
    .then((content) => fs.writeFile(filename, content, 'utf-8'))
    .then(() => filename);
};
