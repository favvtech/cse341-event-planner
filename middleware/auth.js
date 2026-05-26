const requireAuth = (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }

    return res.status(401).json({
        error: 'Authentication required. Log in with GitHub at /auth/github.',
    });
};

module.exports = {
    requireAuth,
};
