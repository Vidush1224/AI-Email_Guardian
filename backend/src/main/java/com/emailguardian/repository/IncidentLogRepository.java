package com.emailguardian.repository;

import com.emailguardian.model.IncidentLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IncidentLogRepository extends JpaRepository<IncidentLog, Long> {
    List<IncidentLog> findAllByOrderByCreatedAtDesc();

    List<IncidentLog> findBySeverityOrderByCreatedAtDesc(IncidentLog.Severity severity);

    List<IncidentLog> findByIncidentTypeOrderByCreatedAtDesc(String incidentType);

    @Query("SELECT i FROM IncidentLog i WHERE i.resolved = :resolved ORDER BY i.createdAt DESC")
    List<IncidentLog> findByResolved(@Param("resolved") Boolean resolved);

    @Query("SELECT COUNT(i) FROM IncidentLog i WHERE i.severity = 'CRITICAL'")
    long countCritical();
}
