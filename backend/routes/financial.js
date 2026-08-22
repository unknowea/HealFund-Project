import express from 'express';
import FinancialCase from '../models/FinancialCase.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

const chapaRequest = async (url, options = {}) => {
  if (!process.env.CHAPA_SECRET_KEY)
    throw new Error('Chapa is not configured. Set CHAPA_SECRET_KEY in backend/.env');

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok || data.status === 'failed') {
    const details = typeof data.message === 'object'
      ? Object.values(data.message).flat().join(', ')
      : data.message;
    throw new Error(details || 'Chapa payment request failed');
  }
  return data;
};

const applySuccessfulDonation = async (financialCase, donation, status) => {
  if (donation.paymentStatus === 'success') return false;

  donation.paymentStatus = status === 'success' ? 'success' : 'failed';
  if (donation.paymentStatus !== 'success') return false;

  const remaining = financialCase.targetAmount - financialCase.raisedAmount;
  if (remaining <= 0) return false;
  const actualDonation = Math.min(donation.amount, remaining);
  donation.amount = actualDonation;
  financialCase.raisedAmount += actualDonation;
  financialCase.donorsCount += 1;
  if (financialCase.raisedAmount >= financialCase.targetAmount) {
    financialCase.raisedAmount = financialCase.targetAmount;
    financialCase.status = 'Funded';
  }
  return true;
};

const serializePublicCase = (financialCase) => {
  const data = financialCase.toObject ? financialCase.toObject() : { ...financialCase };
  delete data.donations;
  return data;
};
// GET /api/financial-cases — public
router.get('/', async (req, res) => {
  try {
    const cases = await FinancialCase.find({ status: 'Active' }).sort({ createdAt: -1 });
    res.json({ success: true, cases: cases.map(serializePublicCase) });
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

// GET /api/financial-cases/chapa/callback — Chapa server callback
router.get('/chapa/callback', async (req, res) => {
  try {
    const { tx_ref: txRef } = req.query;
    if (!txRef) return res.status(400).json({ success: false, message: 'Transaction reference is required' });
    const verification = await chapaRequest(`https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(txRef)}`);
    const financialCase = await FinancialCase.findOne({ 'donations.chapaTxRef': txRef });
    if (!financialCase) return res.status(404).json({ success: false, message: 'Donation not found' });
    const donation = financialCase.donations.find((item) => item.chapaTxRef === txRef);
    await applySuccessfulDonation(financialCase, donation, verification.data?.status);
    await financialCase.save();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/financial-cases/:id/donate — initialize Chapa checkout
router.post('/:id/donate', async (req, res) => {
  try {
    const { amount, donorName, donorEmail } = req.body;
    const donationVal = parseFloat(amount);
    if (!donationVal || donationVal <= 0)
      return res.status(400).json({ success: false, message: 'Valid donation amount required' });
    if (!donorName?.trim())
      return res.status(400).json({ success: false, message: 'Donor name is required' });
    if (!donorEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail.trim()))
      return res.status(400).json({ success: false, message: 'Donor email is required' });

    const financialCase = await FinancialCase.findOne({ caseId: req.params.id });
    if (!financialCase)
      return res.status(404).json({ success: false, message: 'Case not found' });
    if (financialCase.status !== 'Active')
      return res.status(400).json({ success: false, message: 'This case is no longer active' });

    const remaining = financialCase.targetAmount - financialCase.raisedAmount;
    if (remaining <= 0)
      return res.status(400).json({ success: false, message: 'This case is already fully funded' });

    const actualDonation = Math.min(donationVal, remaining);
    const txRef = `HEALFUND-${financialCase.caseId}-${Date.now()}`;
    const callbackUrl = process.env.CHAPA_CALLBACK_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/financial-cases/chapa/callback`;
    const returnUrl = process.env.CHAPA_RETURN_URL || `${process.env.USER_FRONTEND_URL || 'http://localhost:3000'}/?payment=return`;
    const chapaResponse = await chapaRequest('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        amount: actualDonation.toFixed(2),
        currency: 'ETB',
        email: donorEmail.trim(),
        first_name: donorName.trim().split(/\s+/)[0],
        last_name: donorName.trim().split(/\s+/).slice(1).join(' ') || 'Donor',
        tx_ref: txRef,
        callback_url: callbackUrl,
        return_url: `${returnUrl}&tx_ref=${encodeURIComponent(txRef)}&case_id=${encodeURIComponent(financialCase.caseId)}`,
        customization: { title: 'HealFund Aid', description: `Support ${financialCase.patientName}` },
      }),
    });
    financialCase.donations.push({
      donorName: donorName.trim(),
      donorEmail: donorEmail.trim(),
      amount: actualDonation,
      paymentMethod: 'Chapa',
      chapaTxRef: txRef,
      paymentStatus: 'pending',
    });
    await financialCase.save();
    res.json({
      success: true,
      txRef,
      checkoutUrl: chapaResponse.data?.checkout_url,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/financial-cases/:id/donate/verify?tx_ref=... — confirm return from Chapa
router.get('/:id/donate/verify', async (req, res) => {
  try {
    const { tx_ref: txRef } = req.query;
    const financialCase = await FinancialCase.findOne({ caseId: req.params.id, 'donations.chapaTxRef': txRef });
    if (!financialCase) return res.status(404).json({ success: false, message: 'Donation not found' });
    const donation = financialCase.donations.find((item) => item.chapaTxRef === txRef);
    const verification = await chapaRequest(`https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(txRef)}`);
    const applied = await applySuccessfulDonation(financialCase, donation, verification.data?.status);
    await financialCase.save();
    res.json({ success: true, paid: verification.data?.status === 'success', applied, case: financialCase });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
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

export default router;
