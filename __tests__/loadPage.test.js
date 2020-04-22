import { promises as fs } from 'fs';

import path from 'path';

import os from 'os';

import nock from 'nock';

import loadPage from '../src';

const buildFilepath = (filename) => path.join(__dirname, '__fixtures__', filename);
const site = 'https://go.ods';
const pagePath = '/test/page';
const pageName = 'go-ods-test-page';
const url = `${site}${pagePath}`;
const resourcesDir = `${pageName}_files`;
const resourcesPath = 'assets';
const tmpDir = os.tmpdir();
let outputDir;
let filename;

nock.disableNetConnect();

beforeAll(async () => {
  outputDir = await fs.mkdtemp(path.join(tmpDir, path.sep));
  nock(site)
    .get(pagePath)
    .replyWithFile(200, buildFilepath('helloworld'), { 'Content-Type': 'text/html' })
    .get(`/${resourcesPath}/style.css`)
    .replyWithFile(200, buildFilepath('style'), { 'Content-Type': 'text/css' })
    .get(`/${resourcesPath}/script.js`)
    .replyWithFile(200, buildFilepath('script'), { 'Content-Type': 'application/javascript' })
    .get(`/${resourcesPath}/picture.jpg`)
    .replyWithFile(200, buildFilepath('picture'), { 'Content-Type': 'image/jpg' });
  filename = await loadPage(url, outputDir);
});

describe('correct data', () => {
  it('download page', async () => {
    const expectedFilename = path.join(outputDir, `${pageName}.html`);
    expect(await fs.readFile(filename, 'utf-8')).not.toBeNull();
    expect(filename).toBe(expectedFilename);
  });

  it('download resources', async () => {
    [['css', 'style', 'utf-8'], ['js', 'script', 'utf-8']]
      .forEach(async ([type, name, encoding]) => {
        const resFilename = path.join(outputDir, resourcesDir, `${resourcesPath}-${name}.${type}`);
        expect(await fs.readFile(resFilename, encoding))
          .toBe(await fs.readFile(buildFilepath(name), encoding));
      });
  });

  it('download binary resource', async () => {
    const { size: expected } = await fs.stat(buildFilepath('picture'));
    const resFilename = path.join(outputDir, resourcesDir, `${resourcesPath}-picture.jpg`);
    const { size: actual } = await fs.stat(resFilename);
    expect(actual).toBe(expected);
  });
});

describe('test errors', () => {
  beforeEach(() => {
    nock(site)
      .get(pagePath)
      .replyWithFile(200, buildFilepath('helloworld'), { 'Content-Type': 'text/html' })
      .get('/nonexist')
      .reply(404)
      .get('/unknown')
      .replyWithError({
        message: 'getaddrinfo ENOTFOUND',
        code: 'ENOTFOUND',
      });
  });
  it.each([['unknown hostname', `${site}/unknown`, tmpDir],
    ['nonexistent resource', `${site}/nonexist`, tmpDir],
    ['nonexistent output directory', url, '/nonexist'],
    ['mkdir permission denied', url, '/']])(
    '%s',
    async (test, page, dir) => {
      await expect(loadPage(page, dir))
        .rejects.toThrowErrorMatchingSnapshot();
    },
  );
});
