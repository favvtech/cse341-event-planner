const venuesModel = require('../models/venues');

const requiredFields = ['name', 'address', 'city', 'state', 'zipCode', 'capacity', 'contactEmail'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const getAuthenticatedUser = (req) => {
    if (!req.user) {
        return null;
    }

    return {
        githubId: req.user.githubId || req.user.id,
        username: req.user.username,
        displayName: req.user.displayName,
    };
};

const validateVenue = (body) => {
    const errors = [];

    requiredFields.forEach((field) => {
        if (body[field] === undefined || body[field] === null || body[field] === '') {
            errors.push(`${field} is required`);
        }
    });

    ['name', 'address', 'city', 'state', 'zipCode'].forEach((field) => {
        if (body[field] !== undefined && !isNonEmptyString(body[field])) {
            errors.push(`${field} must be a non-empty string`);
        }
    });

    if (body.capacity !== undefined && (!Number.isInteger(Number(body.capacity)) || Number(body.capacity) <= 0)) {
        errors.push('capacity must be a positive integer');
    }

    if (body.contactEmail !== undefined && !emailPattern.test(body.contactEmail)) {
        errors.push('contactEmail must be a valid email address');
    }

    return errors;
};

const getVenuePayload = (body, req, includeCreatedFields = false) => {
    const now = new Date();
    const payload = {
        name: body.name.trim(),
        address: body.address.trim(),
        city: body.city.trim(),
        state: body.state.trim(),
        zipCode: body.zipCode.trim(),
        capacity: Number(body.capacity),
        contactEmail: body.contactEmail.trim().toLowerCase(),
        updatedAt: now,
        updatedBy: getAuthenticatedUser(req),
    };

    if (includeCreatedFields) {
        payload.createdAt = now;
        payload.createdBy = getAuthenticatedUser(req);
    }

    return payload;
};

const getAll = async (req, res) => {
    try {
        const venues = await venuesModel.findAll();
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(venues);
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred while getting venues' });
    }
};

const getSingle = async (req, res) => {
    let venueId;
    try {
        venueId = venuesModel.parseId(req.params.id);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid venue id' });
    }

    try {
        const venue = await venuesModel.findById(venueId);
        if (!venue) {
            return res.status(404).json({ error: 'Venue not found' });
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(venue);
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred while getting the venue' });
    }
};

const createVenue = async (req, res) => {
    const validationErrors = validateVenue(req.body);
    if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
    }

    const venue = getVenuePayload(req.body, req, true);

    try {
        const response = await venuesModel.create(venue);
        if (response.acknowledged) {
            return res.status(201).json({ id: response.insertedId });
        }

        return res.status(500).json({ error: 'An error occurred while creating the venue' });
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred while creating the venue' });
    }
};

const updateVenue = async (req, res) => {
    let venueId;
    try {
        venueId = venuesModel.parseId(req.params.id);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid venue id' });
    }

    const validationErrors = validateVenue(req.body);
    if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
    }

    const venue = getVenuePayload(req.body, req);

    try {
        const response = await venuesModel.updateById(venueId, venue);
        if (response.matchedCount === 0) {
            return res.status(404).json({ error: 'Venue not found' });
        }

        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred while updating the venue' });
    }
};

const deleteVenue = async (req, res) => {
    let venueId;
    try {
        venueId = venuesModel.parseId(req.params.id);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid venue id' });
    }

    try {
        const response = await venuesModel.deleteById(venueId);
        if (response.deletedCount === 0) {
            return res.status(404).json({ error: 'Venue not found' });
        }

        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred while deleting the venue' });
    }
};

module.exports = {
    getAll,
    getSingle,
    createVenue,
    updateVenue,
    deleteVenue,
};
