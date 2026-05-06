
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA4HZMENFr5VFKQfiTH-f02PHx1rvSFz8E",
  authDomain: "exam-96957713-e7f90.firebaseapp.com",
  projectId: "exam-96957713-e7f90",
  storageBucket: "exam-96957713-e7f90.firebasestorage.app",
  messagingSenderId: "182607695170",
  appId: "1:182607695170:web:404223a937f132bdf58cdb",
  measurementId: "G-FL0J34VE29"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, auth, storage };
