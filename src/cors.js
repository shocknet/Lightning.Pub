const setAccessControlHeaders = (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "OPTIONS,POST,GET,PUT,DELETE")
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, public-key-for-decryption"
  );
};

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    setAccessControlHeaders(req, res);
    res.sendStatus(204);
    return;
  }

  setAccessControlHeaders(req, res);
  next();
};
