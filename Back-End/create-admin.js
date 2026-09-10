require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/admin');

// ✏️ Change ces valeurs avant de lancer le script
const ADMIN_NAME     = "Super Admin";
const ADMIN_EMAIL    = "admin@easyticket.com";
const ADMIN_PASSWORD = "Admin@2025";

const MONGO_URI = process.env.LOCAL_DB || "mongodb+srv://Easy_Ticket:reservation_17@cluster0.vmefzaj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function createAdmin() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ Connecté à MongoDB Atlas');

    const existing = await Admin.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log('⚠️  Un admin avec cet email existe déjà.');
      process.exit(0);
    }

    const admin = new Admin({
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    await admin.generateAuthTokenAndSaveUser();

    console.log('🎉 Admin créé avec succès !');
    console.log(`   Email    : ${ADMIN_EMAIL}`);
    console.log(`   Mot de passe : ${ADMIN_PASSWORD}`);
  } catch (err) {
    console.error('❌ Erreur :', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
