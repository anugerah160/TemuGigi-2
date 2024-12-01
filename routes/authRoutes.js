const authController = require('../controllers/authController');

module.exports = [
    { method: 'POST', path: '/registerpatient', handler: authController.registerPatient, options: { auth: false } },
    { method: 'POST', path: '/registercoass', handler: authController.registerCoass , options: { auth: false }},
    { method: 'POST', path: '/login', handler: authController.login, options: { auth: false } },
    { method: 'POST', path: '/forgot-password', handler: authController.forgotPassword },
    { method: 'POST', path: '/reset-password', handler: authController.resetPassword },
    { method: 'PUT', path: '/change-password', handler: authController.changePassword },
];
