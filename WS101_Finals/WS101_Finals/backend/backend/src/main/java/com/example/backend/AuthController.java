package com.example.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ActivityLogRepository logRepository;

    /**
     * Helper method to process login with role enforcement
     */
    private ResponseEntity<?> processLogin(Map<String, String> loginData, String requiredRole) {
        // 1. Resolve username/identifier mismatch from different frontend scripts
        String username = loginData.get("username");
        if (username == null) {
            username = loginData.get("identifier");
        }

        String password = loginData.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest()
                    .body("{\"success\": false, \"message\": \"Credentials required\"}");
        }

        // 2. Fetch user from database
        User user = userRepository.findByUsername(username);

        // 3. Verify existence and password (plain text as currently implemented)
        if (user == null || !password.equals(user.getPassword())) {
            return ResponseEntity.status(401)
                    .body("{\"success\": false, \"message\": \"Invalid credentials\"}");
        }

        // 4. Role Verification: Ensure the user belongs in this portal
        if (requiredRole != null && !user.getRole().equalsIgnoreCase(requiredRole)) {
            return ResponseEntity.status(403)
                    .body("{\"success\": false, \"message\": \"Access Denied: You do not have " + requiredRole + " permissions for this portal.\"}");
        }

        // 5. Log the successful login activity
        logRepository.save(new ActivityLog(user.getUsername(), "Logged in to " + user.getRole() + " portal", user.getRole()));

        // 6. Return the user data to the frontend
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("role", user.getRole());
        response.put("username", user.getUsername());
        response.put("courseId", user.getCourseId());

        return ResponseEntity.ok(response);
    }

    /**
     * General login endpoint (used if role check is handled by frontend)
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
        return processLogin(loginData, null);
    }

    /**
     * Specific endpoint for Student Portal - strictly requires 'student' role
     */
    @PostMapping("/student/login")
    public ResponseEntity<?> studentLogin(@RequestBody Map<String, String> data) {
        return processLogin(data, "student");
    }

    /**
     * Specific endpoint for Professor Portal - strictly requires 'professor' role
     */
    @PostMapping("/prof/login")
    public ResponseEntity<?> professorLogin(@RequestBody Map<String, String> data) {
        return processLogin(data, "professor");
    }

    /**
     * Specific endpoint for Admin Portal - strictly requires 'admin' role
     */
    @PostMapping("/admin/login")
    public ResponseEntity<?> adminLogin(@RequestBody Map<String, String> data) {
        return processLogin(data, "admin");
    }
}