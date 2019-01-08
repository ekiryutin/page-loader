import path from 'path';
import url from 'url';
import fs from 'fs';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';

axios.defaults.adapter = httpAdapter; // for nock

const trimEnd = (str, end) => (str.endsWith(end) ? str.substring(0, str.length - end.length) : str);

const makeFilePath = (outputDir, pageUrl) => {
  const { hostname, pathname } = url.parse(pageUrl);
  const filename = `${hostname}${trimEnd(pathname, '/')}`.replace(/\W/g, '-');
  return path.join(outputDir, `${filename}.html`);
};

const downloadPage = (pageUrl) => {
  console.log(`Download '${pageUrl}'`);
  return axios.get(pageUrl)
    .then(response => response.data);
};

const savePage = (filePath, data) => {
  console.log(`Save to '${filePath}'`);
  return fs.promises.writeFile(filePath, data, 'utf8');
};

export default (pageUrl, outputDir) => {
  downloadPage(pageUrl)
    .then((data) => {
      const filePath = makeFilePath(outputDir, pageUrl);
      return savePage(filePath, data);
    })
    .then(() => console.log('Success'));
    // .catch(error => console.log(error));
};
