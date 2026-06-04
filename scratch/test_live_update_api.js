const http = require('http');

const payload = JSON.stringify({
  runs: 15,
  wickets: 0,
  overNum: 2,
  ballInOver: 1,
  totalBalls: 14,
  inningsNum: 1,
  target: null,
  batting_team: 'A',
  striker: 0,
  nonStriker: 1,
  striker_idx: 0,
  non_striker_idx: 1,
  currentBowlerIdx: 0,
  batters: [
    { id: 'quick_player_0', name: 'Pavan', r: 1, b: 2, batting: true, out: false },
    { id: 'quick_player_1', name: 'Player_1111', r: 5, b: 2, batting: false, out: false }
  ],
  bowlers: [
    { id: 'quick_player_2', name: 'Player_2222', balls: 7, r: 15, w: 0 }
  ],
  currentOverBalls: ['3', '1'],
  overHistory: [['0', '3', '2', '1', '4', '4']],
  partnership: { runs: 15, balls: 8 },
  lastBallData: {
    runs: 1,
    isWicket: false,
    extra: null,
    batsmanId: 'quick_player_0',
    bowlerId: 'quick_player_2'
  },
  status: 'In Progress'
});

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/matches/6a21736eaa3575e36799c1a2/live-update',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
  process.exit(1);
});

req.write(payload);
req.end();
