// Email configuration
const nodemailer = require('nodemailer');

// Create a transporter object using the default SMTP transport
const createTransporter = () => {
  // For development, you can use services like Gmail, SendGrid, or Mailtrap
  // For production, use a proper email service provider
  
  // Example configuration for Gmail (requires app password)
  // return nodemailer.createTransport({
  //   service: 'gmail',
  //   auth: {
  //     user: process.env.EMAIL_USER,
  //     pass: process.env.EMAIL_PASS
  //   }
  // });
  
  // Example configuration for SendGrid or other SMTP services
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Function to send email
const sendEmail = async (to, subject, html) => {
  try {
    // Create transporter
    const transporter = createTransporter();
    
    // Define email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'smartleave@example.com',
      to,
      subject,
      html
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail
};