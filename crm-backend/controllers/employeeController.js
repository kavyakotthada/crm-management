const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { Employee } = require('../models');
dotenv.config();

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await Employee.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const employee = await Employee.create({ name, email, password: hashed });
    res.status(201).json({ message: 'Employee registered', employee });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const employee = await Employee.findOne({ where: { email } });
    if (!employee) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, employee.password);
    if (!match) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: employee.id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({ message: 'Login successful', token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login };
