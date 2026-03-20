import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAs9epDg6cgj9Yctk4VTPFMhc-GWYZqcEM",
  authDomain: "serenova-4ed34.firebaseapp.com",
  projectId: "serenova-4ed34",
  storageBucket: "serenova-4ed34.firebasestorage.app",
  messagingSenderId: "365084180891",
  appId: "1:365084180891:web:880ca079ebf9ce08a3213e",
  measurementId: "G-KKBTBBSM4B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const navLinks = document.querySelector('.nav-links');
const authBtn = document.getElementById('nav-auth-btn');

onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in. Extract a nice display name
        const displayName = user.displayName || (user.email ? user.email.split('@')[0] : "User");
        
        // Change auth button to profile display
        authBtn.textContent = displayName;
        authBtn.href = "#"; 
        authBtn.style.background = "transparent";
        authBtn.style.color = "var(--color-primary)";
        authBtn.style.boxShadow = "none";
        authBtn.style.padding = "0.5rem 0.5rem";
        authBtn.style.fontWeight = "600";
        authBtn.style.cursor = "default";
        
        // Add a logout button next to their name if it doesn't already exist
        if (!document.getElementById('nav-logout-btn')) {
            const logoutBtn = document.createElement('a');
            logoutBtn.href = "#";
            logoutBtn.id = "nav-logout-btn";
            logoutBtn.className = "btn-primary";
            logoutBtn.style.padding = "0.5rem 1.2rem";
            logoutBtn.style.marginLeft = "0.5rem";
            logoutBtn.style.fontSize = "0.85rem";
            logoutBtn.style.background = "#fff";
            logoutBtn.style.color = "var(--color-primary)";
            logoutBtn.style.border = "1px solid var(--color-border)";
            logoutBtn.style.boxShadow = "none";
            logoutBtn.style.cursor = "pointer";
            logoutBtn.textContent = "Log Out";
            
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await signOut(auth);
                globalThis.location.reload();
            });
            
            navLinks.appendChild(logoutBtn);
        }
    } else {
        // No user is signed in. Make sure the default UI shows "Log In"
        authBtn.textContent = "Log In / Sign Up";
        authBtn.href = "auth.html";
        authBtn.style.background = "var(--color-primary)";
        authBtn.style.color = "#ffffff";
        authBtn.style.boxShadow = "var(--shadow-btn)";
        authBtn.style.padding = "0.5rem 1.2rem";
        authBtn.style.fontWeight = "600";
        authBtn.style.cursor = "pointer";
        
        const logoutBtn = document.getElementById('nav-logout-btn');
        if (logoutBtn) logoutBtn.remove();
    }
});
