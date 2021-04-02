/** @param {any} data */
const safeParseJSON = (data) => {
  try {
    const parsedJSON = JSON.parse(data);
    return parsedJSON;
  } catch (err) {
    return data;
  }
};

module.exports = {
  safeParseJSON
}