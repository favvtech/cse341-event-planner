const fs = require('fs');
require('dotenv').config();
const swaggerAutogen = require('swagger-autogen')();

const eventSchema = {
    type: 'object',
    required: ['name', 'description', 'date', 'time', 'venueId', 'organizer', 'capacity', 'budget', 'status'],
    properties: {
        name: { type: 'string', example: 'CSE341 Final Demo Night' },
        description: { type: 'string', example: 'A showcase event for final API projects.' },
        date: { type: 'string', example: '2026-06-15' },
        time: { type: 'string', example: '18:00' },
        venueId: { type: 'string', example: '665f1c2a9b5a4b0012d34abc' },
        organizer: { type: 'string', example: 'Favour Igein' },
        capacity: { type: 'integer', example: 120 },
        budget: { type: 'number', example: 1500 },
        status: { type: 'string', enum: ['planned', 'scheduled', 'cancelled', 'completed'], example: 'planned' },
    },
};

const venueSchema = {
    type: 'object',
    required: ['name', 'address', 'city', 'state', 'zipCode', 'capacity', 'contactEmail'],
    properties: {
        name: { type: 'string', example: 'Downtown Conference Hall' },
        address: { type: 'string', example: '120 Main Street' },
        city: { type: 'string', example: 'Dallas' },
        state: { type: 'string', example: 'TX' },
        zipCode: { type: 'string', example: '75201' },
        capacity: { type: 'integer', example: 250 },
        contactEmail: { type: 'string', example: 'booking@example.com' },
    },
};

const errorSchema = {
    type: 'object',
    properties: {
        error: { type: 'string', example: 'Event not found' },
    },
};

const validationErrorSchema = {
    type: 'object',
    properties: {
        errors: {
            type: 'array',
            items: { type: 'string' },
            example: ['name is required', 'capacity must be a positive integer'],
        },
    },
};

const authStatusSchema = {
    type: 'object',
    properties: {
        authenticated: { type: 'boolean', example: true },
        user: { type: 'object' },
    },
};

const objectIdParameter = {
    name: 'id',
    in: 'path',
    required: true,
    type: 'string',
    description: 'MongoDB ObjectId (24 hex characters)',
};

const doc = {
    info: {
        title: 'CSE341 Event Planner API',
        description: 'REST API for managing events and venues with MongoDB, validation, error handling, and GitHub OAuth.',
        version: '1.0.0',
    },
    host: process.env.API_HOST || 'localhost:3000',
    schemes: [process.env.API_SCHEME || 'http'],
    tags: [
        { name: 'Auth', description: 'GitHub OAuth user management' },
        { name: 'Events', description: 'Event records in MongoDB' },
        { name: 'Venues', description: 'Venue records in MongoDB' },
    ],
    securityDefinitions: {
        GitHubOAuthSession: {
            type: 'apiKey',
            in: 'cookie',
            name: 'connect.sid',
            description: 'Session cookie created after logging in at /auth/github.',
        },
    },
    definitions: {
        Event: eventSchema,
        Venue: venueSchema,
        Error: errorSchema,
        ValidationError: validationErrorSchema,
        AuthStatus: authStatusSchema,
    },
};

const outputFile = './swagger.json';
const endpointsFiles = ['./routes/index.js'];

