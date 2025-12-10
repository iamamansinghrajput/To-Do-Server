const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Create or update user by email (preferred endpoint)
router.post('/register', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      { name: name.trim(), email: normalizedEmail },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Backward-compatible root POST (also creates/updates)
router.post('/', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      { name: name.trim(), email: normalizedEmail },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

