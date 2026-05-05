import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','English','Hindi','History','Geography','Computer Science','Economics','Other'];

function avatarColor(name) {
  const colors = [
    ['#6366f1','#4f46e5'],['#8b5cf6','#7c3aed'],['#14b8a6','#0d9488'],
    ['#f59e0b','#d97706'],['#ef4444','#dc2626'],['#10b981','#059669'],
    ['#3b82f6','#2563eb'],['#ec4899','#db2777'],
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
}

export default function TutorProfileSetup() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    bio: '', subjects: [], experience: '',
    qualification: '', phone: '', city: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, 'tutorProfiles', currentUser.uid));
      if (snap.exists()) {
        const data = snap.data();
        setForm({
          bio: data.bio || '',
          subjects: data.subjects || [],
          experience: data.experience || '',
          qualification: data.qualification || '',
          phone: data.phone || '',
          city: data.city || '',
        });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const toggleSubject = (s) => {
    setForm(f => ({
      ...f,
      subjects: f.subjects.includes(s) ? f.subjects.filter(x => x !== s) : [...f.subjects, s]
    }));
  };

  const save = async () => {
    setSaving(true); setError('');
    await setDoc(doc(db, 'tutorProfiles', currentUser.uid), {
      ...form,
      tutorId: currentUser.uid,
      name: userData.name,
      email: currentUser.email,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    setSuccess('✅ Profile saved!');
    setTimeout(() => { setSuccess(''); navigate('/tutor'); }, 1500);
    setSaving(false);
  };

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;

  const [c1, c2] = avatarColor(userData?.name);

  return (
    <div className="page fade-in" style={{ maxWidth: 680 }}>
      <div className="page-header">
        <h1>My Profile</h1>
        <p className="text-muted">Help students know who you are — all fields are optional except subjects</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Avatar Preview */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${c1}, ${c2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, color: '#fff',
        }}>
          {userData?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{userData?.name}</div>
          <div className="text-muted text-sm">{form.qualification || 'Add your qualification below'}</div>
          <div className="text-muted text-sm">{form.city ? `📍 ${form.city}` : ''}</div>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
            Your avatar is auto-generated from your name. Students will see this on your profile.
          </p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>📋 Basic Info <span className="text-muted text-sm">(all optional)</span></h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Qualification</label>
            <input value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}
              placeholder="e.g. B.Tech, M.Sc Mathematics" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Years of Experience</label>
            <input value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))}
              placeholder="e.g. 5 years" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>City</label>
            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              placeholder="e.g. Delhi, Mumbai" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Contact (shown only to enrolled students)</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="WhatsApp number or email" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1', margin: 0 }}>
            <label>Bio — tell students about yourself</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="e.g. I have 5 years of experience teaching Mathematics for Class 10-12 students. I focus on clearing fundamentals and exam preparation."
              rows={4} />
          </div>
        </div>
      </div>

      {/* Subjects */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>📚 Subjects You Teach</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SUBJECTS.map(s => (
            <button key={s} onClick={() => toggleSubject(s)}
              className={`btn btn-sm ${form.subjects.includes(s) ? 'btn-primary' : 'btn-outline'}`}>
              {s}
            </button>
          ))}
        </div>
        {form.subjects.length === 0 && (
          <p className="text-muted text-sm" style={{ marginTop: 10 }}>Select at least one subject so students can find you by subject filter</p>
        )}
      </div>

      <div className="flex-between">
        <button className="btn btn-outline" onClick={() => navigate('/tutor')}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : '✓ Save Profile'}
        </button>
      </div>
    </div>
  );
}
