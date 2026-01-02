const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Menu = require('../models/Menu');
const Attendance = require('../models/Attendance');
const Expense = require('../models/Expense');
const bcrypt = require('bcryptjs');

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

// Login route (without JWT)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if using default credentials
    if (email === DEFAULT_CREDENTIALS.email && password === DEFAULT_CREDENTIALS.password) {
      const user = await User.findOne({ email: DEFAULT_CREDENTIALS.email });
      if (!user) {
        await initializeDefaultAdmin();
      }
      return res.json({
        success: true,
        user: {
          _id: user ? user._id : 'default-admin-id',
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
    
    const isPasswordValid = await user.comparePassword(password);
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Menu routes
router.get('/menu', async (req, res) => {
  try {
    const menu = await Menu.find().sort({ day: 1 });
    res.json({ success: true, menu });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/menu', async (req, res) => {
  try {
    const { day, breakfast, lunch, dinner } = req.body;
    const menuItem = await Menu.findOneAndUpdate(
      { day },
      { breakfast, lunch, dinner },
      { upsert: true, new: true }
    );
    res.json({ success: true, menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
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
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/attendance', async (req, res) => {
  try {
    const { studentId, status, mealType } = req.body;
    const student = await User.findOne({ studentId });
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    const attendance = new Attendance({
      student: student._id,
      status,
      mealType,
      date: new Date()
    });
    
    await attendance.save();
    res.json({ success: true, attendance });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Attendance already marked for this meal' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Expense routes
router.get('/expenses', async (req, res) => {
  try {
    const expenses = await Expense.find()
      .populate('addedBy', 'name')
      .sort({ date: -1 });
    res.json({ success: true, expenses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    const { description, amount, category } = req.body;
    const expense = new Expense({
      description,
      amount,
      category,
      addedBy: req.body.userId || 'default-admin-id',
      date: new Date()
    });
    
    await expense.save();
    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, category } = req.body;
    
    const expense = await Expense.findByIdAndUpdate(
      id,
      { description, amount, category },
      { new: true }
    );
    
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    
    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByIdAndDelete(id);
    
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Student routes
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password');
    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;