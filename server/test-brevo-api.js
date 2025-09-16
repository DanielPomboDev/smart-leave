// Test Brevo API email functionality
require('dotenv').config();
const { sendEmail } = require('./config/email');

async function testEmail() {
  try {
    console.log('Testing Brevo API email functionality...');
    
    // Replace with your actual email address for testing
    const testEmail = 'danielvincentrombo@gmail.com';
    
    const result = await sendEmail(
      testEmail,
      'Test Email from SmartLeave (API)',
      '<h1>Test Email</h1><p>This is a test email from SmartLeave sent via Brevo API.</p>'
    );
    
    if (result.success) {
      console.log('Email sent successfully via Brevo API!');
    } else {
      console.log('Failed to send email via Brevo API:', result.error);
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testEmail();