// Quick test script to verify email sending
require('dotenv').config();
const { sendEmail } = require('./services/emailSender');

async function test() {
  console.log('Testing email configuration...');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_FROM:', process.env.SMTP_FROM);
  
  const testHtml = `
    <h2>Email Test</h2>
    <p>This is a test email from GateMate to verify SMTP is working correctly.</p>
    <p>If you're reading this, the email system is operational! 🎉</p>
  `;
  
  // Change this to your email to test
  const testEmail = 'brian@flnet.works';
  
  console.log(`\nSending test email to ${testEmail}...`);
  const result = await sendEmail(testEmail, 'GateMate Email Test', testHtml);
  
  if (result) {
    console.log('✅ Test email sent successfully!');
  } else {
    console.log('❌ Test email failed');
  }
  
  process.exit(result ? 0 : 1);
}

test();
