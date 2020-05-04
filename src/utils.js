import { join } from 'path';
import { parse } from 'url';

const nameTails = {
  file: '.html',
  dir: '_files',
};

export const normalize = (str) => str.replace(/\W/g, '-');

export const buildName = (dir, name, tail) => join(dir, [name, tail].join(''));

export const isLocal = (url, host) => {
  const { hostname } = parse(url);
  return !hostname || hostname === host;
};

export const buildResourceFilename = (resourcesDirectory, resource) => {
  const { pathname } = parse(resource);
  const localName = normalize(pathname.slice(1));
  return join(resourcesDirectory, localName);
};

export default (pageUrl, outputDirectory) => {
  const { hostname, pathname } = parse(pageUrl);
  // console.log(`pageUrl: ${pageUrl}\n  hostname: ${hostname}\n  pathname: ${pathname}`);
  const localName = normalize(join(hostname, pathname));
  // const pageName = join(hostname, pathname);
  // console.log(`pageName: ${pageName}`);
  // const localName = normalize(pageName);
  const [filename, resourcesDirectory] = Object.values(nameTails)
    .map((nameTail) => buildName(outputDirectory, localName, nameTail));
  return { filename, resourcesDirectory };
};
