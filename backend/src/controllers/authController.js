const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, password, role, phone });

    const token = signToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user._id);
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// PUT /api/auth/location
exports.updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      lastLocation: { latitude, longitude, updatedAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/users?role=RANGER
exports.getUsers = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    if (req.query.role) {
      filter.role = req.query.role;
    }
    const users = await User.find(filter).select('-password');
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account registered with that email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetOtp = otp;
    user.resetOtpExpires = expiresAt;
    await user.save({ validateBeforeSave: false });

    // Send email with OTP
    const sendEmail = require('../config/email');
    await sendEmail({
      to: user.email,
      subject: 'WildPulse Security - Password Reset OTP',
      text: `Your WildPulse password reset verification code is: ${otp}. It will expire in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #064e3b; margin-top: 0;">🛡️ WildPulse Security</h2>
          <p>You requested a password reset for your WildPulse Conservation account.</p>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; color: #166534; font-size: 13px; font-weight: bold;">VERIFICATION OTP CODE</p>
            <h1 style="margin: 8px 0; color: #047857; letter-spacing: 6px; font-size: 32px;">${otp}</h1>
            <p style="margin: 0; color: #64748b; font-size: 12px;">Expires in 10 minutes</p>
          </div>
          <p style="color: #64748b; font-size: 12px;">If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: 'OTP sent to your email address',
      // Include OTP in dev mode when SMTP is not configured so testers can proceed without live mailbox
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
exports.resetPasswordWithOtp = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      email,
      resetOtp: otp,
      resetOtpExpires: { $gt: Date.now() },
    }).select('+resetOtp +resetOtpExpires');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code' });
    }

    // Update password and clear OTP
    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password successfully reset! You can now log in.',
    });
  } catch (err) {
    next(err);
  }
};