const admin = require('firebase-admin');
const serviceAccount = require('../path/to/serviceAccountKey.json'); // Update the path to your service account key file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_URL // Update with your database URL
});

module.exports = admin;
