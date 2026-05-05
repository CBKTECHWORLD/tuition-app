import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function TutorDashboard() {
  const { currentUser, userData } = useAuth();
  const [classes, setClasses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const [classSnap, enrollSnap, profileSnap] = await Promise.all([
        getDocs(query(collection(db, 'classes'), where('tutorId', '==', currentUser.uid))),
        getDocs(query(collection(db, 'enrollments'), where('tutorId', '==', currentUser.uid))),
        getDoc(doc(db, 'tutorProfiles', currentUser.uid)),
      ]);
      setClasses(classSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setEnrollments(enrollSnap.docs.map(d => d.data()));
      if (profileSnap.exists()) setProfile(profileSnap.data());
      setLoading(false);
    };
    fetch();
  }, [currentUser]);

  const deleteClass = async (id) => {
    if (!confirm('Delete this class?')) return;
    setDeleting(id);
    await deleteDoc(doc(db, 'classes', id));
    setClasses(prev => prev.filter(c => c.id !== id));
    setDeleting('');
  };

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;

  const activeStudents = enrollments.filter(e => e.status === 'approved').length;
  const pendingStudents = enrollments.filter(e => e.status === 'pending').length;

  return (
    <div className="page fade-in">
      <div className="page-header flex-between">
        <div>
          <h1>My Dashboard</h1>
          <p className="text-muted">Welcome, {userData?.name}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/tutor/profile" className="btn btn-outline">👤 My Profile</Link>
          <Link to="/tutor/enrollments" className="btn btn-outline">👥 Students</Link>
          <Link to="/tutor/create" className="btn btn-primary">+ New Class</Link>
        </div>
      </div>

      {/* Profile incomplete warning */}
      {!profile && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <div className="flex-between">
            <div>
              <p style={{ fontWeight: 600, color: 'var(--amber)', marginBottom: 4 }}>⚠️ Complete your profile</p>
              <p className="text-muted text-sm">Students can't find you without a profile. Add your photo, bio and subjects.</p>
            </div>
            <Link to="/tutor/profile" className="btn btn-primary btn-sm">Complete Profile →</Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'My Classes', value: classes.length, icon: '📚', color: 'var(--accent)' },
          { label: 'Active Students', value: activeStudents, icon: '🎓', color: 'var(--green)' },
          { label: 'Pending Requests', value: pendingStudents, icon: '⏳', color: 'var(--amber)', alert: pendingStudents > 0 },
          { label: 'Total Videos', value: classes.reduce((a, c) => a + (c.videos?.length || 0), 0), icon: '📹', color: 'var(--teal)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: 18, borderColor: s.alert ? 'var(--amber)' : undefined }}>
            <div style={{ fontSize: 26, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div className="text-muted text-sm">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pending alert */}
      {pendingStudents > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <div className="flex-between">
            <p style={{ color: 'var(--amber)', fontWeight: 500 }}>⏳ {pendingStudents} student{pendingStudents > 1 ? 's' : ''} waiting for your approval</p>
            <Link to="/tutor/enrollments" className="btn btn-sm" style={{ background: 'var(--amber)', color: '#000' }}>Approve Now →</Link>
          </div>
        </div>
      )}

      {/* Classes */}
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>My Classes</h2>
        <Link to="/tutor/create" className="btn btn-outline btn-sm">+ Add Class</Link>
      </div>

      {classes.length === 0
        ? <div className="empty">
            <div className="empty-icon">📚</div>
            <h3>No classes yet</h3>
            <p>Create your first class and start teaching!</p>
            <Link to="/tutor/create" className="btn btn-primary" style={{ marginTop: 16 }}>Create First Class</Link>
          </div>
        : <div className="grid-3">
            {classes.map(c => {
              const classEnrolls = enrollments.filter(e => e.classId === c.id && e.status === 'approved');
              return (
                <div className="card" key={c.id}>
                  <div className="flex-between" style={{ marginBottom: 10 }}>
                    <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}>{c.subject}</span>
                    <div className="flex gap-2">
                      <button className="btn btn-outline btn-sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/tutor/class/${c.id}`); }}>✏️ Edit</button>
                      <button className="btn btn-danger btn-sm" disabled={deleting === c.id}
                        onClick={(e) => { e.stopPropagation(); deleteClass(c.id); }}>
                        {deleting === c.id ? '…' : '🗑'}
                      </button>
                    </div>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{c.title}</h3>
                  {c.grade && <p className="text-muted text-sm">{c.grade}</p>}
                  <p className="text-muted text-sm" style={{ marginBottom: 10 }}>
                    {c.description?.slice(0, 80)}{c.description?.length > 80 ? '…' : ''}
                  </p>
                  {c.price && <p style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>₹{c.price}/month</p>}
                  <div className="divider"></div>
                  <div className="flex gap-3 text-sm text-muted" style={{ marginTop: 8 }}>
                    <span>📹 {c.videos?.length || 0} videos</span>
                    <span>📡 {c.liveSessions?.length || 0} live</span>
                    <span>🎓 {classEnrolls.length} students</span>
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}
