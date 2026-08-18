const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf-8');

// 1. Add imports
const imports = `
import mongoose from 'mongoose';
import StudentModel from './server/models/Student';
import QuizModel from './server/models/Quiz';
import AttemptModel from './server/models/Attempt';
import AdminConfigModel from './server/models/AdminConfig';
`;
code = code.replace(/import fs from 'fs';/, "import fs from 'fs';" + imports);

// 2. Replace students data loading
const studentsLoadRegex = /\/\/ Load persisted data or default mocks[\s\S]*?function saveStudents\(\) \{[\s\S]*?\}/;
const newStudentsCode = `// Load persisted data or default mocks
let authorizedStudents: AuthorizedStudent[] = [];

function saveStudents() {
  StudentModel.deleteMany({}).then(() => {
    return StudentModel.insertMany(authorizedStudents);
  }).catch(e => console.error('Failed to save students to DB:', e));
}`;
code = code.replace(studentsLoadRegex, newStudentsCode);

// 3. Replace quizzes and attempts loading
const quizzesLoadRegex = /try \{\s*if \(fs\.existsSync\(QUIZZES_FILE\)\) \{[\s\S]*?quizzes = \[\.\.\.INITIAL_QUIZZES\];\s*attempts = \[\.\.\.INITIAL_ATTEMPTS\];\s*\}/;
code = code.replace(quizzesLoadRegex, "");

// 4. Replace saveQuizzes and saveAttempts
const saveQuizzesRegex = /function saveQuizzes\(\) \{[\s\S]*?\}/;
const newSaveQuizzes = `function saveQuizzes() {
  QuizModel.deleteMany({}).then(() => {
    return QuizModel.insertMany(quizzes);
  }).catch(e => console.error('Failed to save quizzes to DB:', e));
}`;
code = code.replace(saveQuizzesRegex, newSaveQuizzes);

const saveAttemptsRegex = /function saveAttempts\(\) \{[\s\S]*?\}/;
const newSaveAttempts = `function saveAttempts() {
  AttemptModel.deleteMany({}).then(() => {
    return AttemptModel.insertMany(attempts);
  }).catch(e => console.error('Failed to save attempts to DB:', e));
}`;
code = code.replace(saveAttemptsRegex, newSaveAttempts);

// 5. Replace Admin Password loading
const adminPassRegex = /\/\/ 1a\. Admin Authentication[\s\S]*?function saveAdminPassword\(newPassword: string\) \{[\s\S]*?\}/;
const newAdminPass = `// 1a. Admin Authentication & Dynamic Password Management
let currentAdminPassword = process.env.ADMIN_PASSWORD || 'nmms@2026';

function saveAdminPassword(newPassword: string) {
  currentAdminPassword = newPassword;
  AdminConfigModel.findOneAndUpdate({ id: 'admin_config' }, { adminPin: newPassword }, { upsert: true })
    .then(() => console.log('Admin password updated in DB.'))
    .catch(e => console.error('Failed to persist admin password:', e));
}`;
code = code.replace(adminPassRegex, newAdminPass);

// 6. Update start() function
const startRegex = /async function start\(\) \{/;
const newStart = `async function start() {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB in start()');
      
      const dbStudents = await StudentModel.find().lean();
      if (dbStudents.length > 0) authorizedStudents = dbStudents as any;
      else authorizedStudents = [...AUTHORIZED_STUDENTS];

      const dbQuizzes = await QuizModel.find().lean();
      if (dbQuizzes.length > 0) quizzes = dbQuizzes as any;
      else quizzes = [...INITIAL_QUIZZES];

      const dbAttempts = await AttemptModel.find().lean();
      if (dbAttempts.length > 0) attempts = dbAttempts as any;
      else attempts = [...INITIAL_ATTEMPTS];

      const dbAdmin = await AdminConfigModel.findOne({ id: 'admin_config' }).lean();
      if (dbAdmin && dbAdmin.adminPin) currentAdminPassword = dbAdmin.adminPin;

    } else {
      console.warn('No MONGODB_URI found, using defaults.');
      authorizedStudents = [...AUTHORIZED_STUDENTS];
      quizzes = [...INITIAL_QUIZZES];
      attempts = [...INITIAL_ATTEMPTS];
    }
  } catch (e) {
    console.error('Failed to load from MongoDB:', e);
  }
`;
code = code.replace(startRegex, newStart);

fs.writeFileSync('server.ts', code);
console.log('server.ts refactored!');
