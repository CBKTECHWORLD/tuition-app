import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

function VideoModal({ video, onClose }) {
  let embedSrc = '';
  if (video.type === 'youtube') {
    embedSrc = `https://www.youtube.com/embed/${video.embedId}?autoplay=1`;
  } else if (video.type === 'drive') {
    embedSrc = `https://drive.google.com/file/d/${video.embedId}/preview`;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={{ width: '90%', maxWidth: 860 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{video.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="video-embed" style={{ height: 480 }}>
          <iframe src={embedSrc} title={video.title} allowFullScreen allow="autoplay" />
        </div>
        {video.description && <p className="text-muted text-sm" style={{ marginTop: 12 }}>{video.description}</p>}
      </div>
    </div>
  );
}

function LiveModal({ session, onClose }) {
  const jitsiUrl = `https://meet.jit.si/${session.roomName}`;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={{ width: '95%', maxWidth: 1000 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📡 {session.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="live-frame">
          <iframe src={jitsiUrl} title="Live Class" allow="camera; microphone; fullscreen; display-capture" />
        </div>
        <div className="flex-between" style={{ marginTop: 12 }}>
          <p className="text-muted text-sm">{session.date} at {session.time} · {session.duration} min</p>
          <a href={jitsiUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Open in New Tab ↗</a>
        </div>
      </div>
    </div>
  );
}

export default function StudentMyClasses() {
  const { currentUser } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [classes, setClasses] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeClass, setActiveClass] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(query(
        collection(db, 'enrollments'),
        where('studentId', '==', currentUser.uid),
        where('status', '==', 'approved')
      ));
      const enroll = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEnrollments(enroll);

      const classData = {};
      for (const e of enroll) {
        const cSnap = await getDoc(doc(db, 'classes', e.classId));
        if (cSnap.exists()) classData[e.classId] = { id: cSnap.id, ...cSnap.data() };
      }
      setClasses(classData);
      setLoading(false);
    };
    fetch();
  }, [currentUser]);

  if (loading) return <div className="loader-wrap"><div className="spinner"></div></div>;

  const selectedClass = activeClass ? classes[activeClass] : null;

  return (
    <div className="page fade-in">
      {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
      {activeSession && <LiveModal session={activeSession} onClose={() => setActiveSession(null)} />}

      <div className="page-header">
        <h1>My Enrollments</h1>
        <p className="text-muted">Your approved classes — watch videos and join live sessions</p>
      </div>

      {enrollments.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📚</div>
          <h3>No approved classes yet</h3>
          <p>Browse classes and request to join. Admin will approve you shortly.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: activeClass ? '280px 1fr' : '1fr', gap: 24 }}>
          {/* Class List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {enrollments.map(e => {
              const cls = classes[e.classId];
              if (!cls) return null;
              return (
                <div key={e.id} className="card"
                  style={{ cursor: 'pointer', borderColor: activeClass === e.classId ? 'var(--accent)' : undefined, background: activeClass === e.classId ? 'rgba(99,102,241,0.05)' : undefined }}
                  onClick={() => setActiveClass(e.classId)}>
                  <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)', marginBottom: 6 }}>{cls.subject}</span>
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>{cls.title}</h3>
                  <p className="text-muted text-sm mt-1">👨‍🏫 {cls.tutorName}</p>
                  <div className="flex gap-3 text-sm text-muted mt-2">
                    <span>📹 {cls.videos?.length || 0}</span>
                    <span>📡 {cls.liveSessions?.length || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Class Content */}
          {selectedClass && (
            <div className="fade-in">
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="flex-between">
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selectedClass.title}</h2>
                    <p className="text-muted text-sm mt-1">{selectedClass.description}</p>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => setActiveClass(null)}>✕ Close</button>
                </div>
              </div>

              {/* Videos */}
              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>🎬 Recorded Lessons ({selectedClass.videos?.length || 0})</h3>
                {!selectedClass.videos?.length
                  ? <p className="text-muted text-sm">No videos uploaded yet.</p>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selectedClass.videos.map((v, i) => (
                        <div key={v.id} className="flex-between"
                          style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.2s' }}
                          onClick={() => setActiveVideo(v)}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                          <div className="flex gap-3" style={{ alignItems: 'center' }}>
                            <div style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                              {i + 1}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 14 }}>{v.title}</div>
                              {v.description && <div className="text-muted text-sm">{v.description}</div>}
                            </div>
                          </div>
                          <div className="flex gap-2" style={{ alignItems: 'center' }}>
                            <span className={`badge ${v.type === 'youtube' ? 'badge-approved' : 'badge-pending'}`}>{v.type === 'youtube' ? '▶ YouTube' : '📁 Drive'}</span>
                            <span style={{ color: 'var(--accent)', fontSize: 18 }}>▶</span>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </div>

              {/* Live Sessions */}
              <div className="card">
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>📡 Live Sessions ({selectedClass.liveSessions?.length || 0})</h3>
                {!selectedClass.liveSessions?.length
                  ? <p className="text-muted text-sm">No live sessions scheduled yet.</p>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selectedClass.liveSessions.map(s => {
                        const sessionDate = new Date(`${s.date}T${s.time}`);
                        const isUpcoming = sessionDate > new Date();
                        return (
                          <div key={s.id} className="flex-between"
                            style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 16px', border: `1px solid ${isUpcoming ? 'rgba(20,184,166,0.3)' : 'var(--border)'}` }}>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: 14 }}>{s.title}</div>
                              <div className="text-muted text-sm mt-1">
                                📅 {s.date} · ⏰ {s.time} · ⏱ {s.duration} min
                              </div>
                            </div>
                            <div className="flex gap-2" style={{ alignItems: 'center' }}>
                              {isUpcoming && <span className="badge" style={{ background: 'rgba(20,184,166,0.15)', color: 'var(--teal)' }}>Upcoming</span>}
                              <button className="btn btn-primary btn-sm" onClick={() => setActiveSession(s)}>
                                📡 Join Live
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
