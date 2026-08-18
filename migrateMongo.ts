import { MongoClient } from 'mongodb';
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

const uri = "mongodb+srv://anbarasanbj_db_user:lcgZwIlGxaTe3jTq@clusternmms.ubrcjov.mongodb.net/?appName=ClusterNMMS";
const client = new MongoClient(uri);

async function migrate() {
  try {
    await client.connect();
    const database = client.db('test'); // Replace with your actual db name if different
    const subjectUnitsCollection = database.collection('subjectunits'); // Mongoose typically lowercase + 's'

    const units = await subjectUnitsCollection.find({}).toArray();
    console.log(`Found ${units.length} subject units in MongoDB`);

    for (const u of units) {
      delete u._id;
      delete u.__v;
      const id = `${u.subject}_${u.unitNumber}`;
      await setDoc(doc(db, 'subjectUnits', id), u);
    }
    console.log('Successfully migrated subjectUnits to Firebase!');
  } finally {
    await client.close();
    process.exit(0);
  }
}

migrate().catch(console.dir);
