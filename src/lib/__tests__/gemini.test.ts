/// <reference types="jest" />
import { generateSpendingInsights } from '../gemini';

describe('generateSpendingInsights', () => {
  let originalKey: string | undefined;

  beforeAll(() => {
    originalKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  });

  beforeEach(() => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'dummy-key';
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    } else {
      process.env.EXPO_PUBLIC_GEMINI_API_KEY = originalKey;
    }
    jest.restoreAllMocks();
  });

  it('throws an error if EXPO_PUBLIC_GEMINI_API_KEY is missing', async () => {
    delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    await expect(generateSpendingInsights([], [], 1000000, 500000)).rejects.toThrow(
      'Missing Gemini API Key'
    );
  });

  it('returns formatted insights on a successful API call', async () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  forecastMessage: 'Chi tiêu của bạn rất hợp lý.',
                  installmentAlert: null,
                  aiShoppingAlert: 'Có 1 giao dịch Winmart.',
                  forecastType: 'success',
                }),
              },
            ],
          },
        },
      ],
    };

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    globalThis.fetch = mockFetch as any;

    const result = await generateSpendingInsights(
      [
        {
          amount: 50000,
          type: 'transfer',
          created_at: new Date().toISOString(),
          description: 'Winmart mua sua',
        },
      ],
      [],
      1000000,
      50000
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      forecastMessage: 'Chi tiêu của bạn rất hợp lý.',
      installmentAlert: null,
      aiShoppingAlert: 'Có 1 giao dịch Winmart.',
      forecastType: 'success',
    });
  });

  it('falls back to the next model if the first one fails (e.g. 503)', async () => {
    const mockSuccessResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  forecastMessage: 'Dự phòng hoạt động tốt.',
                  installmentAlert: null,
                  aiShoppingAlert: null,
                  forecastType: 'info',
                }),
              },
            ],
          },
        },
      ],
    };

    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      });

    globalThis.fetch = mockFetch as any;

    const result = await generateSpendingInsights([], [], 0, 0);

    expect(mockFetch).toHaveBeenCalledTimes(2); // First failed, second succeeded
    expect(result.forecastMessage).toBe('Dự phòng hoạt động tốt.');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Gemini API model gemini-2.5-flash failed:'),
      expect.any(String)
    );
  });

  it('throws after trying all models if all of them fail', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    });

    globalThis.fetch = mockFetch as any;

    await expect(generateSpendingInsights([], [], 0, 0)).rejects.toThrow(
      'Gemini API returned status 503: Service Unavailable'
    );
    expect(mockFetch).toHaveBeenCalledTimes(3); // Tried all 3 models
  });
});
