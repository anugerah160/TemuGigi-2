const authController = require('../controllers/authController');
const predictController = require('../controllers/predictController');
const profileController = require('../controllers/profileController');
const requestController = require('../controllers/requestController');
const scheduleController = require('../controllers/scheduleController');
const { uploadSingle, uploadSingle1 } = require('../services/multerService');

module.exports = [
    //AuthController
    { method: 'POST', path: '/registerpatient', handler: authController.registerPatient, options: { auth: false } },
    { method: 'POST', path: '/registercoass', handler: authController.registerCoass , options: { auth: false }},
    { method: 'POST', path: '/login', handler: authController.login, options: { auth: false } },
    { method: 'POST', path: '/forgot-password', handler: authController.forgotPassword, options: { auth: false } },
    { method: 'POST', path: '/reset-password', handler: authController.resetPassword, options: { auth: false } },
    { method: 'PUT', path: '/change-password', handler: authController.changePassword },
    //PredictController
    { method: 'GET', path: '/list-coass', handler: predictController.listCoass },
    { method: 'GET', path: '/list-patients', handler: predictController.listPatients },
    { method: 'GET', path: '/predict', handler: predictController.getPredict },
    {
        method: 'POST',
        path: '/predict',
        handler: predictController.predictDisease,
        options: {
            auth: 'jwt',
            payload: {
                maxBytes: 10 * 1024 * 1024, // Max 10 MB
                output: 'stream',
                parse: false,
                allow: 'multipart/form-data',
                // multipart: true
            },
            pre: [
                { method: uploadSingle },
            ],
        },
    },
    //ProfileController
    { method: 'GET', path: '/profile', handler: profileController.getProfile },
    { method: 'PUT', path: '/profile', handler: profileController.updateProfile,
        options: {
        payload: {
            allow: 'application/json',
            parse: true,
        },
    }, },
    { method: 'PUT', path: '/profile-picture', 
        handler: profileController.updatePicture,
        options: {
            auth: 'jwt',
            payload: {
                maxBytes: 10 * 1024 * 1024, // Max 10 MB
                output: 'stream',
                parse: false,
                allow: 'multipart/form-data',
                // multipart: true
            },
            pre: [
                { method: uploadSingle1 },
            ],
        },
    },
    //RequestController
    {
        method: 'POST',
        path: '/request-meeting',
        handler: requestController.requestMeeting,
        options: {
            auth: 'jwt',
            pre: [
                { method: requestController.verifyRole('Patient') },
            ],
        },
    },
    {
        method: 'GET',
        path: '/pending-requests',
        handler: requestController.getPendingRequests,
        options: {
            auth: 'jwt',
            pre: [
                { method: requestController.verifyRole('Coass') },
            ],
        },
    },
    {
        method: 'GET',
        path: '/accepted-requests',
        handler: requestController.getAcceptedRequests,
        options: {
            auth: 'jwt',
            pre: [
                { method: requestController.verifyRole('Coass') },
            ],
        },
    },
    {
        method: 'PUT',
        path: '/review-request',
        handler: requestController.reviewRequest,
        options: {
            auth: 'jwt',
            pre: [
                { method: requestController.verifyRole('Coass') },
            ],
        },
    },
    //ScheduleController
    {
        method: 'POST',
        path: '/schedule-meeting',
        handler: scheduleController.scheduleMeeting,
        options: {
            auth: 'jwt',
            pre: [
                { method: scheduleController.verifyRole('Coass') },
            ],
        },
    },
    {
        method: 'GET',
        path: '/my-schedule',
        handler: scheduleController.getPatientSchedule,
        options: {
            auth: 'jwt',
            pre: [
                { method: scheduleController.verifyRole('Patient') },
            ],
        },
    },
    {
        method: 'GET',
        path: '/coass-schedule',
        handler: scheduleController.getCoassSchedule,
        options: {
            auth: 'jwt',
            pre: [
                { method: scheduleController.verifyRole('Coass') },
            ],
        },
    },
];
