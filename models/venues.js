const { ObjectId } = require('mongodb');
const mongodb = require('../data/database');

const collection = () => mongodb.getDatabase().collection('venues');
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const parseId = (id) => {
    if (typeof id !== 'string' || !objectIdPattern.test(id) || !ObjectId.isValid(id)) {
        throw new Error('Invalid ObjectId');
    }
    return ObjectId.createFromHexString(id);
};

const findAll = () => collection().find().toArray();

const findById = (id) => collection().findOne({ _id: id });

const create = (venue) => collection().insertOne(venue);

const updateById = (id, venue) => collection().updateOne({ _id: id }, { $set: venue });

const deleteById = (id) => collection().deleteOne({ _id: id });

module.exports = {
    parseId,
    findAll,
    findById,
    create,
    updateById,
    deleteById,
};
