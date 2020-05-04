import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';
import os from 'os';
import nock from 'nock';
import loadPage, { normalize } from '../src';

const buildFilename = (name) => path.join(__dirname, '__fixtures__', name);
const makeTmpDir = () => fs.mkdtemp(path.join(os.tmpdir(), path.sep));
const join = (...strParts) => strParts.join('');

const testSite = 'https://tests.ite';
const pagePath = '/test/page';
const testPage = join(testSite, pagePath);

const getPageName = (pageUrl) => {
  const { hostname, pathname } = url.parse(pageUrl);
  return normalize(path.join(hostname, pathname));
};
const pageName = getPageName(testPage);
const pageFilename = join(pageName, '.html');

const resourcesPath = '/assets';
const resourcesDirName = join(pageName, '_files');
const getResourceLocalName = (resourcePath, resourceName, resourceType) => {
  const resource = path.join(resourcePath, join(resourceName, resourceType));
  return normalize(resource.slice(1));
};

const resources = [
  ['helloworld', 'text/html', ''],
  ['style', 'text/css', '.css'],
  ['script', 'application/javascript', '.js'],
  ['picture', 'image/jpg', '.jpg'],
];

const nonexist = '/nonexistentresource';
const unknown = '/unknownhostname';

nock.disableNetConnect();

beforeEach(() => {
  const scope = nock(testSite);
  resources.map(([name, contentType, type]) => ({
    resource: type.length === 0 ? pagePath : path.join(resourcesPath, join(name, type)),
    filename: buildFilename(name),
    contentType,
  }))
    .forEach(({ resource, filename, contentType }) => {
      scope.get(resource).replyWithFile(200, filename, { 'Content-Type': contentType });
    });
  // console.log(scope.pendingMocks());
  scope
    .get(nonexist).reply(404)
    .get(unknown).replyWithError({
      message: 'getaddrinfo ENOTFOUND',
      code: 'ENOTFOUND',
    });
});

it('normalize string', () => {
  expect(normalize('fo.o/bar/ba.z')).toBe('fo-o-bar-ba-z');
});

it('correct data', async () => {
  const outputDirectory = await makeTmpDir();
  const filename = await loadPage(testPage, outputDirectory);
  const expectedFilename = path.join(outputDirectory, pageFilename);
  expect(await fs.readFile(filename, 'utf-8')).not.toBeNull();
  expect(filename).toBe(expectedFilename);

  [['style', '.css', 'utf-8'], ['script', '.js', 'utf-8']]
    .forEach(async ([name, type, encoding]) => {
      const resourceFilename = path.join(
        outputDirectory,
        resourcesDirName,
        getResourceLocalName(resourcesPath, name, type),
      );
      expect(await fs.readFile(resourceFilename, encoding))
        .toBe(await fs.readFile(buildFilename(name), encoding));
    });

  const { size: expected } = await fs.stat(buildFilename('picture'));
  const resourceFilename = path.join(
    outputDirectory,
    resourcesDirName,
    getResourceLocalName(resourcesPath, 'picture', '.jpg'),
  );
  const { size: actual } = await fs.stat(resourceFilename);
  expect(actual).toBe(expected);
});

it.each([['unknown hostname', join(testSite, unknown), null],
  ['nonexistent resource', join(testSite, nonexist), null],
  ['nonexistent output directory', testPage, nonexist],
  ['permission denied', testPage, '/']])(
  '%s',
  async (test, page, dir) => {
    const outputDir = dir === null ? await makeTmpDir() : dir;
    await expect(loadPage(page, outputDir))
      .rejects.toThrowErrorMatchingSnapshot();
  },
);
