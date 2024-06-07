const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Replace these with your own credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));

const usageSchema = new mongoose.Schema({
  userId: String,
  usage: Number
});

const Usage = mongoose.model('Usage', usageSchema);

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Find or create usage data for the user
        let usage = await Usage.findOne({ userId: profile.id });
        if (!usage) {
            usage = new Usage({ userId: profile.id, usage: 0 });
            await usage.save();
        }
        done(null, profile);
    } catch (error) {
        done(error);
    }
}));



passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

app.use(session({ secret: 'SECRET', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/dashboard');
});

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/auth/google');
}

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.send(`Hello, ${req.user.displayName}`);
});

app.get('/api/user', isAuthenticated, (req, res) => {
    res.json(req.user);
});


app.get('/api/usage', isAuthenticated, async (req, res) => {
  const usage = await Usage.findOne({ userId: req.user.id });
  res.json(usage);
});

app.get('/api/billing', isAuthenticated, async (req, res) => {
  const usage = await Usage.findOne({ userId: req.user.id });
  const billingInfo = {
    cycle: 'Current Cycle',
    usage: usage ? usage.usage : 0
  };
  res.json(billingInfo);
});

app.post('/api/invoice', isAuthenticated, async (req, res) => {
  const usage = await Usage.findOne({ userId: req.user.id });
  res.json({ message: 'Invoice generated', usage: usage ? usage.usage : 0 });
});

app.post('/api/trigger-billing', isAuthenticated, async (req, res) => {
  try {
    const usage = await Usage.findOne({ userId: req.user.id });
    const response = await axios.post(ZAPIER_WEBHOOK_URL, { usage }, {
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error triggering billing webhook:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