const routeDocs = {
    '/': {
        get: {
            tags: ['Auth'],
            summary: 'API welcome route',
            description: 'Returns the main API links.',
            produces: ['application/json'],
            responses: {
                200: { description: 'API information returned' },
            },
        },
    },
    '/auth/github': {
        get: {
            tags: ['Auth'],
            summary: 'Start GitHub OAuth login',
            description: 'Redirects the user to GitHub to begin OAuth login.',
            responses: {
                302: { description: 'Redirect to GitHub OAuth' },
                500: { description: 'GitHub OAuth is not configured', schema: { $ref: '#/definitions/Error' } },
            },
        },
    },
    '/auth/github/callback': {
        get: {
            tags: ['Auth'],
            summary: 'GitHub OAuth callback',
            description: 'GitHub redirects here after successful login. The app stores the OAuth user and creates a session.',
            responses: {
                302: { description: 'Redirect to Swagger docs after login' },
                401: { description: 'Login was not completed', schema: { $ref: '#/definitions/Error' } },
                500: { description: 'OAuth login failed', schema: { $ref: '#/definitions/Error' } },
            },
        },
    },
    '/auth/logout': {
        get: {
            tags: ['Auth'],
            summary: 'Log out',
            description: 'Ends the current login session.',
            responses: {
                200: { description: 'Logged out successfully' },
                500: { description: 'Logout failed', schema: { $ref: '#/definitions/Error' } },
            },
        },
    },
    '/auth/status': {
        get: {
            tags: ['Auth'],
            summary: 'Check login status',
            description: 'Returns whether the current browser session is authenticated.',
            responses: {
                200: { description: 'Authentication status', schema: { $ref: '#/definitions/AuthStatus' } },
            },
        },
    },
    '/events': {
        get: {
            tags: ['Events'],
            summary: 'Get all events',
            description: 'Returns every event document from the events collection.',
            produces: ['application/json'],
            responses: {
                200: { description: 'List of events', schema: { type: 'array', items: { $ref: '#/definitions/Event' } } },
                500: { description: 'Server error', schema: { $ref: '#/definitions/Error' } },
            },
        },
        post: {
            tags: ['Events'],
            summary: 'Create an event',
            description: 'Creates a new event. Requires GitHub OAuth login and a venueId that already exists in the venues collection.',
            security: [{ GitHubOAuthSession: [] }],
            consumes: ['application/json'],
            produces: ['application/json'],
            parameters: [{ name: 'body', in: 'body', required: true, schema: { $ref: '#/definitions/Event' } }],
            responses: {
                201: { description: 'Event created' },
                400: { description: 'Validation error', schema: { $ref: '#/definitions/ValidationError' } },
                401: { description: 'Authentication required', schema: { $ref: '#/definitions/Error' } },
                500: { description: 'Server error', schema: { $ref: '#/definitions/Error' } },
            },
        },
    },
    '/events/{id}': {
        get: {
            tags: ['Events'],
            summary: 'Get one event',
            description: 'Returns a single event by MongoDB ObjectId.',
            produces: ['application/json'],
            parameters: [objectIdParameter],
            responses: {
                200: { description: 'Event found', schema: { $ref: '#/definitions/Event' } },
                400: { description: 'Invalid ObjectId', schema: { $ref: '#/definitions/Error' } },
                404: { description: 'Event not found', schema: { $ref: '#/definitions/Error' } },
                500: { description: 'Server error', schema: { $ref: '#/definitions/Error' } },
            },
        },
        put: {
            tags: ['Events'],
            summary: 'Update an event',
            description: 'Updates an existing event by MongoDB ObjectId. All event fields are required.',
            security: [{ GitHubOAuthSession: [] }],
            consumes: ['application/json'],
            parameters: [objectIdParameter, { name: 'body', in: 'body', required: true, schema: { $ref: '#/definitions/Event' } }],
            responses: {
                204: { description: 'Event updated successfully' },
                400: { description: 'Invalid ObjectId or validation error', schema: { $ref: '#/definitions/ValidationError' } },
                401: { description: 'Authentication required', schema: { $ref: '#/definitions/Error' } },
                404: { description: 'Event not found', schema: { $ref: '#/definitions/Error' } },
                500: { description: 'Server error', schema: { $ref: '#/definitions/Error' } },
            },
        },
        delete: {
            tags: ['Events'],
            summary: 'Delete an event',
            description: 'Deletes an event by MongoDB ObjectId. Requires GitHub OAuth login.',
            security: [{ GitHubOAuthSession: [] }],
            parameters: [objectIdParameter],
            responses: {
                204: { description: 'Event deleted successfully' },
                400: { description: 'Invalid ObjectId', schema: { $ref: '#/definitions/Error' } },
                401: { description: 'Authentication required', schema: { $ref: '#/definitions/Error' } },
                404: { description: 'Event not found', schema: { $ref: '#/definitions/Error' } },
                500: { description: 'Server error', schema: { $ref: '#/definitions/Error' } },
            },
        },
    },
    '/venues': {
        get: {
            tags: ['Venues'],
            summary: 'Get all venues',
            description: 'Returns every venue document from the venues collection.',
            produces: ['application/json'],
            responses: {
                200: { description: 'List of venues', schema: { type: 'array', items: { $ref: '#/definitions/Venue' } } },
                500: { description: 'Server error', schema: { $ref: '#/definitions/Error' } },
            },
        },
        post: {
            tags: ['Venues'],
            summary: 'Create a venue',
            description: 'Creates a new venue. Requires GitHub OAuth login.',
            security: [{ GitHubOAuthSession: [] }],
            consumes: ['application/json'],
            produces: ['application/json'],
            parameters: [{ name: 'body', in: 'body', required: true, schema: { $ref: '#/definitions/Venue' } }],
            responses: {
                201: { description: 'Venue created' },
                400: { description: 'Validation error', schema: { $ref: '#/definitions/ValidationError' } },
                401: { description: 'Authentication required', schema: { $ref: '#/definitions/Error' } },
                500: { description: 'Server error', schema: { $ref: '#/definitions/Error' } },
            },
        },
    },
    '/venues/{id}': {
        get: {
            tags: ['Venues'],
            summary: 'Get one venue',
            description: 'Returns a single venue by MongoDB ObjectId.',
            produces: ['application/json'],
            parameters: [objectIdParameter],
            responses: {
                200: { description: 'Venue found', schema: { $ref: '#/definitions/Venue' } },
                400: { description: 'Invalid ObjectId', schema: { $ref: '#/definitions/Error' } },
                404: { description: 'Venue not found', schema: { $ref: '#/definitions/Error' } },
                500: { description: 'Server error', schema: { $ref: '#/definitions/Error' } },
            },
        },
        put: {
            tags: ['Venues'],
            summary: 'Update a venue',
            description: 'Updates an existing venue by MongoDB ObjectId. All venue fields are required.',
            security: [{ GitHubOAuthSession: [] }],
            consumes: ['application/json'],
            parameters: [objectIdParameter, { name: 'body', in: 'body', required: true, schema: { $ref: '#/definitions/Venue' } }],
            responses: {
                204: { description: 'Venue updated successfully' },
                400: { description: 'Invalid ObjectId or validation error', schema: { $ref: '#/definitions/ValidationError' } },
                401: { description: 'Authentication required', schema: { $ref: '#/definitions/Error' } },
                404: { description: 'Venue not found', schema: { $ref: '#/definitions/Error' } },
                500: { description: 'Server error', schema: { $ref: '#/definitions/Error' } },
            },
        },
        delete: {
            tags: ['Venues'],
            summary: 'Delete a venue',
            description: 'Deletes a venue by MongoDB ObjectId. Requires GitHub OAuth login.',
            security: [{ GitHubOAuthSession: [] }],
            parameters: [objectIdParameter],
            responses: {
                204: { description: 'Venue deleted successfully' },
                400: { description: 'Invalid ObjectId', schema: { $ref: '#/definitions/Error' } },
                401: { description: 'Authentication required', schema: { $ref: '#/definitions/Error' } },
                404: { description: 'Venue not found', schema: { $ref: '#/definitions/Error' } },
                500: { description: 'Server error', schema: { $ref: '#/definitions/Error' } },
            },
        },
    },
};

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    const spec = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

    spec.host = doc.host;
    spec.schemes = doc.schemes;
    spec.tags = doc.tags;
    spec.securityDefinitions = doc.securityDefinitions;
    spec.definitions = doc.definitions;

    for (const [path, methods] of Object.entries(routeDocs)) {
        spec.paths[path] = {
            ...(spec.paths[path] || {}),
            ...methods,
        };
    }

    fs.writeFileSync(outputFile, JSON.stringify(spec, null, 2));
    console.log('swagger.json generated with Event Planner API documentation');
});
