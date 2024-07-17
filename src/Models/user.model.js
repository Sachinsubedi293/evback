const mongoose = require('mongoose');

// Define user schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  fullname: {
    type: String,
  },
  role: {
    type: String,
    enum: ['student', 'admin'], // Define allowed roles
    default: 'student' // Default role is 'student'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
Code:{
    type:Number,
    required: true
  }
});

// Create User model from the schema
const User = mongoose.model('User', userSchema);

// Export the User model
module.exports = User;
