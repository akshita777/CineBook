package com.example.ticketbooking.config;

import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Thread-safe mock Redis configuration for tests using Mockito proxy for ValueOperations
 * to remain resilient across Spring Data Redis versions.
 */
@TestConfiguration
public class TestRedisConfiguration {

    private static final Map<String, String> inMemoryStore = new ConcurrentHashMap<>();

    public static void clear() {
        inMemoryStore.clear();
    }

    @Bean
    @Primary
    public RedisConnectionFactory redisConnectionFactory() {
        RedisConnectionFactory factory = mock(RedisConnectionFactory.class);
        RedisConnection connection = mock(RedisConnection.class);
        when(factory.getConnection()).thenReturn(connection);
        return factory;
    }

    @Bean
    @Primary
    @SuppressWarnings("unchecked")
    public StringRedisTemplate stringRedisTemplate() {
        StringRedisTemplate template = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);

        // Mock setIfAbsent with Duration
        when(valueOperations.setIfAbsent(any(String.class), any(String.class), any(Duration.class)))
                .thenAnswer(invocation -> {
                    String key = invocation.getArgument(0);
                    String value = invocation.getArgument(1);
                    return inMemoryStore.putIfAbsent(key, value) == null;
                });

        // Mock setIfAbsent without Duration
        when(valueOperations.setIfAbsent(any(String.class), any(String.class)))
                .thenAnswer(invocation -> {
                    String key = invocation.getArgument(0);
                    String value = invocation.getArgument(1);
                    return inMemoryStore.putIfAbsent(key, value) == null;
                });

        // Mock get
        when(valueOperations.get(any(String.class)))
                .thenAnswer(invocation -> inMemoryStore.get(invocation.getArgument(0)));

        when(template.opsForValue()).thenReturn(valueOperations);

        // Mock delete
        when(template.delete(any(String.class)))
                .thenAnswer(inv -> inMemoryStore.remove(inv.getArgument(0)) != null);

        // Mock Lua release script execution
        when(template.execute(any(), any(), any()))
                .thenAnswer(invocation -> {
                    List<String> keys = invocation.getArgument(1);
                    Object arg2 = invocation.getArgument(2);
                    String expectedVal = null;
                    if (arg2 instanceof Object[] arr && arr.length > 0) {
                        expectedVal = String.valueOf(arr[0]);
                    } else if (arg2 != null) {
                        expectedVal = String.valueOf(arg2);
                    }
                    if (keys != null && !keys.isEmpty() && expectedVal != null) {
                        String key = keys.get(0);
                        String actualVal = inMemoryStore.get(key);
                        if (expectedVal.equals(actualVal)) {
                            inMemoryStore.remove(key);
                            return 1L;
                        }
                    }
                    return 0L;
                });

        return template;
    }
}
