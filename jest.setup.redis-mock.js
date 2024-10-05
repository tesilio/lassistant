jest.mock('redis', () => {
  const mClient = {
    on: jest.fn().mockReturnThis(),
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue('Mocked news'),
    set: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
  };
  return {
    createClient: jest.fn(() => mClient),
    SocketClosedUnexpectedlyError: class extends Error {},
  };
});
