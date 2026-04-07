const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

function signToken(user) {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
  };
  const secret = process.env.JWT_SECRET || 'dev_secret';
  const expiresIn = '7d';
  return jwt.sign(payload, secret, { expiresIn });
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const validRoles = ['student', 'maintenance', 'admin'];
    const assignedRole = validRoles.includes(role) ? role : 'student';

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: assignedRole,
    });

    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { email, name, googleId } = req.body;
    if (!email || !googleId) {
      return res.status(400).json({ message: 'Missing google user info' });
    }

    const validRoles = ['student', 'maintenance', 'admin'];
    const requestedRole = req.body.role;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        role: validRoles.includes(requestedRole) ? requestedRole : 'student',
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Google auth failed' });
  }
});

const { authMiddleware } = require('../middleware/auth');
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, department, year } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { name, phone, department, year } },
      { new: true }
    ).select('-passwordHash');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

module.exports = router;
