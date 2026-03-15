package com.emailguardian.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class RootController {

    @GetMapping("/")
    public Map<String, Object> getRoot() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("message", "Welcome to AI Email Guardian Backend API");
        response.put("documentation", "/api/dashboard/stats");
        return response;
    }
}
