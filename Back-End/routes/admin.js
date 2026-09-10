const express = require('express');
const Admin = require('../models/admin');
const authentification = require('../middelwares/authentification')(Admin);
const adminController = require('../controllers/admin');
const router = new express.Router();

// --- ROUTES PUBLIQUES ---
router.post('/admin', adminController.createAdmin); 
router.post('/admin/login', adminController.loginAdmin);
 

// routes/admin.js
router.patch('/admin/validate-agence/:id', authentification, adminController.validateAgence);

// --- ROUTES PRIVÉES (Nécessitent le Token) ---
router.get('/admin/history', authentification, adminController.getFullHistory);

router.get('/admin/stats', authentification, adminController.getGlobalStats);
router.post('/admin/logout', authentification, adminController.logoutAdmin);
router.patch('/admin/update-lang', authentification, adminController.updateLang);
router.get('/admin/agences', authentification, adminController.getAllAgences);
router.patch('/admin/validate-agence/:id', authentification, adminController.validateAgence);
router.get('/admin/clients', authentification, adminController.getAllClients);
router.patch('/admin/clients/:id/ban', authentification, adminController.banClient);
router.patch('/admin/clients/:id/unban', authentification, adminController.unbanClient);
router.patch('/admin/agences/:id/ban', authentification, adminController.banAgence);
router.patch('/admin/agences/:id/unban', authentification, adminController.unbanAgence);
router.patch('/admin/agences/:id/pin', authentification, adminController.setAgencyPin);

// ── Livreurs ──────────────────────────────────────────────────────────────────
router.get('/admin/livreurs',          authentification, adminController.getAllLivreurs);
router.post('/admin/livreurs',         authentification, adminController.createLivreur);
router.patch('/admin/livreurs/:id',    authentification, adminController.updateLivreur);
router.delete('/admin/livreurs/:id',   authentification, adminController.deleteLivreur);

// Reset tous les soldes à 0
router.post('/admin/reset-balances', authentification, adminController.resetAllBalances);

module.exports = router;