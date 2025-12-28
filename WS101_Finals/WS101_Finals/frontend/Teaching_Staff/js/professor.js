// ==========================================
// 1. INIT & GLOBAL VARIABLES
// ==========================================
const API_BASE_URL = "http://localhost:8080/api";
let currentProfessor = null;
let professorNotifications = [];
let professorStats = {
    totalStudents: 0,
    activeSubjects: 0,
    totalLessons: 0
};

// ==========================================
// 2. AUTH & SESSION MANAGEMENT
// ==========================================
function getCurrentProfessor() {
    const userData = localStorage.getItem('user');
    if (userData) {
        return JSON.parse(userData);
    }
    return null;
}

function getProfessorUserId() {
    if (currentProfessor && currentProfessor.id) {
        return currentProfessor.id;
    }
    return 1; // Default for demo
}

// ==========================================
// 3. INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Get current professor from session
    currentProfessor = getCurrentProfessor();

    if (currentProfessor) {
        // Update sidebar info
        updateProfessorSidebarInfo();
    }

    // Load dashboard stats
    loadProfessorStats();

    // Load notifications
    loadProfessorNotifications();

    // Initialize profile form
    initProfessorProfileForm();

    // Initialize password form
    initProfessorPasswordForm();

    // Start notification polling
    startNotificationPolling();

    // Set up event listeners
    setupEventListeners();
});

// ==========================================
// 4. PROFESSOR LOGIN (ADDED CODE)
// ==========================================
// Initialize saved credentials
auth.initSavedCredentials('professor');

const loginForm = document.getElementById('loginForm');
const loginButton = document.getElementById('loginButton');

