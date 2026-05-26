const router = require('express').Router();

router.get('/', (req, res) => {
    res.status(200).json({
        message: 'CSE341 Event Planner API',
        documentation: '/api-docs',
        auth: '/auth/status',
        routes: {
            events: '/events',
            venues: '/venues',
        },
    });
});

router.use('/auth', require('./auth'));
router.use('/events', require('./events'));
router.use('/venues', require('./venues'));

module.exports = router;
