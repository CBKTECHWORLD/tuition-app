import { useState, useEffect } from 'react';
import { doc, addDoc, getDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'History', 'Geography', 'Computer Science', 'Economics', 'Other'];

function extractYouTubeId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

function makeJitsiRoom(title) {
  return title.replace(/[^a-zA-Z0-9]/g, '') + Math.random().toString(36).substr(2, 6);
}

export default function TutorCreateClass() {
  const { currentUser, userData } = useAuth();
  const { classId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!classId;

  const [form, setForm] = useState({ title: '', subject: 'Mathematics', description: '', grade: '' });
  const [videos, setVideos] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [newVideo, setNewVideo] = useState({ title: '', url: '', description: '' });
  const [newSession, setNewSession] = useState({ title: '', date: '', time: '', duration: '60' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    const fetch = async () => {
      const snap = await getDoc(doc(db, 'classes', classId));
      if (snap.exists()) {
        const d = snap.data();
        setForm({ title: d.title, subject: d.subject, description: d.description, grade: d.grade || '' });
        setVideos(d.videos || []);
        setLiveSessions(d.liveSessions || []);
      }
      setLoading(false);
    };
    fetch();
  }, [classId, isEdit]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const addVideo = () => {
    if (!newVideo.title || !newVideo.url) return setError('Video title and URL are required.');
    const ytId = extractYouTubeId(newVideo.url);
    const driveMatch = newVideo.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!ytId && !driveMatch) return setError('Please enter a valid YouTube or Google Drive URL.');
    setError('');
    const type = ytId ? 'youtube' : 'drive';
    const embedId = ytId || driveMatch[1];
    setVideos(prev => [...prev, { ...newVideo, type, embedId, id: Date.now().toString() }]);
    setNewVideo({ title: '', url: '', description: '' });
  };

  const addLiveSession = () => {
    if (!newSession.title || !newSession.date || !newSession.time) return setError('All live session fields are required.');
    setError('');
    const roomName = makeJitsiRoom(newSession.title);
    setLiveSessions(prev => [...prev, { ...newSession, roomName, id: Date.now().toString() }]);
    setNewSession({ title: '', date: '', time: '', duration: '60' });
  };

  const removeVideo = (id) => setVideos(prev => prev.filter(v => v.id !== id));
  const removeSession = (id) => setLiveSessions(prev => prev.filter(s => s.id !== id));

  const handleSave = async () => {
    if (!form.title || !form.subject || !form.description) return setError('Title, subject and description are required.');
    setSaving(true); setError('');
    const data = {
      ...form, videos, liveSessions,
      tutorId: currentUser.uid, tutorName: userData.name,
      updatedAt: serverTimestamp(),
    };
    try {
      if (isEdit) {
        await updateDoc(doc(db, 'classes', classId), data);
      } else {
        await addDoc(collection(db, 'classes'), { ...data, createdAt: serverTimestamp() });
      }
      setSuccess(isEdit ? 'Class updated!' : 'Class created successfully!');
      setTimeout(() => navigate('/tutor'), 1200);
    } catch (e) {
      setError('Failed to save. Please try again.');
    }
    setSaving(false);
  };

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;

  return (
    <div className="page fade-in">
      <div className="page-header flex-between">
        <div>
          <h1>{isEdit ? 'Edit Class' : 'Create New Class'}</h1>
          <p className="text-muted">Fill in the details for your class</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/tutor')}>← Back</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Basic Info */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📋 Class Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label>Class Title *</label>
            <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Class 10 Mathematics – Algebra" />
          </div>
          <div className="form-group">
            <label>Subject *</label>
            <select name="subject" value={form.subject} onChange={handleChange}>
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Grade / Class</label>
            <input name="grade" value={form.grade} onChange={handleChange} placeholder="e.g. Class 10, Grade 12" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label>Description *</label>
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="What will students learn? Who is this for?" rows={3} />
          </div>
        </div>
      </div>

      {/* Recorded Videos */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>🎬 Recorded Videos</h2>
        <p className="text-muted text-sm" style={{ marginBottom: 16 }}>Paste YouTube Unlisted or Google Drive share links</p>

        {videos.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {videos.map((v, i) => (
              <div key={v.id} className="flex-between" style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                <div>
                  <span style={{ color: 'var(--text2)', fontSize: 12, marginRight: 8 }}>#{i + 1}</span>
                  <strong style={{ fontSize: 14 }}>{v.title}</strong>
                  <span style={{ marginLeft: 8 }} className={`badge ${v.type === 'youtube' ? 'badge-approved' : 'badge-pending'}`}>
                    {v.type === 'youtube' ? '▶ YouTube' : '📁 Drive'}
                  </span>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => removeVideo(v.id)}>Remove</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: 'var(--text2)' }}>Add a video:</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Video Title</label>
              <input value={newVideo.title} onChange={e => setNewVideo(p => ({ ...p, title: e.target.value }))} placeholder="Lesson 1 – Introduction" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>YouTube or Google Drive URL</label>
              <input value={newVideo.url} onChange={e => setNewVideo(p => ({ ...p, url: e.target.value }))} placeholder="https://youtu.be/... or drive.google.com/..." />
            </div>
            <div className="form-group" style={{ margin: 0, gridColumn: '1/-1' }}>
              <label>Short description (optional)</label>
              <input value={newVideo.description} onChange={e => setNewVideo(p => ({ ...p, description: e.target.value }))} placeholder="What is covered in this video?" />
            </div>
          </div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={addVideo}>+ Add Video</button>
        </div>
      </div>

      {/* Live Sessions */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>📡 Live Sessions</h2>
        <p className="text-muted text-sm" style={{ marginBottom: 16 }}>Schedule live classes via Jitsi Meet (free, no download needed)</p>

        {liveSessions.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {liveSessions.map(s => (
              <div key={s.id} className="flex-between" style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                <div>
                  <strong style={{ fontSize: 14 }}>{s.title}</strong>
                  <span className="text-muted text-sm" style={{ marginLeft: 8 }}>{s.date} at {s.time} · {s.duration} min</span>
                </div>
                <div className="flex gap-2">
                  <a href={`https://meet.jit.si/${s.roomName}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Open Room</a>
                  <button className="btn btn-danger btn-sm" onClick={() => removeSession(s.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: 'var(--text2)' }}>Schedule a session:</p>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Session Title</label>
              <input value={newSession.title} onChange={e => setNewSession(p => ({ ...p, title: e.target.value }))} placeholder="Live Doubt Session" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Date</label>
              <input type="date" value={newSession.date} onChange={e => setNewSession(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Time</label>
              <input type="time" value={newSession.time} onChange={e => setNewSession(p => ({ ...p, time: e.target.value }))} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Duration (min)</label>
              <input type="number" value={newSession.duration} onChange={e => setNewSession(p => ({ ...p, duration: e.target.value }))} min="15" max="300" />
            </div>
          </div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={addLiveSession}>+ Schedule Session</button>
        </div>
      </div>

      <div className="flex-between">
        <button className="btn btn-outline" onClick={() => navigate('/tutor')}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? '✓ Update Class' : '✓ Publish Class'}
        </button>
      </div>
    </div>
  );
}
