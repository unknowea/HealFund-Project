import express from 'express';
import { randomUUID } from 'crypto';
import FinancialCase, { getConfirmedAccounting } from '../models/FinancialCase.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

const chapaRequest = async (url, options = {}) => {
  if (!process.env.CHAPA_SECRET_KEY) {
    throw new Error('Online donations are not configured yet');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status === 'failed') {
    const details = data.message && typeof data.message === 'object'
      ? Object.values(data.message).flat().join(', ')
      : data.message;
    throw new Error(details || 'Chapa payment request failed');
  }
  return data;
};

const serializePublicCase = (financialCase) => {
  const data = financialCase.toObject ? financialCase.toObject() : { ...financialCase };
  Object.assign(data, getConfirmedAccounting(data));
  delete data.donations;
  return data;
};

const reconcileAccounting = async (caseId) => {
  const donationList = { $ifNull: ['$donations', []] };
  const paidDonations = {
    $filter: {
      input: donationList,
      as: 'donation',
      cond: {
        $or: [
          { $eq: ['$$donation.status', 'Paid'] },
          { $eq: ['$$donation.paymentStatus', 'success'] },
        ],
      },
    },
  };
  const pendingDonations = {
    $filter: {
      input: donationList,
      as: 'donation',
      cond: {
        $or: [
          {
            $and: [
              { $eq: ['$$donation.status', 'Pending'] },
              { $gt: ['$$donation.expiresAt', new Date()] },
            ],
          },
          {
            $and: [
              { $eq: ['$$donation.paymentStatus', 'pending'] },
              { $gt: ['$$donation.donatedAt', new Date(Date.now() - 60 * 60 * 1000)] },
            ],
          },
        ],
      },
    },
  };

  await FinancialCase.updateOne({ caseId }, [{
    $set: {
      raisedAmount: { $sum: { $map: { input: paidDonations, as: 'donation', in: '$$donation.amount' } } },
      pendingAmount: { $sum: { $map: { input: pendingDonations, as: 'donation', in: '$$donation.amount' } } },
      donorsCount: { $size: paidDonations },
    },
  }]);
};

const expireDonation = async (caseId, donation) => {
  if (donation.txRef && donation.status === 'Pending') {
    await FinancialCase.updateOne(
      { caseId, donations: { $elemMatch: { txRef: donation.txRef, status: 'Pending' } } },
      {
        $set: {
          'donations.$[donation].status': 'Expired',
          'donations.$[donation].paymentStatus': 'failed',
        },
      },
      { arrayFilters: [{ 'donation.txRef': donation.txRef, 'donation.status': 'Pending' }] }
    );
  } else if (donation.chapaTxRef && donation.paymentStatus === 'pending') {
    await FinancialCase.updateOne(
      { caseId, donations: { $elemMatch: { chapaTxRef: donation.chapaTxRef, paymentStatus: 'pending' } } },
      {
        $set: {
          'donations.$[donation].status': 'Expired',
          'donations.$[donation].paymentStatus': 'failed',
        },
      },
      { arrayFilters: [{ 'donation.chapaTxRef': donation.chapaTxRef, 'donation.paymentStatus': 'pending' }] }
    );
  }
};

