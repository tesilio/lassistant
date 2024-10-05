import environment from '../config/environment';
import { createClient, RedisClientType } from 'redis';

export default class Redis {
  private static instance: Redis;
  private client: RedisClientType;

  /** */
  private constructor() {
    this.client = createClient({
      url: `redis://${environment.redis.host}:${environment.redis.port}`,
      password: environment.redis.password,
      pingInterval: 2000,
    });

    this.client
      .on('error', (err) => {
        console.error('Redis Client Error', err);
      })
      .connect()
      .catch((error) => {
        console.error('레디스 클라이언트 연결 에러:', error);
      });
  }

  /**
   * 싱글톤 인스턴스 반환
   * @returns {Redis}
   */
  public static getInstance(): Redis {
    if (!Redis.instance) {
      Redis.instance = new Redis();
    }
    return Redis.instance;
  }

  /**
   * Redis에 값을 설정하는 메서드
   * @async
   * @param {string} key
   * @param {string} value
   * @param {number} ttl
   * @returns {Promise<void>}
   */
  public async set(key: string, value: string, ttl = 0): Promise<void> {
    try {
      await this.client.set(key, value, {
        EX: ttl,
      });
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
      return await this.client.get(key);
    } catch (error) {
      console.error(`레디스 Get 에러: ${key}`, error);
      throw error;
    }
  }
}
