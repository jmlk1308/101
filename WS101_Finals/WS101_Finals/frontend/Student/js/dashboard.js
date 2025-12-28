// ==========================================
// 1. INIT & GLOBAL VARIABLES
// ==========================================
const params = new URLSearchParams(window.location.search);
const courseId = params.get('course') || 'it';
let allSubjects = [];
let currentYearFilter = "All Years";
let showAllCards = false;
let studentNotifications = [];
let currentStudent = null;

// ==========================================
// 2. AUTH & SESSION MANAGEMENT
// ==========================================
function getCurrentStudent() {
    // Try to get student from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
        return JSON.parse(userData);
    }
    return null;
}

function getStudentUserId() {
    if (currentStudent && currentStudent.id) {
        return currentStudent.id;
    }
    // Default to 1 for demo (in real app, get from JWT)
    return 1;
}

// ==========================================
// 3. INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Get current student from session
    currentStudent = getCurrentStudent();

    if (currentStudent) {
        // Update profile name if available
        const profileNameEl = document.querySelector('.profile-name');
        if (profileNameEl && currentStudent.username) {
            profileNameEl.textContent = currentStudent.username;
        }

        // Update student ID in profile modal
        const studentIdEl = document.getElementById('student-id');
        if (studentIdEl) {
            studentIdEl.value = currentStudent.username || '';
        }
    }

    // A. Load Course Info
    fetch(`http://localhost:8080/api/courses/${courseId}`)
        .then(r => r.json())
        .then(data => {
            const titleEl = document.getElementById('dashboard-title');
            if(titleEl) titleEl.innerText = data.title;

            // Update course in profile modal
            const courseEl = document.getElementById('student-course');
            if(courseEl) courseEl.value = data.title || '';

            fetchSubjects(courseId);
        })
        .catch(e => console.error("Error loading course:", e));

    // B. Load Recent Views
    renderRecentViews();

    // C. Load notifications
    loadStudentNotifications();

    // D. Initialize profile dropdown
    initProfileDropdown();

    // E. Initialize profile form
    initStudentProfileForm();

    // F. Initialize password form
    initStudentPasswordForm();

    // Start notification polling
    startNotificationPolling();
});

// ==========================================
// 4. DATA FETCHING
// ==========================================
function fetchSubjects(cId) {
    fetch(`http://localhost:8080/api/courses/${cId}/subjects`)
        .then(r => r.json())
        .then(subjects => {
            allSubjects = subjects.filter(s => s.status !== 'inactive'); // Only show active subjects
            applyFilter();
        })
        .catch(e => console.error(e));
}

// ==========================================
// 5. RENDERING CARDS
// ==========================================
function renderCards(subjects) {
    const grid = document.getElementById('cardsGrid');
    if (!grid) return;

    if (subjects.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No subjects found for this category.</p>';
        return;
    }

    const visibleSubjects = showAllCards ? subjects : subjects.slice(0, 3);
    const hasHiddenCards = subjects.length > 3;

    const palette = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'];

    let html = visibleSubjects.map((s, index) => {
        const color = palette[index % palette.length];
        const subjectData = encodeURIComponent(JSON.stringify(s));

        return `
        <div class="card" style="border-top-color: ${color}">
            <div>
                <div class="card-code" style="color:${color}">${s.code}</div>
                <div class="card-title">${s.title}</div>
                <div style="font-size: 0.8rem; color: #9ca3af; margin-top: 5px;">
                    ${s.yearLevel ? convertYear(s.yearLevel) : 'Year N/A'}
                </div>
            </div>
            <div>
                <button class="btn-view"
                        style="background:${color}"
                        onclick="handleSubjectClick('${subjectData}')">
                    View
                </button>
            </div>
        </div>`;
    }).join('');

    if (hasHiddenCards) {
        const btnText = showAllCards ? "Show Less ▲" : `View More (${subjects.length - 3} hidden) ▼`;
        html += `
        <div style="grid-column: 1 / -1; display: flex; justify-content: center; margin-top: 10px;">
            <button onclick="toggleShowAll()"
                    style="padding: 10px 20px; background: #e5e7eb; border: none; border-radius: 20px; cursor: pointer; font-weight: 600; color: #374151; transition: background 0.2s;">
                ${btnText}
            </button>
        </div>
        `;
    }

    grid.innerHTML = html;
}

function toggleShowAll() {
    showAllCards = !showAllCards;
    applyFilter();
}

function convertYear(num) {
    if(num == 1) return "1st Year";
    if(num == 2) return "2nd Year";
    if(num == 3) return "3rd Year";
    if(num == 4) return "4th Year";
    return num + " Year";
}

