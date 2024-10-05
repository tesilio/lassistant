import environment from '../config/environment';
import { createClient, RedisClientType, SocketClosedUnexpectedlyError } from 'redis';

let RedisClient: RedisClientType | null;

/**
 * 레디스 클라이언트 생성
 * @async
 * @returns {Promise<RedisClientType>}
 */
const createRedisClient = async (): Promise<RedisClientType> => {
  const client = createClient({
    url: `redis://${environment.redis.host}:${environment.redis.port}`,
    password: environment.redis.password,
  });

  client.on('error', (err) => err);

  await client.connect();
  return client as RedisClientType;
};

/**
 * 레디스 클라이언트 반환
 * @async
 * @param {number} tryCount - 재시도 횟수
 * @returns {Promise<RedisClientType>}
 */
const getRedisClient = async (tryCount: number = 1): Promise<RedisClientType> => {
  try {
    if (!RedisClient) {
      RedisClient = await createRedisClient();
    }

    await RedisClient.ping();

    return RedisClient;
  } catch (error) {
    if (error instanceof SocketClosedUnexpectedlyError && tryCount > 0) {
      RedisClient = null;
      return getRedisClient(tryCount - 1);
    }

    console.error('레디스 클라이언트 연결 에러:', error);
    throw error;
  }
};

export default class Redis {
  private static instance: Redis;
  client: RedisClientType | null;

  /** */
  private constructor() {
    this.client = null;
  }

  /**
   * 싱글톤 인스턴스 반환
   * @returns {Redis}
   */
  public static async getInstance(): Promise<Redis> {
    if (!Redis.instance) {
      Redis.instance = new Redis();
      Redis.instance.client = await getRedisClient();
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
      if (!this.client) {
        this.client = await getRedisClient();
      }
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
      if (!this.client) {
        this.client = await getRedisClient();
      }
      return await this.client.get(key);
    } catch (error) {
      console.error(`레디스 Get 에러: ${key}`, error);
      throw error;
    }
  }
}
