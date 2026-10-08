package com.example.ticketbooking.lock;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Component
public class RedisDistributedSeatLock {

    private static final Logger log = LoggerFactory.getLogger(RedisDistributedSeatLock.class);

    private static final String LOCK_PREFIX = "seat:lock:";
    private static final String RELEASE_LOCK_LUA_SCRIPT =
            "if redis.call('get', KEYS[1]) == ARGV[1] then " +
            "    return redis.call('del', KEYS[1]) " +
            "else " +
            "    return 0 " +
            "end";

    private final StringRedisTemplate redisTemplate;
    private final DefaultRedisScript<Long> releaseScript;

    public RedisDistributedSeatLock(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.releaseScript = new DefaultRedisScript<>();
        this.releaseScript.setScriptText(RELEASE_LOCK_LUA_SCRIPT);
        this.releaseScript.setResultType(Long.class);
    }

    private String buildKey(UUID showId, UUID showSeatId) {
        return LOCK_PREFIX + showId + ":" + showSeatId;
    }

    /**
     * Attempts to acquire atomic distributed locks for all requested seats.
     * If any seat fails to be locked, all previously acquired seats in this batch are rolled back immediately.
     *
     * @param showId target show
     * @param showSeatIds list of seats to lock
     * @param lockToken unique token (e.g. userId or lockToken UUID)
     * @param ttl duration before automatic expiration
     * @return true if all seats successfully locked, false otherwise
     */
    public boolean acquireAll(UUID showId, List<UUID> showSeatIds, String lockToken, Duration ttl) {
        List<UUID> lockedSeats = new ArrayList<>();

        for (UUID seatId : showSeatIds) {
            String key = buildKey(showId, seatId);
            try {
                Boolean acquired = redisTemplate.opsForValue().setIfAbsent(key, lockToken, ttl);
                if (Boolean.TRUE.equals(acquired)) {
                    lockedSeats.add(seatId);
                } else {
                    log.warn("Failed to acquire Redis lock for seat: {} - rolling back batch", seatId);
                    releaseAll(showId, lockedSeats, lockToken);
                    return false;
                }
            } catch (Exception ex) {
                log.error("Redis connection failure while locking seat: {}", seatId, ex);
                releaseAll(showId, lockedSeats, lockToken);
                return false;
            }
        }
        return true;
    }

    /**
     * Atomically releases a lock using a Lua script to ensure only the holder can release it.
     */
    public boolean release(UUID showId, UUID showSeatId, String lockToken) {
        String key = buildKey(showId, showSeatId);
        try {
            Long result = redisTemplate.execute(releaseScript, Collections.singletonList(key), lockToken);
            return result != null && result > 0;
        } catch (Exception ex) {
            log.error("Redis error releasing lock for key: {}", key, ex);
            return false;
        }
    }

    /**
     * Releases a collection of seats.
     */
    public void releaseAll(UUID showId, List<UUID> showSeatIds, String lockToken) {
        for (UUID seatId : showSeatIds) {
            release(showId, seatId, lockToken);
        }
    }

    /**
     * Checks if a seat lock is currently held by the expected token.
     */
    public boolean isHeldByToken(UUID showId, UUID showSeatId, String lockToken) {
        String key = buildKey(showId, showSeatId);
        try {
            String val = redisTemplate.opsForValue().get(key);
            return lockToken.equals(val);
        } catch (Exception ex) {
            log.error("Redis check error for key: {}", key, ex);
            return false;
        }
    }
}
