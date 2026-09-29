const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const emailOk = (e) => /^\S+@\S+\.\S+$/.test(e);

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role, adminCode } = req.body;

    if (!name || !email || !password || !confirmPassword)
      return res.status(400).json({ message: "All fields are required." });
    if (!["student", "admin"].includes(role))
      return res.status(400).json({ message: "Please choose a role." });
    if (!emailOk(email))
      return res.status(400).json({ message: "Enter a valid email." });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    if (password !== confirmPassword)
      return res.status(400).json({ message: "Passwords do not match." });

    // Admin accounts need the secret code from the .env file
    if (role === "admin") {
      if (!process.env.ADMIN_SECRET_CODE || adminCode !== process.env.ADMIN_SECRET_CODE)
        return res.status(403).json({ message: "Invalid admin secret code." });
    }

    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(400).json({ message: "This email is already registered." });

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashed, role });
    res.status(201).json({ message: "Registration successful! You can now log in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// POST /api/auth/login   (role = which login page was used)
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: "Invalid email or password." });

    if (role && user.role !== role)
      return res.status(403).json({ message: `This is not a ${role} account.` });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    // Never send the password back
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
