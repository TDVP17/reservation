//agenceRoute.js
// agenceRoutes.js

const express = require('express');
const Agence = require('../models/agence');
const authentification = require('../middelwares/authentification')(Agence);
const financialAuth = require('../middelwares/financialAuth');
const agenceController = require('../controllers/agenceController');
const router = new express.Router();
const multer = require('multer');
const path = require('path');
// Stockage en mémoire (compatible Vercel - pas de filesystem)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if(ext !== '.pdf' && ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
        return callback(new Error('Seuls les PDF et les images sont autorisés'));
    }
    callback(null, true);
  },
  // Vercel plafonne le corps des requêtes serverless à ~4.5 Mo : on reste
  // sous cette limite pour que ce soit multer (message clair) qui bloque
  // le fichier trop lourd, et non la plateforme (erreur brute illisible).
  limits: { fileSize: 1024 * 1024 * 4 }
});

// Remplace 'image' par 'documentProuveAgence'
router.post('/agences', upload.single('documentProuveAgence'), agenceController.createAgence);
router.get('/agences/pending', agenceController.getAllPendingAgences);
router.get('/agences/validated', async (req, res) => {
  try {
    const Agence = require('../models/agence');
    const agences = await Agence.find({ status: 'Validé' }).select('name ville telephone');
    res.json(agences);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/agences/:id/validate', agenceController.validateAgence);
router.post('/agences/:id/reject', agenceController.rejectAgence);


router.post('/agences/login', agenceController.loginAgence);
router.post('/agences/logout', authentification, agenceController.logoutAgence);
router.delete('/agences/:id',authentification,  agenceController.deleteAgence);
router.get('/agences/me', authentification, agenceController.getMyProfile);
router.patch('/agences/update/:id',authentification,  agenceController.updateAgence);
router.post('/agences/logo', authentification, upload.single('logo'), agenceController.uploadLogo);
router.post('/agences/send-verify-code', authentification, agenceController.sendVerificationCode);
router.post('/agences/verify-and-update', authentification, agenceController.verifyCodeAndUpdate);
router.post('/agences/verify-financial-pin', authentification, agenceController.verifyFinancialPin);
router.get('/portefeuille/mon-solde', authentification, financialAuth, agenceController.getAgenceBalance);
router.get('/agences/revenue-summary', authentification, financialAuth, agenceController.getRevenueSummary);
router.post('/portefeuille/retrait', authentification, financialAuth, agenceController.requestWithdrawal);
router.get('/portefeuille/mes-transactions', authentification, financialAuth, agenceController.getMyWithdrawals);

module.exports = router;


