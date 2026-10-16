const express = require("express");
const {
    getApprovedUsers,
    getMyProfile,
    updateMyProfile,
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authMiddleware, getMyProfile);
router.put("/me", authMiddleware, updateMyProfile);
router.get("/", authMiddleware, getApprovedUsers);

module.exports = router;