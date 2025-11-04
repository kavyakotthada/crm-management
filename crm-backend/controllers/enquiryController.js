const { Enquiry } = require('../models');

exports.createPublicEnquiry = async (req, res) => {
  try {
    const { name, email, courseInterest } = req.body;
    const enquiry = await Enquiry.create({ name, email, courseInterest });
    res.status(201).json({ message: 'Enquiry submitted', enquiry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPublicEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.findAll({ where: { claimed: false } });
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPrivateEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.findAll({ where: { counselorId: req.user } });
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.claimEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findByPk(req.params.id);
    if (!enquiry) return res.status(404).json({ message: 'Enquiry not found' });
    if (enquiry.claimed)
      return res.status(409).json({ message: 'Already claimed' });

    enquiry.claimed = true;
    enquiry.counselorId = req.user;
    await enquiry.save();

    res.json({ message: 'Enquiry claimed', enquiry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
module.exports = { register, login };