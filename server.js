import express from 'express';
import { exec } from 'child_process';
import cors from 'cors';
import {fetchDirectus } from 'fari-directus-parser'


const app = express();
const port = 3000;

app.use(cors()); 

app.get('/content', async (_req, res) => {
  const response = await fetchDirectus({slug: 'swarm-of-robots'})
  res.json(response)
})

app.get('/start-robots', (req, res) => {
  exec('bash /home/fari/Documents/demo-iridia-swarm-robotics/start_robots.sh', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.send(`Error executing script: ${error}`);
    }
    res.send(`Script executed successfully: ${stdout}`);
  });
});

app.get('/spread', (req, res) => {
  exec(`rostopic pub /master/sphero/state_change std_msgs/Bool 'data: true'`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.send(`Error executing script: ${error}`);
    }
    res.send(`Script executed successfully: ${stdout}`);
  });
});


app.get('/stop-robots', (req, res) => {
  exec('bash /home/fari/Documents/demo-iridia-swarm-robotics/stop_robots.sh', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.send(`Error executing script: ${error}`);
    }
    res.send(`Script executed successfully: ${stdout}`);
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
