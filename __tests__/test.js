import nock from 'nock';
import fs from 'fs';
import path from 'path';
import os from 'os';
import downloadPage from '../src';

const expectedFile = path.resolve(__dirname, '__fixtures__/test.html');

const server = 'https://host';
const pages = ['/test', '/test/'];

let outputDir;

beforeAll(async () => {
  outputDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), path.sep));
});

pages.forEach((page) => {
  test(`download ${page}`, async () => {
    nock(server)
      .get(page)
      .replyWithFile(
        200,
        expectedFile,
        { 'Content-Type': 'text/html' },
      );
    const testUrl = `${server}${page}`;
    await downloadPage(testUrl, outputDir);

    const expected = await fs.promises.readFile(expectedFile);
    const actual = await fs.promises.readFile(`${outputDir}/host-test.html`);

    expect(actual.toString()).toBe(expected.toString());
  });
});

test('download to invalid dir', async () => {
  const page = pages[0];
  nock(server)
    .get(page)
    .replyWithFile(
      200,
      expectedFile,
      { 'Content-Type': 'text/html' },
    );
  const testUrl = `${server}${page}`;
  const invalidDir = 'unknown';
  /*
  try {
    await downloadPage(testUrl, invalidDir);
    expect(false).toBe(true);
  } catch(err) {
    expect(err.code).toEqual('ENOENT');
  }
  */
  await expect(downloadPage(testUrl, invalidDir))
    .rejects.toThrowErrorMatchingSnapshot();
});
