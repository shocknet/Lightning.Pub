module.exports = server => {
  const module = {};

  server.getURL = function getURL() {
    const HTTPSPort = this.httpsPort === "443" ? "" : ":" + this.httpsPort;
    const HTTPPort = this.serverPort === "80" ? "" : ":" + this.serverPort;
    const URLPort = this.useTLS ? HTTPSPort : HTTPPort;
    return `http${this.useTLS ? "s" : ""}://${this.serverHost}${URLPort}`;
  };

  return module;
};
