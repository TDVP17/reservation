//Dossier back-End
//clientRoutes.js
const express = require('express');
const Client = require('../models/client');
const authentification = require('../middelwares/authentification')(Client);
const clientController = require('../controllers/clientController');
const router = new express.Router();



router.post('/clients', clientController.createClient);
router.post('/clients/login', clientController.loginClient);
router.post('/clients/google', clientController.googleAuth);
router.get('/clients/me', authentification, clientController.getMonProfil);
router.post('/clients/logout', clientController.logoutClient);
router.delete('/clients/:id',authentification,  clientController.deleteClient);
router.patch('/clients/update/:id',authentification,  clientController.updateClient);
router.get('/clients/all', authentification,  clientController.getAllClients);
router.post("/clients/forgot-password", clientController.forgotPassword);
router.post("/clients/reset-password", clientController.resetPassword);
router.post("/clients/send-verify-code", authentification, clientController.sendVerificationCode);
router.post("/clients/verify-and-update", authentification, clientController.verifyCodeAndUpdate);


module.exports = router;   
