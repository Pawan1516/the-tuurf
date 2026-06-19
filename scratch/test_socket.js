const axios = require('axios');

async function test() {
    try {
        console.log("Sending Socket.io polling handshake to http://127.0.0.1:5001/socket.io/ ...");
        const res = await axios.get('http://127.0.0.1:5001/socket.io/?EIO=4&transport=polling');
        console.log("Status Code:", res.status);
        console.log("Headers:", res.headers);
        console.log("Response Body:", res.data);
    } catch (err) {
        console.error("Request failed:");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", err.response.data);
        } else {
            console.error(err.message);
        }
    }
}

test();
