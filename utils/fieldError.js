class FieldError extends Error {
  /** @param {any} error */
  constructor(error) {
    super();
    this.message = (error && error.message) || "An unknown error has occurred";
    this.field = (error && error.field) || "unknown";
    this.name = (error && error.name);
    this.stack = (error && error.stack);
  }
}

module.exports = FieldError