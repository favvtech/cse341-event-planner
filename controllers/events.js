const eventsModel = require('../models/events');
const venuesModel = require('../models/venues');

const requiredFields = ['name', 'description', 'date', 'time', 'venueId', 'organizer', 'capacity', 'budget', 'status'];
const allowedStatuses = ['planned', 'scheduled', 'cancelled', 'completed'];

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

const validateEvent = (body) => {
    const errors = [];

    requiredFields.forEach((field) => {
        if (body[field] === undefined || body[field] === null || body[field] === '') {
            errors.push(`${field} is required`);
        }
    });

    ['name', 'description', 'date', 'time', 'organizer', 'status'].forEach((field) => {
        if (body[field] !== undefined && !isNonEmptyString(body[field])) {
            errors.push(`${field} must be a non-empty string`);
        }
    });

    if (body.date !== undefined && Number.isNaN(Date.parse(body.date))) {
        errors.push('date must be a valid date string');
    }

    if (body.venueId !== undefined && !eventsModel.isValidObjectId(body.venueId)) {
        errors.push('venueId must be a valid MongoDB ObjectId');
    }

    if (body.capacity !== undefined && (!Number.isInteger(Number(body.capacity)) || Number(body.capacity) <= 0)) {
        errors.push('capacity must be a positive integer');
    }

    if (body.budget !== undefined && (Number.isNaN(Number(body.budget)) || Number(body.budget) < 0)) {
        errors.push('budget must be a non-negative number');
    }

    if (body.status !== undefined && !allowedStatuses.includes(String(body.status).toLowerCase())) {
        errors.push(`status must be one of: ${allowedStatuses.join(', ')}`);
    }

    return errors;
};

const getEventPayload = (body, req, includeCreatedFields = false) => {
    const now = new Date();
    const payload = {
        name: body.name.trim(),
        description: body.description.trim(),
        date: body.date.trim(),
        time: body.time.trim(),
        venueId: eventsModel.parseId(body.venueId),
        organizer: body.organizer.trim(),
        capacity: Number(body.capacity),
        budget: Number(body.budget),
        status: body.status.trim().toLowerCase(),
        updatedAt: now,
        updatedBy: getAuthenticatedUser(req),
    };

    if (includeCreatedFields) {
        payload.createdAt = now;
        payload.createdBy = getAuthenticatedUser(req);
    }

    return payload;
};

const ensureVenueExists = async (venueId) => {
    const venue = await venuesModel.findById(venueId);
    return Boolean(venue);
};

const getAll = async (req, res) => {
    try {
        const events = await eventsModel.findAll();
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(events);
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred while getting events' });
    }
};

const getSingle = async (req, res) => {
    let eventId;
    try {
        eventId = eventsModel.parseId(req.params.id);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid event id' });
    }

    try {
        const event = await eventsModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(event);
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred while getting the event' });
    }
};

const createEvent = async (req, res) => {
    const validationErrors = validateEvent(req.body);
    if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
    }

    const venueId = eventsModel.parseId(req.body.venueId);

    try {
        if (!(await ensureVenueExists(venueId))) {
            return res.status(400).json({ error: 'venueId must reference an existing venue' });
        }

        const event = getEventPayload(req.body, req, true);
        const response = await eventsModel.create(event);
        if (response.acknowledged) {
            return res.status(201).json({ id: response.insertedId });
        }

        return res.status(500).json({ error: 'An error occurred while creating the event' });
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred while creating the event' });
    }
};

const updateEvent = async (req, res) => {
    let eventId;
    try {
        eventId = eventsModel.parseId(req.params.id);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid event id' });
    }

    const validationErrors = validateEvent(req.body);
    if (validationErrors.length > 0) {
        return res.status(400).json({ errors: validationErrors });
    }

    const venueId = eventsModel.parseId(req.body.venueId);

    try {
        if (!(await ensureVenueExists(venueId))) {
            return res.status(400).json({ error: 'venueId must reference an existing venue' });
        }

        const event = getEventPayload(req.body, req);
        const response = await eventsModel.updateById(eventId, event);
        if (response.matchedCount === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred while updating the event' });
    }
};

const deleteEvent = async (req, res) => {
    let eventId;
    try {
        eventId = eventsModel.parseId(req.params.id);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid event id' });
    }

    try {
        const response = await eventsModel.deleteById(eventId);
        if (response.deletedCount === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ error: 'An error occurred while deleting the event' });
    }
};

module.exports = {
    getAll,
    getSingle,
    createEvent,
    updateEvent,
    deleteEvent,
};
