//routes voyages
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const voyageController = require('../controllers/voyageController');
const Agence = require('../models/agence'); 
const auth = require('../middelwares/authentification')(Agence);


// ==========================================================
// 1. CONFIGURATION DU STOCKAGE (Multer)
// ==========================================================
// On définit le stockage AVANT de créer la variable upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 5 }
});

router.post('/', auth, upload.single('imageBus'), voyageController.createVoyage);

router.get('/ma-liste', auth, voyageController.getVoyagesByAgence);
router.get('/all', voyageController.getAllVoyages);
router.get('/:id', voyageController.getVoyageById);
router.patch('/:id/status', auth, voyageController.updateStatus);
router.patch('/:id', auth, upload.single('imageBus'), voyageController.updateVoyage);
// router.patch('/:id', auth, voyageController.updateVoyage);
router.delete('/:id', auth, voyageController.deleteVoyage);

module.exports = router;