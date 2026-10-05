const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String },
    role: {
      type: String,
      enum: ['RANGER', 'PARK_MANAGER', 'COMMUNITY_LIAISON_OFFICER', 'ADMIN'],
      default: 'RANGER',
    },
    park: { type: mongoose.Schema.Types.ObjectId, ref: 'Park' },
    assignedPatrols: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Patrol' }],
    isActive: { type: Boolean, default: true },
    lastLocation: {
      latitude: Number,
      longitude: Number,
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);