/**
 * HealFund Database Seeder
 * Run: node seed.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
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
    phone: '+251-11-551-8085',
  },
  {
    hospitalId: 'HOSP-002',
    name: 'Lideta Health Center',
    location: 'Addis Ababa, Lideta',
    level: 'Primary Health Care Unit',
    verified: true,
    departments: ['Outpatient', 'Emergency Care', 'Maternal & Child Health', 'Basic Diagnostics'],
    phone: '+251-11-553-2211',
  },
  {
    hospitalId: 'HOSP-003',
    name: "St. Paul's Hospital Millennium Medical College",
    location: 'Addis Ababa, Gulele',
    level: 'Specialized Referral Hospital',
    verified: true,
    departments: ['Nephrology', 'Cardiology', 'Surgery', 'Transplant Center'],
    phone: '+251-11-275-0125',
  },
  {
    hospitalId: 'HOSP-004',
    name: 'Tikur Anbessa (Black Lion) Hospital',
    location: 'Addis Ababa, Lideta',
    level: 'National Specialized Hospital',
    verified: true,
    departments: ['Oncology', 'Radiotherapy', 'Pediatric Surgery', 'Trauma'],
    phone: '+251-11-551-1211',
  },
  {
    hospitalId: 'HOSP-005',
    name: 'Yekatit 12 Hospital Medical College',
    location: 'Addis Ababa, Arada',
    level: 'General & Referral Hospital',
    verified: true,
    departments: ['Burn Unit', 'Plastic Surgery', 'General Medicine'],
    phone: '+251-11-123-4567',
  },
]);
console.log(`✅ Seeded ${hospitals.length} hospitals`);

// ─── USERS ─────────────────────────────────────────────────────────────────────
// Note: passwords are hashed by the User model pre-save hook
const users = await User.insertMany([
  {
    name: 'Ahmed Kamara',
    email: 'you@example.com',
    password: await bcrypt.hash('password123', 10),
    age: 42,
    gender: 'Male',
    location: 'Addis Ababa, Lideta',
    patientId: 'HF-0247',
    status: 'Verified',
    role: 'patient',
  },
  {
    name: 'Dr. Tadesse Bekele',
    email: 'staff@lidetahc.gov.et',
    password: await bcrypt.hash('hospital123', 10),
    role: 'hospital_officer',
    hospitalId: 'HOSP-002',
    hospitalName: 'Lideta Health Center',
  },
  {
    name: 'Dr. M. Worku',
    email: 'admin@zewditu.gov.et',
    password: await bcrypt.hash('admin123', 10),
    role: 'admin',
    hospitalId: 'HOSP-001',
    hospitalName: 'Zewditu Memorial Hospital',
  },
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
    requiredDocuments: ['Medical Records', 'ID / QR Card', 'Lab Reports'],
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
    requiredDocuments: ['Medical Records', 'ID / QR Card'],
  },
]);
console.log(`✅ Seeded ${queue.length} queue items`);

// ─── APPOINTMENTS ──────────────────────────────────────────────────────────────
const appointments = await Appointment.insertMany([
  {
    appointmentId: 'APT-1001',
    patientId: 'HF-0247',
    patientName: 'Ahmed Kamara',
    hospitalName: 'Zewditu Memorial Hospital',
    doctorName: 'Dr. M. Worku',
    department: 'Cardiology',
    datetime: new Date('2026-08-25T10:00:00Z'),
    status: 'Confirmed',
    queueToken: 'C-023',
  },
  {
    appointmentId: 'APT-1002',
    patientId: 'HF-0247',
    patientName: 'Ahmed Kamara',
    hospitalName: 'Zewditu Memorial Hospital',
    doctorName: 'Dr. S. Alemu',
    department: 'Follow-up Clinic',
    datetime: new Date('2026-09-02T14:30:00Z'),
    status: 'Pending',
    queueToken: 'C-048',
  },
]);
console.log(`✅ Seeded ${appointments.length} appointments`);

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
    verificationStage1: 'Medical Records Verified (Lideta HC → Zewditu)',
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
    verificationStage1: 'Medical Records Verified (Adama Hospital → Zewditu)',
    verificationStage2: 'Financial Assistance Approved',
    targetAmount: 120000,
    raisedAmount: 0,
    currency: 'ETB',
    description: 'Tigist is an 8-year-old student referred from Adama for congenital heart defect corrective surgery.',
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
    message: 'Hello, I uploaded my medical lab results yesterday from Lideta clinic. Could you please check the verification status?',
    status: 'Unread',
  },
  {
    messageId: 'MSG-1002',
    name: 'Kassahun Belay',
    contact: 'kassahun.b@ethionet.et',
    category: 'Medical File Verification',
    message: 'Inquiring about medical file transfer timeline from Tikur Anbessa to Zewditu Memorial Hospital Cardiology clinic.',
    status: 'Read',
  },
  {
    messageId: 'MSG-1003',
    name: 'Genet Wolde',
    contact: 'genet.w@yahoo.com',
    category: 'Community Agent',
    message: 'My elderly mother cannot travel easily to the hospital. We would appreciate a community health field agent visit in Lideta area.',
    status: 'Unread',
  },
]);
console.log(`✅ Seeded ${messages.length} messages`);

console.log('\n🎉 Database seeded successfully!');
console.log('\nDemo credentials:');
console.log('  Patient  → you@example.com / password123');
console.log('  Staff    → staff@lidetahc.gov.et / hospital123');
console.log('  Admin    → admin@zewditu.gov.et / admin123');

await mongoose.disconnect();
process.exit(0);
