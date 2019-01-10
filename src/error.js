
const errors = [
  { code: 'ENOTFOUND', msg: 'Invalid host.' },
  { code: 'ERRHTTP', msg: 'Invalid url.' },
  { code: 'ENOENT', msg: 'Invalid output directory.' },
  { code: 'EEXIST', msg: 'The page is already downloaded.' },
];

const getErrorCode = (error) => {
  if (error.code) return error.code;
  return error.response ? 'ERRHTTP' : '';
};

const getErrorMessage = (error) => {
  const code = getErrorCode(error);
  const res = errors.find(e => e.code === code);
  const msg = res ? res.msg : '';
  // console.log(error);
  return `Download aborted. ${msg}\nError: ${error.message}`;
};

export default getErrorMessage;
