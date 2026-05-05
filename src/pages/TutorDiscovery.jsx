import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';

// Generate consistent color from name
function avatarColor(name) {
  const colors = [
    ['#6366f1','#4f46e5'], ['#8b5cf6','#7c3aed'], ['#14b8a6','#0d9488'],
    ['#f59e0b','#d97706'], ['#ef4444','#dc2626'], ['#10b981','#059669'],
    ['#3b82f6','#2563eb'], ['#ec4899','#db2777'],
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
}

function TutorAvatar({ name, size = 56 }) {
  const [c1, c2] = avatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: '#fff',
    }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function StarDisplay({ rating, count }) {
  return (
    <div className="flex gap-1" style={{ alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: 13, color: i <= Math.round(rating) ? '#f59e0b' : '#334155' }}>★</span>
      ))}
      <span className="text-muted text-sm" style={{ marginLeft: 4 }}>
        {rating > 0 ? `${rating.toFixed(1)} (${count})` : 'No ratings yet'}
      </span>
    </div>
  );
}

export default function TutorDiscovery() {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All');
  const navigate = useNavigate();

  const SUBJECTS = ['All','Mathematics','Physics','Chemistry','Biology','English','Hindi','History','Geography','Computer Science','Economics','Other'];

  useEffect(() => {
    const fetch = async () => {
      // Get all approved tutors from users collection
      const [tutorSnap, profileSnap, classSnap, ratingSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'tutor'), where('approved', '==', true))),
        getDocs(collection(db, 'tutorProfiles')),
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'ratings')),
      ]);

      const profiles = {};
      profileSnap.docs.forEach(d => { profiles[d.id] = d.data(); });

      const classCount = {};
      classSnap.docs.forEach(d => {
        const tid = d.data().tutorId;
        classCount[tid] = (classCount[tid] || 0) + 1;
      });

      const ratingMap = {};
      ratingSnap.docs.forEach(d => {
        const { tutorId, rating } = d.data();
        if (!ratingMap[tutorId]) ratingMap[tutorId] = [];
        ratingMap[tutorId].push(rating);
      });

      const tutorList = tutorSnap.docs.map(d => {
        const user = { id: d.id, ...d.data() };
        const profile = profiles[d.id] || {};
        const ratings = ratingMap[d.id] || [];
        const avgRating = ratings.length > 0 ? ratings.reduce((a,b) => a+b,0) / ratings.length : 0;
        return {
          ...user,
          ...profile,
          id: d.id,
          name: user.name,
          classCount: classCount[d.id] || 0,
          avgRating,
          ratingCount: ratings.length,
          featured: profile.featured || false,
          verified: profile.verified || false,
        };
      });

      // Sort: featured first, then by rating
      tutorList.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return b.avgRating - a.avgRating;
      });

      setTutors(tutorList);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = tutors.filter(t => {
    const matchSearch = !search ||
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.bio?.toLowerCase().includes(search.toLowerCase()) ||
      t.subjects?.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchSubject = subject === 'All' || t.subjects?.includes(subject);
    return matchSearch && matchSubject;
  });

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1>Find Your Tutor</h1>
        <p className="text-muted">Browse tutors, view their classes and request to enroll</p>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by tutor name or subject…"
          style={{ flex: 1, minWidth: 200, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 14, outline: 'none' }} />
        <select value={subject} onChange={e => setSubject(e.target.value)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 14, outline: 'none' }}>
          {SUBJECTS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">👨‍🏫</div>
          <h3>No tutors found</h3>
          <p>Try a different search or check back later</p>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(tutor => (
            <div key={tutor.id} className="card"
              style={{ cursor: 'pointer', position: 'relative', borderColor: tutor.featured ? 'var(--accent)' : undefined }}
              onClick={() => navigate(`/student/tutor/${tutor.id}`)}>

              {tutor.featured && (
                <div style={{ position: 'absolute', top: -1, right: 12, background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: '0 0 8px 8px', letterSpacing: 1 }}>
                  ⭐ FEATURED
                </div>
              )}

              <div className="flex gap-3" style={{ alignItems: 'center', marginBottom: 14 }}>
                <TutorAvatar name={tutor.name} size={56} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {tutor.name}
                    {tutor.verified && (
                      <span style={{ background: 'rgba(20,184,166,0.15)', color: 'var(--teal)', fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>✓ Verified</span>
                    )}
                  </div>
                  {tutor.qualification && <div className="text-muted text-sm">{tutor.qualification}</div>}
                  {tutor.city && <div className="text-muted text-sm">📍 {tutor.city}</div>}
                </div>
              </div>

              <StarDisplay rating={tutor.avgRating} count={tutor.ratingCount} />

              {tutor.bio
                ? <p className="text-muted text-sm" style={{ margin: '10px 0', lineHeight: 1.5 }}>{tutor.bio.slice(0, 90)}{tutor.bio.length > 90 ? '…' : ''}</p>
                : <p className="text-muted text-sm" style={{ margin: '10px 0', fontStyle: 'italic' }}>No bio added yet</p>
              }

              {tutor.subjects?.length > 0 && (
                <div className="flex gap-1" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
                  {tutor.subjects.slice(0, 3).map(s => (
                    <span key={s} className="badge" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent)', fontSize: 11 }}>{s}</span>
                  ))}
                  {tutor.subjects.length > 3 && <span className="text-muted text-sm">+{tutor.subjects.length - 3}</span>}
                </div>
              )}

              <div className="divider"></div>
              <div className="flex gap-3 text-sm" style={{ marginTop: 10, marginBottom: 14 }}>
                <span style={{ color: 'var(--text2)' }}>📚 {tutor.classCount} class{tutor.classCount !== 1 ? 'es' : ''}</span>
                {tutor.experience && <span style={{ color: 'var(--text2)' }}>🎓 {tutor.experience}</span>}
              </div>

              <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                View Classes →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
