package com.example.ticketbooking.kafka.consumer;

import com.example.ticketbooking.entity.ProcessedEvent;
import com.example.ticketbooking.repository.ProcessedEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;

import java.util.UUID;

@Service
public class ProcessedEventService {

    private static final Logger log = LoggerFactory.getLogger(ProcessedEventService.class);

    private final ProcessedEventRepository processedEventRepository;
    private final PlatformTransactionManager transactionManager;

    public ProcessedEventService(ProcessedEventRepository processedEventRepository,
                                 PlatformTransactionManager transactionManager) {
        this.processedEventRepository = processedEventRepository;
        this.transactionManager = transactionManager;
    }

    /**
     * Attempts to claim event processing rights in an isolated transaction.
     * Uses REQUIRES_NEW with explicit rollback so that a duplicate key violation
     * cleanly rolls back ONLY this isolated transaction without throwing UnexpectedRollbackException.
     *
     * @param eventId the unique event identifier
     * @param eventType the event type
     * @return true if rights were successfully claimed, false if already processed or duplicate
     */
    public boolean tryClaimEventProcessing(UUID eventId, String eventType) {
        DefaultTransactionDefinition def = new DefaultTransactionDefinition();
        def.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        TransactionStatus status = transactionManager.getTransaction(def);

        try {
            if (processedEventRepository.existsByEventId(eventId)) {
                transactionManager.commit(status);
                return false;
            }

            processedEventRepository.saveAndFlush(new ProcessedEvent(eventId, eventType));
            transactionManager.commit(status);
            return true;
        } catch (DataIntegrityViolationException ex) {
            log.info("Concurrent duplicate delivery detected for eventId={}. Discarding duplicate.", eventId);
            transactionManager.rollback(status);
            return false;
        } catch (Exception ex) {
            transactionManager.rollback(status);
            log.warn("Unexpected exception claiming event processing for eventId={}: {}", eventId, ex.getMessage());
            return false;
        }
    }
}
