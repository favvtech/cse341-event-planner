const express = require('express');
const passport = require('passport');

const router = express.Router();

router.get('/github', (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
        return res.status(500).json({
            error: 'GitHub OAuth is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to .env.',
        });
    }

    return passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});

router.get('/github/callback', (req, res, next) => {
    passport.authenticate('github', { failureRedirect: '/auth/status' }, (error, user) => {
        if (error) {
            return res.status(500).json({ error: 'GitHub OAuth login failed' });
        }

        if (!user) {
            return res.status(401).json({ error: 'GitHub OAuth login was not completed' });
        }

        return req.logIn(user, (loginError) => {
            if (loginError) {
                return res.status(500).json({ error: 'Unable to start login session' });
            }

            return res.redirect('/api-docs');
        });
    })(req, res, next);
});

router.get('/logout', (req, res) => {
    req.logout((error) => {
        if (error) {
            return res.status(500).json({ error: 'Unable to log out' });
        }

        return res.status(200).json({ message: 'Logged out successfully' });
    });
});

router.get('/status', (req, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return res.status(200).json({
            authenticated: true,
            user: {
                githubId: req.user.githubId,
                username: req.user.username,
                displayName: req.user.displayName,
                profileUrl: req.user.profileUrl,
            },
        });
    }

    return res.status(200).json({
        authenticated: false,
        loginUrl: '/auth/github',
    });
});

module.exports = router;
