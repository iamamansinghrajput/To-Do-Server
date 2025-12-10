const express = require('express');
const router = express.Router();
const DailyReport = require('../models/DailyReport');
const Task = require('../models/Task');
const Expense = require('../models/Expense');

// Get daily report
router.get('/daily/:email/:date', async (req, res) => {
  try {
    const { email, date } = req.params;
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    let report = await DailyReport.findOne({
      userEmail: email.toLowerCase(),
      date: { $gte: startDate, $lte: endDate },
    });

    // If no report exists, create one with current data
    if (!report) {
      const tasks = await Task.find({
        userEmail: email.toLowerCase(),
        date: { $gte: startDate, $lte: endDate },
      });

      const expenses = await Expense.find({
        userEmail: email.toLowerCase(),
        date: { $gte: startDate, $lte: endDate },
      });

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.completed).length;
      const productivityRating = totalTasks > 0 ? (completedTasks / totalTasks) * 5 : 0;
      const totalSpend = expenses.reduce((sum, exp) => sum + exp.amount, 0);

      report = new DailyReport({
        userEmail: email.toLowerCase(),
        date: startDate,
        tasksCreated: totalTasks,
        tasksCompleted: completedTasks,
        productivityRating: Math.round(productivityRating * 100) / 100,
        daySpend: Math.round(totalSpend * 100) / 100,
      });

      await report.save();
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get monthly report
router.get('/monthly/:email/:year/:month', async (req, res) => {
  try {
    const { email, year, month } = req.params;
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

    const reports = await DailyReport.find({
      userEmail: email.toLowerCase(),
      date: { $gte: startDate, $lte: endDate },
    });

    const totalSpend = reports.reduce((sum, r) => sum + r.daySpend, 0);
    const averageSpend = reports.length > 0 ? totalSpend / reports.length : 0;
    const totalCompletedTasks = reports.reduce((sum, r) => sum + r.tasksCompleted, 0);
    const totalTasksCreated = reports.reduce((sum, r) => sum + r.tasksCreated, 0);
    const averageProductivity = reports.length > 0
      ? reports.reduce((sum, r) => sum + r.productivityRating, 0) / reports.length
      : 0;

    const monthlyReport = {
      userEmail: email.toLowerCase(),
      year: parseInt(year),
      month: parseInt(month),
      totalSpend: Math.round(totalSpend * 100) / 100,
      averageSpend: Math.round(averageSpend * 100) / 100,
      totalCompletedTasks,
      totalTasksCreated,
      averageProductivity: Math.round(averageProductivity * 100) / 100,
      daysWithData: reports.length,
      reports: reports,
    };

    res.json(monthlyReport);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

