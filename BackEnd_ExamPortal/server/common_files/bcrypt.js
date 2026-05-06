const bcrypt = require("bcryptjs");

module.exports = {
  hashPassword: (plain) => bcrypt.hash(plain, 10),
  comparePassword: (plain, hashed) => bcrypt.compare(plain, hashed)
};