const verifyAndSettleDonation = async (txRef) => {
  if (!process.env.CHAPA_SECRET_KEY) {
    return { statusCode: 503, body: { success: false, message: 'Online donations are not configured yet' } };
  }

  const financialCase = await FinancialCase.findOne({
    $or: [{ 'donations.txRef': txRef }, { 'donations.chapaTxRef': txRef }],
  });
  const donation = financialCase?.donations.find((item) => item.txRef === txRef || item.chapaTxRef === txRef);
  if (!financialCase || !donation) {
    return { statusCode: 404, body: { success: false, message: 'Donation checkout not found' } };
  }

  const isPaid = donation.status === 'Paid' || donation.paymentStatus === 'success';
  const isPending = donation.status === 'Pending' || donation.paymentStatus === 'pending';
  const expiresAt = donation.expiresAt || new Date(new Date(donation.donatedAt || 0).getTime() + 60 * 60 * 1000);
  if (isPaid) {
    return { statusCode: 200, body: { success: true, status: 'Paid', case: serializePublicCase(financialCase) } };
  }
  if (!isPending && donation.status !== 'Expired') {
    return { statusCode: 409, body: { success: false, status: donation.status, message: 'This checkout is no longer payable' } };
  }

  const verification = await chapaRequest(
    `https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(txRef)}`
  );
  const transaction = verification.data;
  if (!transaction) {
    return { statusCode: 502, body: { success: false, message: 'Payment verification failed' } };
  }
  if (transaction.status !== 'success') {
    if (expiresAt <= new Date()) {
      await expireDonation(financialCase.caseId, donation);
      await reconcileAccounting(financialCase.caseId);
      return { statusCode: 410, body: { success: false, status: 'Expired', message: 'This checkout has expired' } };
    }
    return { statusCode: 200, body: { success: true, status: 'Pending', message: 'Payment has not been confirmed yet' } };
  }
  if (transaction.tx_ref !== txRef || Number(transaction.amount) !== donation.amount || transaction.currency !== 'ETB') {
    return { statusCode: 409, body: { success: false, message: 'Payment details did not match this donation' } };
  }

  const isReservedByCurrentFlow = donation.status === 'Pending' && Boolean(donation.txRef);
  const donationSelector = isReservedByCurrentFlow
    ? { txRef, status: 'Pending' }
    : { chapaTxRef: txRef, paymentStatus: 'pending' };
  const arrayFilter = isReservedByCurrentFlow
    ? { 'donation.txRef': txRef, 'donation.status': 'Pending' }
    : { 'donation.chapaTxRef': txRef, 'donation.paymentStatus': 'pending' };
  const settleFilter = {
    caseId: financialCase.caseId,
    donations: { $elemMatch: donationSelector },
  };
  if (!isReservedByCurrentFlow) {
    settleFilter.$expr = {
      $lte: [
        { $add: [{ $ifNull: ['$raisedAmount', 0] }, { $ifNull: ['$pendingAmount', 0] }, donation.amount] },
        '$targetAmount',
      ],
    };
  }

  const settledCase = await FinancialCase.findOneAndUpdate(
    settleFilter,
    {
      $set: {
        'donations.$[donation].status': 'Paid',
        'donations.$[donation].paymentStatus': 'success',
        'donations.$[donation].paidAt': new Date(),
      },
      $inc: {
        raisedAmount: donation.amount,
        pendingAmount: isReservedByCurrentFlow ? -donation.amount : 0,
        donorsCount: 1,
      },
    },
    { new: true, arrayFilters: [arrayFilter] }
  );
  if (!settledCase) {
    const currentCase = await FinancialCase.findById(financialCase._id);
    const alreadyPaid = currentCase?.donations.some((item) => (
      (item.txRef === txRef || item.chapaTxRef === txRef) &&
      (item.status === 'Paid' || item.paymentStatus === 'success')
    ));
    if (alreadyPaid) {
      return { statusCode: 200, body: { success: true, status: 'Paid', case: serializePublicCase(currentCase) } };
    }
    return { statusCode: 409, body: { success: false, message: 'Payment was confirmed but could not be added to the case goal. Contact support.' } };
  }

  await FinancialCase.updateOne(
    { _id: settledCase._id, $expr: { $gte: ['$raisedAmount', '$targetAmount'] } },
    [{ $set: { raisedAmount: { $min: ['$raisedAmount', '$targetAmount'] }, status: 'Funded' } }]
  );
  const updatedCase = await FinancialCase.findById(settledCase._id);
  return { statusCode: 200, body: { success: true, status: 'Paid', case: serializePublicCase(updatedCase) } };
};

const handlePaymentCallback = async (req, res) => {
  try {
    const txRef = req.params.txRef || req.query.tx_ref || req.query.trx_ref || req.body?.tx_ref || req.body?.trx_ref;
    if (!txRef) return res.status(400).json({ success: false, message: 'Transaction reference is required' });
    const result = await verifyAndSettleDonation(String(txRef));
    res.status(result.statusCode).json(result.body);
  } catch (err) {
    res.status(502).json({ success: false, message: err.message || 'Could not verify payment' });
  }
};

