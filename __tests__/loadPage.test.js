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
const makeTmpDir = () => fs.mkdtemp(path.join(os.tmpdir(), path.sep));
const nonexist = '/nonexistentresource';
const unknown = '/unknownhostname';

nock.disableNetConnect();

beforeEach(() => {
  nock(site)
    .get(pagePath)
    .replyWithFile(200, buildFilepath('helloworld'), { 'Content-Type': 'text/html' })
    .get(`/${resourcesPath}/style.css`)
    .replyWithFile(200, buildFilepath('style'), { 'Content-Type': 'text/css' })
    .get(`/${resourcesPath}/script.js`)
    .replyWithFile(200, buildFilepath('script'), { 'Content-Type': 'application/javascript' })
    .get(`/${resourcesPath}/picture.jpg`)
    .replyWithFile(200, buildFilepath('picture'), { 'Content-Type': 'image/jpg' })
    .get(nonexist)
    .reply(404)
    .get(unknown)
    .replyWithError({
      message: 'getaddrinfo ENOTFOUND',
      code: 'ENOTFOUND',
    });
});

it('correct data', async () => {
  const outputDir = await makeTmpDir();
  const filename = await loadPage(url, outputDir);
  const expectedFilename = path.join(outputDir, `${pageName}.html`);
  expect(await fs.readFile(filename, 'utf-8')).not.toBeNull();
  expect(filename).toBe(expectedFilename);

  [['css', 'style', 'utf-8'], ['js', 'script', 'utf-8']]
    .forEach(async ([type, name, encoding]) => {
      const resFilename = path.join(outputDir, resourcesDir, `${resourcesPath}-${name}.${type}`);
      expect(await fs.readFile(resFilename, encoding))
        .toBe(await fs.readFile(buildFilepath(name), encoding));
    });

  const { size: expected } = await fs.stat(buildFilepath('picture'));
  const resFilename = path.join(outputDir, resourcesDir, `${resourcesPath}-picture.jpg`);
  const { size: actual } = await fs.stat(resFilename);
  expect(actual).toBe(expected);
});

it.each([['unknown hostname', `${site}${unknown}`, null],
  ['nonexistent resource', `${site}${nonexist}`, null],
  ['nonexistent output directory', url, nonexist],
  ['permission denied', url, '/']])(
  '%s',
  async (test, page, dir) => {
    const outputDir = dir === null ? await makeTmpDir() : dir;
    await expect(loadPage(page, outputDir))
      .rejects.toThrowErrorMatchingSnapshot();
  },
);
