package com.example.backend;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    User findByUsername(String username);

    User findByEmail(String email);

    User findByResetToken(String resetToken);

    long countByRole(String role);

    long countByRoleAndCourseId(String role, String courseId);

    // NEW METHODS
    List<User> findAllByCourseId(String courseId);

    List<User> findAllByRole(String role);

    List<User> findAllByIdIn(List<Long> ids);

    @Query("SELECT u FROM User u WHERE u.courseId = :courseId AND u.role = :role")
    List<User> findByCourseIdAndRole(@Param("courseId") String courseId, @Param("role") String role);
}