import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const matUnits = [
  "எண் தொடர்கள் (Number Series)",
  "எழுத்துத் தொடர்கள் (Letter Series)",
  "ஒப்புமை (Analogy)",
  "மாறுபட்டதை தேர்ந்தெடுத்தல் (Odd One Out)",
  "குறியீட்டு முறைகள் (Coding-Decoding)",
  "திசை அறிதல் (Direction Sense)",
  "இரத்த உறவுகள் (Blood Relations)",
  "பகடைகள் (Dice)",
  "வென்படங்கள் (Venn Diagrams)"
];

const mathsUnits = [
  "எண்கள்",
  "அளவைகள்",
  "வாழ்வியல் கணிதம்",
  "இயற்கணிதம்",
  "வடிவியல்",
  "புள்ளியியல்"
];

const scienceUnits = [
  "அளவீட்டியல்",
  "விசையும் இயக்கமும்",
  "நம்மைச் சுற்றியுள்ள பருப்பொருள்கள்",
  "அணு அமைப்பு",
  "தாவரங்கள் மற்றும் விலங்குகளின் இனப்பெருக்கம்",
  "நுண்ணுயிரிகள்"
];

const socialUnits = [
  "1857 பெரும் புரட்சி",
  "இந்திய அரசமைப்பு",
  "மாநில அரசு எவ்வாறு செயல்படுகிறது",
  "முகலாயப் பேரரசு"
];

async function seed() {
  const allUnits: any[] = [];
  
  let unitId = 1;
  matUnits.forEach(u => allUnits.push({ subject: 'MAT', unitNumber: unitId++, unitName: u, totalQuestions: 0, deployedQuizId: null, questions: [] }));
  
  unitId = 1;
  mathsUnits.forEach(u => allUnits.push({ subject: 'SAT_MATHS', unitNumber: unitId++, unitName: u, totalQuestions: 0, deployedQuizId: null, questions: [] }));
  
  unitId = 1;
  scienceUnits.forEach(u => allUnits.push({ subject: 'SAT_SCIENCE', unitNumber: unitId++, unitName: u, totalQuestions: 0, deployedQuizId: null, questions: [] }));

  unitId = 1;
  socialUnits.forEach(u => allUnits.push({ subject: 'SAT_SOCIAL', unitNumber: unitId++, unitName: u, totalQuestions: 0, deployedQuizId: null, questions: [] }));

  for (const u of allUnits) {
    const id = `${u.subject}_${u.unitNumber}`;
    await setDoc(doc(db, 'subjectUnits', id), u);
  }
  
  console.log(`Seeded ${allUnits.length} subject units to Firebase!`);
  process.exit(0);
}

seed().catch(console.error);
