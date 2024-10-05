import Redis from '../Redis';
import { createClient } from 'redis';

describe('Redis', () => {
  let redis: Redis;
  let mockRedisClient: any;

  beforeEach(async () => {
    mockRedisClient = createClient();
    redis = await Redis.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getInstance 테스트', async () => {
    const instance1 = await Redis.getInstance();
    const instance2 = await Redis.getInstance();

    expect(instance1).toBe(instance2);
  });

  it('set 테스트', async () => {
    const key = 'testKey';
    const value = 'testValue';
    const ttl = 3600;

    await redis.set(key, value, ttl);

    expect(mockRedisClient.set).toHaveBeenCalledWith(key, value, { EX: ttl });
  });

  it('get 테스트', async () => {
    const key = 'testKey';
    const expectedValue = 'testValue';
    mockRedisClient.get.mockResolvedValueOnce(expectedValue);

    const value = await redis.get(key);

    expect(value).toBe(expectedValue);
    expect(mockRedisClient.get).toHaveBeenCalledWith(key);
  });
});
