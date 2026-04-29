import { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function AdminClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(query(collection(db, 'classes'), orderBy('createdAt', 'desc')));
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetch();
  }, []);

  const deleteClass = async (id) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    setDeleting(id);
    await deleteDoc(doc(db, 'classes', id));
    setClasses(prev => prev.filter(c => c.id !== id));
    setDeleting('');
  };

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>All Classes</h1>
        <p className="text-muted">{classes.length} classes on the platform</p>
      </div>

      {classes.length === 0
        ? <div className="empty"><div className="empty-icon">📚</div><h3>No classes created yet</h3></div>
        : <div className="grid-3">
            {classes.map(c => (
              <div className="card" key={c.id}>
                <div className="flex-between" style={{ marginBottom: 8 }}>
                  <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}>{c.subject}</span>
                  <button className="btn btn-danger btn-sm" disabled={deleting === c.id}
                    onClick={() => deleteClass(c.id)}>
                    {deleting === c.id ? '…' : '🗑'}
                  </button>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{c.title}</h3>
                <p className="text-muted text-sm" style={{ marginBottom: 8 }}>{c.description?.slice(0, 80)}…</p>
                <div className="text-sm text-muted">
                  <div>👨‍🏫 {c.tutorName}</div>
                  <div style={{ marginTop: 4 }}>📹 {c.videos?.length || 0} videos · 📡 {c.liveSessions?.length || 0} live sessions</div>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}
