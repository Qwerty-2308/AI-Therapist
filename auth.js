import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    OAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Initialize Firebase with provided configuration
const firebaseConfig = {
  apiKey: "AIzaSyAs9epDg6cgj9Yctk4VTPFMhc-GWYZqcEM",
  authDomain: "serenova-4ed34.firebaseapp.com",
  projectId: "serenova-4ed34",
  storageBucket: "serenova-4ed34.firebasestorage.app",
  messagingSenderId: "365084180891",
  appId: "1:365084180891:web:880ca079ebf9ce08a3213e",
  measurementId: "G-KKBTBBSM4B"
};

// Only initialize Firebase if the configuration has been provided
let app, auth;
const isConfigured = Object.keys(firebaseConfig).length > 0;

if (isConfigured) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // Observer: Redirect users who are already logged in
    onAuthStateChanged(auth, (user) => {
        if (user) {
            globalThis.location.href = "index.html";
        }
    });
}

// ============================================
// UI LOGIC (View Toggling)
// ============================================

const loginView = document.getElementById("login-view");
const signupView = document.getElementById("signup-view");
const linkToSignup = document.getElementById("link-to-signup");
const linkToLogin = document.getElementById("link-to-login");
const errorMsgBox = document.getElementById("auth-error-message");

function showError(msg) {
    errorMsgBox.textContent = msg;
    errorMsgBox.classList.remove("hidden");
}

function hideError() {
    errorMsgBox.textContent = "";
    errorMsgBox.classList.add("hidden");
}

linkToSignup.addEventListener("click", (e) => {
    e.preventDefault();
    hideError();
    loginView.classList.remove("active-view");
    signupView.classList.add("active-view");
});

linkToLogin.addEventListener("click", (e) => {
    e.preventDefault();
    hideError();
    signupView.classList.remove("active-view");
    loginView.classList.add("active-view");
});

// ============================================
// AUTHENTICATION LOGIC
// ============================================

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");

const btnLoginGoogle = document.getElementById("btn-login-google");
const btnLoginMicrosoft = document.getElementById("btn-login-microsoft");
const btnSignupGoogle = document.getElementById("btn-signup-google");
const btnSignupMicrosoft = document.getElementById("btn-signup-microsoft");

// Helper to check config
function requireFirebase() {
    if (!isConfigured) {
        showError("Firebase configuration is missing. Please provide the connection string in auth.js.");
        return false;
    }
    return true;
}

// Email/Password Log In
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();
    if (!requireFirebase()) return;

    const identifier = document.getElementById("login-identifier").value;
    const password = document.getElementById("login-password").value;

    try {
        // Firebase natively expects an email for `signInWithEmailAndPassword`. 
        // If they enter a username, you'd normally need a cloud function or custom logic to map username -> email.
        // For standard Firebase, let's treat it as email by default.
        let email = identifier;
        if (!email.includes('@')) {
            showError("Please enter a valid email address. Username login requires advanced custom backend mapping.");
            return;
        }

        await signInWithEmailAndPassword(auth, email, password);
        globalThis.location.href = "index.html";
    } catch (error) {
        showError(error.message);
    }
});

// Email/Password Sign Up
signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();
    if (!requireFirebase()) return;

    const username = document.getElementById("signup-username").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Set the display name to the chosen username
        await updateProfile(userCredential.user, { displayName: username });
        globalThis.location.href = "index.html";
    } catch (error) {
        showError(error.message);
    }
});

// OAuth Log In / Sign Up
async function handleOAuth(provider) {
    hideError();
    if (!requireFirebase()) return;

    try {
        await signInWithPopup(auth, provider);
        globalThis.location.href = "index.html";
    } catch (error) {
        showError(error.message);
    }
}

const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');

btnLoginGoogle.addEventListener("click", () => handleOAuth(googleProvider));
btnSignupGoogle.addEventListener("click", () => handleOAuth(googleProvider));

btnLoginMicrosoft.addEventListener("click", () => handleOAuth(microsoftProvider));
btnSignupMicrosoft.addEventListener("click", () => handleOAuth(microsoftProvider));
