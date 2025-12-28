// prof-login.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // ✅ Stops the page from refreshing

            const identifier = document.getElementById('identifier').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:8080/api/auth/prof/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier, password })
                });

                const data = await response.json();

                if (data.success) {
                    localStorage.setItem('user', JSON.stringify(data));
                    // ✅ Redirect to professor dashboard
                    window.location.href = 'professor-dashboard.html';
                } else {
                    alert(data.message || 'Login failed');
                }
            } catch (error) {
                console.error('Error:', error);
            }
        });
    }
});