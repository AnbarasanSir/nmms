import fs from 'fs';
import path from 'path';

// Prepares seed SQL for all PYQ papers and Subject Unit Banks
function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

async function generateSeedSql() {
  const outputFile = path.join(process.cwd(), 'd1-seed-data.sql');
  const stream = fs.createWriteStream(outputFile, { encoding: 'utf-8' });

  stream.write('-- Auto-generated D1 Seed Data for NMMS Exam Portal\n\n');

  // 1. Seed Authorized Students
  stream.write('-- 1. Students\n');
  const studentsFile = path.join(process.cwd(), 'students.json');
  if (fs.existsSync(studentsFile)) {
    const students = JSON.parse(fs.readFileSync(studentsFile, 'utf-8'));
    for (const s of students) {
      stream.write(
        `INSERT OR IGNORE INTO students (exam_number, student_name, school) VALUES ('${escapeSql(s.examNumber)}', '${escapeSql(s.studentName)}', '${escapeSql(s.school || 'GHS Kadayam')}');\n`
      );
    }
  }

  // 2. Seed PYQ Papers
  stream.write('\n-- 2. Previous Year Papers (Quizzes)\n');
  const pyqDir = path.join(process.cwd(), 'assets', 'pyq', 'data');
  if (fs.existsSync(pyqDir)) {
    const pyqFiles = fs.readdirSync(pyqDir).filter((f) => f.endsWith('.json'));
    for (const file of pyqFiles) {
      const match = file.match(/^(mat|sat)(\d{4})\.json$/i);
      if (!match) continue;

      const type = match[1].toUpperCase() as 'MAT' | 'SAT';
      const year = parseInt(match[2], 10);
      const paperId = `pyq-${year}-${type.toLowerCase()}`;
      const rawData = JSON.parse(fs.readFileSync(path.join(pyqDir, file), 'utf-8'));
      if (!Array.isArray(rawData)) continue;

      const title =
        type === 'MAT'
          ? `NMMS ${year} - MAT (மனத்திறன் தேர்வு - Mental Ability Test)`
          : `NMMS ${year} - SAT (படிப்பறிவுத் திறன் தேர்வு - Scholastic Aptitude Test)`;

      const description =
        type === 'MAT'
          ? `Official NMMS ${year} Mental Ability Test (MAT) with 90 official previous year questions.`
          : `Official NMMS ${year} Scholastic Aptitude Test (SAT) covering Mathematics, Science, and Social Science.`;

      const optionLetters = ['A', 'B', 'C', 'D'];
      const questions = rawData.map((raw: any, index: number) => {
        let subject = 'MAT';
        let topic = 'மனத்திறன் தேர்வு (MAT)';
        const qNum = typeof raw.id === 'number' ? raw.id : index + 1;

        if (type === 'SAT') {
          if (qNum <= 110) {
            subject = 'SAT_MATHS';
            topic = 'கணிதம் (Mathematics)';
          } else if (qNum <= 145) {
            subject = 'SAT_SCIENCE';
            topic = 'அறிவியல் (Science)';
          } else {
            subject = 'SAT_SOCIAL';
            topic = 'சமூக அறிவியல் (Social Science)';
          }
        }

        const rawOpts = Array.isArray(raw.options) ? raw.options : [];
        const options = optionLetters.map((letter, idx) => ({
          id: letter,
          text: String(rawOpts[idx] !== undefined ? rawOpts[idx] : `Option ${letter}`),
        }));

        let correctOption = 'A';
        if (typeof raw.correct === 'number') {
          if (raw.correct >= 0 && raw.correct <= 3) correctOption = optionLetters[raw.correct];
          else if (raw.correct >= 1 && raw.correct <= 4) correctOption = optionLetters[raw.correct - 1];
        } else if (typeof raw.correct === 'string') {
          const uc = raw.correct.trim().toUpperCase();
          if (['A', 'B', 'C', 'D'].includes(uc)) correctOption = uc;
        }

        let questionImage = undefined;
        if (raw.image && typeof raw.image === 'string' && raw.image.trim()) {
          let img = raw.image.trim().replace(/^\/+/, '');
          if (!img.startsWith('assets/')) img = `assets/pyq/${img}`;
          questionImage = `/${img}`;
        }

        return {
          id: `${paperId}-q${qNum}`,
          subject,
          topic,
          questionText: raw.question || `Question ${qNum}`,
          questionImage,
          options,
          correctOption,
          explanation: raw.explanation || '',
          marks: 1,
          negativeMarks: 0,
        };
      });

      const questionsJson = escapeSql(JSON.stringify(questions));
      stream.write(
        `INSERT OR REPLACE INTO quizzes (id, title, description, duration_minutes, total_marks, pass_percentage, shuffle_questions, shuffle_options, enable_anti_cheat, status, questions, created_at) VALUES ('${paperId}', '${escapeSql(title)}', '${escapeSql(description)}', 90, ${questions.length}, 40, 0, 0, 1, 'draft', '${questionsJson}', '${year}-01-01T00:00:00.000Z');\n`
      );
    }
  }

  // 3. Seed Unit Question Banks
  stream.write('\n-- 3. Unit Question Banks\n');
  const subjectFolders = [
    { sub: 'MAT', folder: 'matquiz' },
    { sub: 'SAT_MATHS', folder: 'satmaths' },
    { sub: 'SAT_SCIENCE', folder: 'satscience' },
    { sub: 'SAT_SOCIAL', folder: 'satsocial' },
  ];

  for (const { sub, folder } of subjectFolders) {
    const dataDir = path.join(process.cwd(), 'assets', folder, 'data');
    if (!fs.existsSync(dataDir)) continue;

    const files = fs.readdirSync(dataDir).filter((f) => f.match(/^unit\d+\.json$/i));
    for (const file of files) {
      const match = file.match(/^unit(\d+)\.json$/i);
      if (!match) continue;

      const unitNum = parseInt(match[1], 10);
      const rawData = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
      if (!Array.isArray(rawData) || rawData.length === 0) continue;

      const key = `${sub}_${unitNum}`;
      const optionLetters = ['A', 'B', 'C', 'D'];
      const questions = rawData.map((raw: any, index: number) => {
        const qIdNum = typeof raw.id === 'number' ? raw.id : index + 1;
        const rawOpts = Array.isArray(raw.options) ? raw.options : [];
        const options = optionLetters.map((letter, idx) => ({
          id: letter,
          text: String(rawOpts[idx] !== undefined ? rawOpts[idx] : `விருப்பம் ${letter}`),
        }));

        let correctOption = 'A';
        if (typeof raw.correct === 'number') {
          if (raw.correct >= 0 && raw.correct <= 3) correctOption = optionLetters[raw.correct];
          else if (raw.correct >= 1 && raw.correct <= 4) correctOption = optionLetters[raw.correct - 1];
        } else if (typeof raw.correct === 'string') {
          const uc = raw.correct.trim().toUpperCase();
          if (['A', 'B', 'C', 'D'].includes(uc)) correctOption = uc;
        }

        let questionImage = undefined;
        if (raw.image && typeof raw.image === 'string' && raw.image.trim()) {
          const trimmed = raw.image.trim().replace(/^\/+/, '');
          questionImage = `/assets/${folder}/image/unit${unitNum}/${trimmed}`;
        }

        return {
          id: `unit-${folder}-${unitNum}-q${qIdNum}`,
          subject: sub,
          topic: `Unit ${unitNum}`,
          questionText: raw.question || `வினா ${qIdNum}`,
          questionImage,
          options,
          correctOption,
          explanation: raw.explanation || '',
          marks: 1,
          negativeMarks: 0,
        };
      });

      const questionsJson = escapeSql(JSON.stringify(questions));
      stream.write(
        `INSERT OR REPLACE INTO unit_bank (key, subject, unit_number, questions, updated_at) VALUES ('${key}', '${sub}', ${unitNum}, '${questionsJson}', datetime('now'));\n`
      );
    }
  }

  stream.end();
  console.log('Seed SQL file generated successfully: d1-seed-data.sql');
}

generateSeedSql();

