const profileController = require('../controllers/profileController');

module.exports = [
    { method: 'GET', path: '/profile', handler: profileController.getProfile },
    { method: 'PUT', path: '/profile', handler: profileController.updateProfile,
        options: {
        payload: {
            allow: 'application/json',
            parse: true,
        },
    }, },
];
