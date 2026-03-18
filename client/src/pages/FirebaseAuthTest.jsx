import React, { useState } from 'react';
import { auth } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification 
} from "firebase/auth";
import PushNotificationManager from '../components/PushNotificationManager';

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

      {/* Embedded Push Notification Manager below the auth block */}
      <PushNotificationManager />
    </div>
  );
};

export default FirebaseAuthTest;
