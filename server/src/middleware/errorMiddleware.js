function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || "Internal Server Error",
    details: err.details || null,
  });
}

module.exports = { notFoundHandler, errorHandler };
