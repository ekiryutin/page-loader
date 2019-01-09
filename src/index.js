import path from 'path';
import url from 'url';
import fs from 'fs';
import _ from 'lodash';
import cheerio from 'cheerio';
import debug from 'debug';
import axios from './lib/axiosAdapter';

const logInfo = debug('page-loader:info');
const logRequest = debug('page-loader:http');
const logFile = debug('page-loader:file');

const urlToFilename = (pageUrl) => {
  const { hostname, pathname } = url.parse(pageUrl);
  const filename = hostname
    ? `${hostname}${_.trimEnd(pathname, '/')}`.replace(/\W/g, '-')
    : `${_.trimEnd(pathname, '/')}`.replace(/[^A-Za-z0-9_.]/g, '-'); // local resources
  return filename;
};

const downloadPage = (pageUrl) => {
  logRequest("Downloading '%s'", pageUrl);
  return axios.get(pageUrl)
    .then((response) => {
      logRequest(" Downloaded '%s'", pageUrl);
      return response.data;
    });
};

const writeFile = (filePath, data) => {
  logFile("Saving '%s'", filePath);
  return fs.promises.writeFile(filePath, data)
    .then(() => logFile(" Saved '%s'", filePath));
};

const downloadTextResource = (resourceUrl, filePath) => {
  logRequest("Downloading `%s'", resourceUrl);
  return axios.get(resourceUrl)
    .then((response) => {
      logRequest(" Downloaded `%s'", resourceUrl);
      return writeFile(filePath, response.data);
    });
};

const downloadBinaryResource = (resourceUrl, filePath) => {
  logRequest("Downloading binary `%s'", resourceUrl);
  return axios.get(resourceUrl, { responseType: 'stream' })
    .then(response => response.data.pipe(fs.createWriteStream(filePath)))
    .then(() => logRequest(" Downloaded `%s'", resourceUrl));
};

const resourceTypes = {
  link: { attr: 'href', download: downloadTextResource },
  img: { attr: 'src', download: downloadBinaryResource },
  script: { attr: 'src', download: downloadTextResource },
};

const processTag = ($dom, tag, resourceDir) => {
  const resources = [];
  const src = resourceTypes[tag].attr;
  $dom(`${tag}[${src}]`).each(function processElement() {
    const link = $dom(this).attr(src);
    const linkUrl = url.parse(link);
    if (linkUrl.hostname === null) {
      const fileName = urlToFilename(linkUrl.pathname);
      const localLink = path.join(resourceDir, fileName);

      $dom(this).attr(src, localLink); // replace to local link
      resources.push({ ...resourceTypes[tag], url: linkUrl.pathname });
    }
  });
  return resources;
};

const searchLocalResources = (pageContent, resourceDir) => {
  logInfo('Analyzing page');
  const $dom = cheerio.load(pageContent, { decodeEntities: false });

  const resources = Object.keys(resourceTypes)
    .reduce((acc, tag) => [...acc, ...processTag($dom, tag, resourceDir)], []);

  logInfo('Local resources: %d', resources.length);
  // logInfo('%j', resources)
  return { $dom, resources };
};

const downloadResource = (resource, pageUrl, resourcePath) => {
  const { download } = resource;
  const resourceUrl = url.resolve(pageUrl, resource.url);
  const filePath = path.join(resourcePath, urlToFilename(resource.url));

  return download(resourceUrl, filePath); // defined in resourceTypes
};

const downloadResources = (data, pageUrl, resourcePath) => {
  const { resources } = data;
  // if (resources.length === 0) return data; // test required
  logInfo("Create directory '%s'", resourcePath);
  return fs.promises.mkdir((resourcePath))
    .then(() => Promise.all(resources.map(res => downloadResource(res, _.trimEnd(pageUrl, '/'), resourcePath))))
    .then(() => data);
};

export default (pageUrl, outputDir) => {
  const pageFileName = urlToFilename(pageUrl);
  const resourceDir = `${pageFileName}_files`;
  const resourcePath = path.join(outputDir, resourceDir);
  const basePath = path.join(outputDir, pageFileName);
  const filePath = `${basePath}.html`;
  logInfo('\nStart');
  return downloadPage(pageUrl)
    .then(pageContent => searchLocalResources(pageContent, resourceDir))
    .then(data => downloadResources(data, pageUrl, resourcePath))
    .then(({ $dom }) => writeFile(filePath, $dom.html()))
    .then(() => logInfo('Complete'));
};