// ==========================================
// 6. FILTERING LOGIC
// ==========================================
function applyFilter() {
    let filtered = allSubjects;

    if (currentYearFilter !== "All Years") {
        const yearMap = { "1st Year": 1, "2nd Year": 2, "3rd Year": 3, "4th Year": 4 };
        const targetYear = yearMap[currentYearFilter];
        if (targetYear) filtered = filtered.filter(s => s.yearLevel === targetYear);
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value) {
        const term = searchInput.value.toLowerCase();
        filtered = filtered.filter(s =>
            s.title.toLowerCase().includes(term) ||
            s.code.toLowerCase().includes(term)
        );
    }

    renderCards(filtered);
}

// ==========================================
// 7. DROPDOWN & SEARCH UI
// ==========================================
const filterBtn = document.getElementById('filterBtn');
const filterDropdown = document.getElementById('filterDropdown');
const filterText = document.getElementById('filterBtnText');
const filterOptions = document.querySelectorAll('.filter-option');

if (filterBtn && filterDropdown) {
    filterBtn.onclick = (e) => {
        e.stopPropagation();
        filterDropdown.classList.toggle('show');
    };
}

filterOptions.forEach(opt => {
    opt.onclick = (e) => {
        const val = e.target.getAttribute('data-value');
        currentYearFilter = val;
        if(filterText) filterText.innerText = val;
        filterDropdown.classList.remove('show');
        showAllCards = false;
        applyFilter();
    };
});

window.onclick = (e) => {
    if (filterDropdown && !filterBtn.contains(e.target)) filterDropdown.classList.remove('show');

    // Close profile dropdown when clicking outside
    const profileDropdown = document.getElementById('profile-dropdown');
    const profileWrapper = document.querySelector('.profile-dropdown-wrapper');
    if (profileDropdown && profileWrapper && !profileWrapper.contains(e.target)) {
        profileDropdown.classList.remove('show');
    }

    // Close notification dropdown when clicking outside
    const notificationDropdown = document.getElementById('notification-dropdown');
    const notificationBtn = document.querySelector('.notification-wrapper button');
    if (notificationDropdown && notificationBtn && !notificationDropdown.contains(e.target) && !notificationBtn.contains(e.target)) {
        notificationDropdown.classList.remove('show');
    }
};

const searchInput = document.getElementById('searchInput');
if(searchInput) searchInput.onkeyup = () => applyFilter();

// ==========================================
// 8. RECENT VIEW SYNC LOGIC
// ==========================================
function handleSubjectClick(encodedSubject) {
    const subject = JSON.parse(decodeURIComponent(encodedSubject));

    let recent = JSON.parse(localStorage.getItem('recentSubjects')) || [];
    recent = recent.filter(r => r.code !== subject.code);
    recent.unshift({
        title: subject.title,
        code: subject.code,
        yearLevel: subject.yearLevel
    });

    if (recent.length > 3) recent.pop();
    localStorage.setItem('recentSubjects', JSON.stringify(recent));

    // Log activity
    logStudentActivity(`Viewed subject: ${subject.title} (${subject.code})`);

    window.location.href = `Roadmap.html?id=${subject.code}&title=${encodeURIComponent(subject.title)}`;
}

function renderRecentViews() {
    const recentListEl = document.querySelector('.recent-list');
    if (!recentListEl) return;

    const recent = JSON.parse(localStorage.getItem('recentSubjects')) || [];

    if (recent.length === 0) {
        recentListEl.innerHTML = '<div style="color:#9ca3af; padding:10px;">No recently viewed subjects.</div>';
        return;
    }

    recentListEl.innerHTML = recent.map(s => `
        <div class="recent-item" onclick="window.location.href='Roadmap.html?id=${s.code}&title=${encodeURIComponent(s.title)}'" style="cursor:pointer;">
            <span class="recent-title">${s.code}: ${s.title}</span>
            <span class="recent-year">${convertYear(s.yearLevel)}</span>
        </div>
    `).join('');
}

// ==========================================
// 9. NOTIFICATION SYSTEM
// ==========================================
async function loadStudentNotifications() {
    try {
        const userId = getStudentUserId();
        const res = await fetch(`http://localhost:8080/api/admin/notifications?userId=${userId}`);
        if (res.ok) {
            studentNotifications = await res.json();
            updateStudentNotificationBadge();

            // If notifications dropdown is open, update it
            const dropdown = document.getElementById('notification-dropdown');
            if (dropdown && dropdown.classList.contains('show')) {
                renderStudentNotifications();
            }
        }
    } catch (err) {
        console.error("Error loading notifications:", err);
    }
}

function updateStudentNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (!badge) return;

    const unreadCount = studentNotifications.filter(n => !n.isRead).length;
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

function toggleStudentNotifications() {
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;

    dropdown.classList.toggle('show');

    if (dropdown.classList.contains('show')) {
        renderStudentNotifications();
    }
}

function renderStudentNotifications() {
    const container = document.getElementById('notification-list');
    if (!container) return;

    if (!studentNotifications || studentNotifications.length === 0) {
        container.innerHTML = `
            <div class="notif-item empty">
                <i class="fas fa-bell-slash" style="font-size: 1.5rem; margin-bottom: 10px; color: #94a3b8;"></i>
                <p>No notifications yet</p>
            </div>
        `;
        return;
    }

    let html = '';
    studentNotifications.forEach(notif => {
        const isUnread = !notif.isRead ? 'unread' : '';
        const typeClass = notif.type || 'system';

        html += `
            <div class="notif-item ${isUnread}" onclick="markStudentNotificationAsRead(${notif.id})">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 5px;">
                    <strong style="color: #1e293b; font-size: 0.9rem;">${notif.title}</strong>
                    <span class="notif-type" style="font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; background: #e2e8f0; color: #475569;">
                        ${typeClass}
                    </span>
                </div>
                <div class="notif-text">${notif.message}</div>
                <div class="notif-time">${notif.createdAt || 'Just now'}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function markStudentNotificationAsRead(notificationId) {
    try {
        const userId = getStudentUserId();
        await fetch(`http://localhost:8080/api/admin/notifications/mark-read/${notificationId}?userId=${userId}`, {
            method: 'POST'
        });
        loadStudentNotifications();
    } catch (err) {
        console.error("Error marking notification as read:", err);
    }
}

async function markAllStudentNotificationsAsRead() {
    try {
        const userId = getStudentUserId();
        await fetch(`http://localhost:8080/api/admin/notifications/mark-all-read?userId=${userId}`, {
            method: 'POST'
        });
        loadStudentNotifications();
    } catch (err) {
        console.error("Error marking all as read:", err);
    }
}

function startNotificationPolling() {
    // Check for new notifications every 30 seconds
    setInterval(() => {
        loadStudentNotifications();
    }, 30000);
}

// ==========================================
// 10. PROFILE DROPDOWN
// ==========================================
function initProfileDropdown() {
    const profileWrapper = document.querySelector('.profile-dropdown-wrapper');
    if (!profileWrapper) return;

    const toggleBtn = profileWrapper.querySelector('.flex.items-center');
    if (toggleBtn) {
        toggleBtn.onclick = toggleProfileDropdown;
    }
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown');
    if (!dropdown) return;

    dropdown.classList.toggle('show');

    // Close other dropdowns
    const notificationDropdown = document.getElementById('notification-dropdown');
    if (notificationDropdown) notificationDropdown.classList.remove('show');
}

// ==========================================
// 11. STUDENT PROFILE MANAGEMENT
// ==========================================
function openStudentProfile() {
    const modal = document.getElementById('student-profile-modal');
    if (!modal) return;

    // Close dropdowns
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown) profileDropdown.classList.remove('show');

    // Load current profile data
    loadStudentProfileData();

    modal.classList.add('active');
}

function closeStudentProfile() {
    const modal = document.getElementById('student-profile-modal');
    if (modal) modal.classList.remove('active');
}

function initStudentProfileForm() {
    const form = document.getElementById('student-profile-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const profileData = {
            fullName: document.getElementById('student-fullname').value,
            email: document.getElementById('student-email').value,
            phone: document.getElementById('student-phone').value
        };

        try {
            // In real app, send to API endpoint
            // For now, update localStorage
            if (currentStudent) {
                currentStudent.fullName = profileData.fullName;
                currentStudent.email = profileData.email;
                currentStudent.phone = profileData.phone;
                localStorage.setItem('user', JSON.stringify(currentStudent));

                // Update profile name in navbar
                const profileNameEl = document.querySelector('.profile-name');
                if (profileNameEl && profileData.fullName) {
                    profileNameEl.textContent = profileData.fullName;
                }

                alert("Profile updated successfully!");
                closeStudentProfile();
                logStudentActivity("Updated profile information");
            }
        } catch (err) {
            console.error("Error updating profile:", err);
            alert("Error updating profile");
        }
    });

    // Profile picture upload
    const uploadInput = document.getElementById('student-profile-upload');
    if (uploadInput) {
        uploadInput.addEventListener('change', handleProfilePictureUpload);
    }
}

