const Hapi = require('@hapi/hapi');
const Jwt = require('@hapi/jwt');
require('dotenv').config();
// const loadModel = require('../controllers/predictController');
const routes = require('./routes');

const init = async () => {
    const server = Hapi.server({
        port: process.env.PORT || 8080, 
        host: process.env.HOST || '0.0.0.0',
        routes: {
            cors: {
              origin: ['*'],
            },
        }, 
    });

    // Register JWT plugin
    await server.register(Jwt);

    // Define JWT strategy
    server.auth.strategy('jwt', 'jwt', {
        keys: process.env.JWT_SECRET,
        verify: {
            aud: false,
            iss: false,
            sub: false,
            nbf: true,
            exp: true,
            maxAgeSec: 86400*7, // 7 days
        },
        validate: (artifacts, request, h) => {
            return {
                isValid: true,
                credentials: { id: artifacts.decoded.payload.id, role: artifacts.decoded.payload.role },
            };
        },
    });

    // Set default auth strategy
    server.auth.default('jwt');

    // Register routes
    server.route([...routes]);

    await server.start();
    console.log(`Server running on ${server.info.uri}`);
};

init();
