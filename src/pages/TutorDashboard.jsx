import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function TutorDashboard() {
  const { currentUser, userData } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, 'classes'), where('tutorId', '==', currentUser.uid));
      const snap = await getDocs(q);
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  return (
    <div className="page fade-in">
      <div className="page-header flex-between">
        <div>
          <h1>My Classes</h1>
          <p className="text-muted">Welcome, {userData?.name}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/tutor/enrollments" className="btn btn-outline">👥 Manage Students</Link>
          <Link to="/tutor/create" className="btn btn-primary">+ Create Class</Link>
        </div>
      </div>

      {classes.length === 0
        ? <div className="empty">
            <div className="empty-icon">📚</div>
            <h3>No classes yet</h3>
            <p>Create your first class and start teaching!</p>
            <Link to="/tutor/create" className="btn btn-primary" style={{ marginTop: 16 }}>Create First Class</Link>
          </div>
        : <div className="grid-3">
            {classes.map(c => (
              <div className="card" key={c.id}>
                <div className="flex-between" style={{ marginBottom: 10 }}>
                  <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}>{c.subject}</span>
                  <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/tutor/class/${c.id}`); }}>
                      ✏️ Edit
                    </button>
                    <button className="btn btn-danger btn-sm"
                      disabled={deleting === c.id}
                      onClick={(e) => { e.stopPropagation(); deleteClass(c.id); }}>
                      {deleting === c.id ? '…' : '🗑'}
                    </button>
                  </div>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{c.title}</h3>
                <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
                  {c.description?.slice(0, 100)}{c.description?.length > 100 ? '…' : ''}
                </p>
                <div className="divider"></div>
                <div className="flex gap-3 text-sm text-muted" style={{ marginTop: 8 }}>
                  <span>📹 {c.videos?.length || 0} videos</span>
                  <span>📡 {c.liveSessions?.length || 0} live sessions</span>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}
