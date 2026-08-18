import { db } from './config';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where } from 'firebase/firestore';

const originalFetch = window.fetch;

window.fetch = async (...args) => {
  const [resource, config] = args;
  const url = typeof resource === 'string' ? resource : resource instanceof Request ? resource.url : '';
  const method = (config?.method || 'GET').toUpperCase();

  // If not an API call or is an AI call (which needs Vercel functions), let it pass normally
  if (!url.startsWith('/api/') || url.startsWith('/api/ai/')) {
    return originalFetch(...args);
  }

  try {
    const createJsonResponse = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    // 1. Quizzes
    if (url === '/api/quizzes') {
      if (method === 'GET') {
        const snapshot = await getDocs(collection(db, 'quizzes'));
        return createJsonResponse(snapshot.docs.map(d => d.data()));
      }
      if (method === 'POST') {
        const body = JSON.parse(config?.body as string);
        await setDoc(doc(db, 'quizzes', body.id), body);
        return createJsonResponse({ success: true, quiz: body });
      }
    }

    if (url.match(/^\/api\/quizzes\/[^\/]+$/)) {
      const id = url.split('/').pop()?.split('?')[0];
      if (method === 'GET') {
        const d = await getDoc(doc(db, 'quizzes', id!));
        return createJsonResponse(d.exists() ? d.data() : { error: 'Not found' }, d.exists() ? 200 : 404);
      }
      if (method === 'DELETE') {
        await deleteDoc(doc(db, 'quizzes', id!));
        return createJsonResponse({ success: true });
      }
    }

    if (url.match(/^\/api\/quizzes\/[^\/]+\/submit$/)) {
        if (method === 'POST') {
            const body = JSON.parse(config?.body as string);
            await setDoc(doc(db, 'attempts', body.id), body);
            return createJsonResponse({ success: true });
        }
    }

    // 2. Students
    if (url === '/api/students/roster') {
        if (method === 'GET') {
            const snapshot = await getDocs(collection(db, 'students'));
            return createJsonResponse(snapshot.docs.map(d => d.data()));
        }
    }
    if (url === '/api/students') {
        if (method === 'POST') {
            const body = JSON.parse(config?.body as string);
            await setDoc(doc(db, 'students', body.examNumber), body);
            return createJsonResponse({ success: true, student: body });
        }
    }
    if (url.match(/^\/api\/students\/[^\/]+$/)) {
        const examNumber = decodeURIComponent(url.split('/').pop()?.split('?')[0] || '');
        if (method === 'DELETE') {
            await deleteDoc(doc(db, 'students', examNumber));
            return createJsonResponse({ success: true });
        }
    }

    // 3. Attempts
    if (url.match(/^\/api\/attempts\/[^\/]+$/)) {
        const id = url.split('/').pop()?.split('?')[0];
        if (method === 'DELETE') {
            await deleteDoc(doc(db, 'attempts', id!));
            return createJsonResponse({ success: true });
        }
    }

    // 4. PYQ Papers
    if (url === '/api/pyq/papers') {
        if (method === 'GET') {
            const snapshot = await getDocs(collection(db, 'pyq_papers'));
            return createJsonResponse(snapshot.docs.map(d => {
                const data = d.data();
                return { id: data.id, type: data.type, year: data.year }; // Return summary
            }));
        }
    }
    if (url.match(/^\/api\/pyq\/papers\/[^\/]+$/)) {
        const id = url.split('/').pop()?.split('?')[0];
        if (method === 'GET') {
            const d = await getDoc(doc(db, 'pyq_papers', id!));
            return createJsonResponse(d.exists() ? d.data().data : { error: 'Not found' }, d.exists() ? 200 : 404);
        }
    }

    // 5. Subject Units
    if (url.match(/^\/api\/subject-units\?subject=/)) {
        const subject = new URL(url, window.location.origin).searchParams.get('subject');
        if (method === 'GET') {
            const snapshot = await getDocs(query(collection(db, 'subjectUnits'), where('subject', '==', subject)));
            return createJsonResponse({ units: snapshot.docs.map(d => d.data()) });
        }
    }
    if (url.match(/^\/api\/subject-units\/[^\/]+\/\d+$/)) {
        const parts = url.split('/');
        const unitNumber = parts.pop()?.split('?')[0];
        const subject = parts.pop();
        const id = `${subject}_${unitNumber}`;
        
        if (method === 'GET') {
            const d = await getDoc(doc(db, 'subjectUnits', id));
            return createJsonResponse(d.exists() ? d.data() : { error: 'Not found' }, d.exists() ? 200 : 404);
        }
    }

    // 6. Admin Auth
    if (url === '/api/admin/login') {
        if (method === 'POST') {
            const body = JSON.parse(config?.body as string);
            const d = await getDoc(doc(db, 'adminConfig', 'config'));
            if (d.exists() && d.data().adminPassword === body.password) {
                return createJsonResponse({ success: true, message: 'Login successful' });
            }
            return createJsonResponse({ error: 'Invalid password' }, 401);
        }
    }

    // Default fallback to original fetch if not intercepted
    return originalFetch(...args);

  } catch (error: any) {
    console.error('Firebase Interceptor Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
