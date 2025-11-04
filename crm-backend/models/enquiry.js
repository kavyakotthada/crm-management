const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Employee = require('./employee');

const Enquiry = sequelize.define('Enquiry', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  courseInterest: { type: DataTypes.STRING },
  claimed: { type: DataTypes.BOOLEAN, defaultValue: false },
});

Enquiry.belongsTo(Employee, { foreignKey: 'counselorId' });
Employee.hasMany(Enquiry, { foreignKey: 'counselorId' });

module.exports = Enquiry;
