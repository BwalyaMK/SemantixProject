const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const pool = require("../config/db");

module.exports = function(passport) {

    passport.use(
        new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
            try {
                const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);

                if (rows.length === 0) {
                    return done(null, false, { message: "User not found" });
                }

                const user = rows[0];
                const passwordMatch = await bcrypt.compare(password, user.password);

                if (!passwordMatch) {
                    return done(null, false, { message: "Incorrect password" });
                }

                return done(null, user);
            } catch (err) {
                return done(err);
            }
        })
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
            done(null, rows[0]);
        } catch (err) {
            done(err);
        }
    });
};
