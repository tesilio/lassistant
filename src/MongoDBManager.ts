import mongoose from 'mongoose';

// Lambda 환경에서 연결을 재사용하기 위한 전역 변수
let cachedConnection: typeof mongoose | null = null;

export class MongoDBManager {
  private static instance: MongoDBManager;
  private isConnecting = false;

  private constructor() {}

  public static getInstance(): MongoDBManager {
    if (!MongoDBManager.instance) {
      MongoDBManager.instance = new MongoDBManager();
    }
    return MongoDBManager.instance;
  }

  /**
   * MongoDB에 연결합니다.
   * Lambda의 warm start 시 기존 연결을 재사용합니다.
   */
  public async connect(): Promise<typeof mongoose> {
    // 이미 연결되어 있고 연결 상태가 좋으면 재사용
    if (cachedConnection && mongoose.connection.readyState === 1) {
      console.log('MongoDB: 기존 연결 재사용');
      return cachedConnection;
    }

    // 연결 중인 경우 대기
    if (this.isConnecting) {
      console.log('MongoDB: 연결 중, 대기...');
      while (this.isConnecting) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return cachedConnection!;
    }

    try {
      this.isConnecting = true;
      console.log('MongoDB: 새 연결 시도');

      const mongoUri = process.env.MONGO_URI;
      if (!mongoUri) {
        throw new Error('MONGO_URI 환경 변수가 설정되지 않았습니다.');
      }

      // MongoDB 연결 옵션 (Lambda에 최적화)
      const options = {
        maxPoolSize: 5, // Lambda 동시성을 고려한 작은 pool
        serverSelectionTimeoutMS: 5000, // 빠른 타임아웃
        socketTimeoutMS: 45000, // Lambda 타임아웃보다 작게
        bufferCommands: false, // 연결되지 않은 상태에서 명령 버퍼링 비활성화
      };

      cachedConnection = await mongoose.connect(mongoUri, options);

      // 연결 이벤트 리스너
      mongoose.connection.on('connected', () => {
        console.log('MongoDB: 연결 성공');
      });

      mongoose.connection.on('error', (error) => {
        console.error('MongoDB 연결 오류:', error);
        cachedConnection = null;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB: 연결 끊김');
        cachedConnection = null;
      });

      return cachedConnection;
    } catch (error) {
      console.error('MongoDB 연결 실패:', error);
      cachedConnection = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * 연결을 닫습니다. (Lambda에서는 일반적으로 호출하지 않음)
   */
  public async disconnect(): Promise<void> {
    if (cachedConnection) {
      await mongoose.disconnect();
      cachedConnection = null;
      console.log('MongoDB: 연결 종료');
    }
  }

  /**
   * 연결 상태를 확인합니다.
   */
  public isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  /**
   * 연결 상태 정보를 반환합니다.
   */
  public getConnectionState(): string {
    const states = {
      0: '연결 끊김',
      1: '연결됨',
      2: '연결 중',
      3: '연결 해제 중',
    };
    return states[mongoose.connection.readyState as keyof typeof states] || '알 수 없음';
  }
}

// 편의를 위한 기본 인스턴스 내보내기
export const mongoDBManager = MongoDBManager.getInstance();

// info: Lambda handler에서 사용하기 위한 헬퍼 함수
export const ensureMongoConnection = async (): Promise<typeof mongoose> => {
  return mongoDBManager.connect();
};
