import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from './config';
import type { Quiz, StudentAttempt, AuthorizedStudent } from '../types';

// Quizzes
export const getQuizzes = async (): Promise<Quiz[]> => {
  const q = collection(db, 'quizzes');
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Quiz);
};

export const getQuizById = async (id: string): Promise<Quiz | null> => {
  const docRef = doc(db, 'quizzes', id);
  const snapshot = await getDoc(docRef);
  return snapshot.exists() ? (snapshot.data() as Quiz) : null;
};

export const saveQuiz = async (quiz: Quiz): Promise<void> => {
  await setDoc(doc(db, 'quizzes', quiz.id), quiz);
};

export const deleteQuiz = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'quizzes', id));
};

// Students
export const getStudents = async (): Promise<AuthorizedStudent[]> => {
  const q = collection(db, 'students');
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as AuthorizedStudent);
};

export const saveStudent = async (student: AuthorizedStudent): Promise<void> => {
  await setDoc(doc(db, 'students', student.examNumber), student);
};

export const deleteStudent = async (examNumber: string): Promise<void> => {
  await deleteDoc(doc(db, 'students', examNumber));
};

// Attempts
export const getAttempts = async (): Promise<StudentAttempt[]> => {
  const q = collection(db, 'attempts');
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as StudentAttempt);
};

export const saveAttempt = async (attempt: StudentAttempt): Promise<void> => {
  await setDoc(doc(db, 'attempts', attempt.id), attempt);
};

export const deleteAttempt = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'attempts', id));
};
