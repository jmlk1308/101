package com.example.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    @Autowired(required = false)  // Make it optional
    private JavaMailSender mailSender;

    private boolean isEmailConfigured() {
        return mailSender != null;
    }

    public void sendPasswordResetEmail(String toEmail, String resetToken, String username, String role) {
        if (!isEmailConfigured()) {
            logEmailSimulation(toEmail, resetToken, username, role);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String resetLink = "http://localhost:8080/reset-password.html?token=" + resetToken + "&role=" + role;

            String subject = "UEP Learning Hub - Password Reset Request";
            String htmlContent = buildResetEmailHtml(username, resetLink);

            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            helper.setFrom("UEP Learning Hub <no-reply@uep.edu.ph>");

            mailSender.send(message);
            System.out.println("Password reset email sent to: " + toEmail);
        } catch (MessagingException e) {
            System.err.println("Failed to send email: " + e.getMessage());
            // Fallback to logging
            logEmailSimulation(toEmail, resetToken, username, role);
        }
    }

    private void logEmailSimulation(String toEmail, String resetToken, String username, String role) {
        System.out.println("=== EMAIL SIMULATION (No mail server configured) ===");
        System.out.println("To: " + toEmail);
        System.out.println("Token: " + resetToken);
        System.out.println("Username: " + username);
        System.out.println("Role: " + role);
        System.out.println("Reset Link: http://localhost:8080/reset-password.html?token=" + resetToken + "&role=" + role);
        System.out.println("===================================================");
    }

    private String buildResetEmailHtml(String username, String resetLink) {
        // Your HTML content here
        return "<html>...</html>";
    }
}