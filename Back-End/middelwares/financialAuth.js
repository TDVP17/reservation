// Vérifie un jeton financier temporaire (obtenu via /agences/verify-financial-pin).
// Doit être placé APRÈS le middleware authentification() dans la chaîne de routes,
// puisqu'il compare le jeton au req.user déjà résolu.
const jwt = require("jsonwebtoken");

const financialAuth = async (req, res, next) => {
  try {
    const token = req.header("X-Financial-Token");
    if (!token) {
      return res.status(401).json({ error: "Vérification PIN requise ou expirée." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "foo");
    if (decoded.scope !== "financial" || decoded._id !== req.user._id.toString()) {
      return res.status(401).json({ error: "Vérification PIN requise ou expirée." });
    }

    next();
  } catch (e) {
    res.status(401).json({ error: "Vérification PIN requise ou expirée." });
  }
};

module.exports = financialAuth;
