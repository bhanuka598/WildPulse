const express = require('express');
const {
  register,
  login,
  getMe,
  updateLocation,
  getUsers,
  forgotPassword,
  resetPasswordWithOtp,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordWithOtp);
router.get('/me', protect, getMe);
router.put('/location', protect, updateLocation);
router.get('/users', protect, getUsers);

module.exports = router;