// Update js/auth.js
const auth = {
    togglePasswordVisibility: function(inputId, button) {
        const input = document.getElementById(inputId);
        const icon = button.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'far fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'far fa-eye';
        }
    },

    checkAuth: function() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (!token || !user) {
            return null;
        }

        try {
            return JSON.parse(user);
        } catch (e) {
            return null;
        }
    },

    redirectIfNotLoggedIn: function(expectedRole, redirectTo) {
        const user = this.checkAuth();

        if (!user) {
            window.location.href = redirectTo || '/Student/student-login.html';
            return false;
        }

        if (expectedRole && user.role !== expectedRole) {
            window.location.href = redirectTo || '/Student/student-login.html';
            return false;
        }

        return user;
    }
};
auth.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/Student/landing.html';
};
// Auto-check auth on protected pages
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;

    // List of protected pages and their required roles
    const protectedPages = {
        '/Admin/admin.html': 'admin',
        '/Teaching_Staff/professor-dashboard.html': 'professor',
        '/Student/index.html': 'student',
        '/Student/dashboard.html': 'student'
    };

    if (protectedPages[currentPath]) {
        const requiredRole = protectedPages[currentPath];
        const user = auth.checkAuth();

        if (!user || user.role !== requiredRole) {
            // Redirect to appropriate login page
            switch(requiredRole) {
                case 'admin':
                    window.location.href = '/Admin/admin-login.html';
                    break;
                case 'professor':
                    window.location.href = '/Teaching_Staff/professor-login.html';
                    break;
                case 'student':
                    window.location.href = '/Student/student-login.html';
                    break;
            }
        }
    }
});