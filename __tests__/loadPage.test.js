import { promises as fs } from 'fs';

import path from 'path';

import os from 'os';

import nock from 'nock';

import loadPage from '../src';

it('download testpage', async () => {
  const url = 'https://host.test';
  const filepath = path.resolve(__dirname, '__fixtures__', 'helloworld');
  nock(url)
    .get('/page')
    .replyWithFile(200, filepath, { 'Content-Type': '    text/html' });
  const dirpath = await fs.mkdtemp(path.join(os.tmpdir(), path.sep));
  await loadPage(`${url}/page`, dirpath);
  const expected = await fs.readFile(filepath, 'utf-8');
  const actual = await fs.readFile(path.join(dirpath, 'host-test-page.html'), 'utf-8');
  expect(actual).toBe(expected);
});
