import express from 'express';
import { exec } from 'child_process';
import cors from 'cors'; // Import cors
import { attribute } from 'three/examples/jsm/nodes/Nodes.js';
import fallbackLocales from './assets/fallbackLocales.json' assert { type: "json" };

let strapiUrl = "http://46.226.110.124:1337";

const app = express();
const port = 3000;

app.use(cors()); // Enable CORS for all routes

app.get('/content', async (req, res) => {
  const response = await fetch(`${strapiUrl}/api/demos/49?populate=*`);
  const { data } = await response.json();


  const { localizations, explanation_short, research_head, research_lead, caroussel } = data.attributes

  const locales = localizations.data.map(({ attributes }) => ({ locale: attributes.locale, explanation_short: attributes.explanation_short }))

  const iridiaLogo = await fetch(`${strapiUrl}/uploads/iridia_cbde9e8b7c.svg`);
  const logo = await iridiaLogo.text()

  const content = [
    { logo },
    { research_head, research_lead },
    { locale: 'en', explanation_short }, ...locales
  ]

  res.send(content || fallbackLocales)
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

app.get('/reset-robots', (req, res) => {
  exec('rostopic pub /master/sphero/sleep std_msgs/Bool "data: true"', (error, stdout, stderr) => {
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
