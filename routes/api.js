const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Menu = require('../models/Menu');
const Attendance = require('../models/Attendance');
const expenseRoutes = require('./expenseRoutes'); // Import new expense routes

// Default credentials
const DEFAULT_CREDENTIALS = {
  email: 'admin@mess.com',
  password: 'admin123'
};

// Initialize default admin
const initializeDefaultAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ email: DEFAULT_CREDENTIALS.email });
    if (!existingAdmin) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(DEFAULT_CREDENTIALS.password, 10);
      await User.create({
        name: 'Admin',
        email: DEFAULT_CREDENTIALS.email,
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Default admin created');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if using default credentials
    if (email === DEFAULT_CREDENTIALS.email && password === DEFAULT_CREDENTIALS.password) {
      await initializeDefaultAdmin();
      return res.json({
        success: true,
        user: {
          name: 'Admin',
          email: DEFAULT_CREDENTIALS.email,
          role: 'admin'
        }
      });
    }
    
    // Regular user login
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
});

// Menu routes
router.get('/menu', async (req, res) => {
  try {
    const menu = await Menu.find().sort({ day: 1 });
    res.json({ success: true, menu });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch menu',
      error: error.message 
    });
  }
});

router.post('/menu', async (req, res) => {
  try {
    const { day, breakfast, lunch, dinner } = req.body;
    
    if (!day || !breakfast || !lunch || !dinner) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    const menuItem = await Menu.findOneAndUpdate(
      { day },
      { breakfast, lunch, dinner },
      { upsert: true, new: true, runValidators: true }
    );
    
    res.json({ 
      success: true, 
      menuItem,
      message: 'Menu updated successfully'
    });
  } catch (error) {
    console.error('Update menu error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update menu',
      error: error.message 
    });
  }
});

// Attendance routes
router.get('/attendance/:date?', async (req, res) => {
  try {
    const date = req.params.date ? new Date(req.params.date) : new Date();
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    
    const attendance = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('student', 'name email');
    
    res.json({ success: true, attendance });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch attendance',
      error: error.message 
    });
  }
});

router.post('/attendance', async (req, res) => {
  try {
    const { studentId, status, mealType } = req.body;
    
    if (!studentId || !status || !mealType) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    const student = await User.findOne({ studentId });
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }
    
    const attendance = new Attendance({
      student: student._id,
      status,
      mealType,
      date: new Date()
    });
    
    await attendance.save();
    await attendance.populate('student', 'name email');
    
    res.json({ 
      success: true, 
      attendance,
      message: 'Attendance marked successfully'
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark attendance',
      error: error.message 
    });
  }
});

// Student routes
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ name: 1 });
    
    res.json({ success: true, students });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch students',
      error: error.message 
    });
  }
});

// ========== USE NEW EXPENSE ROUTES ==========
router.use('/expenses', expenseRoutes);

module.exports = router;