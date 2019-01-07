import path from 'path';
import url from 'url';
import fs from 'fs';
import axios from 'axios';

const trimEnd = (str, end) => (str.endsWith(end) ? str.substring(0, str.length - end.length) : str);

const makeFilePath = (outputDir, pageUrl) => {
  const { hostname, pathname } = url.parse(pageUrl);
  const filename = `${hostname}${trimEnd(pathname, '/')}`.replace(/\W/g, '-');
  return path.join(outputDir, `${filename}.html`);
};

const downloadPage = (pageUrl) => {
  console.log(`Download '${pageUrl}'`);
  return axios.get(pageUrl)
    .then(response => ({ url: pageUrl, data: response.data }));
};

// const writeFile = (filePath, data, encoding) =>
// fs.promises.writeFile(filePath, data, encoding);

// без BOM'a сохраненная страница открывается в кривой кодировке
const writeFileWithBOM = (filePath, data, encoding) => fs.promises.writeFile(filePath, `\ufeff${data}`, encoding);

const savePage = (filePath, data) => {
  console.log(`Save to '${filePath}'`);
  return writeFileWithBOM(filePath, data, 'utf8');
};

export default (pageUrl, outputDir) => {
  downloadPage(pageUrl)
    .then((res) => {
      const filePath = makeFilePath(outputDir, res.url);
      return savePage(filePath, res.data);
    })
    .then(() => console.log('Success'))
    .catch(error => console.log(error));
};
