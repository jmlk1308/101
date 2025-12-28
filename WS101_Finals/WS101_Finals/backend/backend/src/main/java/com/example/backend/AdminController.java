package com.example.backend;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class AdminController {

    @Autowired private UserRepository userRepository;
    @Autowired private CourseRepository courseRepository;
    @Autowired private SubjectRepository subjectRepository;
    @Autowired private ActivityLogRepository logRepository;
    @Autowired private NotificationRepository notificationRepository; // ✅ NEW

    private static final String UPLOAD_DIR = "uploads/";

    // ==========================================
    // USER PROFILE ENDPOINTS
    // ==========================================

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        // In real app, get user from JWT token
        // For demo, return first admin user
        User admin = userRepository.findByUsername("admin");
        if (admin == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(admin);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody User profileData) {
        try {
            User user = userRepository.findByUsername("admin"); // Get current user
            if (user == null) {
                return ResponseEntity.notFound().build();
            }

            // Update fields
            if (profileData.getEmail() != null) user.setEmail(profileData.getEmail());
            if (profileData.getFullName() != null) user.setFullName(profileData.getFullName());
            if (profileData.getPhone() != null) user.setPhone(profileData.getPhone());

            userRepository.save(user);

            // ✅ LOG IT
            logActivity(user.getUsername(), "Profile updated", user.getRole());

            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error updating profile: " + e.getMessage());
        }
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody PasswordChangeRequest request) {
        try {
            User user = userRepository.findByUsername("admin"); // Get current user
            if (user == null) {
                return ResponseEntity.notFound().build();
            }

            // Verify current password
            if (!user.getPassword().equals(request.getCurrentPassword())) {
                return ResponseEntity.badRequest().body("Current password is incorrect");
            }

            // Update password
            user.setPassword(request.getNewPassword());
            userRepository.save(user);

            // ✅ LOG IT
            logActivity(user.getUsername(), "Password changed", user.getRole());

            return ResponseEntity.ok("Password updated successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error changing password: " + e.getMessage());
        }
    }

    @PostMapping("/upload-profile-picture")
    public ResponseEntity<?> uploadProfilePicture(@RequestParam("file") MultipartFile file) {
        try {
            User user = userRepository.findByUsername("admin"); // Get current user
            if (user == null) {
                return ResponseEntity.notFound().build();
            }

            String fileName = saveFile(file);
            user.setProfilePicture(fileName);
            userRepository.save(user);

            // ✅ LOG IT
            logActivity(user.getUsername(), "Profile picture updated", user.getRole());

            return ResponseEntity.ok("Profile picture uploaded: " + fileName);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error uploading picture: " + e.getMessage());
        }
    }

    // ==========================================
    // ADMIN USER MANAGEMENT (Updated with profile fields)
    // ==========================================

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody User userData) {
        return userRepository.findById(id).map(user -> {
            // Update profile fields
            if (userData.getEmail() != null) user.setEmail(userData.getEmail());
            if (userData.getFullName() != null) user.setFullName(userData.getFullName());
            if (userData.getPhone() != null) user.setPhone(userData.getPhone());
            if (userData.getCourseId() != null) user.setCourseId(userData.getCourseId());
            if (userData.getRole() != null) user.setRole(userData.getRole());

            userRepository.save(user);

            // ✅ LOG IT
            logActivity(user.getUsername(), "User profile updated by admin", "admin");

            // ✅ SEND NOTIFICATION TO USER
            createNotification(user.getId(),
                    "Profile Updated",
                    "Your profile has been updated by administrator.",
                    "system", null);

            return ResponseEntity.ok(user);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/users/{id}/password")
    public ResponseEntity<?> adminResetPassword(@PathVariable Long id, @RequestBody Map<String, String> request) {
        return userRepository.findById(id).map(user -> {
            String newPassword = request.get("password");
            if (newPassword == null || newPassword.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Password is required");
            }

            user.setPassword(newPassword);
            userRepository.save(user);

            // ✅ LOG IT
            logActivity(user.getUsername(), "Password reset by admin", "admin");

            // ✅ SEND NOTIFICATION TO USER
            createNotification(user.getId(),
                    "Password Reset",
                    "Your password has been reset by administrator. Please login with your new password.",
                    "system", null);

            return ResponseEntity.ok("Password updated successfully");
        }).orElse(ResponseEntity.notFound().build());
    }

    // ==========================================
    // NOTIFICATION ENDPOINTS
    // ==========================================

    @GetMapping("/notifications")
    public List<Notification> getNotifications(@RequestParam(required = false) Long userId) {
        if (userId != null) {
            return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        }
        // For admin, show all notifications
        return notificationRepository.findAll();
    }

    @GetMapping("/notifications/unread-count")
    public Map<String, Long> getUnreadCount(@RequestParam Long userId) {
        long count = notificationRepository.countByUserIdAndIsReadFalse(userId);
        Map<String, Long> response = new HashMap<>();
        response.put("count", count);
        return response;
    }

    @PostMapping("/notifications/mark-read/{id}")
    public ResponseEntity<?> markNotificationAsRead(@PathVariable Long id, @RequestParam Long userId) {
        notificationRepository.markAsRead(id, userId);
        return ResponseEntity.ok("Notification marked as read");
    }

    @PostMapping("/notifications/mark-all-read")
    public ResponseEntity<?> markAllNotificationsAsRead(@RequestParam Long userId) {
        notificationRepository.markAllAsRead(userId);
        return ResponseEntity.ok("All notifications marked as read");
    }

    // Helper method to create notifications
    private void createNotification(Long userId, String title, String message, String type, String relatedId) {
        Notification notification = new Notification(userId, title, message, type, relatedId);
        notificationRepository.save(notification);
    }

    // ==========================================
    // UPDATED COURSE CREATION WITH NOTIFICATIONS
    // ==========================================

    @PostMapping("/courses")
    public ResponseEntity<?> createCourse(
            @RequestParam("id") String id,
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam("themeColor") String themeColor,
            @RequestParam(value = "file", required = false) MultipartFile file
    ) {
        if (courseRepository.existsById(id)) {
            return ResponseEntity.badRequest().body("Course Code (ID) already exists.");
        }

        Course course = new Course();
        course.setId(id);
        course.setTitle(title);
        course.setDescription(description);
        course.setThemeColor(themeColor);
        course.setStatus("active");

        if (file != null && !file.isEmpty()) {
            String imagePath = saveFile(file);
            course.setImage(imagePath);
        }

        courseRepository.save(course);

        // ✅ LOG IT
        logActivity(course.getId(), "Course created", "System");

        // ✅ SEND NOTIFICATIONS TO ALL USERS
        sendCourseNotificationToAllUsers(course);

        return ResponseEntity.ok(course);
    }

    private void sendCourseNotificationToAllUsers(Course course) {
        List<User> allUsers = userRepository.findAll();
        for (User user : allUsers) {
            // Send to students and professors
            if ("student".equalsIgnoreCase(user.getRole()) || "professor".equalsIgnoreCase(user.getRole())) {
                createNotification(user.getId(),
                        "New Course Available",
                        "A new course '" + course.getTitle() + "' (" + course.getId() + ") has been added.",
                        "course", course.getId());
            }
        }
    }

    // ==========================================
    // UPDATED SUBJECT CREATION WITH NOTIFICATIONS
    // ==========================================

    @PostMapping("/subjects")
    public ResponseEntity<?> createSubject(@RequestBody Subject subject) {
        if (subjectRepository.existsById(subject.getCode())) {
            return ResponseEntity.badRequest().body("Subject Code already exists.");
        }
        if (subject.getYearLevel() == 0) subject.setYearLevel(1);
        if (subject.getSemester() == 0) subject.setSemester(1);
        if (subject.getStatus() == null) subject.setStatus("active");

        subjectRepository.save(subject);

        // ✅ LOG IT
        logActivity(subject.getCode(), "Subject created", "System");

        // ✅ SEND NOTIFICATIONS TO RELEVANT USERS
        sendSubjectNotification(subject);

        return ResponseEntity.ok(subject);
    }

    private void sendSubjectNotification(Subject subject) {
        // Get course to include in notification
        Course course = courseRepository.findById(subject.getCourseId()).orElse(null);
        String courseName = course != null ? course.getTitle() : subject.getCourseId();

        // Send to users in the same course
        List<User> courseUsers = userRepository.findAll().stream()
                .filter(u -> subject.getCourseId().equals(u.getCourseId()))
                .toList();

        for (User user : courseUsers) {
            createNotification(user.getId(),
                    "New Subject Added",
                    "A new subject '" + subject.getTitle() + "' (" + subject.getCode() + ") has been added to " + courseName + ".",
                    "subject", subject.getCode());
        }
    }

    // ==========================================
    // EXISTING METHODS (keep as is)
    // ==========================================

    @GetMapping("/users")
    public List<User> getAllUsers() { return userRepository.findAll(); }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody User user) {
        if (userRepository.findByUsername(user.getUsername()) != null) {
            return ResponseEntity.badRequest().body("Username already exists");
        }

        if ("professor".equalsIgnoreCase(user.getRole())) {
            if (user.getCourseId() == null || user.getCourseId().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Professors must be assigned to a Course/Department.");
            }
        } else {
            user.setCourseId(null);
        }
        if (user.getRole() == null) user.setRole("student");

        User savedUser = userRepository.save(user);

        // ✅ LOG IT
        logActivity(savedUser.getUsername(), "User created", savedUser.getRole());

        // ✅ SEND WELCOME NOTIFICATION
        createNotification(savedUser.getId(),
                "Welcome to CS Learning Hub",
                "Your account has been created successfully. Welcome to the CS Learning Hub platform!",
                "system", null);

        return ResponseEntity.ok(savedUser);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        userRepository.deleteById(id);

        // ✅ LOG IT
        logActivity(user.getUsername(), "User deleted", user.getRole());

        return ResponseEntity.ok("User deleted successfully");
    }

    @GetMapping("/courses")
    public List<Course> getAllCourses() { return courseRepository.findAll(); }

    @PutMapping("/courses/{id}")
    public ResponseEntity<?> updateCourse(
            @PathVariable String id,
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam("themeColor") String themeColor,
            @RequestParam(value = "file", required = false) MultipartFile file
    ) {
        return courseRepository.findById(id).map(existing -> {
            existing.setTitle(title);
            existing.setDescription(description);
            existing.setThemeColor(themeColor);

            if (file != null && !file.isEmpty()) {
                String imagePath = saveFile(file);
                existing.setImage(imagePath);
            }
            courseRepository.save(existing);

            // ✅ LOG IT
            logActivity(existing.getId(), "Course updated", "System");

            return ResponseEntity.ok(existing);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/courses/{id}")
    public ResponseEntity<?> deleteCourse(@PathVariable String id) {
        if (!courseRepository.existsById(id)) return ResponseEntity.notFound().build();
        courseRepository.deleteById(id);

        // ✅ LOG IT
        logActivity(id, "Course deleted", "System");

        return ResponseEntity.ok("Course deleted successfully");
    }

    @GetMapping("/subjects")
    public List<Subject> getSubjects(@RequestParam(required = false) String courseId) {
        if (courseId != null && !courseId.isEmpty()) {
            return subjectRepository.findByCourseId(courseId);
        }
        return subjectRepository.findAll();
    }

    @GetMapping("/subjects/{code}")
    public ResponseEntity<Subject> getSubject(@PathVariable String code) {
        return subjectRepository.findById(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/subjects/{code}")
    public ResponseEntity<?> updateSubject(@PathVariable String code, @RequestBody Subject subject) {
        return subjectRepository.findById(code).map(existing -> {
            existing.setTitle(subject.getTitle());
            existing.setYearLevel(subject.getYearLevel());
            existing.setSemester(subject.getSemester());
            existing.setStatus(subject.getStatus());

            subjectRepository.save(existing);

            // ✅ LOG IT
            logActivity(code, "Subject updated", "System");

            return ResponseEntity.ok(existing);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/subjects/{code}")
    public ResponseEntity<?> deleteSubject(@PathVariable String code) {
        if (!subjectRepository.existsById(code)) return ResponseEntity.notFound().build();
        subjectRepository.deleteById(code);

        // ✅ LOG IT
        logActivity(code, "Subject deleted", "System");

        return ResponseEntity.ok("Subject deleted successfully");
    }

    @GetMapping("/logs")
    public List<ActivityLog> getLogs() {
        return logRepository.findAllByOrderByTimestampDesc();
    }

    private void logActivity(String target, String action, String role) {
        ActivityLog log = new ActivityLog(target, action, role);
        logRepository.save(log);
    }

    private String saveFile(MultipartFile file) {
        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Files.copy(file.getInputStream(), uploadPath.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);
            return fileName;
        } catch (Exception e) {
            throw new RuntimeException("Could not store file. Error: " + e.getMessage());
        }
    }
}

// Helper class for password change request
class PasswordChangeRequest {
    private String currentPassword;
    private String newPassword;

    // Getters and Setters
    public String getCurrentPassword() { return currentPassword; }
    public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }

    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}