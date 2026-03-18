import React, { useState } from 'react';
import { auth } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

const FirebaseAuthTest = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Immediately send verification
      await sendEmailVerification(userCredential.user);
      setStatusMsg("Registration successful! We have sent a verification email, please check your inbox.");
      setShowResend(false);
    } catch (error) {
      setStatusMsg(`Registration Error: ${error.message}`);
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg('');
    setShowResend(false);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setStatusMsg("Access Denied: Your email is not verified yet. Please check your inbox.");
        setShowResend(true);
      } else {
        setStatusMsg(`Login Successful! Welcome, verified user ${user.email}`);
        setShowResend(false);
      }
    } catch (error) {
      setStatusMsg(`Login Error: ${error.message}`);
    }
    setLoading(false);
  };

  const handleResend = async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setStatusMsg("Verification email re-sent successfully!");
        setShowResend(false);
      }
    } catch (error) {
      setStatusMsg(`Resend Error: ${error.message}`);
    }
  };

  const handleGoogleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      setStatusMsg(`Google Login Successful! Welcome, ${user.displayName || user.email}`);
    } catch (error) {
      setStatusMsg(`Google Login Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl shadow-emerald-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-black text-gray-900 tracking-tighter uppercase">
            Firebase Auth Validation
          </h2>
          <p className="mt-2 text-center text-xs text-gray-500 font-bold uppercase tracking-widest">
            Standalone Email Verification Flow
          </p>
        </div>
        
        <form className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-2xl relative block w-full px-4 py-3 border-2 border-gray-100 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm font-semibold transition-all"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-2xl relative block w-full px-4 py-3 border-2 border-gray-100 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm font-semibold transition-all"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleRegister}
              disabled={loading || !email || !password}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-xs font-black rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 uppercase tracking-widest disabled:opacity-50 transition-all"
            >
              1. Register & Send Verification
            </button>
            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-xs font-black rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 uppercase tracking-widest disabled:opacity-50 transition-all"
            >
              2. Validate Login (Checked)
            </button>
          </div>

          <div className="flex items-center my-4">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-widest">Or</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="group relative w-full justify-center py-3 px-4 flex items-center gap-3 border-2 border-gray-100 text-xs font-black rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 uppercase tracking-widest disabled:opacity-50 transition-all shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>

        {statusMsg && (
          <div className={`mt-4 p-4 rounded-xl text-center text-xs font-bold leading-relaxed ${
            statusMsg.includes('Successful') ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
          }`}>
            {statusMsg}
          </div>
        )}

        {showResend && (
          <button
            onClick={handleResend}
            className="mt-4 w-full py-2 flex justify-center font-bold text-xs text-emerald-600 hover:text-emerald-500 uppercase tracking-wider"
          >
            Click here to Re-send Verification Email
          </button>
        )}
      </div>
    </div>
  );
};

export default FirebaseAuthTest;
