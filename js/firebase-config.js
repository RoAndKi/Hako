const firebaseConfig = {
  apiKey: "AIzaSyCApV_aY28T3Q0rb51y7202dvQByIwFx48",
  authDomain: "hako-messenger.firebaseapp.com",
  projectId: "hako-messenger",
  storageBucket: "hako-messenger.firebasestorage.app",
  messagingSenderId: "419229923192",
  appId: "1:419229923192:web:715c8037275f3a1b90ba8d",
  measurementId: "G-Q8G0G40JE9"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

console.log("Firebase initialized successfully");
