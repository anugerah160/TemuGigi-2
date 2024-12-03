const authController = require('../controllers/authController');
const diagnoseController = require('../controllers/diagnoseController');
const profileController = require('../controllers/profileController');
const requestController = require('../controllers/requestController');
const scheduleController = require('../controllers/scheduleController');


module.exports = [
    //AuthController
    { method: 'POST', path: '/registerpatient', handler: authController.registerPatient, options: { auth: false } },
    { method: 'POST', path: '/registercoass', handler: authController.registerCoass , options: { auth: false }},
    { method: 'POST', path: '/login', handler: authController.login, options: { auth: false } },
    { method: 'POST', path: '/forgot-password', handler: authController.forgotPassword },
    { method: 'POST', path: '/reset-password', handler: authController.resetPassword },
    { method: 'PUT', path: '/change-password', handler: authController.changePassword },
    //PiagnoseController
    { method: 'POST', path: '/predict', handler: diagnoseController.predictDisease },
    { method: 'GET', path: '/list-coass', handler: diagnoseController.listCoass },
    { method: 'GET', path: '/list-patients', handler: diagnoseController.listPatients },
    //ProfileController
    { method: 'GET', path: '/profile', handler: profileController.getProfile },
    { method: 'PUT', path: '/profile', handler: profileController.updateProfile,
        options: {
        payload: {
            allow: 'application/json',
            parse: true,
        },
    }, },
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
