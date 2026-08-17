import React, { useState, useEffect } from 'react';
import { Quiz, Question, NMMS_Subject, QuizAnalytics, StudentAttempt, SUBJECT_METADATA } from '../types';
import { AUTHORIZED_STUDENTS, AuthorizedStudent } from '../data/students';
import { StudentScoreHistoryModal } from './StudentScoreHistoryModal';
import { PreviousYearPapers } from './PreviousYearPapers';
import { SubjectQuestionsTable } from './SubjectQuestionsTable';
import { MathText } from './MathText';
import { formatSecondsToTime, formatDateTime } from '../utils/formatters';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Sparkles, 
  Image as ImageIcon, 
  FileText, 
  Type, 
  BarChart3, 
  Users, 
  Link as LinkIcon, 
  Check, 
  Copy, 
  Trash2, 
  Eye, 
  EyeOff,
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  Clock, 
  BookOpen, 
  HelpCircle, 
  Download, 
  Edit3, 
  Save, 
  Layers,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  Search,
  ExternalLink,
  QrCode,
  RefreshCw,
  UserCheck,
  FileCheck2,
  Lock,
  Unlock,
  KeyRound,
  LogOut,
  ShieldAlert,
  School,
  Share2,
  ImagePlus,
  Images,
  UploadCloud,
  X,
  Shuffle,
  Dices,
  Sliders,
  Hash,
  ShieldCheck,
  ArrowLeft,
  Key,
  UserPlus,
  UserMinus
} from 'lucide-react';

export interface UploadedImageItem {
  id: string;
  name: string;
  size: string;
  base64: string;
}

interface TeacherAdminProps {
  quizzes: Quiz[];
  onRefreshQuizzes: () => void;
  onPreviewQuizAsStudent: (quizId: string) => void;
}

