// auth.js - Login/Registrierung Funktionalität

class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupFormValidation();
    }

    bindEvents() {
        // Form switching
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchToRegister();
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchToLogin();
        });

        // Form submissions
        document.getElementById('loginFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('registerFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Password strength checking
        document.getElementById('registerPassword').addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
        });

        // Password confirmation validation
        document.getElementById('confirmPassword').addEventListener('input', (e) => {
            this.validatePasswordConfirmation();
        });
    }

    switchToRegister() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }

    switchToLogin() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!this.validateEmail(email)) {
            this.showToast('Bitte geben Sie eine gültige E-Mail-Adresse ein.', 'error');
            return;
        }

        if (!password) {
            this.showToast('Bitte geben Sie Ihr Passwort ein.', 'error');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login fehlgeschlagen');
            }
            
            // Store login state
            if (rememberMe) {
                localStorage.setItem('allKiRememberMe', 'true');
            }
            localStorage.setItem('allKiLoggedIn', 'true');
            localStorage.setItem('allKiUserEmail', email);
            localStorage.setItem('allKiAuthToken', data.token);

            this.showToast('Erfolgreich angemeldet! Weiterleitung...', 'success');
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);

        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleRegister() {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const acceptTerms = document.getElementById('acceptTerms').checked;
        const acceptNewsletter = document.getElementById('acceptNewsletter').checked;

        // Validation
        if (!firstName || !lastName) {
            this.showToast('Bitte geben Sie Ihren Vor- und Nachnamen ein.', 'error');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showToast('Bitte geben Sie eine gültige E-Mail-Adresse ein.', 'error');
            return;
        }

        if (!this.isPasswordStrong(password)) {
            this.showToast('Das Passwort muss mindestens 8 Zeichen lang sein und Buchstaben und Zahlen enthalten.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Die Passwörter stimmen nicht überein.', 'error');
            return;
        }

        if (!acceptTerms) {
            this.showToast('Bitte akzeptieren Sie die Nutzungsbedingungen.', 'error');
            return;
        }

        this.showLoading();

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    email,
                    password,
                    acceptNewsletter
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registrierung fehlgeschlagen');
            }
            
            // Store registration data
            localStorage.setItem('allKiLoggedIn', 'true');
            localStorage.setItem('allKiUserEmail', email);
            localStorage.setItem('allKiUserName', `${firstName} ${lastName}`);
            localStorage.setItem('allKiAuthToken', data.token);
            
            if (acceptNewsletter) {
                localStorage.setItem('allKiNewsletter', 'true');
            }

            this.showToast('Registrierung erfolgreich! Weiterleitung...', 'success');
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);

        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    checkPasswordStrength(password) {
        const strengthIndicator = document.getElementById('passwordStrength');
        
        if (password.length === 0) {
            strengthIndicator.className = 'password-strength';
            return;
        }

        let strength = 0;
        
        // Length check
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        
        // Character variety checks
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        if (strength <= 2) {
            strengthIndicator.className = 'password-strength weak';
        } else if (strength <= 4) {
            strengthIndicator.className = 'password-strength medium';
        } else {
            strengthIndicator.className = 'password-strength strong';
        }
    }

    validatePasswordConfirmation() {
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmInput = document.getElementById('confirmPassword');

        if (confirmPassword && password !== confirmPassword) {
            confirmInput.style.borderColor = 'var(--secondary-red)';
        } else {
            confirmInput.style.borderColor = 'var(--glass-border)';
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isPasswordStrong(password) {
        return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
    }

    setupFormValidation() {
        // Real-time validation for all inputs
        const inputs = document.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                if (!input.value) {
                    input.style.borderColor = 'var(--secondary-red)';
                } else {
                    input.style.borderColor = 'var(--glass-border)';
                }
            });

            input.addEventListener('focus', () => {
                input.style.borderColor = 'var(--primary-turquoise)';
            });
        });
    }

    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Click to dismiss
        toast.addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            this.removeToast(toast);
        }, 4000);
    }

    removeToast(toast) {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    // Check if user is already logged in
    checkAuthStatus() {
        const isLoggedIn = localStorage.getItem('allKiLoggedIn');
        const rememberMe = localStorage.getItem('allKiRememberMe');
        
        if (isLoggedIn === 'true' && rememberMe === 'true') {
            // Auto redirect to dashboard if user chose to stay logged in
            window.location.href = '/dashboard.html';
        }
    }

    // Pre-fill email if remembered
    prefillForm() {
        const rememberedEmail = localStorage.getItem('allKiUserEmail');
        const rememberMe = localStorage.getItem('allKiRememberMe');
        
        if (rememberedEmail && rememberMe === 'true') {
            document.getElementById('loginEmail').value = rememberedEmail;
            document.getElementById('rememberMe').checked = true;
        }
    }
}

// Initialize AuthManager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const authManager = new AuthManager();
    
    // Check if user should be auto-logged in
    authManager.checkAuthStatus();
    
    // Pre-fill form if user data is remembered
    authManager.prefillForm();
});

// Utility function to clear all auth data
function clearAuthData() {
    localStorage.removeItem('allKiLoggedIn');
    localStorage.removeItem('allKiUserEmail');
    localStorage.removeItem('allKiUserName');
    localStorage.removeItem('allKiAuthToken');
    localStorage.removeItem('allKiRememberMe');
    localStorage.removeItem('allKiNewsletter');
}

// Export for potential use in other scripts
window.AuthManager = AuthManager;
window.clearAuthData = clearAuthData;