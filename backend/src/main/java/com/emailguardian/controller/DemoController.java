package com.emailguardian.controller;

import com.emailguardian.model.Email;
import com.emailguardian.model.User;
import com.emailguardian.repository.EmailRepository;
import com.emailguardian.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Demo data controller. Provides test emails and users for demo purposes.
 */
@RestController
@RequestMapping("/api/demo")
@RequiredArgsConstructor
public class DemoController {

    private final EmailRepository emailRepository;
    private final UserRepository userRepository;

    @GetMapping("/emails")
    public ResponseEntity<List<Email>> getDemoEmails() {
        return ResponseEntity.ok(emailRepository.findTop20ByOrderByCreatedAtDesc());
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getDemoUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }
}
