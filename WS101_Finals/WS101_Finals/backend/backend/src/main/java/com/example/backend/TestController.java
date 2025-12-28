package com.example.backend;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@CrossOrigin(origins = "*")
public class TestController {

    @GetMapping("/api/test")
    public String test() {
        return "Backend is working!";
    }

    @GetMapping("/api/health")
    public String health() {
        return "OK";
    }
}
