const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Use EMAIL_USER (not NEXT_PUBLIC_*) for server-side
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send an email using nodemailer
 * @param {string} to
 * @param {string} subject
 * @param {string} htmlContent
 * @param {string} textContent
 * @param {Array} attachments
 */
const sendEmail = async (to, subject, htmlContent, textContent = '', attachments = []) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: htmlContent,
      text: textContent,
      attachments
    };
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    throw error;
  }
};

module.exports = sendEmail;