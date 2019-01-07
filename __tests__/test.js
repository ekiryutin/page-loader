import nock from 'nock';
import fs from 'fs';
import path from 'path';
import os from 'os';
import downloadPage from '../src';

const expectedFile = path.resolve(__dirname, '__fixtures__/courses.html');

const server = 'https://hexlet.io';
const page = '/courses';
const testUrl = `${server}${page}`;

let outputDir;

beforeAll(async () => {
  outputDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), path.sep));
});

test(`download ${page}`, async () => {
  nock(server)
    .get(page)
    .replyWithFile(
      200,
      expectedFile,
      { 'Content-Type': 'text/html' },
    );
  await downloadPage(testUrl, outputDir);

  const expected = await fs.promises.readFile(expectedFile);
  const actual = await fs.promises.readFile(`${outputDir}/hexlet-io-courses.html`);

  // expect(actual).toBe(expected);
  expect(actual.equals(expected)).toBe(true);
});
