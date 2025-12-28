document.addEventListener('DOMContentLoaded', function() {
    const resetForm = document.getElementById('resetForm');
    const resetButton = document.getElementById('resetButton');

    resetForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const identifier = document.getElementById('identifier').value.trim();

        if (!identifier) {
            auth.showMessage('responseMessage', 'Please enter your email address', true);
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(identifier)) {
            auth.showMessage('responseMessage', 'Please enter a valid email address', true);
            return;
        }

        resetButton.disabled = true;
        resetButton.innerHTML = '<div class="spinner"></div> Sending...';

        try {
            const response = await fetch(`${auth.API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifier: identifier,
                    role: 'student'
                })
            });

            const data = await response.json();

            if (response.ok) {
                auth.showMessage('responseMessage', 'Password reset link has been sent to your email. Please check your inbox.', false);
                resetForm.reset();

                // Show success message with details
                setTimeout(() => {
                    alert('If you don\'t see the email in your inbox, please check your spam folder.');
                }, 1000);
            } else {
                auth.showMessage('responseMessage', data.message || 'Failed to send reset link', true);
            }
        } catch (error) {
            console.error('Reset request error:', error);
            auth.showMessage('responseMessage', 'Network error. Please check your connection and try again.', true);
        } finally {
            resetButton.disabled = false;
            resetButton.innerHTML = 'Send Reset Link <i class="fas fa-paper-plane"></i>';
        }
    });
});