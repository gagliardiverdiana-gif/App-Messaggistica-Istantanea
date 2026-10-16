const express = require("express");
const rateLimit = require("express-rate-limit");
const {
    login,
    logout,
    updateMyStatus,
    changePassword,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Troppi tentativi, riprova tra qualche minuto" },
});

router.post("/login", loginLimiter, login); // La rotta di login non richiede autenticazione, quindi non usiamo authMiddleware
router.post("/logout", authMiddleware, logout); // La rotta di logout richiede autenticazione, quindi usiamo authMiddleware
router.patch("/status", authMiddleware, updateMyStatus); // La rotta per aggiornare lo status richiede autenticazione, quindi usiamo authMiddleware
router.patch("/change-password", authMiddleware, changePassword); // La rotta per cambiare password richiede autenticazione, quindi usiamo authMiddleware

module.exports = router;