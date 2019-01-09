import nock from 'nock';
import fs from 'fs';
import path from 'path';
import os from 'os';
import downloadPage from '../src';

const makePath = filename => path.resolve(__dirname, `__fixtures__/${filename}`);

const testFile = makePath('test.html');
const expectedFile = makePath('test_expected.html');

const server = 'https://host';
const pages = ['/test', '/test/'];

const resources = {
  js: { url: '/js/script.js', file: makePath('js/script.js'), contentType: 'text/plain' },
  css: { url: '/css/style.css', file: makePath('css/style.css'), contentType: 'text/plain' },
  img: { url: '/img/test.jpg', file: makePath('img/test.jpg'), contentType: 'image/jpg' },
};

let outputDir;

beforeEach(async () => {
  outputDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), path.sep));

  Object.keys(resources).forEach((key) => {
    const { url, file, contentType } = resources[key];
    nock(server)
      .get(url)
      .replyWithFile(
        200,
        file,
        { 'Content-Type': contentType },
      );
  });
});

pages.forEach((page) => {
  test(`download ${page}`, async () => {
    nock(server)
      .get(page)
      .replyWithFile(
        200,
        testFile,
        { 'Content-Type': 'text/html' },
      );
    const testUrl = `${server}${page}`;
    await downloadPage(testUrl, outputDir);

    const expected = await fs.promises.readFile(expectedFile);
    const actual = await fs.promises.readFile(`${outputDir}/host-test.html`);

    expect(actual.toString()).toBe(expected.toString());
    // check resources files
  });
});

test('download to invalid dir', async () => {
  const page = pages[0];
  nock(server)
    .get(page)
    .replyWithFile(
      200,
      testFile,
      { 'Content-Type': 'text/html' },
    );
  const testUrl = `${server}${page}`;
  const invalidDir = 'unknown';

  await expect(downloadPage(testUrl, invalidDir))
    .rejects.toThrowErrorMatchingSnapshot();
});
