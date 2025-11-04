// config/database.js
const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = new Sequelize({
  dialect: process.env.DB_DIALECT || 'sqlite',
  storage: process.env.DB_STORAGE || './crm_db.sqlite',
  logging: false, // optional, to suppress SQL logs
});

module.exports = sequelize;
