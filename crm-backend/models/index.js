const sequelize = require('../config/database');
const Employee = require('./employee');
const Enquiry = require('./enquiry');

module.exports = { sequelize, Employee, Enquiry };
