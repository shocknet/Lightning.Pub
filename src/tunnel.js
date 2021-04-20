const localtunnel = require('localtunnel')
let tunnelRef = null
process.on('message', async (tunnelOpts) => {
  const tunnel = await localtunnel(tunnelOpts)
  tunnelRef = tunnel
  console.log(tunnelOpts)
  const {subdomain:tunnelSubdomain} = tunnelOpts
  process.send({ type: 'info', tunnel:{
    url:tunnel.url,
    token:tunnel.token,
    clientId:tunnel.clientId,
  } });
  if(tunnelSubdomain !== tunnel.clientId && !tunnel.token){
    console.log("AM killing it yo!")
    console.log(tunnel.clientId)
    tunnel.close()
    // eslint-disable-next-line no-process-exit
    process.exit()
  }
});
  
setInterval(() => {
  process.send({ type: "ping" });
}, 1000);


process.on('uncaughtException', ()=> {
  if(tunnelRef){
    console.log("clogin yo")
    tunnelRef.close()
  }
  // eslint-disable-next-line no-process-exit
  process.exit()
});
process.on('SIGINT', ()=>{
  if(tunnelRef){
    console.log("clogin yo")
    tunnelRef.close()
  }
  // eslint-disable-next-line no-process-exit
    process.exit()})
process.on('exit', ()=> {
  if(tunnelRef){
    console.log("clogin yo")
    tunnelRef.close()
  }
});
/*
const f = async () => {
  const tunnelOpts = 
    { port: 9835, host: 'https://tunnel.rip' ,
    tunnelToken:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InRpbWVzdGFtcCI6MTYxODg2NTAxNjkzNywic3ViZG9tYWluIjoidGVycmlibGUtZWFyd2lnLTU2In0sImlhdCI6MTYxODg2NTAxNiwiZXhwIjo1MjE4ODY1MDE2fQ.m2H4B1NatErRqcriB9lRfusZmLdRee9-VXACfnKT-QY',
    subdomain:'terrible-earwig-56'
  }
  const tunnel = await localtunnel(tunnelOpts)
  console.log(tunnel)
  tunnelRef = tunnel
}
f()*/