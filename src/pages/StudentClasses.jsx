import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

export default function StudentClasses() {
  const { currentUser, userData } = useAuth();
  const [classes, setClasses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState('');
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All');

  const subjects = ['All', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'History', 'Geography', 'Computer Science', 'Economics', 'Other'];

  useEffect(() => {
    const fetch = async () => {
      const [classSnap, enrollSnap] = await Promise.all([
        getDocs(collection(db, 'classes')),
        getDocs(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid))),
      ]);
      setClasses(classSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setEnrollments(enrollSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetch();
  }, [currentUser]);

  const getEnrollmentStatus = (classId) => {
    const e = enrollments.find(e => e.classId === classId);
    return e ? e.status : null;
  };

  const requestEnroll = async (cls) => {
    setRequesting(cls.id);
    try {
      const newEnroll = {
        studentId: currentUser.uid, studentName: userData.name,
        studentEmail: currentUser.email, classId: cls.id,
        className: cls.title, subject: cls.subject,
        tutorId: cls.tutorId, tutorName: cls.tutorName,
        status: 'pending', createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'enrollments'), newEnroll);
      setEnrollments(prev => [...prev, { ...newEnroll, classId: cls.id }]);
    } catch (e) { alert('Failed to send request.'); }
    setRequesting('');
  };

  const filtered = classes.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.tutorName?.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subject === 'All' || c.subject === subject;
    return matchSearch && matchSubject;
  });

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>Browse Classes</h1>
        <p className="text-muted">Find a class and request to join — admin will approve your request</p>
      </div>

      <div className="flex gap-3" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search classes or tutors…"
          style={{ flex: 1, minWidth: 200, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 14, outline: 'none' }}
        />
        <select value={subject} onChange={e => setSubject(e.target.value)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 14, outline: 'none' }}>
          {subjects.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0
        ? <div className="empty"><div className="empty-icon">🔍</div><h3>No classes found</h3><p>Try a different search or subject</p></div>
        : <div className="grid-3">
            {filtered.map(c => {
              const status = getEnrollmentStatus(c.id);
              return (
                <div className="card" key={c.id}>
                  <div className="flex-between" style={{ marginBottom: 10 }}>
                    <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}>{c.subject}</span>
                    {c.grade && <span className="text-muted text-sm">{c.grade}</span>}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{c.title}</h3>
                  <p className="text-muted text-sm" style={{ marginBottom: 12 }}>{c.description?.slice(0, 100)}…</p>
                  <div className="flex gap-3 text-sm text-muted" style={{ marginBottom: 14 }}>
                    <span>👨‍🏫 {c.tutorName}</span>
                    <span>📹 {c.videos?.length || 0} videos</span>
                    <span>📡 {c.liveSessions?.length || 0} live</span>
                  </div>
                  <div className="divider"></div>
                  <div style={{ marginTop: 12 }}>
                    {!status && (
                      <button className="btn btn-primary btn-sm" disabled={requesting === c.id}
                        onClick={() => requestEnroll(c)} style={{ width: '100%', justifyContent: 'center' }}>
                        {requesting === c.id ? 'Sending…' : 'Request to Join'}
                      </button>
                    )}
                    {status === 'pending' && (
                      <div style={{ textAlign: 'center' }}>
                        <span className="badge badge-pending">⏳ Awaiting Admin Approval</span>
                      </div>
                    )}
                    {status === 'approved' && (
                      <div style={{ textAlign: 'center' }}>
                        <span className="badge badge-approved">✓ Enrolled — Go to My Enrollments</span>
                      </div>
                    )}
                    {status === 'rejected' && (
                      <div style={{ textAlign: 'center' }}>
                        <span className="badge badge-rejected">✗ Request Rejected</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}
