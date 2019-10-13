import { promises as fs } from 'fs';

import axios from 'axios';

import url from 'url';

import path from 'path';

export default (pageUrl, outputDir) => {
  const { hostname, pathname } = url.parse(pageUrl);
  const pageName = `${hostname}${pathname}`.replace(/\W/g, '-');
  const filename = path.join(outputDir, `${pageName}.html`);
  return axios.get(pageUrl)
    .then(({ data }) => data)
    .then((content) => fs.writeFile(filename, content, 'utf-8'))
    .then(() => filename);
};
