const jwt = require("jsonwebtoken");

const issueToken = (res, user) => {
  const payload = {
    id: user.user_id,
    role: user.role,
    organizationId: user.org_id,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000,
  });

  return token;
};

module.exports = issueToken;