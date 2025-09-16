const { sendEmail } = require('../config/email');
const fs = require('fs').promises;
const path = require('path');

// Function to read and compile email templates
const compileTemplate = async (templateName, data) => {
  try {
    console.log(`Compiling email template: ${templateName}`);
    
    // Read the template file
    const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
    let template = await fs.readFile(templatePath, 'utf8');
    
    // Replace placeholders with actual data
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`<%=\\s*${key}\\s*%>`, 'g');
      template = template.replace(regex, data[key] || '');
    });
    
    console.log(`Template ${templateName} compiled successfully`);
    return template;
  } catch (error) {
    console.error(`Error compiling template ${templateName}:`, error);
    throw error;
  }
};

// Function to send new leave request notification
const sendNewLeaveRequestEmail = async (recipient, data) => {
  try {
    console.log('Sending new leave request email to:', recipient.email);
    
    const html = await compileTemplate('new-leave-request', {
      ...data,
      dashboard_url: process.env.FRONTEND_URL || 'https://smart-leave-mern.vercel.app'
    });
    
    const result = await sendEmail(
      recipient.email,
      `New Leave Request from ${data.requester_name}`,
      html
    );
    
    if (result.success) {
      console.log(`New leave request email sent to ${recipient.email}`);
    } else {
      console.error(`Failed to send new leave request email to ${recipient.email}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error sending new leave request email:', error);
    return { success: false, error: error.message };
  }
};

// Function to send leave status update notification
const sendLeaveStatusUpdateEmail = async (recipient, data) => {
  try {
    console.log('Sending leave status update email to:', recipient.email);
    
    // Determine status text and class for styling
    let statusText = '';
    let statusClass = '';
    
    switch (data.status) {
      case 'recommended':
        statusText = 'Recommended';
        statusClass = 'status-recommended';
        break;
      case 'hr_approved':
        statusText = 'HR Approved';
        statusClass = 'status-approved';
        break;
      case 'hr_disapproved':
        statusText = 'HR Disapproved';
        statusClass = 'status-disapproved';
        break;
      case 'mayor_approved':
        statusText = 'Mayor Approved';
        statusClass = 'status-approved';
        break;
      case 'mayor_disapproved':
        statusText = 'Mayor Disapproved';
        statusClass = 'status-disapproved';
        break;
      case 'department_disapproved':
        statusText = 'Department Disapproved';
        statusClass = 'status-disapproved';
        break;
      default:
        statusText = 'Updated';
        statusClass = '';
    }
    
    const html = await compileTemplate('leave-status-update', {
      ...data,
      status_text: statusText,
      status_class: statusClass,
      dashboard_url: process.env.FRONTEND_URL || 'https://smart-leave-mern.vercel.app'
    });
    
    const subject = data.status === 'recommended' 
      ? 'Your Leave Request Has Been Recommended' 
      : `Your Leave Request Status: ${statusText}`;
    
    const result = await sendEmail(
      recipient.email,
      subject,
      html
    );
    
    if (result.success) {
      console.log(`Leave status update email sent to ${recipient.email}`);
    } else {
      console.error(`Failed to send leave status update email to ${recipient.email}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error sending leave status update email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNewLeaveRequestEmail,
  sendLeaveStatusUpdateEmail
};