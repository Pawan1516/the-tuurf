const admin = require('firebase-admin');

// 💡 TIP: For production, you should use a service account JSON file.
// Or set these environment variables in your server provider (Render/Vercel).
let firebaseApp = null;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK Initialized from Service Account.');
  } else {
    // Fallback for development if only Project ID is available
    // Note: token verification will likely fail without full credentials
    firebaseApp = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'the-turf-79c80'
    });
    console.log('⚠️ Firebase Admin SDK Initialized with Project ID only.');
  }
} catch (error) {
  console.error('❌ Firebase Admin Init Failure:', error.message);
}

module.exports = admin;