router.get('/', async (req, res) => {
  try {
    const cases = await FinancialCase.find({ status: 'Active' }).sort({ createdAt: -1 });
    res.json({ success: true, cases: cases.map(serializePublicCase) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', protect, requireRole('admin', 'hospital_officer'), async (req, res) => {
  try {
    const financialCase = await FinancialCase.create(req.body);
    res.status(201).json({ success: true, case: financialCase });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/:id/donate', async (req, res) => {
  let txRef;
  let reservedCase;
  let amount;
  try {
    const { amount: requestedAmount, donorName } = req.body;
    const email = req.body.email || req.body.donorEmail;
    amount = Number(requestedAmount);
    if (!Number.isFinite(amount) || amount < 1 || Math.round(amount * 100) !== amount * 100) {
      return res.status(400).json({ success: false, message: 'Valid donation amount required' });
    }
    if (!donorName?.trim()) {
      return res.status(400).json({ success: false, message: 'Donor name is required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) {
      return res.status(400).json({ success: false, message: 'A valid email is required for checkout' });
    }
    if (!process.env.CHAPA_SECRET_KEY) {
      return res.status(503).json({ success: false, message: 'Online donations are not configured yet' });
    }

    const now = new Date();
    const financialCase = await FinancialCase.findOne({ caseId: req.params.id, status: 'Active' });
    if (!financialCase) {
      return res.status(404).json({ success: false, message: 'Active case not found' });
    }
    for (const donation of financialCase.donations) {
      const donationExpiry = donation.expiresAt || new Date(new Date(donation.donatedAt || 0).getTime() + 60 * 60 * 1000);
      if ((donation.status === 'Pending' || donation.paymentStatus === 'pending') && donationExpiry <= now) {
        await expireDonation(financialCase.caseId, donation);
      }
    }
    await reconcileAccounting(financialCase.caseId);

    txRef = `HF-${randomUUID()}`;
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    reservedCase = await FinancialCase.findOneAndUpdate(
      {
        caseId: req.params.id,
        status: 'Active',
        $expr: {
          $lte: [
            { $add: [{ $ifNull: ['$raisedAmount', 0] }, { $ifNull: ['$pendingAmount', 0] }, amount] },
            '$targetAmount',
          ],
        },
      },
      {
        $inc: { pendingAmount: amount },
        $push: {
          donations: {
            donorName: donorName.trim(),
            donorEmail: email.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            txRef,
            chapaTxRef: txRef,
            amount,
            paymentMethod: 'Chapa',
            paymentStatus: 'pending',
            status: 'Pending',
            donatedAt: now,
            expiresAt,
          },
        },
      },
      { new: true }
    );
    if (!reservedCase) {
      return res.status(409).json({ success: false, message: 'This amount exceeds the remaining case goal' });
    }

    const [firstName, ...lastNameParts] = donorName.trim().split(/\s+/);
    const defaultReturnUrl = process.env.NODE_ENV === 'production'
      ? 'https://healfund.onrender.com'
      : 'http://localhost:3000';
    const returnUrl = new URL('/', process.env.CHAPA_RETURN_URL || process.env.USER_FRONTEND_URL || defaultReturnUrl);
    returnUrl.searchParams.set('payment', 'return');
    returnUrl.searchParams.set('tx_ref', txRef);
    const callbackUrl = process.env.CHAPA_CALLBACK_URL || (process.env.BACKEND_PUBLIC_URL
      ? `${process.env.BACKEND_PUBLIC_URL.replace(/\/$/, '')}/api/financial-cases/callback`
      : undefined);
    const chapaResponse = await chapaRequest('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        amount: amount.toFixed(2),
        currency: 'ETB',
        email: email.trim().toLowerCase(),
        first_name: firstName,
        last_name: lastNameParts.join(' ') || firstName,
        tx_ref: txRef,
        return_url: returnUrl.toString(),
        ...(callbackUrl ? { callback_url: callbackUrl } : {}),
        customization: { title: 'HealFund', description: `Donation for ${reservedCase.patientName}` },
      }),
    });
    const checkoutUrl = chapaResponse?.data?.checkout_url;
    if (!checkoutUrl) throw new Error('Chapa did not return a checkout URL');
    res.status(201).json({ success: true, checkoutUrl, txRef });
  } catch (err) {
    if (reservedCase && txRef) {
      const donation = reservedCase.donations.find((item) => item.txRef === txRef);
      await FinancialCase.updateOne(
        { caseId: req.params.id, donations: { $elemMatch: { txRef, status: 'Pending' } } },
        {
          $set: { 'donations.$[donation].status': 'Failed', 'donations.$[donation].paymentStatus': 'failed' },
          $inc: { pendingAmount: -(donation?.amount || amount) },
        },
        { arrayFilters: [{ 'donation.txRef': txRef, 'donation.status': 'Pending' }] }
      );
    }
    res.status(502).json({ success: false, message: err.message || 'Could not start payment checkout' });
  }
});

router.post('/donations/:txRef/verify', handlePaymentCallback);
router.get('/callback', handlePaymentCallback);
router.post('/callback', handlePaymentCallback);
router.get('/chapa/callback', handlePaymentCallback);
router.post('/chapa/callback', handlePaymentCallback);

router.get('/:id/donate/verify', async (req, res) => {
  try {
    const txRef = String(req.query.tx_ref || '');
    if (!txRef) return res.status(400).json({ success: false, message: 'Transaction reference is required' });
    const result = await verifyAndSettleDonation(txRef);
    res.status(result.statusCode).json({ ...result.body, paid: result.body.status === 'Paid' });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message || 'Could not verify payment' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const financialCase = await FinancialCase.findOne({ caseId: req.params.id });
    if (!financialCase) return res.status(404).json({ success: false, message: 'Case not found' });
    res.json({ success: true, case: serializePublicCase(financialCase) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;