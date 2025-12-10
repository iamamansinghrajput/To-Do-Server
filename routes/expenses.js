const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const DailyReport = require('../models/DailyReport');

// Get all expenses for a user by date
router.get('/:email/:date', async (req, res) => {
  try {
    const { email, date } = req.params;
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const expenses = await Expense.find({
      userEmail: email.toLowerCase(),
      date: { $gte: startDate, $lte: endDate },
    }).sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new expense
router.post('/', async (req, res) => {
  try {
    const { email, amount, date, description } = req.body;
    const expenseDate = date ? new Date(date) : new Date();
    expenseDate.setHours(0, 0, 0, 0);

    const expense = new Expense({
      userEmail: email?.toLowerCase(),
      amount: parseFloat(amount),
      date: expenseDate,
      description: description || '',
    });

    await expense.save();

    // Update daily report
    await updateDailyReportExpense(expense.userEmail, expenseDate);

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update an expense
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    if (amount !== undefined) expense.amount = parseFloat(amount);
    if (description !== undefined) expense.description = description;
    await expense.save();

    // Update daily report
    await updateDailyReportExpense(expense.userEmail, expense.date);

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an expense
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const userEmail = expense.userEmail;
    const expenseDate = expense.date;

    await Expense.findByIdAndDelete(req.params.id);

    // Update daily report
    await updateDailyReportExpense(userEmail, expenseDate);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to update daily report with expense
async function updateDailyReportExpense(userEmail, date) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  const expenses = await Expense.find({
    userEmail,
    date: { $gte: startDate, $lte: endDate },
  });

  const totalSpend = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  await DailyReport.findOneAndUpdate(
    { userEmail, date: { $gte: startDate, $lte: endDate } },
    {
      userEmail,
      date: startDate,
      daySpend: Math.round(totalSpend * 100) / 100,
    },
    { upsert: true, new: true }
  );
}

module.exports = router;

