const User = require('../Models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

const generateAccessToken = (userId, role, code) => {
  return jwt.sign({ userId, role, Code:code }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '20d' });
};

function generateUniqueCode() {
  const uuid = uuidv4().replace(/-/g, '');
  const intVal = BigInt('0x' + uuid);
  const normalizedVal = Number(intVal % BigInt(1e18)) / 1e18;
  const uniqueCode = 0.001 + normalizedVal * (0.999 - 0.001);
  return uniqueCode.toFixed(3);
}

const signup = async (req, res) => {
  const { username, email, password, fullname, role } = req.body;

  try {
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const uniqueCode = generateUniqueCode();
console.log(uniqueCode)
    const newUser = new User({ 
      Code: uniqueCode, 
      username, 
      email, 
      password, // Store plain password
      fullname, 
      role 
    });

    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error signing up:', error);
    res.status(500).json({ error: 'Failed to sign up' });
  }
};

const createStudents = async (req, res) => {
  try {
    const { userCount, usernamePattern, password } = req.body;

    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenPart = token.split(' ')[1]; 
    const decodedToken = jwt.verify(tokenPart, process.env.JWT_SECRET);
    
    const user = await User.findById(decodedToken.userId);
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const students = [];
    const generatedCodes = new Set();
    const generatedNumbers = new Set();

    const generateUniqueNumber = () => {
      let number;
      do {
        number = Math.floor(1000 + Math.random() * 9000);
      } while (generatedNumbers.has(number));
      generatedNumbers.add(number);
      return number;
    };

    for (let i = 0; i < userCount; i++) {
      let code;
      do {
        code = (Math.random() * (0.999 - 0.001) + 0.001).toFixed(3);
      } while (generatedCodes.has(code));

      generatedCodes.add(code);
      const uniqueNumber = generateUniqueNumber();

      const username = `${usernamePattern}${uniqueNumber}`;
      const email = `student${uniqueNumber}@mcqs.ev.org`;

      const student = new User({
        username,
        password: `${password}${uniqueNumber}`, // Store plain password
        role: 'student',
        email,
        Code:code
      });

      students.push(student);
    }

    const createdStudents = await User.insertMany(students);

    res.json(createdStudents);
  } catch (error) {
    console.error('Error creating students:', error);
    res.status(500).json({ message: 'Error creating students' });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Compare plaintext passwords directly
    const isPasswordMatch = password === user.password; 
    if (!isPasswordMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const accessToken = generateAccessToken(user._id, user.role, user.Code);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({ message: 'Login successful',admin:user.role=='admin'?true:false, accessToken, refreshToken });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token not provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const accessToken = generateAccessToken(user._id, user.role, user.Code);

    return res.status(200).json({ accessToken });
  } catch (error) {
    console.error('Error refreshing token:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    return res.status(500).json({ error: 'Failed to refresh token' });
  }
};

const getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' });
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Error fetching students' });
  }
};


const deleteStudents = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const tokenPart = token.split(' ')[1]; 
    const decodedToken = jwt.verify(tokenPart, process.env.JWT_SECRET);
    
    const user = await User.findById(decodedToken.userId);
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await User.deleteMany({ role: 'student' });
    res.status(200).json({ message: 'All student users deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student users' });
  }
};

module.exports = {
  signup,
  login,
  getStudents,
  refreshToken,
  createStudents,
  deleteStudents
};
