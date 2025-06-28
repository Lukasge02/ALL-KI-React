/**
 * 🔐 AUTH JAVASCRIPT - VOLLSTÄNDIG FUNKTIONAL
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
        console.log('✅ AuthManager: Ready');
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
        } else {
            console.warn('⚠️ Login form not found');
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
            console.log('✅ Register form listener attached');
        } else {
            console.warn('⚠️ Register form not found');
        }

        // Form toggle buttons
        const toggleToRegister = document.getElementById('toggleToRegister');
        const toggleToLogin = document.getElementById('toggleToLogin');
        
        if (toggleToRegister) {
            toggleToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchToRegister();
            });
            console.log('✅ Toggle to register listener attached');
        } else {
            console.warn('⚠️ Toggle to register button not found');
        }
        
        if (toggleToLogin) {
            toggleToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchToLogin();
            });
            console.log('✅ Toggle to login listener attached');
        } else {
            console.warn('⚠️ Toggle to login button not found');
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
        
        console.log(`✅ Real-time validation setup for ${inputs.length} inputs`);
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
            console.log('✅ Switched to register form');
        } else {
            console.error('❌ Could not find login or register form elements');
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
            console.log('✅ Switched to login form');
        } else {
            console.error('❌ Could not find login or register form elements');
        }
    }

    // ========================================
    // FORM HANDLING
    // ========================================

    async handleLogin(event) {
        event.preventDefault();
        console.log('🔑 Handling login...');
        
        if (this.isLoading) {
            console.log('⚠️ Already loading, ignoring login attempt');
            return;
        }

        const formData = new FormData(event.target);
        const loginData = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        console.log('📝 Login data:', { email: loginData.email, password: '***' });

        // Validate form
        if (!this.validateLoginForm(loginData)) {
            console.log('❌ Login validation failed');
            return;
        }

        this.setLoadingState(true);

        try {
            console.log('📡 Sending login request...');
            const response = await this.apiCall('/api/auth/login', 'POST', loginData);
            console.log('📡 Login response:', response);
            
            if (response.success) {
                this.handleLoginSuccess(response);
            } else {
                this.showError(response.message || 'Login fehlgeschlagen');
            }
            
        } catch (error) {
            console.error('❌ Login error:', error);
            this.showError('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
        } finally {
            this.setLoadingState(false);
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        console.log('👤 Handling registration...');
        
        if (this.isLoading) {
            console.log('⚠️ Already loading, ignoring register attempt');
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

        console.log('📝 Register data:', { 
            firstName: registerData.firstName,
            lastName: registerData.lastName, 
            email: registerData.email, 
            password: '***',
            confirmPassword: '***'
        });

        // Validate form
        if (!this.validateRegisterForm(registerData)) {
            console.log('❌ Register validation failed');
            return;
        }

        this.setLoadingState(true);

        try {
            console.log('📡 Sending register request...');
            const response = await this.apiCall('/api/auth/register', 'POST', registerData);
            console.log('📡 Register response:', response);
            
            if (response.success) {
                this.handleRegisterSuccess(response);
            } else {
                this.showError(response.message || 'Registrierung fehlgeschlagen');
            }
            
        } catch (error) {
            console.error('❌ Register error:', error);
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

        // Clear previous errors
        this.clearAllErrors();

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

        // Clear previous errors
        this.clearAllErrors();

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

        // Terms acceptance (check if checkbox exists and is checked)
        const acceptTerms = document.getElementById('acceptTerms');
        if (acceptTerms && !acceptTerms.checked) {
            this.showError('Bitte akzeptieren Sie die AGB und Datenschutzerklärung');
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
            case 'confirmPassword':
                const passwordField = document.querySelector('input[name="password"]');
                if (passwordField && value !== passwordField.value) {
                    this.showFieldError(fieldName, 'Passwörter stimmen nicht überein');
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
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    // ========================================
    // SUCCESS HANDLERS
    // ========================================

    handleLoginSuccess(response) {
        console.log('✅ Login successful:', response);
        
        // Store user data
        if (response.token) {
            localStorage.setItem('authToken', response.token);
            console.log('💾 Token stored');
        }
        
        if (response.user) {
            localStorage.setItem('userData', JSON.stringify(response.user));
            localStorage.setItem('lastEmail', response.user.email);
            console.log('💾 User data stored');
        }

        this.showSuccess('Erfolgreich angemeldet! Weiterleitung...');

        // Redirect to dashboard
        setTimeout(() => {
            console.log('🔄 Redirecting to dashboard...');
            window.location.href = '/dashboard';
        }, 1500);
    }

    handleRegisterSuccess(response) {
        console.log('✅ Registration successful:', response);
        
        this.showSuccess('Registrierung erfolgreich! Sie können sich jetzt anmelden.');
        
        // Switch to login form
        setTimeout(() => {
            this.switchToLogin();
            
            // Pre-fill email if available
            if (response.email || response.user?.email) {
                const emailInput = document.querySelector('#loginForm input[name="email"]');
                if (emailInput) {
                    emailInput.value = response.email || response.user.email;
                    console.log('📧 Email pre-filled in login form');
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
            if (loading) {
                btn.textContent = 'Wird verarbeitet...';
            } else {
                // Reset button text based on current form
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
        
        console.log(`🔄 Loading state: ${loading}`);
    }

    showError(message, fieldName = null) {
        console.log('❌ Showing error:', message, fieldName);
        
        if (fieldName) {
            this.showFieldError(fieldName, message);
        } else {
            // Show general error
            this.clearGeneralMessages();

            const errorDiv = document.createElement('div');
            errorDiv.className = 'general-error';
            errorDiv.textContent = message;
            
            const activeForm = document.querySelector('.auth-form:not(.hidden)');
            if (activeForm) {
                const formHeader = activeForm.querySelector('.form-header');
                if (formHeader) {
                    formHeader.insertAdjacentElement('afterend', errorDiv);
                }
            }
        }
    }

    showSuccess(message) {
        console.log('✅ Showing success:', message);
        
        this.clearGeneralMessages();

        const successDiv = document.createElement('div');
        successDiv.className = 'general-success';
        successDiv.textContent = message;
        
        const activeForm = document.querySelector('.auth-form:not(.hidden)');
        if (activeForm) {
            const formHeader = activeForm.querySelector('.form-header');
            if (formHeader) {
                formHeader.insertAdjacentElement('afterend', successDiv);
            }
        }
    }

    showFieldError(fieldName, message) {
        const input = document.querySelector(`input[name="${fieldName}"]`);
        if (!input) {
            console.warn(`⚠️ Field not found: ${fieldName}`);
            return;
        }

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

    clearAllErrors() {
        // Clear field errors
        const errorInputs = document.querySelectorAll('.form-error');
        errorInputs.forEach(input => {
            input.classList.remove('form-error');
        });

        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(error => error.remove());

        // Clear general messages
        this.clearGeneralMessages();
    }

    clearGeneralMessages() {
        const existingMessages = document.querySelectorAll('.general-error, .general-success');
        existingMessages.forEach(msg => msg.remove());
    }

    // ========================================
    // AUTO-LOGIN & STORAGE
    // ========================================

    checkAutoLogin() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
            console.log('🔍 Found stored credentials, validating...');
            // Check if token is still valid
            this.validateStoredToken(token);
        } else {
            console.log('ℹ️ No stored credentials found');
        }
    }

    async validateStoredToken(token) {
        try {
            const response = await this.apiCall('/api/auth/validate', 'POST', { token });
            
            if (response.valid) {
                console.log('✅ Token is valid, redirecting to dashboard');
                // Token is valid, redirect to dashboard
                window.location.href = '/dashboard';
            } else {
                console.log('❌ Token is invalid, clearing storage');
                // Token is invalid, clear storage
                this.clearStoredData();
            }
        } catch (error) {
            console.log('❌ Error validating token, clearing storage');
            // Error validating token, clear storage
            this.clearStoredData();
        }
    }

    loadStoredData() {
        // Pre-fill email if available
        const lastEmail = localStorage.getItem('lastEmail');
        if (lastEmail) {
            const emailInput = document.querySelector('#loginForm input[name="email"]');
            if (emailInput) {
                emailInput.value = lastEmail;
                console.log('📧 Last email loaded:', lastEmail);
            }
        }
    }

    clearStoredData() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        console.log('🗑️ Stored auth data cleared');
    }
}

// ========================================
// INITIALIZATION
// ========================================

// Initialize AuthManager when script loads
console.log('🚀 Starting AuthManager...');
const authManager = new AuthManager();

// Export for testing (if needed)
if (typeof window !== 'undefined') {
    window.authManager = authManager;
}