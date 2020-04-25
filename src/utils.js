import path from 'path';
import { parse } from 'url';

export const buildName = (ext, ...parts) => {
  const name = parts.join('').replace(/\W/g, '-');
  return `${name}${ext}`;
};

export const isLocal = (url, host) => {
  const { hostname } = parse(url);
  return !hostname || hostname === host;
};

export const toLocalName = (url) => {
  const { pathname } = parse(url);
  const { dir, ext, name } = path.parse(pathname);
  return buildName(ext, path.join(dir, name).slice(1));
};

export default (pageUrl) => {
  const { hostname, pathname } = parse(pageUrl);
  return buildName('.html', hostname, pathname);
};
