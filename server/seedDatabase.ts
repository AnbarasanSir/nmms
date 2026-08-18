import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import Student from './models/Student';
import Quiz from './models/Quiz';
import Attempt from './models/Attempt';
import AdminConfig from './models/AdminConfig';

const DATA_DIR = path.join(process.cwd(), '.data');
const QUIZZES_FILE = path.join(DATA_DIR, 'quizzes.json');
const ATTEMPTS_FILE = path.join(DATA_DIR, 'attempts.json');
const STUDENTS_FILE = path.join(process.cwd(), 'students.json');
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'admin_config.json');

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Seed Students
    if (fs.existsSync(STUDENTS_FILE)) {
      const students = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf-8'));
      for (const s of students) {
        await Student.findOneAndUpdate({ examNumber: s.examNumber }, s, { upsert: true, new: true });
      }
      console.log(`Seeded ${students.length} students`);
    }

    // Seed Quizzes
    if (fs.existsSync(QUIZZES_FILE)) {
      const quizzes = JSON.parse(fs.readFileSync(QUIZZES_FILE, 'utf-8'));
      for (const q of quizzes) {
        await Quiz.findOneAndUpdate({ id: q.id }, q, { upsert: true, new: true });
      }
      console.log(`Seeded ${quizzes.length} quizzes`);
    }

    // Seed Attempts
    if (fs.existsSync(ATTEMPTS_FILE)) {
      const attempts = JSON.parse(fs.readFileSync(ATTEMPTS_FILE, 'utf-8'));
      for (const a of attempts) {
        await Attempt.findOneAndUpdate({ id: a.id }, a, { upsert: true, new: true });
      }
      console.log(`Seeded ${attempts.length} attempts`);
    }

    // Seed Admin Config
    if (fs.existsSync(ADMIN_CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(ADMIN_CONFIG_FILE, 'utf-8'));
      await AdminConfig.findOneAndUpdate({ id: 'admin_config' }, { adminPin: config.adminPin }, { upsert: true, new: true });
      console.log(`Seeded admin config`);
    }

    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
}

seed();
