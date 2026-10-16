const express = require('express');
const { createRegistrationRequest } = require('../controllers/registrationRequestController');

const router = express.Router();

router.post('/', createRegistrationRequest);

module.exports = router;