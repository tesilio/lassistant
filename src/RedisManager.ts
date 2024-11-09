import environment from '../config/environment';
import Redis from 'ioredis';

let redis: Redis;

/**
 * 레디스 인스턴스 생성
 * @async
 * @returns {Redis}
 */
const createRedis = (): Redis => {
  return new Redis({
    host: environment.redis.host,
    port: environment.redis.port,
    password: environment.redis.password,
  });
};

/**
 * 레디스 클라이언트 반환
 * @async
 * @returns {Promise<RedisClientType>}
 */
const getRedis = (): Redis => {
  if (!redis) {
    redis = createRedis();
  }

  return redis;
};

export default class RedisManager {
  private static instance: RedisManager;
  private redis: Redis | undefined;

  /**
   * 싱글톤 인스턴스 반환
   * @returns {RedisManager}
   */
  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
      RedisManager.instance.redis = getRedis();
    }
    return RedisManager.instance;
  }

  /**
   * Redis에 값을 설정하는 메서드
   * @async
   * @param {string} key - 키
   * @param {string} value - 값
   * @param {number} ttl - 만료 시간
   * @returns {Promise<void>}
   */
  public async set(key: string, value: string, ttl: number = 0): Promise<void> {
    try {
      if (!this.redis) {
        this.redis = getRedis();
      }
      await this.redis.set(key, value, 'EX', ttl);
    } catch (error) {
      console.error(`레디스 Set 에러: ${key}`, error);
      throw error;
    }
  }

  /**
   * Redis에서 값을 가져오는 메서드
   * @async
   * @param {string} key
   * @returns {Promise<string | null>}
   */
  public async get(key: string): Promise<string | null> {
    try {
      if (!this.redis) {
        this.redis = getRedis();
      }
      return await this.redis.get(key);
    } catch (error) {
      console.error(`레디스 Get 에러: ${key}`, error);
      throw error;
    }
  }
}
