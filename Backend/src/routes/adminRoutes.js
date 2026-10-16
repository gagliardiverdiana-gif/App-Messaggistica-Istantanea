const express = require("express");
const {
    getPendingRegistrationRequests,
    approveRegistrationRequest,
    rejectRegistrationRequest,
    getAllUsersForAdmin,
    createUserByAdmin,
    deleteUserByAdmin,
} = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.get(
    "/registration-requests/pending",
    authMiddleware,
    adminMiddleware,
    getPendingRegistrationRequests
);

router.put(
    "/registration-requests/:requestId/approve",
    authMiddleware,
    adminMiddleware,
    approveRegistrationRequest
);
router.put(
    "/registration-requests/:requestId/reject",
    authMiddleware,
    adminMiddleware,
    rejectRegistrationRequest
);

router.get(
    "/users",
    authMiddleware,
    adminMiddleware,
    getAllUsersForAdmin
);

router.post(
    "/users",
    authMiddleware,
    adminMiddleware,
    createUserByAdmin
);

router.delete(
    "/users/:userId",
    authMiddleware,
    adminMiddleware,
    deleteUserByAdmin
);

module.exports = router;