const { ObjectId } = require('mongodb');
const mongodb = require('../data/database');

const collection = () => mongodb.getDatabase().collection('events');
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const parseId = (id) => {
    if (typeof id !== 'string' || !objectIdPattern.test(id) || !ObjectId.isValid(id)) {
        throw new Error('Invalid ObjectId');
    }
    return ObjectId.createFromHexString(id);
};

const isValidObjectId = (id) => {
    try {
        parseId(id);
        return true;
    } catch {
        return false;
    }
};

const findAll = () => collection().find().toArray();

const findById = (id) => collection().findOne({ _id: id });

const create = (event) => collection().insertOne(event);

const updateById = (id, event) => collection().updateOne({ _id: id }, { $set: event });

const deleteById = (id) => collection().deleteOne({ _id: id });

module.exports = {
    parseId,
    isValidObjectId,
    findAll,
    findById,
    create,
    updateById,
    deleteById,
};
