/**
 * HealFund Database Seeder
 * Run: node seed.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';

import Hospital from './models/Hospital.js';
import User from './models/User.js';
import Appointment from './models/Appointment.js';
import Queue from './models/Queue.js';
import FinancialCase from './models/FinancialCase.js';
import Message from './models/Message.js';

await connectDB();

// ─── CLEAR ALL COLLECTIONS ─────────────────────────────────────────────────────
await Promise.all([
  Hospital.deleteMany(),
  User.deleteMany(),
  Appointment.deleteMany(),
  Queue.deleteMany(),
  FinancialCase.deleteMany(),
  Message.deleteMany(),
]);
console.log('✅ Cleared all collections');

// ─── HOSPITALS ─────────────────────────────────────────────────────────────────
const hospitals = await Hospital.insertMany([
  {
    hospitalId: 'HOSP-001',
    name: 'Zewditu Memorial Hospital',
    location: 'Addis Ababa, Kirkos',
    level: 'Tertiary / Referral Hospital',
    verified: true,
    departments: ['Cardiology', 'General Surgery', 'Pediatrics', 'Oncology', 'Orthopedics', 'Internal Medicine', 'Neurology'],
    phone: '+251921198350',
  },
]);
console.log(`✅ Seeded ${hospitals.length} hospitals`);

// ─── USERS ─────────────────────────────────────────────────────────────────────
// Use .create() so the pre-save hook hashes the passwords correctly
const users = await Promise.all([
  User.create({
    name: 'Ahmed Kamara',
    email: 'you@example.com',
    password: 'password123',
    age: 42,
    gender: 'Male',
    location: 'Addis Ababa, Lideta',
    patientId: 'HF-0247',
    status: 'Verified',
    role: 'patient',
  }),
  User.create({
    name: 'Dr. Tadesse Bekele',
    email: 'staff@zewditu.gov.et',
    password: 'hospital123',
    role: 'hospital_officer',
    hospitalId: 'HOSP-001',
    hospitalName: 'Zewditu Memorial Hospital',
  }),
  User.create({
    name: 'Dr. M. Worku',
    email: 'admin@zewditu.gov.et',
    password: 'admin123',
    role: 'admin',
    hospitalId: 'HOSP-001',
    hospitalName: 'Zewditu Memorial Hospital',
  }),
  User.create({
    name: 'HealFund Owner',
    email: 'HealFund2006@gmail.com',
    password: 'healFund@2026',
    role: 'admin',
    hospitalId: 'HOSP-001',
    hospitalName: 'Zewditu Memorial Hospital',
  }),
]);
console.log(`✅ Seeded ${users.length} users`);

// ─── QUEUE ─────────────────────────────────────────────────────────────────────
const queue = await Queue.insertMany([
  {
    token: 'C-023',
    patientId: 'HF-0247',
    patientName: 'Ahmed Kamara',
    department: 'Cardiology Clinic (Room 104)',
    assignedDoctor: 'Dr. M. Worku',
    estimatedTime: new Date('2026-08-25T10:00:00Z'),
    status: 'Scheduled',
    urgency: 'High',
    requiredDocuments: ['Medical Records', 'Patient ID Card', 'Lab Reports'],
  },
  {
    token: 'C-024',
    patientId: 'HF-0298',
    patientName: 'Solomon Haile',
    department: 'Cardiology Clinic (Room 104)',
    assignedDoctor: 'Dr. M. Worku',
    estimatedTime: new Date('2026-08-25T10:30:00Z'),
    status: 'Waiting',
    urgency: 'Medium',
    requiredDocuments: ['Medical Records', 'Patient ID Card'],
  },
]);
console.log(`✅ Seeded ${queue.length} queue items`);

// ─── FINANCIAL CASES ───────────────────────────────────────────────────────────
const financialCases = await FinancialCase.insertMany([
  {
    caseId: 'CASE-2026-8801',
    patientId: 'HF-0247',
    patientName: 'Ahmed Kamara',
    age: 42,
    location: 'Addis Ababa, Lideta',
    diagnosis: 'Severe Hypertensive Heart Failure & Valve Procedure',
    verifyingHospital: 'Zewditu Memorial Hospital',
    verifiedByDoctor: 'Dr. M. Worku (Head of Cardiology)',
    verificationStage1: 'Medical Records Verified at Zewditu Memorial Hospital',
    verificationStage2: 'Financial Need Verified by Zewditu Social Work Unit',
    targetAmount: 85000,
    raisedAmount: 0,
    currency: 'ETB',
    description: 'Ahmed is a 42-year-old father of three suffering from acute hypertensive heart failure requiring specialized interventional cardiac care.',
    status: 'Active',
    donorsCount: 0,
  },
  {
    caseId: 'CASE-2026-8805',
    patientId: 'HF-0389',
    patientName: 'Tigist Mersha',
    age: 8,
    location: 'Adama, Oromia',
    diagnosis: 'Pediatric Ventricular Septal Defect Repair',
    verifyingHospital: 'Zewditu Memorial Hospital',
    verifiedByDoctor: 'Dr. Abera Tekle',
    verificationStage1: 'Medical Records Verified at Zewditu Memorial Hospital',
    verificationStage2: 'Financial Assistance Approved',
    targetAmount: 120000,
    raisedAmount: 0,
    currency: 'ETB',
    description: 'Tigist is an 8-year-old student referred for congenital heart defect corrective surgery.',
    status: 'Active',
    donorsCount: 0,
  },
]);
console.log(`✅ Seeded ${financialCases.length} financial cases`);

// ─── MESSAGES ──────────────────────────────────────────────────────────────────
const messages = await Message.insertMany([
  {
    messageId: 'MSG-1001',
    name: 'Selamawit Desta',
    contact: 'selam.desta@gmail.com',
    category: 'Medical File Verification',
    message: 'Hello, I uploaded my medical lab results yesterday for Zewditu Memorial Hospital. Could you please check the verification status?',
    status: 'Unread',
  },
  {
    messageId: 'MSG-1002',
    name: 'Kassahun Belay',
    contact: 'kassahun.b@ethionet.et',
    category: 'Medical File Verification',
    message: 'Inquiring about medical file review timeline at Zewditu Memorial Hospital Cardiology clinic.',
    status: 'Read',
  },
  {
    messageId: 'MSG-1003',
    name: 'Genet Wolde',
    contact: 'genet.w@yahoo.com',
    category: 'Community Agent',
    message: 'My elderly mother cannot travel easily to the hospital. We would appreciate a community health field agent visit in Kirkos / Lideta area.',
    status: 'Unread',
  },
]);
console.log(`✅ Seeded ${messages.length} messages`);

console.log('\n🎉 Database seeded successfully!');
console.log('\nDemo credentials:');
console.log('  Patient  → you@example.com / password123');
console.log('  Staff    → staff@zewditu.gov.et / hospital123');
console.log('  Admin    → admin@zewditu.gov.et / admin123');

await mongoose.disconnect();
process.exit(0);
