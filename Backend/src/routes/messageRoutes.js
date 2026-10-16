const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
    sendMessage,
    getMessages,
    getUnreadCounts,
    getLastMessage,
    markMessagesAsRead,
} = require("../controllers/messageController");

router.post("/", authMiddleware, sendMessage);
router.get("/unread-counts", authMiddleware, getUnreadCounts);
router.get("/last-message/:userId", authMiddleware, getLastMessage);
router.patch("/read/:senderId", authMiddleware, markMessagesAsRead);
router.get("/:receiverId", authMiddleware, getMessages);

module.exports = router;