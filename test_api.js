const axios = require('axios');

async function test() {
    try {
        const payload = {
            format: 'T3',
            overs: 3,
            team_a: {
                name: "A",
                players: [{
                    display_name: "Player Name",
                    input: "7993962018",
                    input_type: "MOBILE",
                    role: "Batsman",
                    is_captain: true,
                    is_wk: false,
                    batting_position: 1
                }]
            },
            team_b: {
                name: "B",
                players: [{
                    display_name: "Player Name",
                    input: "9100712018",
                    input_type: "MOBILE",
                    role: "Batsman",
                    is_captain: true,
                    is_wk: false,
                    batting_position: 1
                }]
            }
        };

        const res = await axios.post('http://localhost:5001/api/matches/quick/create', payload);
        console.log('Success:', res.data);
    } catch (err) {
        console.error('---- FULL ERROR ----');
        console.error(err);
        if (err.response) {
            console.error('---- RESPONSE DATA ----');
            console.error(err.response.data);
        }
    }
}
test();
