// Email service using Brevo's HTTP API as fallback
const axios = require('axios');

// Function to send email via Brevo's HTTP API
const sendEmailViaAPI = async (to, subject, htmlContent) => {
  try {
    console.log('Sending email via Brevo HTTP API to:', to);
    
    // Get API key from environment variables
    const apiKey = process.env.BREVO_API_KEY;
    
    if (!apiKey) {
      throw new Error('Brevo API key not found in environment variables (BREVO_API_KEY)');
    }
    
    // Prepare the request data
    const requestData = {
      sender: {
        name: 'SmartLeave',
        email: process.env.EMAIL_FROM || 'smartleave@example.com'
      },
      to: [
        {
          email: to
        }
      ],
      subject: subject,
      htmlContent: htmlContent
    };
    
    console.log('API request data prepared');
    
    // Make the API request
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      requestData,
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log('Email sent via API successfully:', response.data);
    return { success: true, messageId: response.data.messageId };
  } catch (error) {
    console.error('Error sending email via Brevo API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

module.exports = {
  sendEmailViaAPI
};