const axios = require('axios');

exports.post = (link, data, accessToken = null) => {
  let headers = {
    'User-Agent': 'amoCRM-oAuth-client/1.0',
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return axios.post(link, data, { headers });
};

exports.get = (link, accessToken = null) => {
  let headers = { 'User-Agent': 'amoCRM-oAuth-client/1.0' };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return axios.get(link, { headers });
};
