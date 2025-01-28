const express = require('express');

const cors = require('cors');

const { exec } = require('child_process');

const fs = require('fs');

const axios = require('axios'); 


const app = express();

const PORT = 3000;

const discordWebhookUrl = 'DISCORDWEBHOOKURLHERE';

app.use(cors());

async function getConnectionCount() {

    const ports = [22, 443, 80, 6969, 3000, 1194, 21];

    let totalConnections = 0;



    const promises = ports.map((port) => {

        return new Promise((resolve, reject) => {

            exec(`sudo ss -tn '( sport = :${port} or dport = :${port} )' | wc -l`, (error, stdout) => {

                if (error) {

                    console.error(`Error fetching connections for port ${port}:`, error);

                    return reject(error);

                }

                const connectionCount = parseInt(stdout.trim(), 10);

                totalConnections += connectionCount; 

                resolve();

            });

        });

    });



    await Promise.all(promises);

    return totalConnections; 

}

async function checkMitigationStatus() {

    try {

        const activeConnections = await getConnectionCount();

        let mitigationStatus = false;



        if (activeConnections > 100) {

            mitigationStatus = true;

            const message = {

                content: `?? High number of active connections: ${activeConnections}\nMitigation Status: TRUE`

            };

            await axios.post(discordWebhookUrl, message);

        }



        return mitigationStatus;

    } catch (error) {

        console.error('Error checking mitigation status:', error);

        return false;

    }

}

app.get('/check-iptables', (req, res) => {

    exec('which iptables', (error, stdout) => {

        if (error || !stdout) {

            return res.json({ iptables_installed: false });

        }

        res.json({ iptables_installed: true });

    });

});

app.get('/get-traffic-data', (req, res) => {

    const interface = 'eth0'; // update with your network interface if different

    exec(`vnstat -i ${interface} --json`, (error, stdout, stderr) => {

        if (error || stderr) {

            console.error('Error fetching vnstat data:', stderr || error);

            return res.status(500).json({ error: 'Error fetching network data from vnstat', details: stderr || error });

        }



        console.log('Raw vnstat output:', stdout); 



        try {

            const data = JSON.parse(stdout);

            if (!data || !data.interfaces || data.interfaces.length === 0) {

                return res.status(500).json({

                    error: 'No data found for the specified interface. Make sure the interface is correct and vnstat is collecting data.'

                });

            }



            const interfaceData = data.interfaces[0];  

            const trafficData = interfaceData.traffic.total;  

            if (!trafficData) {

                return res.status(500).json({ error: 'No traffic data available for the interface.' });

            }



            // dont mess with the following section below unless yk what your doing its the math function to conver the traffic from bytes, kb, mbps, gbps if you want to you can improve or whatever dont mess with it unless you know what your doing

            const rxBytes = trafficData.rx || 0;  

            const txBytes = trafficData.tx || 0;  

            const mbpsReceived = ((rxBytes * 8) / (1024 * 1024)).toFixed(2); 

            const mbpsSent = ((txBytes * 8) / (1024 * 1024)).toFixed(2); 



            const gbpsReceived = ((rxBytes * 8) / (1024 * 1024 * 1024)).toFixed(2); 

            const gbpsSent = ((txBytes * 8) / (1024 * 1024 * 1024)).toFixed(2); // 

            const receivedTraffic = parseFloat(gbpsReceived) >= 1 ? `${gbpsReceived} Gbps` : `${mbpsReceived} Mbps`;

            const sentTraffic = parseFloat(gbpsSent) >= 1 ? `${gbpsSent} Gbps` : `${mbpsSent} Mbps`;

            const alert = parseFloat(gbpsReceived) > 8 || parseFloat(gbpsSent) > 8;

            res.json({

                receivedTraffic,

                sentTraffic,

                alert

            });



        } catch (parseError) {

            console.error('Error parsing vnstat data:', parseError);

            return res.status(500).json({

                error: 'Error parsing vnstat data',

                details: parseError.message

            });

        }

    });

});

app.get('/get-maintraffic-data', (req, res) => {

    const interface = 'eth0'; // replace the interface with whatever one your ip is set up on or leave it to eth0 which is usually standard interfa e



    fs.readFile('/proc/net/dev', 'utf8', (err, data) => {

        if (err) {

            console.error('Error reading /proc/net/dev:', err);

            return res.status(500).json({ error: 'Error fetching network data from /proc/net/dev' });

        }



        const lines = data.split('\n');

        const interfaceData = lines.find(line => line.includes(interface));



        if (!interfaceData) {

            return res.status(500).json({ error: `Network interface ${interface} not found` });

        }



        const stats = interfaceData.trim().split(/\s+/); 

        const bytesReceived = parseInt(stats[1], 10);

        const bytesSent = parseInt(stats[9], 10);



        if (isNaN(bytesReceived) || isNaN(bytesSent)) {

            return res.status(500).json({ error: 'Invalid data from /proc/net/dev', details: stats });

        }



        // dont mess with the following section below unless yk what your doing its the math function to conver the traffic from bytes, kb, mbps, gbps if you want to you can improve or whatever dont mess with it unless you know what your doing

        const kbReceived = bytesReceived / 1024;

        const kbSent = bytesSent / 1024;



        const mbpsReceived = (kbReceived * 8 / 1000).toFixed(2); 

        const mbpsSent = (kbSent * 8 / 1000).toFixed(2); 



        const gbpsReceived = (kbReceived * 8 / 1000 / 1000).toFixed(2); 

        const gbpsSent = (kbSent * 8 / 1000 / 1000).toFixed(2); 

        const receivedTraffic = parseFloat(gbpsReceived) >= 1 ? `${gbpsReceived} Gbps` : `${mbpsReceived} Mbps`;

        const sentTraffic = parseFloat(gbpsSent) >= 1 ? `${gbpsSent} Gbps` : `${mbpsSent} Mbps`;

        const randomPackets = Math.floor(Math.random() * 100000);

        const alert = parseFloat(gbpsReceived) > 8 || parseFloat(gbpsSent) > 8;



        res.json({

            receivedTraffic,

            sentTraffic,

            packets: randomPackets,

            alert

        });

    });

});



// you can add or change any port or add any port it will auto show connections for that port

app.get('/get-connection-count', (req, res) => {

    const ports = [22, 443, 80, 6969, 3000, 1194, 21];

    const portConnections = {};



    const promises = ports.map((port) => {

        return new Promise((resolve, reject) => {

            exec(`sudo ss -tn '( sport = :${port} or dport = :${port} )' | wc -l`, (error, stdout) => {

                if (error) {

                    console.error(`Error fetching connections for port ${port}:`, error);

                    return reject(error);

                }

                const connectionCount = parseInt(stdout.trim(), 10);

                portConnections[port] = connectionCount; 

                resolve();

            });

        });

    });



    Promise.all(promises)

        .then(() => {

            res.json(portConnections); 

        })

        .catch((error) => {

            console.error('Error fetching connection count:', error);

            res.json({ error: 'Failed to retrieve connection data' });

        });

});


app.get('/mitigation-status', async (req, res) => {

    try {

        const mitigationStatus = await checkMitigationStatus();

        res.json({

            mitigationStatus

        });

    } catch (error) {

        console.error('Error fetching mitigation status:', error);

        res.status(500).json({

            error: 'Error checking mitigation status',

            details: error.message

        });

    }

});


app.listen(PORT, () => {

    console.log(`Server is running on http://localhost:${PORT}`);

});

