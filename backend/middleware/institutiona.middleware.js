function institutionMiddleware(req, res, next) {
  const institution_id = req.headers["x-school-id"];
  if (!institution_id)
    return res.status(400).json({ error: "Missing X-School-ID header" });
  req.institution_id = institution_id;
  next();
}

module.exports = { institutionMiddleware };
