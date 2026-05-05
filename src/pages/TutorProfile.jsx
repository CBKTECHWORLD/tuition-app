import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, query, where, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';

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

function TutorAvatar({ name, size = 80 }) {
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

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <span key={i} onClick={() => onChange(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
          style={{ fontSize: 28, cursor: 'pointer', color: i <= (hover || value) ? '#f59e0b' : 'var(--border-hover)', transition: 'color 0.1s' }}>★</span>
      ))}
    </div>
  );
}

function StarDisplay({ rating, count }) {
  return (
    <div className="flex gap-1" style={{ alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: 16, color: i <= Math.round(rating) ? '#f59e0b' : 'var(--border-hover)' }}>★</span>
      ))}
      <span className="text-muted text-sm" style={{ marginLeft: 4 }}>{rating > 0 ? `${rating.toFixed(1)} (${count} reviews)` : 'No reviews yet'}</span>
    </div>
  );
}

export default function TutorProfile() {
  const { tutorId } = useParams();
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState('');
  const [requesting, setRequesting] = useState('');
  const [enrollSuccess, setEnrollSuccess] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const [profileSnap, classSnap, ratingSnap, enrollSnap] = await Promise.all([
        getDoc(doc(db, 'tutorProfiles', tutorId)),
        getDocs(query(collection(db, 'classes'), where('tutorId', '==', tutorId))),
        getDocs(query(collection(db, 'ratings'), where('tutorId', '==', tutorId))),
        getDocs(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid))),
      ]);
      if (profileSnap.exists()) setProfile(profileSnap.data());
      setClasses(classSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRatings(ratingSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setEnrollments(enrollSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Check existing rating
      const myExisting = ratingSnap.docs.find(d => d.data().studentId === currentUser.uid);
      if (myExisting) { setMyRating(myExisting.data().rating); setMyReview(myExisting.data().review || ''); }
      setLoading(false);
    };
    fetch();
  }, [tutorId, currentUser]);

  const getEnrollStatus = (classId) => {
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
      setEnrollSuccess(`Request sent for "${cls.title}"!`);
      setTimeout(() => setEnrollSuccess(''), 3000);
    } catch { alert('Failed. Please try again.'); }
    setRequesting('');
  };

  const submitRating = async () => {
    if (!myRating) return;
    setSubmittingRating(true);
    const existing = ratings.find(r => r.studentId === currentUser.uid);
    if (existing) {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'ratings', existing.id), { rating: myRating, review: myReview, updatedAt: new Date() });
      setRatings(prev => prev.map(r => r.id === existing.id ? { ...r, rating: myRating, review: myReview } : r));
    } else {
      await addDoc(collection(db, 'ratings'), {
        tutorId, studentId: currentUser.uid, studentName: userData.name,
        rating: myRating, review: myReview, createdAt: serverTimestamp(),
      });
    }
    setRatingSuccess('✅ Rating submitted!');
    setTimeout(() => setRatingSuccess(''), 3000);
    setSubmittingRating(false);
  };

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;
  if (!profile) return <div className="page"><div className="empty"><div className="empty-icon">👨‍🏫</div><h3>Tutor profile not found</h3><button className="btn btn-outline" onClick={() => navigate('/student')}>← Back</button></div></div>;

  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b.rating, 0) / ratings.length : 0;
  const isEnrolledInAny = classes.some(c => getEnrollStatus(c.id) === 'approved');

  return (
    <div className="page fade-in">
      <button className="btn btn-outline btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate('/student')}>← Back to Tutors</button>

      {enrollSuccess && <div className="alert alert-success">{enrollSuccess}</div>}

      {/* Tutor Header */}
      <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.04))' }}>
        <div className="flex gap-4" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TutorAvatar name={profile.name} size={80} />
          <div style={{ flex: 1 }}>
            <div className="flex gap-2" style={{ alignItems: 'center', marginBottom: 4 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>{profile.name}</h1>
              {profile.verified && <span style={{ background: 'rgba(20,184,166,0.15)', color: 'var(--teal)', fontSize: 12, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>✓ Verified</span>}
              {profile.featured && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 12, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>⭐ Featured</span>}
            </div>
            <div className="text-muted text-sm" style={{ marginBottom: 8 }}>
              {profile.qualification} {profile.city && `· 📍 ${profile.city}`} {profile.experience && `· 🎓 ${profile.experience}`}
            </div>
            <StarDisplay rating={avgRating} count={ratings.length} />
            <p style={{ marginTop: 12, color: 'var(--text2)', lineHeight: 1.6, fontSize: 14 }}>{profile.bio}</p>
            <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
              {profile.subjects?.map(s => (
                <span key={s} className="badge" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent)' }}>{s}</span>
              ))}
            </div>
            {isEnrolledInAny && profile.phone && (
              <div style={{ marginTop: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                <p style={{ fontSize: 13, color: 'var(--green)' }}>📞 Contact: <strong>{profile.phone}</strong></p>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)' }}>{classes.length}</div>
            <div className="text-muted text-sm">Classes</div>
          </div>
        </div>
      </div>

      {/* Classes */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>📚 Classes by {profile.name}</h2>
      {classes.length === 0
        ? <div className="empty"><div className="empty-icon">📚</div><h3>No classes yet</h3></div>
        : <div className="grid-3" style={{ marginBottom: 32 }}>
            {classes.map(c => {
              const status = getEnrollStatus(c.id);
              return (
                <div key={c.id} className="card">
                  <div className="flex-between" style={{ marginBottom: 8 }}>
                    <span className="badge" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent)' }}>{c.subject}</span>
                    {c.grade && <span className="text-muted text-sm">{c.grade}</span>}
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{c.title}</h3>
                  <p className="text-muted text-sm" style={{ marginBottom: 10 }}>{c.description?.slice(0, 80)}…</p>
                  <div className="flex gap-3 text-sm text-muted" style={{ marginBottom: 12 }}>
                    <span>📹 {c.videos?.length || 0} videos</span>
                    <span>📡 {c.liveSessions?.length || 0} live</span>
                  </div>
                  {c.price && <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 16, marginBottom: 10 }}>₹{c.price}<span className="text-muted text-sm" style={{ fontWeight: 400 }}>/month</span></div>}
                  <div className="divider"></div>
                  <div style={{ marginTop: 10 }}>
                    {!status && (
                      <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}
                        disabled={requesting === c.id} onClick={() => requestEnroll(c)}>
                        {requesting === c.id ? 'Sending…' : '✉️ Request to Enroll'}
                      </button>
                    )}
                    {status === 'pending' && <div style={{ textAlign: 'center' }}><span className="badge badge-pending">⏳ Request Pending</span></div>}
                    {status === 'approved' && <div style={{ textAlign: 'center' }}><span className="badge badge-approved">✓ Enrolled</span></div>}
                    {status === 'rejected' && <div style={{ textAlign: 'center' }}><span className="badge badge-rejected">✗ Rejected</span></div>}
                  </div>
                </div>
              );
            })}
          </div>
      }

      {/* Rate this Tutor */}
      <div className="card" style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>⭐ Rate This Tutor</h3>
        {ratingSuccess && <div className="alert alert-success">{ratingSuccess}</div>}
        <StarPicker value={myRating} onChange={setMyRating} />
        <div className="form-group" style={{ marginTop: 12 }}>
          <label>Write a review (optional)</label>
          <textarea value={myReview} onChange={e => setMyReview(e.target.value)}
            placeholder="Share your experience with this tutor…" rows={3} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={submitRating} disabled={!myRating || submittingRating}>
          {submittingRating ? 'Submitting…' : '⭐ Submit Rating'}
        </button>
      </div>

      {/* Reviews */}
      {ratings.filter(r => r.review).length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>💬 Student Reviews</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ratings.filter(r => r.review).map(r => (
              <div key={r.id} className="card" style={{ padding: '14px 18px' }}>
                <div className="flex-between" style={{ marginBottom: 6 }}>
                  <strong style={{ fontSize: 14 }}>{r.studentName}</strong>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 13, color: i <= r.rating ? '#f59e0b' : 'var(--border-hover)' }}>★</span>)}
                  </div>
                </div>
                <p className="text-muted text-sm">{r.review}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
