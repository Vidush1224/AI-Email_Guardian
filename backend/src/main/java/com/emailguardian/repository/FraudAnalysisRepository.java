package com.emailguardian.repository;

import com.emailguardian.model.FraudAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FraudAnalysisRepository extends JpaRepository<FraudAnalysis, Long> {
    Optional<FraudAnalysis> findByEmailId(Long emailId);
    List<FraudAnalysis> findTop20ByOrderByCreatedAtDesc();

    @Query("SELECT AVG(f.totalScore) FROM FraudAnalysis f")
    Double findAverageRiskScore();

    @Query("SELECT COUNT(f) FROM FraudAnalysis f WHERE f.aiDeepAnalysisTriggered = true")
    long countAiTriggered();
}
