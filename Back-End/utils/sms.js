// Pas de service SMS gratuit fiable → le code part par email
const { sendVerificationEmail } = require("./mailer");

async function sendVerificationSMS(phone, code, emailFallback) {
  // emailFallback = email enregistré du client
  if (!emailFallback) {
    console.log(`[SMS DEV] Code pour ${phone} : ${code}`);
    return { devCode: code };
  }
  return sendVerificationEmail(emailFallback, code);
}

module.exports = { sendVerificationSMS };
