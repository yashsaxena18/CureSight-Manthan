const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const authController = {
  // POST /api/auth/signup
  async signup(req, res) {
    try {
      console.log('Signup request received:', req.body);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { 
        firstName, 
        lastName, 
        email, 
        dateOfBirth, 
        gender, 
        password,
        agreeTerms,
        agreePrivacy,
        subscribeNewsletter
      } = req.body;

      console.log('Processing signup for email:', email);

      // Check if user exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        console.log('User already exists:', email);
        return res.status(400).json({
          error: 'User already exists',
          message: 'An account with this email already exists'
        });
      }

      // Create user
      const user = new User({
        firstName,
        lastName,
        email: email.toLowerCase(),
        dateOfBirth: new Date(dateOfBirth),
        gender,
        password,
        preferences: {
          newsletter: subscribeNewsletter === true || subscribeNewsletter === 'true'
        },
        agreements: {
          termsAccepted: {
            accepted: agreeTerms === true || agreeTerms === 'true',
            acceptedAt: new Date(),
            version: '1.0'
          },
          privacyAccepted: {
            accepted: agreePrivacy === true || agreePrivacy === 'true',
            acceptedAt: new Date(),
            version: '1.0'
          }
        }
      });

      console.log('Saving user to database...');
      await user.save();
      console.log('User saved successfully');

      // Generate token
      const token = jwt.sign(
        { 
          userId: user._id,
          email: user.email 
        },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '7d' }
      );

      console.log('Token generated successfully');

      res.status(201).json({
        message: 'Account created successfully',
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          fullName: user.fullName
        }
      });

    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        error: 'Signup failed',
        message: error.message || 'Unable to create account'
      });
    }
  },

  // POST /api/auth/signin
  async signin(req, res) {
    try {
      console.log('Signin request received:', { email: req.body.email });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password, rememberMe } = req.body;

      console.log('Looking for user with email:', email);

      // Find user
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        console.log('User not found:', email);
        return res.status(400).json({
          error: 'Invalid credentials',
          message: 'No account found with this email'
        });
      }

      console.log('User found, checking password...');

      // Check password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        console.log('Invalid password for user:', email);
        return res.status(400).json({
          error: 'Invalid credentials',
          message: 'Incorrect password'
        });
      }

      console.log('Password valid, generating token...');

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const tokenExpiry = rememberMe ? '30d' : '7d';
      const token = jwt.sign(
        { 
          userId: user._id,
          email: user.email 
        },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: tokenExpiry }
      );

      console.log('Signin successful for:', email);

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          fullName: user.fullName,
          lastLogin: user.lastLogin
        }
      });

    } catch (error) {
      console.error('Signin error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: error.message || 'Unable to login'
      });
    }
  }
};

module.exports = authController;
