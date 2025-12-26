jest.mock('axios');

import axios from 'axios';
import AirKoreaManager from '../AirKoreaManager';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AirKoreaManager', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    AirKoreaManager.resetInstance();
  });

  describe('getInstance', () => {
    it('싱글톤 인스턴스를 반환해야 한다', () => {
      const instance1 = AirKoreaManager.getInstance();
      const instance2 = AirKoreaManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('resetInstance 후 새로운 인스턴스를 생성해야 한다', () => {
      const instance1 = AirKoreaManager.getInstance();
      AirKoreaManager.resetInstance();
      const instance2 = AirKoreaManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('getStationList', () => {
    it('측정소 목록을 반환해야 한다', async () => {
      const mockStations = [
        { stationName: '강남구', addr: '서울특별시 강남구' },
        { stationName: '서초구', addr: '서울특별시 서초구' },
      ];

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          response: {
            header: { resultCode: '00', resultMsg: 'NORMAL_CODE' },
            body: {
              items: mockStations,
              numOfRows: 100,
              pageNo: 1,
              totalCount: 2,
            },
          },
        },
      });

      const manager = AirKoreaManager.getInstance();
      const result = await manager.getStationList('강남');

      expect(result).toEqual(mockStations);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('getMsrstnList'),
        expect.objectContaining({
          params: expect.objectContaining({
            addr: '강남',
            returnType: 'json',
          }),
        }),
      );
    });

    it('결과가 없을 때 빈 배열을 반환해야 한다', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          response: {
            header: { resultCode: '00', resultMsg: 'NORMAL_CODE' },
            body: {
              items: null,
              numOfRows: 100,
              pageNo: 1,
              totalCount: 0,
            },
          },
        },
      });

      const manager = AirKoreaManager.getInstance();
      const result = await manager.getStationList('존재하지않는지역');

      expect(result).toEqual([]);
    });
  });

  describe('getAirQuality', () => {
    const mockAirQualityResponse = {
      data: {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL_CODE' },
          body: {
            items: [
              {
                stationName: '강남구',
                dataTime: '2025-12-27 09:00',
                so2Value: '0.003',
                coValue: '0.4',
                o3Value: '0.025',
                no2Value: '0.020',
                pm10Value: '45',
                pm10Grade: '2',
                pm25Value: '25',
                pm25Grade: '2',
                khaiValue: '75',
                khaiGrade: '2',
              },
            ],
            numOfRows: 1,
            pageNo: 1,
            totalCount: 1,
          },
        },
      },
    };

    it('대기질 정보를 반환해야 한다', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockAirQualityResponse);

      const manager = AirKoreaManager.getInstance();
      const result = await manager.getAirQuality('강남구');

      expect(result).toEqual({
        pm10Value: 45,
        pm10Grade: 2,
        pm25Value: 25,
        pm25Grade: 2,
        khaiValue: 75,
        khaiGrade: 2,
        pm10GradeText: '보통',
        pm25GradeText: '보통',
        khaiGradeText: '보통',
        pm10GradeEmoji: '🟡',
        pm25GradeEmoji: '🟡',
        khaiGradeEmoji: '🟡',
      });
    });

    it('데이터가 없을 때 에러를 던져야 한다', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          response: {
            header: { resultCode: '00', resultMsg: 'NORMAL_CODE' },
            body: {
              items: [],
              numOfRows: 1,
              pageNo: 1,
              totalCount: 0,
            },
          },
        },
      });

      const manager = AirKoreaManager.getInstance();

      await expect(manager.getAirQuality('존재하지않는측정소')).rejects.toThrow(
        '측정소 존재하지않는측정소의 대기질 정보를 찾을 수 없습니다.',
      );
    });

    it('등급이 유효하지 않을 때 기본값 1을 사용해야 한다', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          response: {
            header: { resultCode: '00', resultMsg: 'NORMAL_CODE' },
            body: {
              items: [
                {
                  stationName: '강남구',
                  dataTime: '2025-12-27 09:00',
                  pm10Value: '45',
                  pm10Grade: '-',
                  pm25Value: '25',
                  pm25Grade: '',
                  khaiValue: '75',
                  khaiGrade: 'invalid',
                },
              ],
              numOfRows: 1,
              pageNo: 1,
              totalCount: 1,
            },
          },
        },
      });

      const manager = AirKoreaManager.getInstance();
      const result = await manager.getAirQuality('강남구');

      expect(result.pm10Grade).toBe(1);
      expect(result.pm25Grade).toBe(1);
      expect(result.khaiGrade).toBe(1);
      expect(result.pm10GradeText).toBe('좋음');
      expect(result.pm25GradeText).toBe('좋음');
      expect(result.khaiGradeText).toBe('좋음');
    });

    it('값이 없을 때 0으로 처리해야 한다', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          response: {
            header: { resultCode: '00', resultMsg: 'NORMAL_CODE' },
            body: {
              items: [
                {
                  stationName: '강남구',
                  dataTime: '2025-12-27 09:00',
                  pm10Value: '-',
                  pm10Grade: '1',
                  pm25Value: '',
                  pm25Grade: '1',
                  khaiValue: 'invalid',
                  khaiGrade: '1',
                },
              ],
              numOfRows: 1,
              pageNo: 1,
              totalCount: 1,
            },
          },
        },
      });

      const manager = AirKoreaManager.getInstance();
      const result = await manager.getAirQuality('강남구');

      expect(result.pm10Value).toBe(0);
      expect(result.pm25Value).toBe(0);
      expect(result.khaiValue).toBe(0);
    });

    it('모든 등급에 대해 올바른 텍스트와 이모지를 반환해야 한다', async () => {
      const gradeTestCases = [
        { grade: '1', expectedText: '좋음', expectedEmoji: '🟢' },
        { grade: '2', expectedText: '보통', expectedEmoji: '🟡' },
        { grade: '3', expectedText: '나쁨', expectedEmoji: '🟠' },
        { grade: '4', expectedText: '매우나쁨', expectedEmoji: '🔴' },
      ];

      for (const testCase of gradeTestCases) {
        AirKoreaManager.resetInstance();
        mockedAxios.get.mockReset();
        mockedAxios.get.mockResolvedValueOnce({
          data: {
            response: {
              header: { resultCode: '00', resultMsg: 'NORMAL_CODE' },
              body: {
                items: [
                  {
                    stationName: '강남구',
                    dataTime: '2025-12-27 09:00',
                    pm10Value: '50',
                    pm10Grade: testCase.grade,
                    pm25Value: '25',
                    pm25Grade: testCase.grade,
                    khaiValue: '75',
                    khaiGrade: testCase.grade,
                  },
                ],
                numOfRows: 1,
                pageNo: 1,
                totalCount: 1,
              },
            },
          },
        });

        const manager = AirKoreaManager.getInstance();
        const result = await manager.getAirQuality('강남구');

        expect(result.pm10GradeText).toBe(testCase.expectedText);
        expect(result.pm10GradeEmoji).toBe(testCase.expectedEmoji);
      }
    });
  });

  describe('retryRequest (via getAirQuality)', () => {
    it('첫 번째 시도에서 성공하면 바로 결과를 반환해야 한다', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          response: {
            header: { resultCode: '00', resultMsg: 'NORMAL_CODE' },
            body: {
              items: [
                {
                  stationName: '강남구',
                  pm10Value: '45',
                  pm10Grade: '2',
                  pm25Value: '25',
                  pm25Grade: '2',
                  khaiValue: '75',
                  khaiGrade: '2',
                },
              ],
            },
          },
        },
      });

      const manager = AirKoreaManager.getInstance();
      await manager.getAirQuality('강남구');

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });
});