// Prevent form from submitting
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault(); // CRITICAL

        const identifier = document.getElementById('identifier').value.trim();
        const password = document.getElementById('password').value.trim();
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!identifier || !password) {
            auth.showMessage('responseMessage', 'Please fill in all fields', true);
            return;
        }

        // Save credentials if remember me is checked
        auth.saveCredentials('professor', identifier, password, rememberMe);

        loginButton.disabled = true;
        loginButton.innerHTML = '<div class="spinner"></div> Authenticating...';

        try {
            const response = await fetch(`${auth.API_BASE_URL}/auth/prof/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ identifier, password })
            });

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response:', text);
                auth.showMessage('responseMessage', 'Server error: Invalid response format', true);
                return;
            }

            const data = await response.json();
            console.log('Professor login response:', data);

            if (data.success) {
                auth.showMessage('responseMessage', 'Login successful! Redirecting...', false);

                // Store token and user info
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('role', 'professor');

                // Redirect to professor dashboard
                setTimeout(() => {
                    window.location.href = 'professor-dashboard.html';
                }, 1500);
            } else {
                auth.showMessage('responseMessage', data.message || 'Login failed', true);
            }
        } catch (error) {
            console.error('Login error:', error);
            auth.showMessage('responseMessage', 'Network error. Please try again.', true);
        } finally {
            loginButton.disabled = false;
            loginButton.innerHTML = '<span>Login as Professor</span> <i class="fas fa-sign-in-alt"></i>';
        }
    });
}

// ==========================================
// 5. SIDEBAR INFO UPDATE
// ==========================================
function updateProfessorSidebarInfo() {
    if (!currentProfessor) return;

    const initialElement = document.getElementById('professor-initial');
    const nameElement = document.getElementById('professor-name');

    if (initialElement && currentProfessor.fullName) {
        initialElement.textContent = currentProfessor.fullName.charAt(0).toUpperCase();
    }

    if (nameElement && currentProfessor.fullName) {
        nameElement.textContent = `Prof. ${currentProfessor.fullName.split(' ')[0]}`;
    } else if (nameElement && currentProfessor.username) {
        nameElement.textContent = `Prof. ${currentProfessor.username}`;
    }
}

// ==========================================
// 6. STATISTICS LOADING
// ==========================================
async function loadProfessorStats() {
    try {
        // Example: Fetch stats from API
        // const res = await fetch(`${API_BASE_URL}/professor/stats`);
        // const stats = await res.json();

        // For demo, use mock data
        professorStats = {
            totalStudents: 45,
            activeSubjects: 6,
            totalLessons: 23
        };

        document.getElementById('totalStudents').textContent = professorStats.totalStudents;
        document.getElementById('activeSubjects').textContent = professorStats.activeSubjects;
        document.getElementById('totalLessons').textContent = professorStats.totalLessons;

    } catch (err) {
        console.error("Error loading professor stats:", err);
    }
}

// ==========================================
// 7. NOTIFICATION SYSTEM
// ==========================================
async function loadProfessorNotifications() {
    try {
        const userId = getProfessorUserId();
        const res = await fetch(`${API_BASE_URL}/admin/notifications?userId=${userId}`);
        if (res.ok) {
            professorNotifications = await res.json();
            updateNotificationBadge();

            const dropdown = document.getElementById('notification-dropdown');
            if (dropdown && dropdown.classList.contains('show')) {
                renderNotifications();
            }
        }
    } catch (err) {
        console.error("Error loading notifications:", err);
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;

    const unreadCount = professorNotifications.filter(n => !n.isRead).length;
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

function toggleNotifications() {
    const dropdown = document.getElementById('notification-dropdown');
    dropdown.classList.toggle('show');

    if (dropdown.classList.contains('show')) {
        renderNotifications();
    }
}

function renderNotifications() {
    const container = document.getElementById('notification-list');
    if (!container) return;

    if (!professorNotifications || professorNotifications.length === 0) {
        container.innerHTML = `
            <div class="notif-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications yet</p>
            </div>
        `;
        return;
    }

    let html = '';
    professorNotifications.forEach(notif => {
        const typeClass = notif.type || 'system';
        const isUnread = !notif.isRead ? 'unread' : '';

        html += `
            <div class="notif-item ${isUnread}" onclick="markNotificationAsRead(${notif.id})">
                <div class="notif-title">
                    <span>${notif.title}</span>
                    <span class="notif-type ${typeClass}">${typeClass.toUpperCase()}</span>
                </div>
                <div class="notif-message">${notif.message}</div>
                <div class="notif-time">${notif.createdAt || 'Just now'}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function markNotificationAsRead(notificationId) {
    try {
        const userId = getProfessorUserId();
        await fetch(`${API_BASE_URL}/admin/notifications/mark-read/${notificationId}?userId=${userId}`, {
            method: 'POST'
        });
        loadProfessorNotifications();
    } catch (err) {
        console.error("Error marking notification as read:", err);
    }
}

async function markAllAsRead() {
    try {
        const userId = getProfessorUserId();
        await fetch(`${API_BASE_URL}/admin/notifications/mark-all-read?userId=${userId}`, {
            method: 'POST'
        });
        loadProfessorNotifications();
    } catch (err) {
        console.error("Error marking all as read:", err);
    }
}

function startNotificationPolling() {
    setInterval(() => {
        loadProfessorNotifications();
    }, 30000);
}

// ==========================================
// 8. PROFILE MANAGEMENT
// ==========================================
function openProfessorProfile() {
    const modal = document.getElementById('professor-profile-modal');
    if (!modal) return;

    loadProfessorProfileData();
    modal.classList.add('active');
}

function closeProfessorProfile() {
    const modal = document.getElementById('professor-profile-modal');
    if (modal) modal.classList.remove('active');
}

function initProfessorProfileForm() {
    const form = document.getElementById('professor-profile-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const profileData = {
            fullName: document.getElementById('professor-fullname').value,
            email: document.getElementById('professor-email').value,
            phone: document.getElementById('professor-phone').value,
            specialization: document.getElementById('professor-specialization').value
        };

        try {
            if (currentProfessor) {
                currentProfessor = { ...currentProfessor, ...profileData };
                localStorage.setItem('user', JSON.stringify(currentProfessor));

                updateProfessorSidebarInfo();

                alert("Profile updated successfully!");
                closeProfessorProfile();
                logProfessorActivity("Updated profile information");
            }
        } catch (err) {
            console.error("Error updating profile:", err);
            alert("Error updating profile");
        }
    });

    // Profile picture upload
    const uploadInput = document.getElementById('professor-profile-upload');
    if (uploadInput) {
        uploadInput.addEventListener('change', handleProfessorProfilePictureUpload);
    }
}

function loadProfessorProfileData() {
    if (!currentProfessor) return;

    const idEl = document.getElementById('professor-id');
    const nameEl = document.getElementById('professor-fullname');
    const emailEl = document.getElementById('professor-email');
    const phoneEl = document.getElementById('professor-phone');
    const courseEl = document.getElementById('professor-course');
    const specializationEl = document.getElementById('professor-specialization');

    if (idEl) idEl.value = currentProfessor.username || '';
    if (nameEl) nameEl.value = currentProfessor.fullName || '';
    if (emailEl) emailEl.value = currentProfessor.email || '';
    if (phoneEl) phoneEl.value = currentProfessor.phone || '';
    if (courseEl) courseEl.value = currentProfessor.courseId || '';
    if (specializationEl) specializationEl.value = currentProfessor.specialization || '';

    // Load profile picture
    const profileImg = document.getElementById('professor-profile-img');
    const profileIcon = document.getElementById('professor-profile-icon');
    if (currentProfessor.profilePicture && profileImg) {
        profileImg.src = `http://localhost:8080/uploads/${currentProfessor.profilePicture}`;
        profileImg.style.display = 'block';
        if (profileIcon) profileIcon.style.display = 'none';
    }
}

function handleProfessorProfilePictureUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (file.size > 2 * 1024 * 1024) {
        alert("File size must be less than 2MB");
        return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        alert("Only JPG, PNG, and GIF files are allowed");
        return;
    }

    // Preview image
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.getElementById('professor-profile-img');
        const icon = document.getElementById('professor-profile-icon');
        if (img && icon) {
            img.src = e.target.result;
            img.style.display = 'block';
            icon.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);

    // Upload to server
    uploadProfessorProfilePicture(file);
}

async function uploadProfessorProfilePicture(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', getProfessorUserId());

    try {
        const res = await fetch(`${API_BASE_URL}/admin/upload-profile-picture`, {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            const fileName = await res.text();
            if (currentProfessor) {
                currentProfessor.profilePicture = fileName.replace('Profile picture uploaded: ', '');
                localStorage.setItem('user', JSON.stringify(currentProfessor));
            }
            alert("Profile picture updated successfully!");
            logProfessorActivity("Updated profile picture");
        } else {
            const msg = await res.text();
            alert("Error: " + msg);
        }
    } catch (err) {
        console.error("Error uploading picture:", err);
        alert("Error uploading picture");
    }
}

// ==========================================
// 9. PASSWORD MANAGEMENT
// ==========================================
function openChangePassword() {
    const modal = document.getElementById('professor-password-modal');
    if (!modal) return;

    modal.classList.add('active');
}

function closePasswordModal() {
    const modal = document.getElementById('professor-password-modal');
    if (modal) modal.classList.remove('active');
}

function initProfessorPasswordForm() {
    const form = document.getElementById('professor-password-form');
    if (!form) return;

    // Password strength indicator
    const newPasswordInput = document.getElementById('new-password');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', checkProfessorPasswordStrength);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            alert("New passwords don't match!");
            return;
        }

        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters long!");
            return;
        }

        try {
            // In real app, call API
            alert("Password changed successfully!");
            closePasswordModal();
            logProfessorActivity("Changed password");

            // Clear form
            form.reset();

        } catch (err) {
            console.error("Error changing password:", err);
            alert("Error changing password");
        }
    });
}

function checkProfessorPasswordStrength() {
    const password = document.getElementById('new-password').value;
    const strengthBar = document.getElementById('password-strength');

    if (!strengthBar) return;

    let strength = 0;

    if (password.length >= 8) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;

    strengthBar.className = 'password-strength';
    if (strength === 0) {
        strengthBar.classList.add('weak');
    } else if (strength <= 2) {
        strengthBar.classList.add('medium');
    } else {
        strengthBar.classList.add('strong');
    }
}

// ==========================================
// 10. LOGOUT
// ==========================================
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        sessionStorage.clear();

        window.location.href = 'professor-login.html';
    }
}

// ==========================================
// 11. EVENT LISTENERS SETUP
// ==========================================
function setupEventListeners() {
    // Close notifications when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notification-dropdown');
        const btn = document.querySelector('.notification-btn');
        if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
}

// ==========================================
// 12. ACTIVITY LOGGING
// ==========================================
function logProfessorActivity(action) {
    console.log(`Professor Activity: ${action}`);

    let activities = JSON.parse(localStorage.getItem('professorActivities')) || [];
    activities.unshift({
        action: action,
        timestamp: new Date().toISOString()
    });

    if (activities.length > 50) {
        activities = activities.slice(0, 50);
    }

    localStorage.setItem('professorActivities', JSON.stringify(activities));
}

// ==========================================
// 13. INITIAL CHECK
// ==========================================
function initProfessorDashboard() {
    const user = JSON.parse(localStorage.getItem('user'));
    const role = localStorage.getItem('role');

    if (!user || role !== 'professor') {
        window.location.href = 'professor-login.html';
        return;
    }

    currentProfessor = user;
    updateProfessorSidebarInfo();
    loadProfessorStats();
    loadProfessorNotifications();
}

// Run initialization
initProfessorDashboard();