package com.emailguardian.repository;

import com.emailguardian.model.Email;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EmailRepository extends JpaRepository<Email, Long> {
    List<Email> findByStatusOrderByCreatedAtDesc(Email.EmailStatus status);
    List<Email> findTop20ByOrderByCreatedAtDesc();

    @Query("SELECT COUNT(e) FROM Email e WHERE e.status = 'BLOCKED'")
    long countBlocked();

    @Query("SELECT COUNT(e) FROM Email e WHERE e.status = 'WARNED' OR e.status = 'STRONG_WARNING'")
    long countWarned();

    @Query("SELECT COUNT(e) FROM Email e")
    long countTotal();
}
