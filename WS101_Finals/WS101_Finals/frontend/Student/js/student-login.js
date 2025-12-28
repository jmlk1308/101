// student-login.js
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // ✅ STOP THE REFRESH IMMEDIATELY

            const identifier = document.getElementById('identifier').value;
            const password = document.getElementById('password').value;

            try {
                // ✅ Use Absolute URL to avoid 404/Refresh issues
                const response = await fetch('http://localhost:8080/api/auth/student/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier, password })
                });

               const data = await response.json();

               if (data.success) {
                   // ✅ ADD THIS CHECK: Verify the role is actually 'student'
                   if (data.role !== 'student') {
                       alert("Access Denied: You are not registered as a student.");
                       return;
                   }

                   localStorage.setItem('user', JSON.stringify({
                       username: data.username,
                       role: data.role,
                       courseId: data.courseId
                   }));

                   window.location.href = 'home.html';
               } else {
                   alert(data.message || 'Login failed');
               }
            } catch (error) {
                console.error('Login error:', error);
                alert('Connection error. Is your Spring Boot running?');
            }
        });
    }
});