const express = require('express');
const passport = require('passport');

const router = express.Router();
const sessionCookieName = 'eventPlanner.sid';
const isProduction = process.env.NODE_ENV === 'production';
const sessionCookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
};

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

        return req.session.regenerate((regenerateError) => {
            if (regenerateError) {
                return res.status(500).json({ error: 'Unable to create login session' });
            }

            return req.logIn(user, (loginError) => {
                if (loginError) {
                    return res.status(500).json({ error: 'Unable to start login session' });
                }

                return req.session.save((sessionError) => {
                    if (sessionError) {
                        return res.status(500).json({ error: 'Unable to save login session' });
                    }

                    return res.redirect('/api-docs');
                });
            });
        });
    })(req, res, next);
});

router.get('/logout', (req, res) => {
    req.logout((error) => {
        if (error) {
            return res.status(500).json({ error: 'Unable to log out' });
        }

        return req.session.destroy((sessionError) => {
            if (sessionError) {
                return res.status(500).json({ error: 'Unable to destroy session' });
            }

            res.clearCookie(sessionCookieName, sessionCookieOptions);
            return res.status(200).json({ message: 'Logged out successfully' });
        });
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

router.get('/debug-session', (req, res) => {
    const cookieNames = (req.headers.cookie || '')
        .split(';')
        .map((cookie) => cookie.trim().split('=')[0])
        .filter(Boolean);

    return res.status(200).json({
        authenticated: Boolean(req.isAuthenticated && req.isAuthenticated()),
        sessionID: req.sessionID || null,
        hasCookieHeader: Boolean(req.headers.cookie),
        cookieNames,
        sessionHasPassport: Boolean(req.session && req.session.passport),
        passportUser: req.session && req.session.passport ? req.session.passport.user : null,
        user: req.user
            ? {
                  githubId: req.user.githubId,
                  username: req.user.username,
                  displayName: req.user.displayName,
              }
            : null,
        request: {
            host: req.get('host'),
            protocol: req.protocol,
            secure: req.secure,
            forwardedProto: req.get('x-forwarded-proto') || null,
        },
    });
});

module.exports = router;
