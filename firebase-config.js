export const firebaseConfig = {
  apiKey: "AIzaSyCh4S8PEazdy9VPIXhbUR8yvtWmuzYSigQ",
  authDomain: "daily-to-do-list-3006d.firebaseapp.com",
  projectId: "daily-to-do-list-3006d",
  storageBucket: "daily-to-do-list-3006d.firebasestorage.app",
  messagingSenderId: "650805906695",
  appId: "1:650805906695:web:9731fd6722ae3d442249a2",
};

export function isFirebaseConfigured(config = firebaseConfig) {
  return Object.values(config).every(
    (value) => typeof value === "string" && value.trim() && !value.startsWith("PASTE_"),
  );
}
