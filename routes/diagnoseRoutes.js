const diagnoseController = require('../controllers/diagnoseController');

module.exports = [
    { method: 'POST', path: '/predict', handler: diagnoseController.predictDisease },
    { method: 'GET', path: '/list-coass', handler: diagnoseController.listCoass },
    { method: 'GET', path: '/list-patients', handler: diagnoseController.listPatients },
];
