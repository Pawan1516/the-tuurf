const axios = require('axios');

async function test() {
    try {
        console.log('Testing tournament creation via API...');
        const payload = {
            name: 'Test Auto Tournament ' + Date.now(),
            description: 'Automatic test description',
            tournamentType: 'league',
            ballType: 'leather',
            matchFormat: 'T20',
            oversPerMatch: 20,
            totalTeams: 8,
            startDate: new Date(),
            status: 'draft',
            visibility: 'public'
        };
        const res = await axios.post('http://localhost:5001/api/tournaments/create', payload);
        console.log('Success!', res.data);
        process.exit(0);
    } catch (err) {
        console.error('Failure:', err.response?.data || err.message);
        process.exit(1);
    }
}

test();
