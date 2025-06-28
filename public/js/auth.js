/**
 * 🔐 AUTH JAVASCRIPT
 * Login und Registrierung Funktionalität
 * 
 * SEPARATION OF CONCERNS:
 * - Form Handling
 * - API Communication  
 * - Validation
 * - UI Updates
 * - Local Storage Management
 */

class AuthManager {
    constructor() {
        this.currentForm = 'login';
        this.isLoading = false;
        
        this.initializeEventListeners();
        this.loadStoredData();
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    initializeEventListeners() {
        // Form submissions
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Form toggle buttons
        const toggleToRegister = document.getElementById('toggleToRegister');
        const toggleToLogin = document.getElementById('toggleToLogin');
        
        if (toggleToRegister) {
            toggleToRegister.addEventListener('click', () => this.switchToRegister());
        }
        
        if (toggleToLogin) {
            toggleToLogin.addEventListener('click', () => this.switchToLogin());
        }

        // Real-time validation
        this.setupRealTimeValidation();
        
        // Auto-login check
        this.checkAutoLogin();
    }

    setupRealTimeValidation() {
        const inputs = document.querySelectorAll('input[type="email"], input[type="password"], input[type="text"]');
        
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearErrors(input));
        });
    }

    // ========================================
    // FORM SWITCHING
    // ========================================

    switchToRegister() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm && registerForm) {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            this.currentForm = 'register';
        }
    }

    switchToLogin() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm && registerForm) {
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            this.currentForm = 'login';
        }
    }

    // ========================================
    // FORM HANDLING
    // ========================================

    async handleLogin(event) {
        event.preventDefault();
        
        if (this.isLoading) return;

        const formData = new FormData(event.target);
        const loginData = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        // Validate form
        if (!this.validateLoginForm(loginData)) {
            return;
        }

        this.setLoadingState(true);

        try {
            const response = await this.apiCall('/api/auth/login', 'POST', loginData);
            
            if (response.success) {
                this.handleLoginSuccess(response);
            } else {
                this.showError(response.message || 'Login fehlgeschlagen');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
        } finally {
            this.setLoadingState(false);
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        if (this.isLoading) return;

        const formData = new FormData(event.target);
        const registerData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };

        // Validate form
        if (!this.validateRegisterForm(registerData)) {
            return;
        }

        this.setLoadingState(true);

        try {
            const response = await this.apiCall('/api/auth/register', 'POST', registerData);
            
            if (response.success) {
                this.handleRegisterSuccess(response);
            } else {
                this.showError(response.message || 'Registrierung fehlgeschlagen');
            }
            
        } catch (error) {
            console.error('Register error:', error);
            this.showError('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
        } finally {
            this.setLoadingState(false);
        }
    }

    // ========================================
    // VALIDATION
    // ========================================

    validateLoginForm(data) {
        let isValid = true;

        // Email validation
        if (!data.email || !this.isValidEmail(data.email)) {
            this.showFieldError('email', 'Bitte geben Sie eine gültige E-Mail-Adresse ein');
            isValid = false;
        }

        // Password validation
        if (!data.password || data.password.length < 6) {
            this.showFieldError('password', 'Passwort muss mindestens 6 Zeichen haben');
            isValid = false;
        }

        return isValid;
    }

    validateRegisterForm(data) {
        let isValid = true;

        // First name validation
        if (!data.firstName || data.firstName.trim().length < 2) {
            this.showFieldError('firstName', 'Vorname muss mindestens 2 Zeichen haben');
            isValid = false;
        }

        // Last name validation
        if (!data.lastName || data.lastName.trim().length < 2) {
            this.showFieldError('lastName', 'Nachname muss mindestens 2 Zeichen haben');
            isValid = false;
        }

        // Email validation
        if (!data.email || !this.isValidEmail(data.email)) {
            this.showFieldError('email', 'Bitte geben Sie eine gültige E-Mail-Adresse ein');
            isValid = false;
        }

        // Password validation
        if (!data.password || data.password.length < 6) {
            this.showFieldError('password', 'Passwort muss mindestens 6 Zeichen haben');
            isValid = false;
        }

        // Confirm password validation
        if (data.password !== data.confirmPassword) {
            this.showFieldError('confirmPassword', 'Passwörter stimmen nicht überein');
            isValid = false;
        }

        return isValid;
    }

    validateField(input) {
        const value = input.value.trim();
        const fieldName = input.name;

        switch (fieldName) {
            case 'email':
                if (!this.isValidEmail(value)) {
                    this.showFieldError(fieldName, 'Ungültige E-Mail-Adresse');
                    return false;
                }
                break;
            case 'password':
                if (value.length < 6) {
                    this.showFieldError(fieldName, 'Mindestens 6 Zeichen erforderlich');
                    return false;
                }
                break;
            case 'firstName':
            case 'lastName':
                if (value.length < 2) {
                    this.showFieldError(fieldName, 'Mindestens 2 Zeichen erforderlich');
                    return false;
                }
                break;
        }

        this.clearFieldError(fieldName);
        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // ========================================
    // API COMMUNICATION
    // ========================================

    async apiCall(url, method, data = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        return await response.json();
    }

    // ========================================
    // SUCCESS HANDLERS
    // ========================================

    handleLoginSuccess(response) {
        // Store user data
        if (response.token) {
            localStorage.setItem('authToken', response.token);
        }
        
        if (response.user) {
            localStorage.setItem('userData', JSON.stringify(response.user));
        }

        this.showSuccess('Erfolgreich angemeldet! Weiterleitung...');

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 1500);
    }

    handleRegisterSuccess(response) {
        this.showSuccess('Registrierung erfolgreich! Sie können sich jetzt anmelden.');
        
        // Switch to login form
        setTimeout(() => {
            this.switchToLogin();
            
            // Pre-fill email if available
            if (response.email) {
                const emailInput = document.querySelector('#loginForm input[name="email"]');
                if (emailInput) {
                    emailInput.value = response.email;
                }
            }
        }, 2000);
    }

    // ========================================
    // UI HELPERS
    // ========================================

    setLoadingState(loading) {
        this.isLoading = loading;
        
        const submitBtns = document.querySelectorAll('.submit-btn');
        const forms = document.querySelectorAll('.auth-form');
        
        submitBtns.forEach(btn => {
            btn.disabled = loading;
            btn.textContent = loading ? 'Wird verarbeitet...' : 
                (btn.closest('#loginForm') ? 'Anmelden' : 'Registrieren');
        });
        
        forms.forEach(form => {
            form.classList.toggle('form-loading', loading);
        });
    }

    showError(message, fieldName = null) {
        if (fieldName) {
            this.showFieldError(fieldName, message);
        } else {
            // Show general error
            const existingError = document.querySelector('.general-error');
            if (existingError) {
                existingError.remove();
            }

            const errorDiv = document.createElement('div');
            errorDiv.className = 'general-error error-message';
            errorDiv.textContent = message;
            
            const activeForm = document.querySelector('.auth-form:not(.hidden)');
            if (activeForm) {
                activeForm.insertBefore(errorDiv, activeForm.firstChild);
            }
        }
    }

    showSuccess(message) {
        const existingMessages = document.querySelectorAll('.general-error, .general-success');
        existingMessages.forEach(msg => msg.remove());

        const successDiv = document.createElement('div');
        successDiv.className = 'general-success success-message';
        successDiv.textContent = message;
        
        const activeForm = document.querySelector('.auth-form:not(.hidden)');
        if (activeForm) {
            activeForm.insertBefore(successDiv, activeForm.firstChild);
        }
    }

    showFieldError(fieldName, message) {
        const input = document.querySelector(`input[name="${fieldName}"]`);
        if (!input) return;

        input.classList.add('form-error');
        
        // Remove existing error
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Add new error
        const errorSpan = document.createElement('span');
        errorSpan.className = 'error-message';
        errorSpan.textContent = message;
        input.parentNode.appendChild(errorSpan);
    }

    clearFieldError(fieldName) {
        const input = document.querySelector(`input[name="${fieldName}"]`);
        if (!input) return;

        input.classList.remove('form-error');
        
        const error = input.parentNode.querySelector('.error-message');
        if (error) {
            error.remove();
        }
    }

    clearErrors(input) {
        input.classList.remove('form-error');
        const error = input.parentNode.querySelector('.error-message');
        if (error) {
            error.remove();
        }
    }

    // ========================================
    // AUTO-LOGIN & STORAGE
    // ========================================

    checkAutoLogin() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
            // Check if token is still valid
            this.validateStoredToken(token);
        }
    }

    async validateStoredToken(token) {
        try {
            const response = await this.apiCall('/api/auth/validate', 'POST', { token });
            
            if (response.valid) {
                // Token is valid, redirect to dashboard
                window.location.href = '/dashboard';
            } else {
                // Token is invalid, clear storage
                this.clearStoredData();
            }
        } catch (error) {
            // Error validating token, clear storage
            this.clearStoredData();
        }
    }

    loadStoredData() {
        // Pre-fill email if available
        const lastEmail = localStorage.getItem('lastEmail');
        if (lastEmail) {
            const emailInput = document.querySelector('input[name="email"]');
            if (emailInput) {
                emailInput.value = lastEmail;
            }
        }
    }

    clearStoredData() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
    }
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}