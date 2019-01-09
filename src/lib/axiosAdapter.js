import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';

// axios.defaults.adapter = httpAdapter; // for nock
// export default axios.create();

export default axios.create({ adapter: httpAdapter });
