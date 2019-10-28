import { promises as fs } from 'fs';

import path from 'path';

import os from 'os';

import nock from 'nock';

import loadPage from '../src';

const buildFilepath = (filename) => path.join(__dirname, '__fixtures__', filename);

const url = 'https://blah.blah';
const pagePath = '/test/page';
const pageName = 'blah-blah-test-page';
const resourcesDir = `${pageName}_files`;
const resourcesPath = 'assets';
let outputDir;

beforeEach(async () => {
  outputDir = await fs.mkdtemp(path.join(os.tmpdir(), path.sep));
   nock(url)
     .get(pagePath)
     .replyWithFile(200, buildFilepath('helloworld'), { 'Content-Type': 'text/html' })
     .get(`/${resourcesPath}/style.css`)
     .replyWithFile(200, buildFilepath('style'), { 'Content-Type': 'text/css' })
     .get(`/${resourcesPath}/script.js`)
     .replyWithFile(200, buildFilepath('script'), { 'Content-Type': 'application/javascript' })
     .get(`/${resourcesPath}/picture.jpg`)
     .replyWithFile(200, buildFilepath('picture'), { 'Content-Type': 'image/jpg' });
});

it('download page', async () => {
  const filename = await loadPage(`${url}${pagePath}`, outputDir);
  const expectedFilename = path.join(outputDir, `${pageName}.html`);
  expect(await fs.readFile(filename, 'utf-8')).not.toBeNull();
  expect(filename).toBe(expectedFilename);
});

it('download resources', async () => {
  await loadPage(`${url}${pagePath}`, outputDir);
  [['css', 'style', 'utf-8'], ['js', 'script', 'utf-8']]
    .forEach(async ([type, name, encoding]) => {
      const resFilename = path.join(outputDir, resourcesDir, `${resourcesPath}-${name}.${type}`);
      expect(await fs.readFile(resFilename, encoding))
        .toBe(await fs.readFile(buildFilepath(name), encoding));
    });
});

it('download binary resource', async () => {
  await loadPage(`${url}${pagePath}`, outputDir);
  const { size: expected } = await fs.stat(buildFilepath('picture'));
  const resFilename = path.join(outputDir, resourcesDir, `${resourcesPath}-picture.jpg`);
  const { size: actual } = await fs.stat(resFilename);
  expect(actual).toBe(expected);
});
