const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true },
    role: {
      type: String,
      enum: ['student', 'maintenance', 'admin'],
      default: 'student',
    },
    googleId: { type: String },
    passwordHash: { type: String },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidate, this.passwordHash);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