export const TeacherAdmin: React.FC<TeacherAdminProps> = ({
  quizzes,
  onRefreshQuizzes,
  onPreviewQuizAsStudent,
}) => {
  // Admin Authentication State (Persists across sessions until explicit logout)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem('nmms_admin_auth') === 'true' ||
        sessionStorage.getItem('nmms_admin_auth') === 'true'
      );
    } catch {
      return false;
    }
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  const [activeTab, setActiveTab] = useState<'quizzes' | 'pyq' | 'subject-units' | 'create' | 'analytics' | 'attempts' | 'roster'>('quizzes');
  const [selectedQuizId, setSelectedQuizId] = useState<string>(quizzes[0]?.id || '');
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState<boolean>(false);
  const [copiedLinkQuizId, setCopiedLinkQuizId] = useState<string | null>(null);
  const [viewAttemptModal, setViewAttemptModal] = useState<StudentAttempt | null>(null);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<any | null>(null);
  const [rosterStudents, setRosterStudents] = useState<any[]>(AUTHORIZED_STUDENTS);
  const [searchFilter, setSearchFilter] = useState('');
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [isDeletingQuiz, setIsDeletingQuiz] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Attempt Deletion State
  const [attemptToDelete, setAttemptToDelete] = useState<StudentAttempt | null>(null);
  const [isDeletingAttempt, setIsDeletingAttempt] = useState<boolean>(false);
  const [attemptDeleteError, setAttemptDeleteError] = useState<string | null>(null);

  const handleConfirmDeleteAttempt = async () => {
    if (!attemptToDelete) return;
    setIsDeletingAttempt(true);
    setAttemptDeleteError(null);
    try {
      const res = await fetch(`/api/attempts/${attemptToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (viewAttemptModal?.id === attemptToDelete.id) {
          setViewAttemptModal(null);
        }
        setAttemptToDelete(null);
        if (selectedQuizId) {
          fetchAnalytics(selectedQuizId);
        }
        fetchRoster();
      } else {
        const err = await res.json();
        setAttemptDeleteError(err.error || 'Failed to delete attempt');
      }
    } catch (err: any) {
      setAttemptDeleteError(err.message || 'Error deleting attempt');
    } finally {
      setIsDeletingAttempt(false);
    }
  };

  // Student Add / Remove Management State (PIN Required: 273464)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newExamNumber, setNewExamNumber] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [addStudentPin, setAddStudentPin] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [addStudentError, setAddStudentError] = useState<string | null>(null);
  const [addStudentSuccess, setAddStudentSuccess] = useState<string | null>(null);

  const [studentToRemove, setStudentToRemove] = useState<any | null>(null);
  const [removeStudentPin, setRemoveStudentPin] = useState('');
  const [isRemovingStudent, setIsRemovingStudent] = useState(false);
  const [removeStudentError, setRemoveStudentError] = useState<string | null>(null);
  const [removeStudentSuccess, setRemoveStudentSuccess] = useState<string | null>(null);

  const handleConfirmAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddStudentError(null);
    setAddStudentSuccess(null);

    const cleanNum = newExamNumber.trim().toUpperCase();
    const cleanName = newStudentName.trim();
    const cleanPin = addStudentPin.trim();

    if (!cleanNum) {
      setAddStudentError('தயவுசெய்து தேர்வு எண்ணை (Exam Number) உள்ளிடவும்.');
      return;
    }
    if (!cleanName) {
      setAddStudentError('தயவுசெய்து மாணவர் பெயரை (Student Name) உள்ளிடவும்.');
      return;
    }
    if (!cleanPin) {
      setAddStudentError('மாணவரை சேர்க்க ஆசிரியர் பாதுகாப்பு PIN எண்ணை உள்ளிடவும்.');
      return;
    }

    setIsAddingStudent(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examNumber: cleanNum,
          studentName: cleanName,
          pin: cleanPin,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAddStudentSuccess(data.message || 'மாணவர் வெற்றிகரமாக சேர்க்கப்பட்டார்!');
        setNewExamNumber('');
        setNewStudentName('');
        setAddStudentPin('');
        await fetchRoster();
        setTimeout(() => {
          setShowAddStudentModal(false);
          setAddStudentSuccess(null);
        }, 1200);
      } else {
        setAddStudentError(data.error || 'மாணவரை சேர்க்க முடியவில்லை. பாதுகாப்பு PIN எண்ணை சரிபார்க்கவும்.');
      }
    } catch (err: any) {
      setAddStudentError(err.message || 'இணைப்பு பிழை! மீண்டும் முயற்சிக்கவும்.');
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleConfirmRemoveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToRemove) return;
    setRemoveStudentError(null);
    setRemoveStudentSuccess(null);

    const cleanPin = removeStudentPin.trim();
    if (!cleanPin) {
      setRemoveStudentError('மாணவரை நீக்க ஆசிரியர் பாதுகாப்பு PIN எண்ணை உள்ளிடவும்.');
      return;
    }

    setIsRemovingStudent(true);
    try {
      const res = await fetch(`/api/students/${encodeURIComponent(studentToRemove.examNumber)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: cleanPin,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRemoveStudentSuccess(data.message || 'மாணவர் வெற்றிகரமாக நீக்கப்பட்டார்!');
        setRemoveStudentPin('');
        await fetchRoster();
        setTimeout(() => {
          setStudentToRemove(null);
          setRemoveStudentSuccess(null);
        }, 1200);
      } else {
        setRemoveStudentError(data.error || 'மாணவரை நீக்க முடியவில்லை. பாதுகாப்பு PIN எண்ணை சரிபார்க்கவும்.');
      }
    } catch (err: any) {
      setRemoveStudentError(err.message || 'இணைப்பு பிழை! மீண்டும் முயற்சிக்கவும்.');
    } finally {
      setIsRemovingStudent(false);
    }
  };

  // Handle Admin Login
  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminPasswordInput.trim()) {
      setAuthError('தயவுசெய்து கடவுச்சொல்லை உள்ளிடவும் (Please enter password)');
      return;
    }

    setIsVerifyingPassword(true);
    setAuthError(null);

    try {
      // Send to server verification
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPasswordInput.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.authenticated) {
        try {
          localStorage.setItem('nmms_admin_auth', 'true');
          sessionStorage.setItem('nmms_admin_auth', 'true');
        } catch {
          // ignore
        }
        setIsAuthenticated(true);
        setAuthError(null);
        setAdminPasswordInput('');
      } else {
        // Fallback check in case server is momentarily offline
        if (adminPasswordInput.trim() === 'nmms@2026') {
          try {
            localStorage.setItem('nmms_admin_auth', 'true');
            sessionStorage.setItem('nmms_admin_auth', 'true');
          } catch {
            // ignore
          }
          setIsAuthenticated(true);
          setAuthError(null);
          setAdminPasswordInput('');
        } else {
          setAuthError(data.error || 'தவறான கடவுச்சொல்! (Invalid admin password)');
        }
      }
    } catch {
      // Offline fallback
      if (adminPasswordInput.trim() === 'nmms@2026') {
        try {
          localStorage.setItem('nmms_admin_auth', 'true');
          sessionStorage.setItem('nmms_admin_auth', 'true');
        } catch {
          // ignore
        }
        setIsAuthenticated(true);
        setAuthError(null);
        setAdminPasswordInput('');
      } else {
        setAuthError('தவறான கடவுச்சொல்! சரியான ஆசிரியர் கடவுச்சொல்லை உள்ளிடவும்.');
      }
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleAdminLogout = () => {
    try {
      sessionStorage.removeItem('nmms_admin_auth');
      localStorage.removeItem('nmms_admin_auth');
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setAdminPasswordInput('');
    setAuthError(null);
  };

  // Forgot Password / PIN State
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [forgotStep, setForgotStep] = useState<'pin' | 'reset' | 'success'>('pin');
  const [pinInput, setPinInput] = useState<string>('');
  const [resetToken, setResetToken] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [showNewPasswordInput, setShowNewPasswordInput] = useState<boolean>(false);
  const [showConfirmPasswordInput, setShowConfirmPasswordInput] = useState<boolean>(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);

  const resetForgotState = () => {
    setShowForgotPassword(false);
    setForgotStep('pin');
    setPinInput('');
    setResetToken('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setForgotError(null);
    setForgotSuccessMsg(null);
  };

  // Verify Security PIN (273464)
  const handleVerifyPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim() || pinInput.trim().length < 4) {
      setForgotError('தயவுசெய்து சரியான 6-இலக்க பாதுகாப்பு PIN எண்ணை உள்ளிடவும்.');
      return;
    }

    setIsVerifyingPin(true);
    setForgotError(null);
    setForgotSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/forgot-password/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.resetToken) {
        setResetToken(data.resetToken);
        setForgotStep('reset');
        setForgotSuccessMsg('பாதுகாப்பு PIN சரிபார்க்கப்பட்டது! புதிய கடவுச்சொல்லை உள்ளிடவும்.');
      } else {
        setForgotError(data.error || 'தவறான பாதுகாப்பு PIN எண்! தயவுசெய்து சரிபார்க்கவும்.');
      }
    } catch {
      setForgotError('இணைப்பு பிழை! PIN சரிபார்க்க முடியவில்லை.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Reset Password
  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 4) {
      setForgotError('கடவுச்சொல் குறைந்தது 4 எழுத்துக்களை கொண்டிருக்க வேண்டும்.');
      return;
    }

    if (newPasswordInput.trim() !== confirmPasswordInput.trim()) {
      setForgotError('இரு கடவுச்சொற்களும் பொருந்தவில்லை! தயவுசெய்து சரிபார்க்கவும்.');
      return;
    }

    setIsResettingPassword(true);
    setForgotError(null);
    setForgotSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/forgot-password/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          newPassword: newPasswordInput.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setForgotStep('success');
        setForgotSuccessMsg('கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது!');
      } else {
        setForgotError(data.error || 'கடவுச்சொல் மாற்றுவதில் பிழை ஏற்பட்டது.');
      }
    } catch {
      setForgotError('இணைப்பு பிழை! கடவுச்சொல்லை புதுப்பிக்க முடியவில்லை.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Creation State
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [creationMode, setCreationMode] = useState<'ai_photo' | 'ai_pdf' | 'ai_text' | 'ai_generate' | 'manual'>('ai_photo');
  const [newQuizTitle, setNewQuizTitle] = useState('test');
  const [newQuizDescription, setNewQuizDescription] = useState('mock test.');
  const [newQuizDuration, setNewQuizDuration] = useState<number | ''>(60);
  const [newQuizPassPct, setNewQuizPassPct] = useState<number | ''>(40);
  const [newQuizShuffleQuestions, setNewQuizShuffleQuestions] = useState<boolean>(true);
  const [newQuizShuffleOptions, setNewQuizShuffleOptions] = useState<boolean>(true);
  const [newQuizEnableLimit, setNewQuizEnableLimit] = useState<boolean>(false);
  const [newQuizLimitCount, setNewQuizLimitCount] = useState<number | ''>(10);
  const [newQuizQuestions, setNewQuizQuestions] = useState<Question[]>([]);
  const [activeUrlInputIndex, setActiveUrlInputIndex] = useState<number | null>(null);
  const [imageUrlInputValue, setImageUrlInputValue] = useState<string>('');
  
  // AI Parsing State (Supports Multi-Image and Drag-and-Drop)
  const [uploadedImages, setUploadedImages] = useState<UploadedImageItem[]>([]);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState<boolean>(false);
  const [isDraggingPdf, setIsDraggingPdf] = useState<boolean>(false);
  const [uploadedPdfBase64, setUploadedPdfBase64] = useState<string | null>(null);
  const [uploadedPdfFileName, setUploadedPdfFileName] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [defaultSubject, setDefaultSubject] = useState<NMMS_Subject>('MAT');
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  // AI Generator state
  const [genSubject, setGenSubject] = useState<NMMS_Subject>('MAT');
  const [genTopic, setGenTopic] = useState('Number Series & Reasoning');
  const [genCount, setGenCount] = useState<number | ''>(5);

  // Load analytics when selected quiz changes or when tab opens
  useEffect(() => {
    if (!selectedQuizId && quizzes.length > 0) {
      setSelectedQuizId(quizzes[0].id);
    }
  }, [quizzes, selectedQuizId]);

  useEffect(() => {
    if (selectedQuizId && (activeTab === 'analytics' || activeTab === 'attempts')) {
      fetchAnalytics(selectedQuizId);
    }
    if (activeTab === 'roster') {
      fetchRoster();
    }
  }, [selectedQuizId, activeTab]);

  const fetchRoster = async () => {
    try {
      const res = await fetch('/api/students/roster');
      if (res.ok) {
        const data = await res.json();
        if (data.students && Array.isArray(data.students)) {
          setRosterStudents(data.students);
        }
      }
    } catch (e) {
      console.error('Failed to fetch student roster status:', e);
    }
  };

  const fetchAnalytics = async (quizId: string) => {
    setIsLoadingAnalytics(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error('Error fetching analytics:', e);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleCopyLink = (quizId: string) => {
    const shareUrl = `${window.location.origin}/?quiz=${quizId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLinkQuizId(quizId);
    setTimeout(() => setCopiedLinkQuizId(null), 2500);
  };

  const handleDeleteClick = (quiz: Quiz) => {
    setDeleteError(null);
    setQuizToDelete(quiz);
  };

  const handleConfirmDeleteQuiz = async () => {
    if (!quizToDelete) return;
    setIsDeletingQuiz(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/quizzes/${quizToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const deletedId = quizToDelete.id;
        setQuizToDelete(null);
        await onRefreshQuizzes();
        if (selectedQuizId === deletedId) {
          setSelectedQuizId('');
        }
      } else {
        const data = await res.json();
        setDeleteError(data.error || 'Failed to delete quiz');
      }
    } catch (e: any) {
      console.error('Failed to delete quiz:', e);
      setDeleteError(e.message || 'Error deleting quiz');
    } finally {
      setIsDeletingQuiz(false);
    }
  };

  // Helper to process multiple image files into Base64 state
  const processImageFiles = (files: FileList | File[]) => {
    const fileList = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileList.length === 0) {
      setAiError('தயவுசெய்து படக்கோப்புகளை (JPG, PNG, WebP) மட்டும் தேர்ந்தெடுக்கவும்.');
      return;
    }

    const readPromises = fileList.map((file) => {
      return new Promise<UploadedImageItem>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const sizeFormatted =
            file.size < 1024 * 1024
              ? `${(file.size / 1024).toFixed(1)} KB`
              : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
          resolve({
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: sizeFormatted,
            base64: reader.result as string,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then((newImages) => {
      setUploadedImages((prev) => [...prev, ...newImages]);
      setAiError(null);
    });
  };

  // Image Upload handler (supports multiple files)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFiles(e.target.files);
      e.target.value = '';
    }
  };

  // Remove single uploaded image
  const handleRemoveUploadedImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear all uploaded images
  const handleClearAllUploadedImages = () => {
    setUploadedImages([]);
  };

  // Drag & Drop handlers for Image mode
  const handlePhotoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(true);
  };

  const handlePhotoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFiles(e.dataTransfer.files);
    }
  };

  // PDF Upload handler
  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedPdfFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPdfBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Drag & Drop handlers for PDF mode
  const handlePdfDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPdf(true);
  };

  const handlePdfDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPdf(false);
  };

  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPdf(false);
    const files = Array.from(e.dataTransfer.files) as File[];
    const file = files.find(
      (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (file) {
      setUploadedPdfFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedPdfBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // AI Question Extraction from Photo / PDF / Text
  const handleExtractWithAI = async () => {
    setIsAiProcessing(true);
    setAiError(null);
    setAiSuccessMsg(null);

    try {
      let payload: any = {
        defaultSubject,
      };

      if (creationMode === 'ai_photo') {
        if (uploadedImages.length === 0) {
          throw new Error('தயவுசெய்து குறைந்தபட்சம் ஒரு வினாத்தாள் படத்தை பதிவேற்றவும் (Please upload or drag & drop at least one question paper image).');
        }
        payload.inputType = 'image';
        payload.images = uploadedImages.map((img) => img.base64);
        payload.mimeType = 'image/jpeg';
      } else if (creationMode === 'ai_pdf') {
        if (!uploadedPdfBase64) {
          throw new Error('Please select a question paper PDF document first.');
        }
        payload.inputType = 'pdf';
        payload.content = uploadedPdfBase64;
        payload.mimeType = 'application/pdf';
      } else if (creationMode === 'ai_text') {
        if (!pastedText.trim()) {
          throw new Error('Please paste the question text first.');
        }
        payload.inputType = 'text';
        payload.content = pastedText;
      }

      const res = await fetch('/api/ai/parse-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI Parsing failed');
      }

      if (data.questions && data.questions.length > 0) {
        setNewQuizQuestions((prev) => [...prev, ...data.questions]);
        setAiSuccessMsg(`வெற்றிகரமாக ${data.questions.length} NMMS வினாக்கள் வினாத்தாளில் சேர்க்கப்பட்டன! (Successfully extracted ${data.questions.length} questions)`);
      } else {
        setAiError('படத்திலிருந்து வினாக்களைப் பெற முடியவில்லை. தெளிவான படத்தை பதிவேற்றவும்.');
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      setAiError(err.message || 'Failed to extract questions');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // AI Question Generation
  const handleGenerateWithAI = async () => {
    setIsAiProcessing(true);
    setAiError(null);
    setAiSuccessMsg(null);

    try {
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: genSubject,
          topic: genTopic,
          count: Number(genCount) || 5,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate questions');
      }

      if (data.questions && data.questions.length > 0) {
        setNewQuizQuestions((prev) => [...prev, ...data.questions]);
        setAiSuccessMsg(`Successfully generated ${data.questions.length} authentic NMMS questions!`);
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      setAiError(err.message || 'Failed to generate questions with AI');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Add blank manual question
  const handleAddBlankQuestion = () => {
    const blankQ: Question = {
      id: `q-manual-${Date.now()}`,
      subject: defaultSubject,
      topic: 'General Topic',
      questionText: 'Enter question statement here...',
      options: [
        { id: 'A', text: 'Option A' },
        { id: 'B', text: 'Option B' },
        { id: 'C', text: 'Option C' },
        { id: 'D', text: 'Option D' },
      ],
      correctOption: 'A',
      explanation: 'Detailed solution step...',
      marks: 1,
      negativeMarks: 0,
    };
    setNewQuizQuestions((prev) => [...prev, blankQ]);
  };

  // Handle question image upload (FileReader to base64)
  const handleQuestionImageUpload = (qIndex: number, file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('தயவுசெய்து படக்கோப்பை (Image file) தேர்ந்தெடுக்கவும்.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const updated = [...newQuizQuestions];
      updated[qIndex].questionImage = base64;
      setNewQuizQuestions(updated);
    };
    reader.readAsDataURL(file);
  };

  // Remove image from a question
  const handleRemoveQuestionImage = (qIndex: number) => {
    const updated = [...newQuizQuestions];
    delete updated[qIndex].questionImage;
    setNewQuizQuestions(updated);
  };

  // Edit existing quiz in Question Builder tab (Preserves ID to republish the same exam)
  const handleEditExistingQuiz = (quiz: Quiz) => {
    setEditingQuizId(quiz.id);
    setNewQuizTitle(quiz.title);
    setNewQuizDescription(quiz.description || '');
    setNewQuizDuration(quiz.durationMinutes || 60);
    setNewQuizPassPct(quiz.passPercentage || 40);
    setNewQuizShuffleQuestions(quiz.shuffleQuestions !== false);
    setNewQuizShuffleOptions(quiz.shuffleOptions !== false);
    setNewQuizEnableLimit(Boolean(quiz.enableQuestionLimit));
    setNewQuizLimitCount(quiz.questionsPerAttempt || 10);
    setNewQuizQuestions(JSON.parse(JSON.stringify(quiz.questions || [])));
    setCreationMode('manual');
    setActiveTab('create');
  };

  // Cancel edit mode and reset to fresh quiz builder state
  const handleCancelEditQuiz = () => {
    setEditingQuizId(null);
    setNewQuizTitle('NMMS Practice Assessment 2026');
    setNewQuizDescription('Comprehensive Mental Ability and Scholastic Aptitude mock test.');
    setNewQuizDuration(60);
    setNewQuizPassPct(40);
    setNewQuizShuffleQuestions(true);
    setNewQuizShuffleOptions(true);
    setNewQuizEnableLimit(false);
    setNewQuizLimitCount(10);
    setNewQuizQuestions([]);
    setCreationMode('ai_photo');
  };

  // Save or Update Quiz on server (Republishes the same exam if editingQuizId is set)
  const handleSaveQuiz = async () => {
    if (!newQuizTitle.trim()) {
      alert('தயவுசெய்து தேர்வுத் தலைப்பை உள்ளிடவும் (Please enter a Quiz Title).');
      return;
    }
    if (newQuizQuestions.length === 0) {
      alert('குறைந்தது 1 வினாவையாவது சேர்க்கவும் (Please add at least 1 question).');
      return;
    }

    const isEditing = Boolean(editingQuizId);

    try {
      const quizPayload: Partial<Quiz> = {
        ...(editingQuizId ? { id: editingQuizId } : {}),
        title: newQuizTitle.trim(),
        description: newQuizDescription.trim(),
        durationMinutes: Number(newQuizDuration) || 60,
        passPercentage: Number(newQuizPassPct) || 40,
        enableAntiCheat: true,
        shuffleQuestions: Boolean(newQuizShuffleQuestions),
        shuffleOptions: Boolean(newQuizShuffleOptions),
        enableQuestionLimit: Boolean(newQuizEnableLimit),
        questionsPerAttempt: newQuizEnableLimit ? Math.max(1, Number(newQuizLimitCount) || 10) : undefined,
        showResultsImmediately: true,
        allowReview: true,
        status: 'active',
        questions: newQuizQuestions,
      };

      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizPayload),
      });

      if (res.ok) {
        alert(
          isEditing
            ? `✅ வினாத்தாள் (${newQuizTitle.trim()}) வெற்றிகரமாக திருத்தப்பட்டு மறுவெளியீடு செய்யப்பட்டது!\n(Exam paper updated & republished successfully as the same exam!)`
            : '✅ புதிய NMMS வினாத்தாள் வெற்றிகரமாக உருவாக்கப்பட்டது!\n(New Exam Paper published successfully!)'
        );
        setEditingQuizId(null);
        setNewQuizQuestions([]);
        onRefreshQuizzes();
        setActiveTab('quizzes');
      } else {
        const err = await res.json();
        alert(`Failed to save quiz: ${err.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      alert(`Error saving quiz: ${e.message}`);
    }
  };

  // Export attempts to CSV
  const handleExportCSV = () => {
    if (!analytics || analytics.recentAttempts.length === 0) {
      alert('No student attempts available to export.');
      return;
    }

    const headers = ['Exam Number', 'Student Name', 'Total Score', 'Possible', 'Percentage', 'Status', 'MAT Score', 'SAT Maths', 'SAT Science', 'SAT Social', 'Time Taken (Mins)', 'Submission Time'];
    const rows = analytics.recentAttempts.map((a) => [
      a.examNumber,
      `"${a.studentName.replace(/"/g, '""')}"`,
      a.score.totalObtained,
      a.score.totalPossible,
      `${a.score.percentage}%`,
      a.score.isEligible ? 'QUALIFIED' : 'NEEDS PRACTICE',
      a.score.subjectBreakdown.MAT?.obtained || 0,
      a.score.subjectBreakdown.SAT_MATHS?.obtained || 0,
      a.score.subjectBreakdown.SAT_SCIENCE?.obtained || 0,
      a.score.subjectBreakdown.SAT_SOCIAL?.obtained || 0,
      Math.round(a.timeTakenSeconds / 60),
      formatDateTime(a.submittedAt),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NMMS_Results_${selectedQuizId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 space-y-5">
          
          {/* Top School & Admin Header */}
          <div className="text-center space-y-1.5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20 shadow-inner">
              {showForgotPassword ? <Key className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
            </div>

            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
              <School className="w-3.5 h-3.5 text-indigo-500" />
              <span>GHS Kadayam • அரசு உயர்நிலைப் பள்ளி, கடையம்</span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {showForgotPassword ? 'கடவுச்சொல் மீட்பு (Password Reset)' : 'NMMS ஆசிரியர் / நிர்வாகி தளம்'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {showForgotPassword ? 'பாதுகாப்பு PIN சரிபார்ப்பு மூலம் கடவுச்சொல்லை மாற்றவும்' : 'Teacher & Administrator Secure Access'}
            </p>
          </div>

          {/* Error Message */}
          {(authError || forgotError) && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{authError || forgotError}</span>
            </div>
          )}

          {/* Success Message */}
          {forgotSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-start space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{forgotSuccessMsg}</span>
            </div>
          )}

          {/* VIEW A: STANDARD ADMIN LOGIN */}
          {!showForgotPassword ? (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    நிர்வாகி கடவுச்சொல் (Admin Password)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setForgotStep('pin');
                      setAuthError(null);
                      setForgotError(null);
                      setForgotSuccessMsg(null);
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer transition-colors"
                  >
                    கடவுச்சொல்லை மறந்துவிட்டீர்களா?
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="admin-password-input"
                    placeholder="கடவுச்சொல்லை உள்ளிடவும்..."
                    value={adminPasswordInput}
                    onChange={(e) => {
                      setAdminPasswordInput(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    autoFocus
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="admin-login-btn"
                disabled={isVerifyingPassword}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>{isVerifyingPassword ? 'சரிபார்க்கிறது...' : 'உள்நுழைக (Enter Admin Portal)'}</span>
              </button>
            </form>
          ) : (
            /* VIEW B: FORGOT PASSWORD SECURITY PIN WORKFLOW */
            <div className="space-y-4">
              {/* Step indicator */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span className={forgotStep === 'pin' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
                  1. பாதுகாப்பு PIN (Security PIN)
                </span>
                <span>→</span>
                <span className={forgotStep === 'reset' || forgotStep === 'success' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>
                  2. புதிய கடவுச்சொல் (New Password)
                </span>
              </div>

              {/* STEP 1: VERIFY PIN */}
              {forgotStep === 'pin' && (
                <form onSubmit={handleVerifyPin} className="space-y-3.5">
                  <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
                    <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold">பாதுகாப்பு PIN சரிபார்ப்பு</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      கடவுச்சொல்லை மீட்டமைக்க ஆசிரியர் நிர்வாகிக்கு வழங்கப்பட்ட <span className="font-semibold text-indigo-600 dark:text-indigo-400">6-இலக்க பாதுகாப்பு PIN</span> எண்ணை உள்ளிடவும்.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      6-இலக்க பாதுகாப்பு PIN (Security PIN)
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="••••••"
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value.replace(/\D/g, ''));
                        if (forgotError) setForgotError(null);
                      }}
                      autoFocus
                      className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-center font-mono text-xl font-black tracking-widest text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingPin || pinInput.trim().length < 4}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isVerifyingPin ? 'சரிபார்க்கிறது...' : 'PIN சரிபார்க்கவும் (Verify PIN)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={resetForgotState}
                    className="w-full py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>உள்நுழைவுப் பக்கத்திற்குத் திரும்பு (Back to Login)</span>
                  </button>
                </form>
              )}

              {/* STEP 2: SET NEW PASSWORD */}
              {forgotStep === 'reset' && (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      புதிய கடவுச்சொல் (New Password) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPasswordInput ? 'text' : 'password'}
                        placeholder="குறைந்தது 4 எழுத்துக்கள்..."
                        value={newPasswordInput}
                        onChange={(e) => {
                          setNewPasswordInput(e.target.value);
                          if (forgotError) setForgotError(null);
                        }}
                        autoFocus
                        className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPasswordInput(!showNewPasswordInput)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showNewPasswordInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      கடவுச்சொல்லை உறுதிப்படுத்தவும் (Confirm Password) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPasswordInput ? 'text' : 'password'}
                        placeholder="புதிய கடவுச்சொல்லை மீண்டும் உள்ளிடவும்..."
                        value={confirmPasswordInput}
                        onChange={(e) => {
                          setConfirmPasswordInput(e.target.value);
                          if (forgotError) setForgotError(null);
                        }}
                        className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPasswordInput(!showConfirmPasswordInput)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showConfirmPasswordInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isResettingPassword ? 'மாற்றுகிறது...' : 'கடவுச்சொல்லை மாற்று (Update Password)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={resetForgotState}
                    className="w-full py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                  >
                    ரத்துசெய் (Cancel)
                  </button>
                </form>
              )}

              {/* STEP 3: SUCCESS */}
              {forgotStep === 'success' && (
                <div className="text-center py-4 space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    உங்கள் புதிய கடவுச்சொல் மூலம் ஆசிரியர் தளத்தில் இப்போது உள்நுழையலாம்.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      resetForgotState();
                      setAdminPasswordInput(newPasswordInput);
                    }}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>புதிய கடவுச்சொல்லுடன் உள்நுழைக (Login Now)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Secure Notice */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              <span>பாதுகாக்கப்பட்ட தேர்வு மேலாண்மை தளம்</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-3 sm:py-4 px-2 sm:px-4 space-y-4 sm:space-y-5">
      {/* Tabs Bar with smooth horizontal scroll on mobile */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 border-b border-slate-200 dark:border-slate-800 pb-1.5 overflow-x-auto no-scrollbar flex-nowrap">
        {/* Tab 1: Quizzes */}
        <button
          onClick={() => setActiveTab('quizzes')}
          className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'quizzes'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Quizzes ({quizzes.length})</span>
        </button>

        {/* Tab 2: AI Importer */}
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'create'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Importer</span>
        </button>

        {/* Tab 3: Subject Questions */}
        <button
          onClick={() => setActiveTab('subject-units')}
          className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'subject-units'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Subject (MAT/SAT)</span>
        </button>

        {/* Tab 4: PYQ */}
        <button
          onClick={() => setActiveTab('pyq')}
          className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'pyq'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>PYQ Papers</span>
        </button>

        {/* Tab 5: Analytics */}
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analytics</span>
        </button>

        {/* Tab 6: Submissions */}
        <button
          onClick={() => setActiveTab('attempts')}
          className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'attempts'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Submissions</span>
        </button>

        {/* Tab 7: Roster */}
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Roster ({AUTHORIZED_STUDENTS.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 0: PREVIOUS YEAR QUESTION PAPERS (PYQ) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'pyq' && (
        <PreviousYearPapers
          onSelectQuizForPreview={onPreviewQuizAsStudent}
          onImportToBuilder={(importedQuiz) => {
            setNewQuizTitle(importedQuiz.title);
            setNewQuizDescription(importedQuiz.description || '');
            setNewQuizDuration(importedQuiz.durationMinutes || 90);
            setNewQuizPassPct(importedQuiz.passPercentage || 40);
            setNewQuizShuffleQuestions(importedQuiz.shuffleQuestions !== false);
            setNewQuizShuffleOptions(importedQuiz.shuffleOptions !== false);
            setNewQuizEnableLimit(Boolean(importedQuiz.enableQuestionLimit));
            setNewQuizLimitCount(importedQuiz.questionsPerAttempt || 10);
            setNewQuizQuestions(JSON.parse(JSON.stringify(importedQuiz.questions || [])));
            setActiveTab('create');
          }}
          onRefreshQuizzes={onRefreshQuizzes}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB: SUBJECT UNIT QUESTIONS TABLE & TEST DEPLOYMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'subject-units' && (
        <SubjectQuestionsTable
          onPreviewQuizAsStudent={onPreviewQuizAsStudent}
          onRefreshQuizzes={onRefreshQuizzes}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: ACTIVE QUIZZES LIST */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'quizzes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => {
              const shareUrl = `${window.location.origin}/?quiz=${quiz.id}`;
              const isCopied = copiedLinkQuizId === quiz.id;

              const quizDate = quiz.createdAt
                ? new Date(quiz.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : new Date().toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });

              const totalQs = quiz.enableQuestionLimit && quiz.questionsPerAttempt
                ? `${quiz.questionsPerAttempt}`
                : `${quiz.questions?.length || 0}`;

              const totalMarks = quiz.enableQuestionLimit && quiz.questionsPerAttempt
                ? quiz.questionsPerAttempt
                : (quiz.totalMarks || quiz.questions?.length || 0);

              const whatsappShareText = `📅 நாள்: ${quizDate}
📝 *தேர்வு:* ${quiz.title}
⏱️ கால அளவு: ${quiz.durationMinutes} min
📊 வினாக்கள்: ${totalQs}\n
🔗 தேர்வில் பங்கேற்க கீழே உள்ள இணைப்பை கிளிக் செய்யவும்:👇
${shareUrl}`;

              return (
                <div
                  key={quiz.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition-all h-full"
                >
                  <div className="flex flex-col flex-1">
                    {/* Top Header: Publish Date & Time + Quiz ID */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {quiz.createdAt ? formatDateTime(quiz.createdAt) : 'Published'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/50 flex-shrink-0">
                        {quiz.id}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="mb-2 h-12 flex items-start">
                      <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-2 leading-snug">
                        {quiz.title}
                      </h3>
                    </div>

                    {/* Description */}
                    <div className="h-9 mb-3 flex items-start">
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {quiz.description || 'NMMS தேர்வு வினாத்தாள் (Online Exam Paper)'}
                      </p>
                    </div>

                    {/* Feature Badges for Shuffling / Random Sampling */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3 h-7 overflow-hidden">
                      {quiz.shuffleQuestions && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center space-x-1">
                          <Shuffle className="w-2.5 h-2.5 text-indigo-500" />
                          <span>Shuffle Qs</span>
                        </span>
                      )}
                      {quiz.shuffleOptions && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center space-x-1">
                          <Dices className="w-2.5 h-2.5 text-purple-500" />
                          <span>Shuffle Options</span>
                        </span>
                      )}
                      {quiz.enableQuestionLimit && quiz.questionsPerAttempt ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center space-x-1">
                          <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                          <span>Random {quiz.questionsPerAttempt} of {quiz.questions?.length || 0} Qs</span>
                        </span>
                      ) : null}
                      {!quiz.shuffleQuestions && !quiz.shuffleOptions && !quiz.enableQuestionLimit && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          Standard Exam
                        </span>
                      )}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs mb-4 text-center mt-auto">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-slate-400 text-[10px] block font-medium">
                          {quiz.enableQuestionLimit && quiz.questionsPerAttempt ? 'Shown / Pool' : 'Questions'}
                        </span>
                        <strong className="text-slate-900 dark:text-white font-mono text-sm">
                          {quiz.enableQuestionLimit && quiz.questionsPerAttempt 
                            ? `${quiz.questionsPerAttempt} / ${quiz.questions?.length || 0}`
                            : `${quiz.questions?.length || 0}`}
                        </strong>
                      </div>
                      <div className="flex flex-col items-center justify-center border-x border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-400 text-[10px] block font-medium">Duration</span>
                        <strong className="text-slate-900 dark:text-white font-mono text-sm">
                          {quiz.durationMinutes}m
                        </strong>
                      </div>
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-slate-400 text-[10px] block font-medium">Marks</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                          {quiz.enableQuestionLimit && quiz.questionsPerAttempt
                            ? quiz.questionsPerAttempt
                            : (quiz.totalMarks || quiz.questions?.length || 0)}
                        </strong>
                      </div>
                    </div>

                    {/* Unique Link & WhatsApp Share Box */}
                    <div className="mb-4 space-y-2">
                      <div className="h-10 px-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs gap-2">
                        <div className="truncate font-mono text-[11px] text-indigo-700 dark:text-indigo-300 flex-1 min-w-0">
                          {shareUrl}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(quiz.id)}
                          className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 flex-shrink-0 transition-colors cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
                        </button>
                      </div>

                      {/* WhatsApp Share Button */}
                      <a
                        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappShareText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 w-full px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer"
                      >
                        <Share2 className="w-4 h-4 flex-shrink-0" />
                        <span>Share on WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <div className="grid grid-cols-3 gap-1.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleEditExistingQuiz(quiz)}
                        className="h-8 px-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold flex items-center justify-center space-x-1 whitespace-nowrap cursor-pointer transition-colors"
                        title="Edit this exam paper and questions (வினாத்தாள் திருத்து)"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onPreviewQuizAsStudent(quiz.id)}
                        className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold flex items-center justify-center space-x-1 whitespace-nowrap cursor-pointer transition-colors"
                        title="Student View (மாணவர் பார்வை)"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedQuizId(quiz.id);
                          setActiveTab('analytics');
                        }}
                        className="h-8 px-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-100 dark:border-indigo-900/40 text-xs font-bold flex items-center justify-center space-x-1 whitespace-nowrap cursor-pointer transition-colors"
                        title="View Performance Analytics"
                      >
                        <BarChart3 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Analytics</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteClick(quiz)}
                      className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer"
                      title="Delete Exam Paper (வினாத்தாளை நீக்கு)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: CREATE / AI IMPORT QUIZ */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Input Methods */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>AI Question Importer &amp; Extraction</span>
              </h2>

              {/* Mode Selection */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setCreationMode('ai_photo')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1.5 transition-all ${
                    creationMode === 'ai_photo'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <ImageIcon className="w-5 h-5" />
                  <span>Photo / Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreationMode('ai_pdf')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1.5 transition-all ${
                    creationMode === 'ai_pdf'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span>PDF Upload</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreationMode('ai_text')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1.5 transition-all ${
                    creationMode === 'ai_text'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Type className="w-5 h-5" />
                  <span>Text / OCR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreationMode('ai_generate')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1.5 transition-all ${
                    creationMode === 'ai_generate'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  <span>AI Generate</span>
                </button>
              </div>

              {/* Feedback messages */}
              {aiError && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{aiError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={creationMode === 'ai_generate' ? handleGenerateWithAI : handleExtractWithAI}
                    disabled={isAiProcessing}
                    className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-sm disabled:opacity-50 flex items-center space-x-1.5 flex-shrink-0"
                  >
                    <RefreshCw className={`w-3 h-3 ${isAiProcessing ? 'animate-spin' : ''}`} />
                    <span>{isAiProcessing ? 'Retrying...' : 'Retry Now'}</span>
                  </button>
                </div>
              )}
              {aiSuccessMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{aiSuccessMsg}</span>
                </div>
              )}

              {/* Input Area Based on Mode */}
              {creationMode === 'ai_photo' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Upload Question Paper Images / Photos (வினாத்தாள் படங்கள்)
                    </label>
                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                      Multi-Image Supported
                    </span>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handlePhotoDragOver}
                    onDragLeave={handlePhotoDragLeave}
                    onDrop={handlePhotoDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 ${
                      isDraggingPhoto
                        ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/80 ring-4 ring-indigo-500/30 scale-[1.01]'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/40 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="file"
                      id="input-file-photo"
                      accept="image/*"
                      multiple
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    <label htmlFor="input-file-photo" className="cursor-pointer space-y-2.5 block">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center shadow-inner">
                        <UploadCloud className={`w-6 h-6 transition-transform ${isDraggingPhoto ? 'animate-bounce' : ''}`} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
                          {isDraggingPhoto ? 'Release to drop your images here' : 'Click or Drag & Drop multiple question photos here'}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          Select one or multiple photos (JPG, PNG, WebP) of question papers, diagrams, math series
                        </span>
                      </div>
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                        <Images className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Hold Ctrl/Shift to choose multiple pages at once</span>
                      </div>
                    </label>
                  </div>

                  {/* Uploaded Images Gallery / List */}
                  {uploadedImages.length > 0 && (
                    <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {uploadedImages.length} Image Page{uploadedImages.length > 1 ? 's' : ''} Ready for AI Extraction
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <label
                            htmlFor="input-file-photo"
                            className="cursor-pointer px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800 flex items-center space-x-1 transition-colors"
                          >
                            <ImagePlus className="w-3 h-3" />
                            <span>+ Add More</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleClearAllUploadedImages}
                            className="px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-bold border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-colors"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {uploadedImages.map((imgItem, idx) => (
                          <div
                            key={imgItem.id}
                            className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                          >
                            <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-slate-900 overflow-hidden relative">
                              <img
                                src={imgItem.base64}
                                alt={`Question Page ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold">
                                Page #{idx + 1}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveUploadedImage(imgItem.id)}
                                title="Remove / Delete this page (இப்படத்தை நீக்கு)"
                                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="p-2 space-y-1.5">
                              <div>
                                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate" title={imgItem.name}>
                                  {imgItem.name}
                                </p>
                                <p className="text-[10px] text-slate-400">{imgItem.size}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveUploadedImage(imgItem.id)}
                                className="w-full py-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 text-[10px] font-bold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                                title="Delete Image (படத்தை நீக்கு)"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete (நீக்கு)</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extraction Button */}
                  <button
                    type="button"
                    onClick={handleExtractWithAI}
                    disabled={isAiProcessing || uploadedImages.length === 0}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Sparkles className={`w-4 h-4 ${isAiProcessing ? 'animate-spin' : ''}`} />
                    <span>
                      {isAiProcessing
                        ? `Gemini AI Processing ${uploadedImages.length} Image(s)...`
                        : uploadedImages.length > 0
                        ? `Extract Questions from ${uploadedImages.length} Image Page${uploadedImages.length > 1 ? 's' : ''} with AI`
                        : 'Select or Drop Images to Extract Questions'}
                    </span>
                  </button>
                </div>
              )}

              {creationMode === 'ai_pdf' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Upload Question Paper PDF (வினாத்தாள் PDF)
                    </label>
                    {uploadedPdfFileName && (
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedPdfFileName('');
                          setUploadedPdfBase64('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-800 flex items-center space-x-1 transition-colors cursor-pointer"
                        title="Delete selected PDF (PDF கோப்பை நீக்கு)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete PDF (நீக்கு)</span>
                      </button>
                    )}
                  </div>
                  <div
                    onDragOver={handlePdfDragOver}
                    onDragLeave={handlePdfDragLeave}
                    onDrop={handlePdfDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                      isDraggingPdf
                        ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/80 ring-4 ring-indigo-500/30'
                        : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500'
                    }`}
                  >
                    <input
                      type="file"
                      id="input-file-pdf"
                      accept="application/pdf"
                      onChange={handlePdfFileChange}
                      className="hidden"
                    />
                    <label htmlFor="input-file-pdf" className="cursor-pointer space-y-2 block">
                      <FileText className="w-8 h-8 text-indigo-500 mx-auto" />
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block">
                        {isDraggingPdf ? 'Drop your PDF file here' : 'Upload or Drag & Drop NMMS PDF Examination Paper'}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        {uploadedPdfFileName ? (
                          <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">{uploadedPdfFileName}</strong>
                        ) : (
                          'Supports multi-question PDF mock papers'
                        )}
                      </span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleExtractWithAI}
                    disabled={isAiProcessing || !uploadedPdfBase64}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Sparkles className={`w-4 h-4 ${isAiProcessing ? 'animate-spin' : ''}`} />
                    <span>{isAiProcessing ? 'Extracting from PDF with AI...' : 'Extract Questions from PDF'}</span>
                  </button>
                </div>
              )}

              {creationMode === 'ai_text' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Paste Raw Question Paper Text / OCR
                    </label>
                    {pastedText.trim() && (
                      <button
                        type="button"
                        onClick={() => setPastedText('')}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-800 flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear (நீக்கு)</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={6}
                    placeholder="e.g. 1. Find missing number: 2, 6, 12, 20, ? (A) 30 (B) 42 (C) 40 (D) 48&#10;2. Powerhouse of cell is: (A) Ribosome (B) Mitochondria..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />

                  <button
                    type="button"
                    onClick={handleExtractWithAI}
                    disabled={isAiProcessing || !pastedText.trim()}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isAiProcessing ? 'AI Structuring Questions...' : 'Parse & Format Questions with AI'}</span>
                  </button>
                </div>
              )}

              {creationMode === 'ai_generate' && (
                <div className="space-y-4">
                  {/* Tamil Medium Badge */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold text-[10px] uppercase">
                        தமிழ் வழிக் கல்வி
                      </span>
                      <span className="font-semibold text-[11px]">
                        அனைத்து வினாக்களும் தமிழ் வழியில் உருவாக்கப்படும் (Tamil Medium Only)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        பாடம் (Subject)
                      </label>
                      <select
                        value={genSubject}
                        onChange={(e) => {
                          const subj = e.target.value as any;
                          setGenSubject(subj);
                          if (subj === 'MAT') setGenTopic('எண் தொடர் மற்றும் ஒப்புமை (Number Series & Analogy)');
                          else if (subj === 'SAT_MATHS') setGenTopic('நேரியல் சமன்பாடுகள் & வர்க்கமூலம் (Linear Equations)');
                          else if (subj === 'SAT_SCIENCE') setGenTopic('செல் அமைப்பு, ஒளி மற்றும் மின்னியல் (Cell & Light)');
                          else if (subj === 'SAT_SOCIAL') setGenTopic('1857 பெரும் புரட்சி & இந்திய அரசியலமைப்பு (History & Civics)');
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                      >
                        <option value="MAT">மனத்திறன் தேர்வு (MAT - Mental Ability)</option>
                        <option value="SAT_MATHS">கணிதம் (SAT - Mathematics)</option>
                        <option value="SAT_SCIENCE">அறிவியல் (SAT - Science)</option>
                        <option value="SAT_SOCIAL">சமூக அறிவியல் (SAT - Social Science)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        வினாக்கள் எண்ணிக்கை (Count)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={genCount}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setGenCount('');
                          } else {
                            const num = parseInt(val, 10);
                            setGenCount(isNaN(num) ? '' : num);
                          }
                        }}
                        onBlur={() => {
                          if (genCount === '' || Number(genCount) < 1) {
                            setGenCount(5);
                          }
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      பாடத் தலைப்பு (Topic / Syllabus Focus)
                    </label>
                    <input
                      type="text"
                      placeholder="எ.கா. எண் தொடர், இந்திய அரசியலமைப்பு, ஒளி மற்றும் எதிரொளிப்பு"
                      value={genTopic}
                      onChange={(e) => setGenTopic(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white mb-2"
                    />

                    {/* Quick Tamil Topic Suggestion Chips */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                        பாடத்திட்ட தலைப்புகள் (Quick Select Topics):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {genSubject === 'MAT' && (
                          <>
                            {['எண் தொடர் (Number Series)', 'எழுத்து தொடர் (Letter Series)', 'ஒப்புமை வினாக்கள் (Analogy)', 'பொருந்தாததை கண்டறிதல் (Odd One Out)', 'குறியீட்டு மொழி (Coding-Decoding)', 'திசை அறிதல் (Direction Sense)', 'இரத்த உறவுகள் (Blood Relations)', 'பகடை கணக்குகள் (Dice)'].map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setGenTopic(t)}
                                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                                  genTopic === t
                                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </>
                        )}
                        {genSubject === 'SAT_MATHS' && (
                          <>
                            {['விகிதமுறு எண்கள் (Rational Numbers)', 'நேரியல் சமன்பாடுகள் (Linear Equations)', 'வர்க்கம் & வர்க்கமூலம் (Square Roots)', 'அடுக்குகளும் படிக்குறிகளும் (Exponents)', 'அளவியல் (Mensuration)', 'வடிவியல் பலகோணங்கள் (Geometry)', 'காரணிப்படுத்துதல் (Factorisation)'].map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setGenTopic(t)}
                                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                                  genTopic === t
                                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </>
                        )}
                        {genSubject === 'SAT_SCIENCE' && (
                          <>
                            {['செல் அமைப்பு & உறுப்புகள் (Cell Structure)', 'ஒளி மற்றும் ஒளியியல் (Light & Optics)', 'விசை மற்றும் அழுத்தம் (Force & Pressure)', 'நுண்ணுயிரிகள் உலகம் (Microorganisms)', 'உலோகங்கள் & அலோகங்கள் (Metals & Non-metals)', 'மின்னியல் & காந்தவியல் (Electricity)', 'ஒலி மற்றும் அலைகள் (Sound)'].map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setGenTopic(t)}
                                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                                  genTopic === t
                                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </>
                        )}
                        {genSubject === 'SAT_SOCIAL' && (
                          <>
                            {['1857 பெரும் புரட்சி (Revolt of 1857)', 'இந்திய அரசியலமைப்பு (Indian Constitution)', 'பிளாசி & பக்சார் போர் (Modern History)', 'வளங்கள் மற்றும் பயிர்கள் (Resources & Farming)', 'நீதித்துறை & பாராளுமன்றம் (Judiciary)', 'முகலாயர்கள் & மராத்தியர்கள் (Medieval History)', 'காலநிலை மற்றும் வானிலை (Climate)'].map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setGenTopic(t)}
                                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                                  genTopic === t
                                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateWithAI}
                    disabled={isAiProcessing}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isAiProcessing ? 'Gemini AI Generating Questions (தமிழ் வழியில்)...' : 'Generate NMMS Questions in Tamil (தமிழ் வழி வினாக்கள்)'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quiz General Settings */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Exam Paper Settings
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Exam Title
                </label>
                <input
                  type="text"
                  value={newQuizTitle}
                  onChange={(e) => setNewQuizTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newQuizDescription}
                  onChange={(e) => setNewQuizDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newQuizDuration}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setNewQuizDuration('');
                      } else {
                        const num = parseInt(val, 10);
                        setNewQuizDuration(isNaN(num) ? '' : num);
                      }
                    }}
                    onBlur={() => {
                      if (newQuizDuration === '' || Number(newQuizDuration) < 1) {
                        setNewQuizDuration(60);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Pass Cutoff (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newQuizPassPct}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setNewQuizPassPct('');
                      } else {
                        const num = parseInt(val, 10);
                        setNewQuizPassPct(isNaN(num) ? '' : num);
                      }
                    }}
                    onBlur={() => {
                      if (newQuizPassPct === '' || Number(newQuizPassPct) < 0) {
                        setNewQuizPassPct(40);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Shuffling & Random Question Sampling Settings */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    <span>வினாக்கள் & தெரிவுகள் அமைப்புகள் (Shuffling & Sampling)</span>
                  </span>
                </div>

                {/* Switch 1: Shuffle Questions */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Shuffle Questions (வினாக்களை மாற்றி அமைத்தல்)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Randomize the question display sequence for each student attempt.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={newQuizShuffleQuestions}
                    onClick={() => setNewQuizShuffleQuestions(!newQuizShuffleQuestions)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      newQuizShuffleQuestions ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        newQuizShuffleQuestions ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Switch 2: Shuffle Options */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <Dices className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Shuffle Options (விடைக் குறிப்புகளை மாற்றி அமைத்தல்)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Randomize choices A, B, C, D order for each question per attempt.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={newQuizShuffleOptions}
                    onClick={() => setNewQuizShuffleOptions(!newQuizShuffleOptions)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      newQuizShuffleOptions ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        newQuizShuffleOptions ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Switch 3: Random Question Subset Selection */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Random Question Subset (சமவாய்ப்பு வினா தேர்வு)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Randomly show a certain number of questions from the total pool each time.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={newQuizEnableLimit}
                      onClick={() => setNewQuizEnableLimit(!newQuizEnableLimit)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        newQuizEnableLimit ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          newQuizEnableLimit ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Configurable Number of Questions when Random Subset is active */}
                  {newQuizEnableLimit && (
                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                          <Hash className="w-3.5 h-3.5 text-amber-600" />
                          <span>காட்ட வேண்டிய வினாக்கள் எண்ணிக்கை (Number of Questions to Show):</span>
                        </label>
                        <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                          {newQuizLimitCount || 0} / {newQuizQuestions.length || 'Pool'} Qs
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={newQuizQuestions.length > 0 ? newQuizQuestions.length : 200}
                          value={newQuizLimitCount}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setNewQuizLimitCount('');
                            } else {
                              const num = parseInt(val, 10);
                              setNewQuizLimitCount(isNaN(num) ? '' : num);
                            }
                          }}
                          onBlur={() => {
                            if (newQuizLimitCount === '' || Number(newQuizLimitCount) < 1) {
                              setNewQuizLimitCount(10);
                            }
                          }}
                          className="w-28 p-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                        />

                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          {[10, 15, 20, 25, 30].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setNewQuizLimitCount(preset)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold font-mono transition-all ${
                                newQuizLimitCount === preset
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950'
                              }`}
                            >
                              {preset} Qs
                            </button>
                          ))}
                          {newQuizQuestions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setNewQuizLimitCount(newQuizQuestions.length)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold font-mono transition-all ${
                                newQuizLimitCount === newQuizQuestions.length
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950'
                              }`}
                            >
                              All ({newQuizQuestions.length})
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Explanation Note */}
                      <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5">
                        <p className="font-semibold">
                          💡 எடுத்துக்காட்டு (Example):
                        </p>
                        <p>
                          வினா வங்கியில் <strong>{newQuizQuestions.length || 50} வினாக்கள்</strong> இருந்தால், ஒவ்வொரு மாணவருக்கும் ஒவ்வொரு முறை சமவாய்ப்பு முறையில் <strong>{newQuizLimitCount || 10} வினாக்கள்</strong> மட்டுமே தேர்வு செய்யப்பட்டு காட்டப்படும்.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Question Queue & Editor */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between min-h-[500px]">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Exam Questions Queue ({newQuizQuestions.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Review, edit options, or adjust answer keys before publishing
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBlankQuestion}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Manual</span>
                  </button>
                </div>

                {/* Questions List */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {newQuizQuestions.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                      <Layers className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                      <p>No questions added yet.</p>
                      <p className="text-slate-500">
                        Upload a photo/PDF or use AI Generator on the left to populate questions.
                      </p>
                    </div>
                  ) : (
                    newQuizQuestions.map((q, qIndex) => (
                      <div
                        key={q.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                              {qIndex + 1}
                            </span>
                            <select
                              value={q.subject}
                              onChange={(e) => {
                                const updated = [...newQuizQuestions];
                                updated[qIndex].subject = e.target.value as any;
                                setNewQuizQuestions(updated);
                              }}
                              className="text-xs font-bold p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                            >
                              <option value="MAT">MAT Reasoning</option>
                              <option value="SAT_MATHS">SAT Maths</option>
                              <option value="SAT_SCIENCE">SAT Science</option>
                              <option value="SAT_SOCIAL">SAT Social</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setNewQuizQuestions((prev) => prev.filter((_, idx) => idx !== qIndex));
                            }}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Statement */}
                        <div className="space-y-2">
                          <textarea
                            rows={4}
                            value={q.questionText}
                            placeholder="Enter question statement / வினாவை உள்ளிடவும் (e.g. $x^2 + 5x + 6 = 0$)..."
                            onChange={(e) => {
                              const updated = [...newQuizQuestions];
                              updated[qIndex].questionText = e.target.value;
                              setNewQuizQuestions(updated);
                            }}
                            className="w-full min-h-[96px] p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-medium leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                          />

                          {/* Live Equation Preview & Quick Math Helper (Only shown when dollar symbol / math equation is present) */}
                          {q.questionText && q.questionText.includes('$') ? (
                            <div className="space-y-2 pt-1">
                              {/* Live Equation / LaTeX Preview for Question Text */}
                              <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-xs text-slate-800 dark:text-slate-200 shadow-xs">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                    Live Equation Preview (சூத்திர முன்னோட்டம்):
                                  </span>
                                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                                    LaTeX Active
                                  </span>
                                </div>
                                <div className="font-medium leading-relaxed bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                                  <MathText text={q.questionText} />
                                </div>
                              </div>

                              {/* Quick Math Syntax Helper Buttons */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Quick Math:</span>
                                {[
                                  { label: 'Fraction (பின்னம்)', code: '$\\frac{a}{b}$' },
                                  { label: 'Power (அடுக்கு)', code: '$x^2$' },
                                  { label: 'Square Root (வர்க்கமூலம்)', code: '$\\sqrt{x}$' },
                                  { label: 'Degree', code: '$30^\\circ$' },
                                  { label: '×', code: '$\\times$' },
                                  { label: '÷', code: '$\\div$' },
                                  { label: '±', code: '$\\pm$' },
                                  { label: 'π', code: '$\\pi$' },
                                ].map((btn) => (
                                  <button
                                    key={btn.label}
                                    type="button"
                                    onClick={() => {
                                      const updated = [...newQuizQuestions];
                                      updated[qIndex].questionText = (updated[qIndex].questionText ? updated[qIndex].questionText + ' ' : '') + btn.code;
                                      setNewQuizQuestions(updated);
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 font-medium transition-colors"
                                  >
                                    + {btn.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {/* Image Attachment & Preview */}
                          {q.questionImage ? (
                            <div className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 inline-flex flex-col items-start max-w-full">
                              <div className="relative rounded-lg overflow-hidden bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 min-h-[120px] max-h-64 max-w-sm sm:max-w-md shadow-xs">
                                <img
                                  src={q.questionImage}
                                  alt="Question Diagram"
                                  className="max-h-60 max-w-full object-contain rounded"
                                  referrerPolicy="no-referrer"
                                />

                                <div className="absolute top-2 right-2 flex items-center space-x-1.5 bg-slate-900/75 backdrop-blur-xs p-1 rounded-lg shadow-md">
                                  <label
                                    className="p-1.5 rounded-md text-white hover:bg-white/20 cursor-pointer transition-colors"
                                    title="Change image (படத்தை மாற்று)"
                                  >
                                    <ImagePlus className="w-3.5 h-3.5" />
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleQuestionImageUpload(qIndex, file);
                                      }}
                                    />
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveQuestionImage(qIndex)}
                                    className="p-1.5 rounded-md text-rose-300 hover:text-rose-100 hover:bg-rose-500/40 transition-colors"
                                    title="Remove image (படத்தை நீக்கு)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 pt-0.5">
                              {activeUrlInputIndex === qIndex ? (
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-xs shadow-sm animate-fadeIn">
                                  <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                    <LinkIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                                    <input
                                      type="url"
                                      placeholder="படத்தின் இணைய முகவரியை (URL) ஒட்டவும் / Paste image URL (e.g. https://...)..."
                                      value={imageUrlInputValue}
                                      onChange={(e) => setImageUrlInputValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          if (imageUrlInputValue.trim()) {
                                            const updated = [...newQuizQuestions];
                                            updated[qIndex].questionImage = imageUrlInputValue.trim();
                                            setNewQuizQuestions(updated);
                                            setActiveUrlInputIndex(null);
                                            setImageUrlInputValue('');
                                          }
                                        } else if (e.key === 'Escape') {
                                          setActiveUrlInputIndex(null);
                                          setImageUrlInputValue('');
                                        }
                                      }}
                                      autoFocus
                                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-mono"
                                    />
                                  </div>

                                  <div className="flex items-center space-x-1.5 justify-end flex-shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (imageUrlInputValue.trim()) {
                                          const updated = [...newQuizQuestions];
                                          updated[qIndex].questionImage = imageUrlInputValue.trim();
                                          setNewQuizQuestions(updated);
                                          setActiveUrlInputIndex(null);
                                          setImageUrlInputValue('');
                                        }
                                      }}
                                      disabled={!imageUrlInputValue.trim()}
                                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-1 transition-colors"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>இணை (Add)</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveUrlInputIndex(null);
                                        setImageUrlInputValue('');
                                      }}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
                                    >
                                      <span>ரத்து (Cancel)</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <div className="inline-flex items-center rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/60 dark:bg-indigo-950/40 p-0.5 text-xs text-indigo-800 dark:text-indigo-200 shadow-xs">
                                    <span className="px-2.5 py-1 text-[11px] font-semibold flex items-center space-x-1 select-none text-indigo-700 dark:text-indigo-300">
                                      <span>படம் சேர்க்க</span>
                                      <span className="text-[10px] opacity-75 font-normal hidden sm:inline">(Add Image)</span>
                                    </span>

                                    <span className="h-4 w-px bg-indigo-200 dark:bg-indigo-800 my-auto" />

                                    <label
                                      className="inline-flex items-center justify-center p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 cursor-pointer transition-colors"
                                      title="சாதனத்திலிருந்து படம் பதிவேற்ற (Upload Image File)"
                                    >
                                      <ImagePlus className="w-4 h-4" />
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleQuestionImageUpload(qIndex, file);
                                        }}
                                      />
                                    </label>

                                    <span className="h-4 w-px bg-indigo-200 dark:bg-indigo-800 my-auto" />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveUrlInputIndex(qIndex);
                                        setImageUrlInputValue('');
                                      }}
                                      className="inline-flex items-center justify-center p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 cursor-pointer transition-colors"
                                      title="படத்தின் இணைய இணைப்பு சேர்க்க (Paste Image Link / URL)"
                                    >
                                      <LinkIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 4 Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-2">
                          {q.options.map((opt, optIndex) => (
                            <div key={opt.id} className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="w-5 text-center font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-700/80 py-1 rounded flex-shrink-0">
                                  {opt.id}
                                </span>
                                <input
                                  type="text"
                                  value={opt.text}
                                  placeholder={`Option ${opt.id} (e.g. $12\\text{ cm}$)`}
                                  onChange={(e) => {
                                    const updated = [...newQuizQuestions];
                                    updated[qIndex].options[optIndex].text = e.target.value;
                                    setNewQuizQuestions(updated);
                                  }}
                                  className="flex-1 p-2 sm:p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>
                              {opt.text && (opt.text.includes('$') || opt.text.includes('\\')) && (
                                <div className="pl-7 text-[11px] text-slate-600 dark:text-slate-300 bg-indigo-50/40 dark:bg-indigo-950/20 p-1 rounded">
                                  <span className="text-[9px] text-indigo-500 font-bold mr-1">Preview:</span>
                                  <MathText text={opt.text} />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Correct Key & Explanation */}
                        <div className="flex items-center justify-between text-xs pt-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-600 dark:text-slate-400">
                              Correct Key:
                            </span>
                            <select
                              value={q.correctOption}
                              onChange={(e) => {
                                const updated = [...newQuizQuestions];
                                updated[qIndex].correctOption = e.target.value as any;
                                setNewQuizQuestions(updated);
                              }}
                              className="font-bold text-emerald-600 dark:text-emerald-400 p-1 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50"
                            >
                              <option value="A">Option A</option>
                              <option value="B">Option B</option>
                              <option value="C">Option C</option>
                              <option value="D">Option D</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Publish CTA */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 space-y-2">
                <button
                  type="button"
                  onClick={handleSaveQuiz}
                  disabled={newQuizQuestions.length === 0}
                  className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md disabled:opacity-50 flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    editingQuizId
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25 active:scale-[0.99]'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 active:scale-[0.99]'
                  }`}
                >
                  {editingQuizId ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>மாற்றங்களை சேமித்து மறுவெளியீடு செய் / Update &amp; Republish Exam ({newQuizQuestions.length} Questions)</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Publish Exam Paper ({newQuizQuestions.length} Questions)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleCancelEditQuiz();
                    setActiveTab('quizzes');
                  }}
                  className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>ரத்து செய் (Cancel)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: REAL-TIME PERFORMANCE ANALYTICS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Quiz Selector for Analytics */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto flex-1 min-w-[260px] max-w-2xl">
              <span className="text-xs font-bold uppercase text-slate-500 whitespace-nowrap flex-shrink-0">
                Select Exam Paper:
              </span>
              <select
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                className="w-full sm:w-auto flex-1 min-w-[200px] max-w-full sm:max-w-md md:max-w-lg truncate px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title} ({q.questions?.length} Qs)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV Report</span>
              </button>
            </div>
          </div>

          {isLoadingAnalytics ? (
            <div className="py-20 text-center text-slate-400 text-xs">
              Loading real-time performance analytics...
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Top Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                    Total Attempts
                  </span>
                  <div className="text-3xl font-black text-slate-900 dark:text-white font-mono mt-1">
                    {analytics.totalAttempts}
                  </div>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 block">
                    Candidates Evaluated
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                    Average Score
                  </span>
                  <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                    {analytics.averageScore}
                  </div>
                  <span className="text-xs text-slate-500 font-semibold mt-0.5 block">
                    {analytics.averagePercentage}% Class Avg
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                    Pass / Merit Rate
                  </span>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                    {analytics.passRate}%
                  </div>
                  <span className="text-xs text-emerald-600 font-semibold mt-0.5 block">
                    Above NMMS Cutoff
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                    Avg Completion Time
                  </span>
                  <div className="text-3xl font-black text-slate-900 dark:text-white font-mono mt-1">
                    {Math.round(analytics.averageTimeSeconds / 60)}m
                  </div>
                  <span className="text-xs text-slate-500 font-semibold mt-0.5 block">
                    Speed Benchmark
                  </span>
                </div>
              </div>

              {/* Subject Accuracy Comparison Radar/Bars */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Subject Performance Benchmark (% Accuracy)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(['MAT', 'SAT_MATHS', 'SAT_SCIENCE', 'SAT_SOCIAL'] as NMMS_Subject[]).map((sub) => {
                    const accuracy = analytics.subjectAverages[sub] || 0;
                    const meta = SUBJECT_METADATA[sub];

                    return (
                      <div key={sub} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {meta.shortName}
                          </span>
                          <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                            {accuracy}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${accuracy}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Question-By-Question Item Analysis (Identifies Tough Questions) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
                  Question Item Difficulty Analysis
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="pb-3 px-2">Q#</th>
                        <th className="pb-3 px-2">Section</th>
                        <th className="pb-3 px-2">Question Text</th>
                        <th className="pb-3 px-2 text-center">Correct %</th>
                        <th className="pb-3 px-2 text-center">Correct / Total</th>
                        <th className="pb-3 px-2 text-right">Difficulty Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {analytics.questionStats.map((stat) => (
                        <tr key={stat.questionId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-2 font-mono font-bold">{stat.questionNumber}</td>
                          <td className="py-3 px-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${SUBJECT_METADATA[stat.subject]?.badgeBg}`}>
                              {SUBJECT_METADATA[stat.subject]?.shortName}
                            </span>
                          </td>
                          <td className="py-3 px-2 max-w-xs truncate text-slate-800 dark:text-slate-200 font-medium">
                            {stat.questionText}
                          </td>
                          <td className="py-3 px-2 text-center font-mono font-bold">
                            {stat.correctRate}%
                          </td>
                          <td className="py-3 px-2 text-center text-slate-500 font-mono">
                            {stat.correctAttempts} / {analytics.totalAttempts}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                stat.difficultyRating === 'Easy'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : stat.difficultyRating === 'Moderate'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {stat.difficultyRating}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 text-xs">
              No submissions recorded yet for this exam paper. Share the quiz link with students to gather live data.
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: STUDENT SUBMISSIONS ROSTER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'attempts' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto flex-1 min-w-[260px] max-w-2xl">
              <span className="text-xs font-bold uppercase text-slate-500 whitespace-nowrap flex-shrink-0">Filter Exam:</span>
              <select
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                className="w-full sm:w-auto flex-1 min-w-[200px] max-w-full sm:max-w-md md:max-w-lg truncate px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidate or roll no..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full sm:w-64 pl-8 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Exam Number</th>
                    <th className="py-3.5 px-4">Student Name</th>
                    <th className="py-3.5 px-4 text-center">Score</th>
                    <th className="py-3.5 px-4 text-center">Aggregate</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Time Spent</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {analytics && analytics.recentAttempts.length > 0 ? (
                    analytics.recentAttempts
                      .filter((a) => 
                        a.studentName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                        a.examNumber.toLowerCase().includes(searchFilter.toLowerCase())
                      )
                      .map((attempt) => (
                        <tr key={attempt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {attempt.examNumber}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            {attempt.studentName}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold">
                            {attempt.score.totalObtained} / {attempt.score.totalPossible}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {attempt.score.percentage}%
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                attempt.score.isEligible
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {attempt.score.isEligible ? 'QUALIFIED' : 'NEEDS PRACTICE'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                            {formatSecondsToTime(attempt.timeTakenSeconds)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => setViewAttemptModal(attempt)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-semibold text-[11px] cursor-pointer"
                              >
                                View Sheet
                              </button>
                              <button
                                type="button"
                                onClick={() => setAttemptToDelete(attempt)}
                                className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[11px] font-bold transition-colors cursor-pointer"
                                title="Delete this attempt (முயற்சியை நீக்கு)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No student submission records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: CANDIDATE ROSTER & VERIFICATION STATUS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  <span>Authorized Student Candidate Roster &amp; Score History</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  View candidates, add or remove authorized students, examine attempt frequencies, timestamps, and deep subject analytics.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  id="btn-add-student-modal-trigger"
                  onClick={() => {
                    setAddStudentError(null);
                    setAddStudentSuccess(null);
                    setNewExamNumber('');
                    setNewStudentName('');
                    setAddStudentPin('');
                    setShowAddStudentModal(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ புதிய மாணவரை சேர் (Add Student)</span>
                </button>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search candidate / exam no..."
                    className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Total Candidates: {rosterStudents.length}
                </span>
              </div>
            </div>

            {/* Roster Table (2 Attributes: Exam Number, Student Name + Actions) */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Exam Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Attempts &amp; Status</th>
                    <th className="py-3 px-4 text-right">Score History &amp; Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rosterStudents
                    .filter((student) => {
                      if (!searchFilter.trim()) return true;
                      const q = searchFilter.toLowerCase();
                      return (
                        student.studentName.toLowerCase().includes(q) ||
                        student.examNumber.toLowerCase().includes(q)
                      );
                    })
                    .map((student, idx) => {
                      const hasAttempted = (student.totalAttempts || 0) > 0 || student.isCompleted;

                      return (
                        <tr key={student.examNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {student.examNumber}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            {student.studentName}
                          </td>
                          <td className="py-3 px-4">
                            {hasAttempted ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                                  {student.totalAttempts ? `${student.totalAttempts} Attempt(s)` : 'Attempted'}
                                </span>
                                {student.bestScore !== null && student.bestScore !== undefined && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                    Best: <strong className="text-indigo-600 dark:text-indigo-400">{student.bestScore} marks</strong> ({student.bestPercentage}%)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center text-[11px] font-medium text-slate-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mr-1.5" />
                                Not Attempted
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForHistory(student)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all active:scale-[0.98]"
                                title="View Score History"
                              >
                                <BarChart3 className="w-3.5 h-3.5" />
                                <span>மதிப்பெண் விவரம்</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRemoveStudentError(null);
                                  setRemoveStudentSuccess(null);
                                  setRemoveStudentPin('');
                                  setStudentToRemove(student);
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 text-rose-600 dark:text-rose-300 hover:text-white border border-rose-200 dark:border-rose-800 font-bold text-xs transition-all active:scale-[0.98]"
                                title="மாணவரை நீக்கு (Remove Student)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>நீக்கு</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Student Score History & Detailed Individual Analytics Modal */}
      {selectedStudentForHistory && (
        <StudentScoreHistoryModal
          examNumber={selectedStudentForHistory.examNumber}
          initialStudent={selectedStudentForHistory}
          onClose={() => setSelectedStudentForHistory(null)}
          onInspectAttemptSheet={(attempt) => {
            setViewAttemptModal(attempt);
          }}
          onAttemptDeleted={() => {
            if (selectedQuizId) fetchAnalytics(selectedQuizId);
            fetchRoster();
          }}
        />
      )}

      {/* Answer Sheet Modal for Specific Student */}
      {viewAttemptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Candidate Answer Sheet: {viewAttemptModal.studentName}
                </h3>
                <p className="text-xs text-slate-500">
                  Exam No: {viewAttemptModal.examNumber} • Score: {viewAttemptModal.score.totalObtained}/{viewAttemptModal.score.totalPossible} ({viewAttemptModal.score.percentage}%)
                </p>
              </div>
              <button
                onClick={() => setViewAttemptModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Subject Summary Grid */}
            <div className="grid grid-cols-4 gap-2 text-center mb-4 text-xs">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950">
                <span className="text-[10px] text-slate-400 block">MAT</span>
                <strong className="text-indigo-600 font-mono">
                  {viewAttemptModal.score.subjectBreakdown.MAT?.obtained || 0}/{viewAttemptModal.score.subjectBreakdown.MAT?.possible || 0}
                </strong>
              </div>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950">
                <span className="text-[10px] text-slate-400 block">Maths</span>
                <strong className="text-blue-600 font-mono">
                  {viewAttemptModal.score.subjectBreakdown.SAT_MATHS?.obtained || 0}/{viewAttemptModal.score.subjectBreakdown.SAT_MATHS?.possible || 0}
                </strong>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950">
                <span className="text-[10px] text-slate-400 block">Science</span>
                <strong className="text-emerald-600 font-mono">
                  {viewAttemptModal.score.subjectBreakdown.SAT_SCIENCE?.obtained || 0}/{viewAttemptModal.score.subjectBreakdown.SAT_SCIENCE?.possible || 0}
                </strong>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950">
                <span className="text-[10px] text-slate-400 block">Social</span>
                <strong className="text-amber-600 font-mono">
                  {viewAttemptModal.score.subjectBreakdown.SAT_SOCIAL?.obtained || 0}/{viewAttemptModal.score.subjectBreakdown.SAT_SOCIAL?.possible || 0}
                </strong>
              </div>
            </div>

            {/* Attempt Details */}
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p><strong>Attempt Timestamp:</strong> {formatDateTime(viewAttemptModal.submittedAt)}</p>
              <p><strong>Time Taken:</strong> {formatSecondsToTime(viewAttemptModal.timeTakenSeconds)}</p>
              {viewAttemptModal.tabSwitchCount > 0 && (
                <p className="text-rose-500 font-bold">
                  ⚠️ Tab Switch / Focus Blur Violations: {viewAttemptModal.tabSwitchCount} times
                </p>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setViewAttemptModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity"
              >
                Close Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Attempt Confirmation Modal */}
      {attemptToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Student Attempt Record?
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  மாணவர் தேர்வு முயற்சியை நீக்கவா?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold text-slate-900 dark:text-white">{attemptToDelete.studentName} ({attemptToDelete.examNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Score:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{attemptToDelete.score.totalObtained} / {attemptToDelete.score.totalPossible} ({attemptToDelete.score.percentage}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Submitted:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{formatDateTime(attemptToDelete.submittedAt)}</span>
              </div>
            </div>

            {attemptDeleteError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{attemptDeleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={isDeletingAttempt}
                onClick={() => {
                  setAttemptToDelete(null);
                  setAttemptDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                ரத்து (Cancel)
              </button>
              <button
                type="button"
                disabled={isDeletingAttempt}
                onClick={handleConfirmDeleteAttempt}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingAttempt ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>நீக்குகிறது (Deleting)...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ஆம், நீக்கு (Yes, Delete)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Exam Paper Confirmation Modal */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Exam Paper?
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  வினாத்தாளை நீக்க விரும்புகிறீர்களா?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {quizToDelete.title}
              </div>
              <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                <span>ID: {quizToDelete.id}</span>
                <span>•</span>
                <span>{quizToDelete.questions?.length || 0} Questions</span>
                <span>•</span>
                <span>{quizToDelete.durationMinutes} Mins</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700">
                This action is permanent and will remove this NMMS test paper along with all student attempt submissions.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={isDeletingQuiz}
                onClick={() => {
                  setQuizToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all disabled:opacity-50"
              >
                ரத்து (Cancel)
              </button>
              <button
                type="button"
                disabled={isDeletingQuiz}
                onClick={handleConfirmDeleteQuiz}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
              >
                {isDeletingQuiz ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>நீக்குகிறது (Deleting)...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ஆம், நீக்கு (Yes, Delete)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: ADD NEW AUTHORIZED STUDENT (REQUIRES PIN: 273464) */}
      {/* ============================================================= */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    புதிய மாணவரை சேர்க்க
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add Candidate to Authorized NMMS Roster
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStudentModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  தேர்வு எண் (Exam Number) *
                </label>
                <input
                  type="text"
                  required
                  value={newExamNumber}
                  onChange={(e) => setNewExamNumber(e.target.value)}
                  placeholder="எ.கா: 8036 அல்லது 2401"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  மாணவர் இந்த எண்ணை உள்ளிட்டு ஆன்லைன் தேர்வை எழுதலாம்.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  மாணவர் பெயர் (Student Name) *
                </label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="எ.கா: கார்த்திக் ரா"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-2">
                <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>ஆசிரியர் பாதுகாப்பு PIN சரிபார்ப்பு (Security PIN) *</span>
                </div>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={addStudentPin}
                  onChange={(e) => setAddStudentPin(e.target.value)}
                  placeholder="ஆசிரியர் PIN எண் (6 இலக்கங்கள்)"
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono text-center tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              {addStudentError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{addStudentError}</span>
                </div>
              )}

              {addStudentSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{addStudentSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isAddingStudent}
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all disabled:opacity-50"
                >
                  ரத்து (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isAddingStudent}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {isAddingStudent ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>சேர்க்கப்படுகிறது (Adding)...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>மாணவரை சேர்க்கவும் (Add Student)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: REMOVE AUTHORIZED STUDENT (REQUIRES PIN: 273464) */}
      {/* ============================================================= */}
      {studentToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 flex items-center justify-center flex-shrink-0">
                <UserMinus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  மாணவரை பட்டியலில் இருந்து நீக்க
                </h3>
                <p className="text-xs text-slate-500">
                  Remove Student from NMMS Candidate Roster
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">மாணவர் பெயர்:</span>
                <span className="font-bold text-slate-900 dark:text-white">{studentToRemove.studentName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">தேர்வு எண் (Exam No):</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{studentToRemove.examNumber}</span>
              </div>
              {studentToRemove.totalAttempts !== undefined && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">எழுதிய தேர்வுகள்:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{studentToRemove.totalAttempts} முறை</span>
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmRemoveStudent} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-2">
                <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 text-xs font-bold">
                  <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>மாணவரை நீக்க ஆசிரியர் பாதுகாப்பு PIN சரிபார்க்கவும் *</span>
                </div>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={removeStudentPin}
                  onChange={(e) => setRemoveStudentPin(e.target.value)}
                  placeholder="ஆசிரியர் PIN எண் (6 இலக்கங்கள்)"
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono text-center tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              {removeStudentError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{removeStudentError}</span>
                </div>
              )}

              {removeStudentSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{removeStudentSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  disabled={isRemovingStudent}
                  onClick={() => {
                    setStudentToRemove(null);
                    setRemoveStudentError(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all disabled:opacity-50"
                >
                  ரத்து (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isRemovingStudent}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
                >
                  {isRemovingStudent ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>நீக்குகிறது (Removing)...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ஆம், மாணவரை நீக்கு (Confirm Remove)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
