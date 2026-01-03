const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');

// @route   POST /api/expenses
// @desc    Create a new expense
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { description, amount, category, date } = req.body;

    // Validation
    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      });
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required (greater than 0)'
      });
    }

    // Create expense
    const expense = new Expense({
      description: description.trim(),
      amount: parsedAmount,
      category: category || 'food',
      date: date ? new Date(date) : new Date()
    });

    await expense.save();

    res.status(201).json({
      success: true,
      data: expense,
      message: 'Expense created successfully'
    });

  } catch (error) {
    console.error('Create expense error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/expenses
// @desc    Get all expenses
// @access  Public
router.get('/', async (req, res) => {
  try {
    const expenses = await Expense.find()
      .sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      count: expenses.length,
      data: expenses,
      message: 'Expenses retrieved successfully'
    });

  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/expenses/:id
// @desc    Get single expense
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: expense,
      message: 'Expense retrieved successfully'
    });

  } catch (error) {
    console.error('Get expense error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update expense
// @access  Public
router.put('/:id', async (req, res) => {
  try {
    const { description, amount, category, date } = req.body;

    // Build update object
    const updateFields = {};
    if (description) updateFields.description = description.trim();
    if (amount) updateFields.amount = parseFloat(amount);
    if (category) updateFields.category = category;
    if (date) updateFields.date = new Date(date);

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: expense,
      message: 'Expense updated successfully'
    });

  } catch (error) {
    console.error('Update expense error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: {},
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Delete expense error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/expenses/stats/summary
// @desc    Get expense summary
// @access  Public
router.get('/stats/summary', async (req, res) => {
  try {
    const expenses = await Expense.find();
    
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Group by category
    const categoryStats = expenses.reduce((acc, expense) => {
      const category = expense.category;
      if (!acc[category]) {
        acc[category] = { total: 0, count: 0 };
      }
      acc[category].total += expense.amount;
      acc[category].count += 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalAmount,
        totalCount: expenses.length,
        categoryStats,
        averageAmount: expenses.length > 0 ? totalAmount / expenses.length : 0
      },
      message: 'Summary retrieved successfully'
    });

  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;