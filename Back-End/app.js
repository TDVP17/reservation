//app.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const cors = require("cors");
const multer = require('multer');
const app = express();
const http = require('http').createServer(app);
const port = process.env.PORT || 4004;

// Imports des routes
const agenceRoutes   = require('./routes/agenceRoutes');
const clientRoutes   = require('./routes/clientRoutes');
const voyageRoutes   = require('./routes/voyage');
const paymentRoutes  = require('./routes/payment');
const balanceRoutes  = require('./routes/clientBalance');
const admin          = require('./routes/admin');
const reservationRoutes = require('./routes/reservation');
const shipmentRoutes = require('./routes/shipment');
const notificationRoutes = require('./routes/notification');
const Voyage = require('./models/voyage');



const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

// Règle d'origine partagée entre le CORS Express (REST) et le CORS Socket.IO
// (WebSocket) : sans ça, socket.io applique ses propres règles par défaut et
// bloque les handshakes cross-origin depuis les fronts déployés sur Vercel.
function isAllowedOrigin(origin) {
  if (!origin) return true; // Postman, mobile, serveur
  if (origin.endsWith('.vercel.app')) return true;
  if (origin.includes('localhost')) return true;
  if (allowedOrigins.includes(origin)) return true;
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    callback(new Error(`CORS bloqué : ${origin}`));
  },
  credentials: true
}));

const io = require('socket.io')(http, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      callback(new Error(`CORS bloqué (socket) : ${origin}`));
    },
    credentials: true,
  },
});

// Middlewares
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Connexion DB (compatible serverless Vercel)
let dbConnected = false;
let dbConnecting = null;

async function connectDB() {
  if (dbConnected && mongoose.connection.readyState === 1) return;
  if (dbConnecting) return dbConnecting;
  dbConnecting = mongoose.connect(process.env.LOCAL_DB, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  }).then(async () => {
    dbConnected = true;
    dbConnecting = null;
    console.log('✅ Connexion db réussie !');
    try {
      await mongoose.connection.collection('payments').dropIndex('idtransaction_1');
    } catch (e) { /* index inexistant */ }
  }).catch(err => {
    dbConnected = false;
    dbConnecting = null;
    console.error('❌ Erreur de connexion :', err);
    throw err;
  });
  return dbConnecting;
}

// Middleware : assure la connexion DB avant chaque requête (critique pour Vercel)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: 'Erreur de connexion à la base de données.' });
  }
});
    

    
app.use('/voyages', voyageRoutes); 
// --- ROUTES ---
app.use(agenceRoutes); 
app.use(clientRoutes);  
// app.js
// Ajoute le préfixe ici !
app.use(paymentRoutes);
app.use(balanceRoutes);
app.use(reservationRoutes);
app.use(shipmentRoutes);
app.use(notificationRoutes);
app.use(admin);

// Rend io accessible depuis les controllers (req.app.get("io"))
app.set("io", io);


// Servir les fichiers statiques (IMPORTANT)
// Remplace la ligne actuelle par celle-ci :
//pour les images
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

//pour les dossier pds
// app.use('/documents', express.static(path.join(__dirname, 'uploads')));

// Gestion centralisée des erreurs (uploads multer, erreurs non catchées, etc.)
// Sans ce middleware, une erreur non gérée (ex: fichier trop volumineux ou
// format refusé par multer) tombe sur le handler HTML par défaut d'Express,
// ce que le frontend ne sait pas parser -> message d'erreur inexploitable.
app.use((err, req, res, next) => {
  if (!err) return next();
  console.error('Erreur non gérée :', err);

  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: "Le fichier est trop volumineux (4 Mo maximum).",
    };
    return res.status(400).json({ error: messages[err.code] || err.message });
  }

  if (err.message && err.message.includes('PDF et les images')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: err.message || 'Erreur interne du serveur.' });
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  // Rejoindre une room d'expédition (client ou agence)
  socket.on('join-shipment', (shipmentId) => {
    socket.join(`shipment-${shipmentId}`);
  });

  // Rejoindre la room d'un voyage (client suivant son trajet)
  socket.on('join-voyage', (voyageId) => {
    socket.join(`voyage-${voyageId}`);
  });

  // Rejoindre sa room de notifications personnelle (client ou agence)
  socket.on('join-client', (clientId) => {
    socket.join(`client-${clientId}`);
  });
  socket.on('join-agence', (agenceId) => {
    socket.join(`agence-${agenceId}`);
  });

  // Agence partage la position du bus en temps réel
  socket.on('bus-position-update', async ({ voyageId, latitude, longitude }) => {
    const updatedAt = new Date();
    io.to(`voyage-${voyageId}`).emit('bus-position', { latitude, longitude, updatedAt });
    try {
      await Voyage.findByIdAndUpdate(voyageId, { lastPosition: { latitude, longitude, updatedAt } });
    } catch (e) { /* ignore */ }
  });

  socket.on('disconnect', () => {});
});

// Lancement
http.listen(port, () => {
    console.log(`🚀 Serveur en ligne sur le port ${port}`);
});