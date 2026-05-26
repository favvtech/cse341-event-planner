const mongodb = require('../data/database');

const collection = () => mongodb.getDatabase().collection('users');

const upsertGitHubUser = async (profile) => {
    const now = new Date();
    const user = {
        githubId: profile.id,
        username: profile.username,
        displayName: profile.displayName || profile.username,
        profileUrl: profile.profileUrl,
        updatedAt: now,
    };

    await collection().updateOne(
        { githubId: profile.id },
        {
            $set: user,
            $setOnInsert: { createdAt: now },
        },
        { upsert: true }
    );

    return collection().findOne({ githubId: profile.id });
};

module.exports = {
    upsertGitHubUser,
};
