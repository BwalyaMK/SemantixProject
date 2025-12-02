const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Session middleware FIRST
app.use(session({
    secret: "semantix-secret-key",
    resave: false,
    saveUninitialized: false
}));

// Load passport strategies BEFORE using passport middleware
require("./config/passport")(passport);

// Now initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/chat", require("./routes/chat"));
app.use("/graph", require("./routes/graph"));
app.use("/ai", require("./routes/ai"));

// Home page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Server
app.listen(3000, () => console.log("Semantix running at http://localhost:3000"));
