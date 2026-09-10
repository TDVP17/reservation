import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendNotificationEmail = async (toEmail, subject, htmlContent) => {
  try {
    const data = await resend.emails.send({
      from: 'EasyTicket <onboarding@resend.dev>', // Change par ton domaine plus tard
      to: [toEmail],
      subject: subject,
      html: htmlContent,
    });
    return { success: true, data };
  } catch (error) {
    console.error("Erreur Resend:", error);
    return { success: false, error };
  }
};