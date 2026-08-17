import express from 'express';
import FinancialCase from '../models/FinancialCase.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/financial-cases — public
router.get('/', async (req, res) => {
  try {
    const cases = await FinancialCase.find({ status: 'Active' }).sort({ createdAt: -1 });
    res.json({ success: true, cases });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/financial-cases/:id — public
router.get('/:id', async (req, res) => {
  try {
    const financialCase = await FinancialCase.findOne({ caseId: req.params.id });
    if (!financialCase)
      return res.status(404).json({ success: false, message: 'Case not found' });
    res.json({ success: true, case: financialCase });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/financial-cases — admin only (create new case)
router.post('/', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const financialCase = await FinancialCase.create(req.body);
    res.status(201).json({ success: true, case: financialCase });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/financial-cases/:id/donate — public
router.post('/:id/donate', async (req, res) => {
  try {
    const { amount, donorName, paymentMethod } = req.body;
    const donationVal = parseFloat(amount);
    if (!donationVal || donationVal <= 0)
      return res.status(400).json({ success: false, message: 'Valid donation amount required' });

    const financialCase = await FinancialCase.findOne({ caseId: req.params.id });
    if (!financialCase)
      return res.status(404).json({ success: false, message: 'Case not found' });
    if (financialCase.status !== 'Active')
      return res.status(400).json({ success: false, message: 'This case is no longer active' });

    financialCase.raisedAmount += donationVal;
    financialCase.donorsCount += 1;
    financialCase.donations.push({
      donorName: donorName || 'Anonymous Supporter',
      amount: donationVal,
      paymentMethod: paymentMethod || 'Telebirr',
    });

    // Auto-close if fully funded
    if (financialCase.raisedAmount >= financialCase.targetAmount) {
      financialCase.status = 'Funded';
    }

    await financialCase.save();

    res.json({
      success: true,
      message: `Thank you ${donorName || 'Supporter'}! Donation of ${donationVal} ETB via ${paymentMethod || 'Telebirr'} processed.`,
      case: financialCase,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
