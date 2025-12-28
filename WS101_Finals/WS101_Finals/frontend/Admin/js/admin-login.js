// admin-login.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // ✅ Stops the page from refreshing

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:8080/api/auth/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    localStorage.setItem('user', JSON.stringify(data));
                    // ✅ Redirect to admin panel
                    window.location.href = 'admin.html';
                } else {
                    alert(data.message || 'Login failed');
                }
            } catch (error) {
                console.error('Admin Login error:', error);
            }
        });
    }
});