// Wrap async controllers so a rejected promise hits the error middleware
// instead of hanging Express forever. Write controllers with plain awaits.
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);