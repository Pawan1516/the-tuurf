const axios = require('axios');

const testApi = async () => {
  try {
    const res = await axios.get('http://127.0.0.1:5001/api/slots/settings');
    console.log('SUCCESS:', res.data);
  } catch (err) {
    console.error('ERROR:', err.response?.status, err.response?.data || err.message);
  }
};

testApi();
