// Email configuration
const nodemailer = require('nodemailer');

// Create a transporter object using the default SMTP transport
const createTransporter = () => {
  console.log('Creating SMTP transporter with config:', {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT === '465' // true for 465, false for other ports
  });
  
  // Example configuration for SendGrid or other SMTP services
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false // Only for development, remove in production
    },
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 60000,   // 60 seconds
    socketTimeout: 60000,     // 60 seconds
    logger: false,            // Disable logging in production
    debug: false              // Disable debug output in production
  });
};

// Function to send email with retry mechanism
const sendEmail = async (to, subject, html, retries = 3) => {
  try {
    console.log(`Attempting to send email to: ${to} (Attempt 1 of ${retries})`);
    
    // Create transporter
    const transporter = createTransporter();
    
    // Define email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'smartleave@example.com',
      to,
      subject,
      html
    };
    
    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email (attempt 1):', error.message);
    
    // Retry if we have attempts left
    if (retries > 1) {
      console.log(`Retrying email send... (${retries - 1} attempts left)`);
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      return sendEmail(to, subject, html, retries - 1);
    }
    
    console.error('Failed to send email after all retries:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail
};