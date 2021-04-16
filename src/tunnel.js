const localtunnel = require('localtunnel')
process.on('message', async (tunnelOpts) => {
  console.log('Message from parent:', tunnelOpts);
  const tunnel = await localtunnel(tunnelOpts)
  process.send({ type: 'info', tunnel:{
    url:tunnel.url,
    token:tunnel.token,
    clientId:tunnel.clientId,
  } });
});
  
setInterval(() => {
  process.send({ type: "ping" });
}, 1000);