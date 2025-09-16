// Email configuration
const { sendEmailViaAPI } = require('../utils/brevoApiEmail');

// Function to send email - now using API first
const sendEmail = async (to, subject, html) => {
  try {
    console.log(`Sending email to: ${to} via Brevo HTTP API`);
    
    // Send email via Brevo's HTTP API (primary method)
    const apiResult = await sendEmailViaAPI(to, subject, html);
    
    if (apiResult.success) {
      console.log('Email sent successfully via API');
      return apiResult;
    } else {
      console.error('Failed to send email via API:', apiResult.error);
      return { success: false, error: apiResult.error };
    }
  } catch (error) {
    console.error('Error sending email via API:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail
};