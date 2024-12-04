const ClientError = require('./ClientError');

class InputError extends ClientError {
    constructor(message) {
        super(message, 413);
        this.name = 'InputError';
    }
}

module.exports = InputError;
