const { createApp } = require('./app');
const { loadConfig } = require('./config');

const config = loadConfig();
const app = createApp();
const port = Number(process.env.PORT || config.server.port);

app.listen(port, () => {
  console.log(`${config.appName} server running at http://localhost:${port}`);
});
