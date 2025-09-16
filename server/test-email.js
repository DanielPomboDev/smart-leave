// Test email functionality
const { sendEmail } = require('./config/email');

async function testEmail() {
  try {
    console.log('Testing email functionality...');
    
    // Replace with your actual email address for testing
    const testEmail = 'your_test_email@example.com';
    
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