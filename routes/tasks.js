const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const DailyReport = require('../models/DailyReport');

// Get all tasks for a user by date
router.get('/:email/:date', async (req, res) => {
  try {
    const { email, date } = req.params;
    const normalizedEmail = email.toLowerCase();
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    let tasks = await Task.find({
      userEmail: normalizedEmail,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ createdAt: -1 });

    // If no tasks exist for the requested date, clone the latest day's tasks
    // for this user and reset them to incomplete so they reappear each day.
    if (tasks.length === 0) {
      const lastDayTask = await Task.findOne({
        userEmail: normalizedEmail,
        date: { $lt: startDate },
      }).sort({ date: -1 });

      if (lastDayTask) {
        const previousStart = new Date(lastDayTask.date);
        previousStart.setHours(0, 0, 0, 0);
        const previousEnd = new Date(lastDayTask.date);
        previousEnd.setHours(23, 59, 59, 999);

        const templateTasks = await Task.find({
          userEmail: normalizedEmail,
          date: { $gte: previousStart, $lte: previousEnd },
        }).sort({ createdAt: -1 });

        const clonedTasks = templateTasks.map((task) => ({
          userEmail: task.userEmail,
          title: task.title,
          completed: false,
          date: startDate,
        }));

        if (clonedTasks.length > 0) {
          await Task.insertMany(clonedTasks);
          await updateDailyReport(normalizedEmail, startDate);

          tasks = await Task.find({
            userEmail: normalizedEmail,
            date: { $gte: startDate, $lte: endDate },
          }).sort({ createdAt: -1 });
        }
      }
    }

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  try {
    const { email, title, date } = req.body;
    const taskDate = date ? new Date(date) : new Date();
    taskDate.setHours(0, 0, 0, 0);

    const task = new Task({
      userEmail: email?.toLowerCase(),
      title,
      date: taskDate,
    });

    await task.save();

    // Update daily report
    await updateDailyReport(task.userEmail, taskDate);

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task (mark as completed)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    task.completed = completed !== undefined ? completed : task.completed;
    await task.save();

    // Update daily report
    await updateDailyReport(task.userEmail, task.date);

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const userEmail = task.userEmail;
    const taskDate = task.date;

    await Task.findByIdAndDelete(req.params.id);

    // Update daily report
    await updateDailyReport(userEmail, taskDate);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to update daily report
async function updateDailyReport(userEmail, date) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  const tasks = await Task.find({
    userEmail,
    date: { $gte: startDate, $lte: endDate },
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const productivityRating = totalTasks > 0 ? (completedTasks / totalTasks) * 5 : 0;

  await DailyReport.findOneAndUpdate(
    { userEmail, date: { $gte: startDate, $lte: endDate } },
    {
      userEmail,
      date: startDate,
      tasksCreated: totalTasks,
      tasksCompleted: completedTasks,
      productivityRating: Math.round(productivityRating * 100) / 100,
    },
    { upsert: true, new: true }
  );
}

module.exports = router;

