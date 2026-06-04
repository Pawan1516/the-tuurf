// Mock axios before any imports so that apiClient uses the mock
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  const mockAxios = {
    create: jest.fn(() => mockAxiosInstance),
    post: jest.fn(),
    defaults: { headers: { common: {} } },
  };
  return mockAxios;
});

import axios from 'axios';
import { slotsAPI } from '../client';

// Get the mocked axios instance that client.js created
const mockAxiosInstance = axios.create();

describe('slotsAPI.getAll integration test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return data when API succeeds', async () => {
    const mockData = { data: [{ _id: 'slot1', time: '6:00' }] };
    mockAxiosInstance.get.mockResolvedValueOnce(mockData);

    const response = await slotsAPI.getAll('2023-01-01');

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/slots', { params: { date: '2023-01-01' } });
    expect(response).toEqual(mockData);
  });

  it('should propagate error when API fails', async () => {
    const error = new Error('Network Error');
    mockAxiosInstance.get.mockRejectedValueOnce(error);

    await expect(slotsAPI.getAll('2023-01-01')).rejects.toThrow('Network Error');
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/slots', { params: { date: '2023-01-01' } });
  });
});
