const express = require('express');
const protect = require('../middlewares/auth');
const {
  createPublicEnquiry,
  getPublicEnquiries,
  getPrivateEnquiries,
  claimEnquiry,
} = require('../controllers/enquiryController');

const router = express.Router();

router.post('/public', createPublicEnquiry);
router.get('/public', protect, getPublicEnquiries);
router.get('/private', protect, getPrivateEnquiries);
router.patch('/:id/claim', protect, claimEnquiry);

module.exports = router;
