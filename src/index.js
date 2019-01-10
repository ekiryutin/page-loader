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
const logError = debug('page-loader:error');

const urlToFilename = (pageUrl) => {
  const { hostname, pathname } = url.parse(pageUrl);
  const filename = hostname
    ? `${hostname}${_.trimEnd(pathname, '/')}`.replace(/\W/g, '-')
    : `${_.trimEnd(pathname, '/')}`.replace(/[^A-Za-z0-9_.]/g, '-'); // local resources
  return filename;
};

const downloadPage = (pageUrl) => {
  logRequest("Requesting '%s'", pageUrl);
  return axios.get(pageUrl)
    .then((response) => {
      logRequest(" Received '%s'", pageUrl);
      return response.data;
    })
    .catch((error) => {
      logError(" Request '%s' failed", pageUrl);
      throw error;
    });
};

const writeFile = (filePath, data) => {
  logFile("Saving '%s'", filePath);
  return fs.promises.writeFile(filePath, data)
    .then(() => logFile(" Saved '%s'", filePath));
};

const downloadTextResource = (resourceUrl, filePath) => {
  logRequest("Requesting `%s'", resourceUrl);
  return axios.get(resourceUrl)
    .then((response) => {
      logRequest(" Received `%s'", resourceUrl);
      return writeFile(filePath, response.data);
    });
};

const downloadBinaryResource = (resourceUrl, filePath) => {
  logRequest("Requesting binary `%s'", resourceUrl);
  return axios.get(resourceUrl, { responseType: 'stream' })
    .then(response => response.data.pipe(fs.createWriteStream(filePath)))
    .then(() => logRequest(" Received `%s'", resourceUrl));
};

const resourceTypes = {
  link: { attr: 'href', download: downloadTextResource },
  img: { attr: 'src', download: downloadBinaryResource },
  script: { attr: 'src', download: downloadTextResource },
};

const processTag = ($dom, tag, resourceDir, pageUrl) => {
  const resources = [];
  const src = resourceTypes[tag].attr;
  const { protocol, hostname } = pageUrl;

  $dom(`${tag}[${src}]`).each(function processElement() {
    let link = $dom(this).attr(src);
    if (_.startsWith(link, '//')) {
      link = `${protocol}${link}`;
    }
    const linkUrl = url.parse(link);
    if (linkUrl.hostname === null || linkUrl.hostname === hostname) {
      const fileName = urlToFilename(linkUrl.pathname);
      const localLink = path.join(resourceDir, fileName);

      $dom(this).attr(src, localLink); // replace to local link
      resources.push({ ...resourceTypes[tag], url: linkUrl.pathname });
    }
  });
  return resources;
};

const searchLocalResources = (pageContent, resourceDir, pageUrl) => {
  logInfo('Analyzing page');
  const $dom = cheerio.load(pageContent, { decodeEntities: false });

  const resources = Object.keys(resourceTypes)
    .reduce((acc, tag) => [...acc, ...processTag($dom, tag, resourceDir, pageUrl)], []);

  logInfo('Local resources: %d', resources.length);
  // logInfo('%j', resources)
  return { $dom, resources };
};

const tasks = [];

const downloadResource = (resource, pageUrl, resourcePath) => {
  const { download } = resource;
  const resourceUrl = url.resolve(pageUrl, resource.url);
  const filePath = path.join(resourcePath, urlToFilename(resource.url));

  const promise = download(resourceUrl, filePath); // defined in resourceTypes
  tasks.push({ title: resourceUrl, task: () => promise });
  return promise
    .catch(() => {
      logError(" Request '%s' failed", resourceUrl);
    });
};

const downloadResources = (data, pageUrl, resourcePath, render) => {
  const { resources } = data;
  // if (resources.length === 0) return data; // test required
  logInfo("Create directory '%s'", resourcePath);
  return fs.promises.mkdir((resourcePath))
    .then(() => {
      const promises = resources.map(res => downloadResource(res, _.trimEnd(pageUrl, '/'), resourcePath));
      render(tasks);
      return Promise.all(promises);
    })
    .then(() => data);
};

const checkDirAccess = dir => fs.promises.access(dir);

export default (pageUrl, outputDir, render = () => {}) => {
  const pageFileName = urlToFilename(pageUrl);
  const resourceDir = `${pageFileName}_files`;
  const resourcePath = path.join(outputDir, resourceDir);
  const basePath = path.join(outputDir, pageFileName);
  const filePath = `${basePath}.html`;
  logInfo('\nStart');
  return checkDirAccess(outputDir)
    .then(() => downloadPage(pageUrl))
    .then(pageContent => searchLocalResources(pageContent, resourceDir, url.parse(pageUrl)))
    .then(data => downloadResources(data, pageUrl, resourcePath, render))
    .then(data => writeFile(filePath, data.$dom.html()))
    .then(() => {
      logInfo('Complete');
      return filePath;
    });
};
