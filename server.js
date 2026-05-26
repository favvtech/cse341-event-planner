require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const swaggerUi = require('swagger-ui-express');

const mongodb = require('./data/database');
const usersModel = require('./models/users');

let swaggerDocument;
try {
    swaggerDocument = require('./swagger.json');
} catch {
    swaggerDocument = {
        swagger: '2.0',
        info: {
            title: 'CSE341 Event Planner API',
            version: '1.0.0',
        },
        paths: {},
    };
}

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'development-session-secret',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: isProduction,
        },
    })
);
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, {
        githubId: user.githubId,
        username: user.username,
        displayName: user.displayName,
        profileUrl: user.profileUrl,
    });
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
        new GitHubStrategy(
            {
                clientID: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL: process.env.GITHUB_CALLBACK_URL || `http://localhost:${port}/auth/github/callback`,
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const user = await usersModel.upsertGitHubUser(profile);
                    return done(null, user);
                } catch (error) {
                    return done(error, null);
                }
            }
        )
    );
}

const getSwaggerDocument = (req) => ({
    ...swaggerDocument,
    host: process.env.API_HOST || req.get('host'),
    schemes: [process.env.API_SCHEME || req.get('x-forwarded-proto') || req.protocol],
});

app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(getSwaggerDocument(req));
});

app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(null, { swaggerOptions: { url: '/api-docs.json' } }));

app.use('/', require('./routes'));

mongodb.initDb((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }

    app.listen(port, () => {
        console.log(`Database connected and server running on port ${port}`);
        console.log(`Swagger UI: http://localhost:${port}/api-docs`);
    });
});