function loadStudentProfileData() {
    if (!currentStudent) return;

    const idEl = document.getElementById('student-id');
    const nameEl = document.getElementById('student-fullname');
    const emailEl = document.getElementById('student-email');
    const phoneEl = document.getElementById('student-phone');
    const courseEl = document.getElementById('student-course');
    const yearEl = document.getElementById('student-year');

    if (idEl) idEl.value = currentStudent.username || '';
    if (nameEl) nameEl.value = currentStudent.fullName || '';
    if (emailEl) emailEl.value = currentStudent.email || '';
    if (phoneEl) phoneEl.value = currentStudent.phone || '';
    if (courseEl) courseEl.value = currentStudent.courseId || 'BSIT';
    if (yearEl) yearEl.value = currentStudent.yearLevel || '1';

    // Load profile picture if exists
    const profileImg = document.getElementById('student-profile-img');
    const profileIcon = document.getElementById('student-profile-icon');
    if (currentStudent.profilePicture && profileImg) {
        profileImg.src = `http://localhost:8080/uploads/${currentStudent.profilePicture}`;
        profileImg.style.display = 'block';
        if (profileIcon) profileIcon.style.display = 'none';
    }
}

function handleProfilePictureUpload(e) {
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
        const img = document.getElementById('student-profile-img');
        const icon = document.getElementById('student-profile-icon');
        if (img && icon) {
            img.src = e.target.result;
            img.style.display = 'block';
            icon.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);

    // Upload to server
    uploadProfilePicture(file);
}

async function uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', getStudentUserId());

    try {
        const res = await fetch(`http://localhost:8080/api/admin/upload-profile-picture`, {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            const fileName = await res.text();
            if (currentStudent) {
                currentStudent.profilePicture = fileName.replace('Profile picture uploaded: ', '');
                localStorage.setItem('user', JSON.stringify(currentStudent));
            }
            alert("Profile picture updated successfully!");
            logStudentActivity("Updated profile picture");
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
// 12. PASSWORD MANAGEMENT
// ==========================================
function openChangePassword(role) {
    const modal = document.getElementById('student-password-modal');
    if (!modal) return;

    // Close dropdowns
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown) profileDropdown.classList.remove('show');

    modal.classList.add('active');
}

function closeStudentPasswordModal() {
    const modal = document.getElementById('student-password-modal');
    if (modal) modal.classList.remove('active');
}

function initStudentPasswordForm() {
    const form = document.getElementById('student-password-form');
    if (!form) return;

    // Password strength indicator
    const newPasswordInput = document.getElementById('student-new-password');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', checkPasswordStrength);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('student-current-password').value;
        const newPassword = document.getElementById('student-new-password').value;
        const confirmPassword = document.getElementById('student-confirm-password').value;

        if (newPassword !== confirmPassword) {
            alert("New passwords don't match!");
            return;
        }

        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters long!");
            return;
        }

        try {
            const userId = getStudentUserId();
            const data = {
                userId: userId,
                currentPassword: currentPassword,
                newPassword: newPassword
            };

            // In real app, send to API endpoint
            // For demo, just show success message
            alert("Password changed successfully!");
            closeStudentPasswordModal();
            logStudentActivity("Changed password");

            // Clear form
            form.reset();

        } catch (err) {
            console.error("Error changing password:", err);
            alert("Error changing password");
        }
    });
}

function checkPasswordStrength() {
    const password = document.getElementById('student-new-password').value;
    const strengthBar = document.getElementById('student-password-strength');

    if (!strengthBar) return;

    let strength = 0;

    // Check length
    if (password.length >= 8) strength++;

    // Check for numbers
    if (/\d/.test(password)) strength++;

    // Check for special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    // Check for uppercase and lowercase
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;

    // Update strength indicator
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
// 13. LOGOUT
// ==========================================
function logout(role) {
    if (confirm("Are you sure you want to logout?")) {
        // Clear session data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        sessionStorage.clear();

        // Redirect to login page
        if (role === 'student') {
            window.location.href = 'student-login.html';
        } else if (role === 'professor') {
            window.location.href = 'professor-login.html';
        } else {
            window.location.href = 'index.html';
        }
    }
}

// ==========================================
// 14. ACTIVITY LOGGING (Optional)
// ==========================================
function logStudentActivity(action) {
    // In real app, send to API
    console.log(`Student Activity: ${action}`);

    // You can also save to localStorage for offline tracking
    let activities = JSON.parse(localStorage.getItem('studentActivities')) || [];
    activities.unshift({
        action: action,
        timestamp: new Date().toISOString()
    });

    // Keep only last 50 activities
    if (activities.length > 50) {
        activities = activities.slice(0, 50);
    }

    localStorage.setItem('studentActivities', JSON.stringify(activities));
}