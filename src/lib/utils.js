import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  // Determine if we're in production
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true, // Prevents XSS attacks
    secure: isProduction, // HTTPS required in production
    sameSite: isProduction ? "none" : "lax", // "none" allows cross-origin
    path: "/", // Cookie available for all paths
  });

  return token;
};