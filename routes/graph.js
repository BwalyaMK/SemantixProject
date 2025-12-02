const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.json({ message: "Graph route ready" });
});

module.exports = router;
