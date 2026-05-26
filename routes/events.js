const express = require('express');
const router = express.Router();

const eventsController = require('../controllers/events');
const { requireAuth } = require('../middleware/auth');

// #swagger.tags = ['Events']
// #swagger.summary = 'Get all events'
router.get('/', eventsController.getAll);

// #swagger.tags = ['Events']
// #swagger.summary = 'Get one event by MongoDB ObjectId'
router.get('/:id', eventsController.getSingle);

// #swagger.tags = ['Events']
// #swagger.summary = 'Create an event'
router.post('/', requireAuth, eventsController.createEvent);

// #swagger.tags = ['Events']
// #swagger.summary = 'Update an event'
router.put('/:id', requireAuth, eventsController.updateEvent);

// #swagger.tags = ['Events']
// #swagger.summary = 'Delete an event'
router.delete('/:id', requireAuth, eventsController.deleteEvent);

module.exports = router;
