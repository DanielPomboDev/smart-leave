// Test email functionality
require('dotenv').config(); // Load environment variables
const { sendEmail } = require('./config/email');

async function testEmail() {
  try {
    console.log('Testing email functionality...');
    
    // Replace with your actual email address for testing
    const testEmail = 'danielvincentrombo@gmail.com'; // Use your actual email for testing
    
    const result = await sendEmail(
      testEmail,
      'Test Email from SmartLeave',
      '<h1>Test Email</h1><p>This is a test email from SmartLeave.</p>'
    );
    
    if (result.success) {
      console.log('Email sent successfully!');
    } else {
      console.log('Failed to send email:', result.error);
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testEmail();