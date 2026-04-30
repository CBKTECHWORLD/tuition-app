import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import './Auth.css';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, 'users', user.uid));
      const role = snap.data()?.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'tutor') navigate('/tutor');
      else navigate('/student');
    } catch (err) { setError(getFriendlyError(err.code)); }
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch (err) { setError(getFriendlyError(err.code)); }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand"><span className="brand-icon">◈</span> EduLearn</div>
        <h1 className="auth-headline">Learn from the<br /><em>best tutors</em><br />anywhere.</h1>
        <p className="auth-sub">Join thousands of students across India getting quality education online — completely free.</p>
        <div className="auth-stats">
          <div><strong>50+</strong><span>Classes</span></div>
          <div><strong>20+</strong><span>Tutors</span></div>
          <div><strong>500+</strong><span>Students</span></div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card fade-in">
          {!showReset ? <>
            <h2>Welcome back</h2>
            <p className="auth-desc">Sign in to your account</p>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>
            <p style={{textAlign:'center',marginTop:12,fontSize:13}}>
              <button onClick={() => setShowReset(true)} style={{background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontSize:13}}>
                Forgot password?
              </button>
            </p>
            <p className="auth-switch">Don't have an account? <Link to="/signup">Sign up</Link></p>
          </> : <>
            <h2>Reset Password</h2>
            <p className="auth-desc">We'll send a reset link to your email</p>
            {resetSent
              ? <div className="alert alert-success">✅ Reset link sent! Check your email inbox.</div>
              : <>
                  {error && <div className="alert alert-error">{error}</div>}
                  <form onSubmit={handleReset}>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="you@example.com" required />
                    </div>
                    <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}>Send Reset Link</button>
                  </form>
                </>
            }
            <p style={{textAlign:'center',marginTop:12}}>
              <button onClick={() => { setShowReset(false); setResetSent(false); setError(''); }} style={{background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontSize:13}}>
                ← Back to login
              </button>
            </p>
          </>}
        </div>
      </div>
    </div>
  );
}

export function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    if (form.role === 'admin') {
      setError('Admin accounts cannot be created from signup.');
      setLoading(false); return;
    }
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid, name: form.name, email: form.email, role: form.role,
        createdAt: serverTimestamp(),
        approved: form.role === 'tutor' ? false : true,
      });
      if (form.role === 'tutor') navigate('/tutor');
      else navigate('/student');
    } catch (err) { setError(getFriendlyError(err.code)); }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand"><span className="brand-icon">◈</span> EduLearn</div>
        <h1 className="auth-headline">Start your<br /><em>learning journey</em><br />today.</h1>
        <p className="auth-sub">Free access to recorded lessons and live classes. Learn at your own pace, anytime.</p>
        <div className="auth-roles">
          <div className="role-card"><span>🎓</span><strong>Student</strong><p>Join classes, watch videos, attend live sessions, submit assignments</p></div>
          <div className="role-card"><span>👨‍🏫</span><strong>Tutor</strong><p>Create classes, upload content, manage student access & assignments</p></div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card fade-in">
          <h2>Create account</h2>
          <p className="auth-desc">It's free, always</p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label>Full Name</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Your name" required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Min 6 characters" required minLength={6} />
            </div>
            <div className="form-group">
              <label>I am a…</label>
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="student">Student</option>
                <option value="tutor">Tutor</option>
              </select>
            </div>
            {form.role === 'tutor' && (
              <div className="alert alert-success" style={{fontSize:12}}>
                ℹ️ Tutor accounts need admin approval before you can create classes.
              </div>
            )}
            <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} disabled={loading}>
              {loading ? 'Creating…' : 'Create Account →'}
            </button>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}

function getFriendlyError(code) {
  const map = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/invalid-credential': 'Invalid email or password.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}
