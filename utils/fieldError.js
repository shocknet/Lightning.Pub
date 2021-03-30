class FieldError extends Error {
  /** @param {any} error */
  constructor(error) {
    super();
    this.message = error?.message ?? "An unknown error has occurred";
    this.field = error?.field ?? "unknown";
    this.name = error?.name;
    this.stack = error?.stack;
  }
}

module.exports = FieldError