/**
 * 🔐 AUTH JAVASCRIPT MIT DEBUG & VERBESSERTER VALIDATION
 * ERSETZEN IN: public/js/auth.js
 */

class AuthManager {
    constructor() {
        this.currentForm = 'login';
        this.isLoading = false;
        this.debugMode = false;
        
        // Wait for DOM to be loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        console.log('🔐 AuthManager: Initializing...');
        this.initializeEventListeners();
        this.loadStoredData();
        this.setupDebugMode();
        console.log('✅ AuthManager: Ready');
    }

    setupDebugMode() {
        // Enable debug mode in development
        this.debugMode = window.location.hostname === 'localhost';
        this.updateDebug('AuthManager initialized');
    }

    updateDebug(message, isRegister = false) {
        if (window.updateDebug) {
            window.updateDebug(message, isRegister);
        }
        console.log('🔧 Auth:', message);
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    initializeEventListeners() {
        // Form submissions
        const loginForm = document.querySelector('#loginForm form');
        const registerForm = document.querySelector('#registerForm form');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            console.log('✅ Login form listener attached');
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
            console.log('✅ Register form listener attached');
        }

        // Form toggle buttons
        const toggleToRegister = document.getElementById('toggleToRegister');
        const toggleToLogin = document.getElementById('toggleToLogin');
        
        if (toggleToRegister) {
            toggleToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchToRegister();
            });
        }
        
        if (toggleToLogin) {
            toggleToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchToLogin();
            });
        }

        // Real-time validation
        this.setupRealTimeValidation();
    }

    setupRealTimeValidation() {
        // Password confirmation real-time check
        const confirmPasswordField = document.getElementById('confirmPassword');
        const passwordField = document.getElementById('registerPassword');
        
        if (confirmPasswordField && passwordField) {
            const checkPasswordMatch = () => {
                const password = passwordField.value;
                const confirmPassword = confirmPasswordField.value;
                
                this.updateDebug(`Password: ${password.length} chars, Confirm: ${confirmPassword.length} chars`, true);
                
                if (confirmPassword.length > 0) {
                    if (password === confirmPassword) {
                        this.clearFieldError('confirmPassword');
                        confirmPasswordField.style.borderColor = '#28a745';
                        this.updateDebug('✅ Passwords match', true);
                    } else {
                        confirmPasswordField.style.borderColor = '#dc3545';
                        this.updateDebug('❌ Passwords do not match', true);
                    }
                }
            };
            
            passwordField.addEventListener('input', checkPasswordMatch);
            confirmPasswordField.addEventListener('input', checkPasswordMatch);
            
            console.log('✅ Real-time password validation setup');
        }
        
        // Email validation
        const emailFields = document.querySelectorAll('input[type="email"]');
        emailFields.forEach(field => {
            field.addEventListener('blur', () => {
                if (field.value && !this.isValidEmail(field.value)) {
                    this.showFieldError(field.name, 'Ungültige E-Mail-Adresse');
                } else {
                    this.clearFieldError(field.name);
                }
            });
        });
    }

    // ========================================
    // FORM SWITCHING
    // ========================================

    switchToRegister() {
        console.log('🔄 Switching to register form');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm && registerForm) {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            this.currentForm = 'register';
            this.clearAllErrors();
            this.updateDebug('Switched to registration form', true);
        }
    }

    switchToLogin() {
        console.log('🔄 Switching to login form');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm && registerForm) {
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            this.currentForm = 'login';
            this.clearAllErrors();
            this.updateDebug('Switched to login form');
        }
    }

    // ========================================
    // FORM HANDLING
    // ========================================

    async handleLogin(event) {
        event.preventDefault();
        console.log('🔑 Handling login...');
        
        if (this.isLoading) {
            this.updateDebug('Already loading, ignoring login attempt');
            return;
        }

        const formData = new FormData(event.target);
        const loginData = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        this.updateDebug(`Login attempt: ${loginData.email} (password: ${loginData.password.length} chars)`);

        // Validate form
        if (!this.validateLoginForm(loginData)) {
            this.updateDebug('Login validation failed');
            return;
        }

        this.setLoadingState(true);
        this.updateDebug('Sending login request...');

        try {
            const response = await this.apiCall('/api/auth/login', 'POST', loginData);
            this.updateDebug(`Login response: ${JSON.stringify(response)}`);
            
            if (response.success) {
                this.handleLoginSuccess(response);
            } else {
                this.showError(response.error || response.message || 'Login fehlgeschlagen');
                this.updateDebug(`Login failed: ${response.error || response.message}`);
            }
            
        } catch (error) {
            console.error('❌ Login error:', error);
            this.showError('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
            this.updateDebug(`Login error: ${error.message}`);
        } finally {
            this.setLoadingState(false);
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        console.log('👤 Handling registration...');
        
        if (this.isLoading) {
            this.updateDebug('Already loading, ignoring register attempt', true);
            return;
        }

        const formData = new FormData(event.target);
        const registerData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };

        this.updateDebug(`Register attempt: ${registerData.firstName} ${registerData.lastName} (${registerData.email})`, true);
        this.updateDebug(`Password: ${registerData.password.length} chars, Confirm: ${registerData.confirmPassword.length} chars`, true);

        // DETAILED validation logging
        if (registerData.password !== registerData.confirmPassword) {
            this.updateDebug(`❌ Password mismatch! Password: "${registerData.password}" vs Confirm: "${registerData.confirmPassword}"`, true);
        } else {
            this.updateDebug(`✅ Passwords match: "${registerData.password}"`, true);
        }

        // Validate form
        if (!this.validateRegisterForm(registerData)) {
            this.updateDebug('Register validation failed', true);
            return;
        }

        this.setLoadingState(true);
        this.updateDebug('Sending register request...', true);

        try {
            const response = await this.apiCall('/api/auth/register', 'POST', registerData);
            this.updateDebug(`Register response: ${JSON.stringify(response)}`, true);
            
            if (response.success) {
                this.handleRegisterSuccess(response);
            } else {
                this.showError(response.error || response.message || 'Registrierung fehlgeschlagen');
                this.updateDebug(`Register failed: ${response.error || response.message}`, true);
            }
            
        } catch (error) {
            console.error('❌ Register error:', error);
            this.showError('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
            this.updateDebug(`Register error: ${error.message}`, true);
        } finally {
            this.setLoadingState(false);
        }
    }

    // ========================================
    // IMPROVED VALIDATION
    // ========================================

    validateLoginForm(data) {
        let isValid = true;
        this.clearAllErrors();

        this.updateDebug(`Validating login: email="${data.email}", password="${data.password}"`);

        if (!data.email || !this.isValidEmail(data.email)) {
            this.showFieldError('email', 'Bitte geben Sie eine gültige E-Mail-Adresse ein');
            isValid = false;
        }

        if (!data.password || data.password.length < 6) {
            this.showFieldError('password', 'Passwort muss mindestens 6 Zeichen haben');
            isValid = false;
        }

        this.updateDebug(`Login validation result: ${isValid}`);
        return isValid;
    }

    validateRegisterForm(data) {
        let isValid = true;
        this.clearAllErrors();

        this.updateDebug(`Validating register form...`, true);

        // First name validation
        if (!data.firstName || data.firstName.trim().length < 2) {
            this.showFieldError('firstName', 'Vorname muss mindestens 2 Zeichen haben');
            this.updateDebug(`❌ First name invalid: "${data.firstName}"`, true);
            isValid = false;
        }

        // Last name validation
        if (!data.lastName || data.lastName.trim().length < 2) {
            this.showFieldError('lastName', 'Nachname muss mindestens 2 Zeichen haben');
            this.updateDebug(`❌ Last name invalid: "${data.lastName}"`, true);
            isValid = false;
        }

        // Email validation
        if (!data.email || !this.isValidEmail(data.email)) {
            this.showFieldError('email', 'Bitte geben Sie eine gültige E-Mail-Adresse ein');
            this.updateDebug(`❌ Email invalid: "${data.email}"`, true);
            isValid = false;
        }

        // Password validation
        if (!data.password || data.password.length < 6) {
            this.showFieldError('password', 'Passwort muss mindestens 6 Zeichen haben');
            this.updateDebug(`❌ Password too short: ${data.password.length} chars`, true);
            isValid = false;
        }

        // Confirm password validation - EXTRA LOGGING
        this.updateDebug(`Checking password match: "${data.password}" vs "${data.confirmPassword}"`, true);
        if (data.password !== data.confirmPassword) {
            this.showFieldError('confirmPassword', 'Passwörter stimmen nicht überein');
            this.updateDebug(`❌ Password mismatch detected!`, true);
            this.updateDebug(`  Password: "${data.password}" (length: ${data.password.length})`, true);
            this.updateDebug(`  Confirm:  "${data.confirmPassword}" (length: ${data.confirmPassword.length})`, true);
            isValid = false;
        } else {
            this.updateDebug(`✅ Passwords match perfectly`, true);
        }

        // Terms acceptance
        const acceptTerms = document.getElementById('acceptTerms');
        if (acceptTerms && !acceptTerms.checked) {
            this.showError('Bitte akzeptieren Sie die AGB und Datenschutzerklärung');
            this.updateDebug(`❌ Terms not accepted`, true);
            isValid = false;
        }

        this.updateDebug(`Register validation result: ${isValid}`, true);
        return isValid;
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

        this.updateDebug(`API Call: ${method} ${url}`);
        
        const response = await fetch(url, options);
        
        this.updateDebug(`API Response: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            this.updateDebug(`API Error: ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }
        
        return await response.json();
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
            if (loading) {
                btn.textContent = 'Wird verarbeitet...';
            } else {
                if (btn.closest('#loginForm')) {
                    btn.textContent = 'Anmelden';
                } else if (btn.closest('#registerForm')) {
                    btn.textContent = 'Registrieren';
                }
            }
        });
        
        forms.forEach(form => {
            form.classList.toggle('form-loading', loading);
        });
        
        this.updateDebug(`Loading state: ${loading}`);
    }

    showError(message, fieldName = null) {
        console.log('❌ Showing error:', message, fieldName);
        
        if (fieldName) {
            this.showFieldError(fieldName, message);
        } else {
            // Show general error
            let errorContainer = document.querySelector('.error-message');
            if (!errorContainer) {
                errorContainer = document.createElement('div');
                errorContainer.className = 'error-message';
                errorContainer.style.cssText = `
                    background: #f8d7da;
                    color: #721c24;
                    padding: 12px;
                    border-radius: 4px;
                    margin: 10px 0;
                    border: 1px solid #f5c6cb;
                `;
                
                const activeForm = document.querySelector('.auth-form:not(.hidden)');
                if (activeForm) {
                    const form = activeForm.querySelector('form');
                    form.insertBefore(errorContainer, form.firstChild);
                }
            }
            errorContainer.textContent = message;
            errorContainer.style.display = 'block';
        }
        
        this.updateDebug(`Error shown: ${message}`);
    }

    showSuccess(message) {
        console.log('✅ Showing success:', message);
        
        let successContainer = document.querySelector('.success-message');
        if (!successContainer) {
            successContainer = document.createElement('div');
            successContainer.className = 'success-message';
            successContainer.style.cssText = `
                background: #d4edda;
                color: #155724;
                padding: 12px;
                border-radius: 4px;
                margin: 10px 0;
                border: 1px solid #c3e6cb;
            `;
            
            const activeForm = document.querySelector('.auth-form:not(.hidden)');
            if (activeForm) {
                const form = activeForm.querySelector('form');
                form.insertBefore(successContainer, form.firstChild);
            }
        }
        
        successContainer.textContent = message;
        successContainer.style.display = 'block';
        
        this.updateDebug(`Success shown: ${message}`);
    }

    showFieldError(fieldName, message) {
        const field = document.querySelector(`input[name="${fieldName}"]`);
        if (field) {
            field.style.borderColor = '#dc3545';
            
            // Remove existing error
            const existingError = field.parentNode.querySelector('.field-error');
            if (existingError) {
                existingError.remove();
            }
            
            // Add error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.textContent = message;
            errorDiv.style.cssText = `
                color: #dc3545;
                font-size: 12px;
                margin-top: 4px;
            `;
            
            field.parentNode.appendChild(errorDiv);
        }
    }

    clearFieldError(fieldName) {
        const field = document.querySelector(`input[name="${fieldName}"]`);
        if (field) {
            field.style.borderColor = '';
            const error = field.parentNode.querySelector('.field-error');
            if (error) {
                error.remove();
            }
        }
    }

    clearAllErrors() {
        // Clear field errors
        document.querySelectorAll('.field-error').forEach(el => el.remove());
        document.querySelectorAll('input').forEach(input => {
            input.style.borderColor = '';
        });
        
        // Clear general errors
        const errorMessage = document.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
        
        const successMessage = document.querySelector('.success-message');
        if (successMessage) {
            successMessage.style.display = 'none';
        }
    }

    // ========================================
    // SUCCESS HANDLERS
    // ========================================

    handleLoginSuccess(response) {
        console.log('✅ Login successful:', response);
        
        if (response.token) {
            localStorage.setItem('authToken', response.token);
        }
        
        if (response.user) {
            localStorage.setItem('userData', JSON.stringify(response.user));
            localStorage.setItem('lastEmail', response.user.email);
        }

        this.showSuccess('Erfolgreich angemeldet! Weiterleitung...');
        this.updateDebug('Login successful, redirecting...');

        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 1500);
    }

    handleRegisterSuccess(response) {
        console.log('✅ Registration successful:', response);
        
        this.showSuccess('Registrierung erfolgreich! Sie können sich jetzt anmelden.');
        this.updateDebug('Registration successful, switching to login', true);
        
        setTimeout(() => {
            this.switchToLogin();
            
            if (response.email || response.user?.email) {
                const emailInput = document.querySelector('#loginForm input[name="email"]');
                if (emailInput) {
                    emailInput.value = response.email || response.user.email;
                }
            }
        }, 2000);
    }

    // ========================================
    // UTILITY
    // ========================================

    loadStoredData() {
        const lastEmail = localStorage.getItem('lastEmail');
        if (lastEmail) {
            const emailInput = document.querySelector('input[name="email"]');
            if (emailInput) {
                emailInput.value = lastEmail;
            }
        }
    }
}

// Initialize AuthManager
const authManager = new AuthManager();