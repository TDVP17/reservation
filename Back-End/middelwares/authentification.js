//middelwares
const jwt = require("jsonwebtoken");
const Balance = require("../models/clientBlance");

const authentification = (Model) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.header("Authorization");
      if (!authHeader) {
        return res.status(401).json({ error: "Token manquant" });
      }

      const token = authHeader.replace("Bearer ", "");
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "foo");

      // On cherche l'utilisateur par son ID d'abord, pour pouvoir distinguer
      // un compte banni (message clair) d'un token simplement invalide.
      const user = await Model.findOne({ _id: decoded._id });

      if (!user) {
        return res.status(401).json({ error: "Utilisateur introuvable ou token invalide" });
      }

      if (user.isBanned) {
        return res.status(403).json({
          error: "BANNED",
          message: user.banReason
            ? `Votre compte a été suspendu : ${user.banReason}. Contactez le support pour toute question.`
            : "Votre compte a été définitivement suspendu suite à une violation de nos règles. Contactez le support pour toute question."
        });
      }

      const tokenStillValid = user.authTokens.some(t => t.authToken === token);
      if (!tokenStillValid) {
        return res.status(401).json({ error: "Session invalide, veuillez vous reconnecter." });
      }

      req.user = user;
      req.authToken = token;

      // Gestion de la balance (on utilise try/catch interne pour ne pas bloquer l'auth)
      try {
        let balance = await Balance.findOne({ client: user._id });
        if (!balance) {
          balance = new Balance({ client: user._id, amount: 0 });
          await balance.save();
        }
      } catch (balErr) {
        console.error("Erreur Balance (non bloquante):", balErr.message);
      }

      next();
    } catch (e) {
      console.error("Erreur Auth:", e.message);
      res.status(401).json({ error: "Authentification échouée" });
    }
  };
};

module.exports = authentification;