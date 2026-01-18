const http = require('http');

function request(path, method, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({ status: res.statusCode, body: body ? JSON.parse(body) : {} });
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log("Running API Tests...");

    // 1. Create Team
    console.log("1. Create Team...");
    const teamRes = await request('/api/teams', 'POST', { name: 'Test Team', logo: 'url' });
    console.log("Status:", teamRes.status, "Body:", teamRes.body);
    const teamId = teamRes.body.id;

    // 2. List Teams
    console.log("2. List Teams...");
    const listRes = await request('/api/teams', 'GET');
    console.log("Teams found:", listRes.body.length);

    // 3. Add Player
    console.log("3. Add Player...");
    const playerRes = await request(`/api/teams/${teamId}/players`, 'POST', { name: 'Test Player' });
    console.log("Status:", playerRes.status, "Body:", playerRes.body);

    // 4. List Players
    console.log("4. List Players...");
    const playersRes = await request(`/api/teams/${teamId}/players`, 'GET');
    console.log("Players found:", playersRes.body.length);
    console.log("Player Name:", playersRes.body[0].name);

    // 5. Create Match
    console.log("5. Create Match...");
    const matchRes = await request('/api/matches', 'POST', {
        equipoA: teamId,
        equipoB: teamId, // Allow same for test
        fecha: '2023-01-01',
        scoreA: 1,
        scoreB: 1
    });
    console.log("Status:", matchRes.status, "Body:", matchRes.body);

    // 6. List Matches
    console.log("6. List Matches...");
    const matchesRes = await request('/api/matches', 'GET');
    console.log("Matches found:", matchesRes.body.length);

}

runTests().catch(console.error);
