const program = require("commander");

const version = (require('child_process')
// eslint-disable-next-line no-template-curly-in-string
.execSync("API_TAG=$(git --no-pager log --no-walk --tags -n 1 --pretty=format:'%h');API_HASH=$(git --no-pager log -n 1 --pretty=format:'%h'); [[ \"$API_TAG\" = \"$API_HASH\" ]] && echo $API_TAG || echo \"dev-${API_HASH}\"")
.toString().trim())

// parse command line parameters
program
	.version(version)
	.option("-s, --serverport [port]", "web server http listening port (defaults to 8280)")
	.option("-x, --httpsport [port]", "web server https listening port (defaults to 8283)")
	.option("-h, --serverhost [host]", "web server listening host (defaults to localhost)")
	.option("-l, --lndhost [host:port]", "RPC lnd host (defaults to localhost:10009)")
	.option("-t, --usetls [path]", "path to a directory containing key.pem and cert.pem files")
	.option("-u, --user [login]", "basic authentication login")
	.option("-p, --pwd [password]", "basic authentication password")
	.option("-r, --limituser [login]", "basic authentication login for readonly account")
	.option("-w, --limitpwd [password]", "basic authentication password for readonly account")
	.option("-m, --macaroon-path [file path]", "path to admin.macaroon file")
	.option("-d, --lnd-cert-path [file path]", "path to LND cert file")
	.option("-f, --logfile [file path]", "path to file where to store the application logs")
	.option("-e, --loglevel [level]", "level of logs to display (debug, info, warn, error)")
	.option("-n, --lndlogfile <file path>", "path to lnd log file to send to browser")
	.option("-k, --le-email [email]", "lets encrypt required contact email")
	.option("-c, --mainnet", "run server on mainnet mode")
	.parse(process.argv);

// load server
if (program.serverhost && program.leEmail) {
	require("./app/server-le")(program); // Let"s Encrypt server version
} else {
	require("./src/server")(program); // Standard server version
}
