/**
 * Email System Module
 * Simulates email sending using console.log()
 * All emails are logged to console instead of actually being sent
 */

/**
 * Sends a generic email by logging formatted output to console
 * 
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} message - Email message body
 * @returns {void}
 */
function sendEmail(to, subject, message) {
    console.log("\n" + "=".repeat(50))
    console.log("TO: " + to)
    console.log("SUBJECT: " + subject)
    console.log("MESSAGE: " + message)
    console.log("=".repeat(50))
}

/**
 * Sends a 2FA code email
 * 
 * @param {string} userEmail - User's email address
 * @param {string} code - 6-digit 2FA code
 * @returns {void}
 */
function send2FACodeEmail(userEmail, code) {
    const subject = "Your 2FA Code"
    const message = "Your 2FA code is: " + code + "\nThis code expires in 3 minutes."
    sendEmail(userEmail, subject, message)
}

/**
 * Sends a suspicious activity alert email
 * 
 * @param {string} userEmail - User's email address
 * @returns {void}
 */
function sendSuspiciousActivityEmail(userEmail) {
    const subject = "Suspicious Login Activity Detected"
    const message = "We detected multiple failed login attempts on your account. If this was not you, please change your password immediately."
    sendEmail(userEmail, subject, message)
}

/**
 * Sends an account locked email
 * 
 * @param {string} userEmail - User's email address
 * @returns {void}
 */
function sendAccountLockedEmail(userEmail) {
    const subject = "Your Account Has Been Locked"
    const message = "Due to multiple failed login attempts, your account has been locked. Please contact support to unlock it."
    sendEmail(userEmail, subject, message)
}

module.exports = {
    sendEmail,
    send2FACodeEmail,
    sendSuspiciousActivityEmail,
    sendAccountLockedEmail
}
