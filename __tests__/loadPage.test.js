import { promises as fs } from 'fs';

import path from 'path';

import os from 'os';

import nock from 'nock';

import loadPage from '../src';

const buildFilepath = (filename) => path.resolve(__dirname, '__fixtures__', filename);

it('download testpage', async () => {
  const url = 'https://blah.blah';
  nock(url)
    .get('/test/page')
    .replyWithFile(200, buildFilepath('helloworld'), { 'Content-Type': 'text/html' })
    .get('/assets/style.css')
    .replyWithFile(200, buildFilepath('css'), { 'Content-Type': 'text/css' })
    .get('/assets/alert.js')
    .replyWithFile(200, buildFilepath('alert'), { 'Content-Type': 'application/javascript' })
    .get('/assets/kitty.jpg')
    .replyWithFile(200, buildFilepath('picture'), { 'Content-Type': 'image/jpeg' });

  const dirpath = await fs.mkdtemp(path.join(os.tmpdir(), path.sep));
  await loadPage(`${url}/test/page`, dirpath);

  const pageName = 'blah-blah-test-page';
  expect(await fs.readFile(path.join(dirpath, `${pageName}.html`), 'utf-8'))
    .toBe(await fs.readFile(buildFilepath('helloworld'), 'utf-8'));
  expect(await fs.readFile(path.join(dirpath, `${pageName}_files`, 'assets-style.css'), 'utf-8'))
    .toBe(await fs.readFile(buildFilepath('css'), 'utf-8'));
  expect(await fs.readFile(path.join(dirpath, `${pageName}_files`, 'assets-alert.js'), 'utf-8'))
    .toBe(await fs.readFile(buildFilepath('alert'), 'utf-8'));
  expect(await fs.readFile(path.join(dirpath, `${pageName}_files`, 'assets-kitty.jpg')))
    .toBe(await fs.readFile(buildFilepath('picture')));
});
