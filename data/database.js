const dotenv = require('dotenv');
dotenv.config();

const dns = require('dns');
const { MongoClient } = require('mongodb');

dns.setServers(['8.8.8.8', '1.1.1.1']);

let database;

const initDb = (callback) => {
    if (database) {
        return callback(null, database);
    }

    const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
    const dbName = process.env.DB_NAME || 'eventPlanner';

    if (!uri) {
        return callback(new Error('MONGODB_URI is missing. Create a .env file from .env.example.'), null);
    }

    MongoClient.connect(uri, {
        family: 4,
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
    })
        .then((client) => {
            database = client.db(dbName);
            callback(null, database);
        })
        .catch((err) => {
            callback(err, null);
        });
};

const getDatabase = () => {
    if (!database) {
        throw new Error('Db not initialized!');
    }
    return database;
};

module.exports = {
    initDb,
    getDatabase,
};
