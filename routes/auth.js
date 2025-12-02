const express = require("express");
const router = express.Router();
const passport = require("passport");
const bcrypt = require("bcrypt");
const pool = require("../config/db");

// Signup
router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const hashed = await bcrypt.hash(password, 10);

        await pool.query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, hashed]
        );

        return res.redirect("/index.html");
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Signup failed" });
    }
});

// Login
router.post("/login", passport.authenticate("local", {
    successRedirect: "/index.html",
    failureRedirect: "/login.html"
}));

module.exports = router;
