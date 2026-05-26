const express = require('express');
const router = express.Router();

const venuesController = require('../controllers/venues');
const { requireAuth } = require('../middleware/auth');

// #swagger.tags = ['Venues']
// #swagger.summary = 'Get all venues'
router.get('/', venuesController.getAll);

// #swagger.tags = ['Venues']
// #swagger.summary = 'Get one venue by MongoDB ObjectId'
router.get('/:id', venuesController.getSingle);

// #swagger.tags = ['Venues']
// #swagger.summary = 'Create a venue'
router.post('/', requireAuth, venuesController.createVenue);

// #swagger.tags = ['Venues']
// #swagger.summary = 'Update a venue'
router.put('/:id', requireAuth, venuesController.updateVenue);

// #swagger.tags = ['Venues']
// #swagger.summary = 'Delete a venue'
router.delete('/:id', requireAuth, venuesController.deleteVenue);

module.exports = router;
