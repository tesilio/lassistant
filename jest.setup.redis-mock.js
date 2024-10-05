jest.mock('redis', () => {
  const mClient = {
    on: jest.fn().mockReturnThis(),
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue('Mocked news'),
    set: jest.fn().mockResolvedValue(undefined),
  };
  return {
    createClient: jest.fn(() => mClient),
  };
});
