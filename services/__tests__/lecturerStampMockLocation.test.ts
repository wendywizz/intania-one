/**
 * The lecturer stamp carries Android's mock-location flag as `mock_location`
 * ('1' / '0'), and leaves it out when the OS did not say (iOS).
 */
import { stampToday } from '@/services/timestampService';

jest.mock('@/services/api', () => ({
  ...jest.requireActual('@/services/api'),
  requestJson: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { requestJson } = require('@/services/api') as { requestJson: jest.Mock };

beforeEach(() => {
  requestJson.mockReset();
  requestJson.mockResolvedValue({ data: { stamped: true, created: true }, message: 'ok' });
});

const bodyOfStamp = () => JSON.parse(requestJson.mock.calls[0][1].body);

describe('stampToday mock_location', () => {
  it.each([
    [true, '1'],
    [false, '0'],
  ])('sends %p as %p', async (mocked, expected) => {
    await stampToday('0042764', { lat: 7.0067544, lon: 100.5011083, mocked });

    expect(bodyOfStamp()).toMatchObject({ staff_id: '0042764', lat: '7.0067544', lon: '100.5011083', mock_location: expected });
  });

  it('omits it when unknown (iOS)', async () => {
    await stampToday('0042764', { lat: 7.0067544, lon: 100.5011083 });

    expect(bodyOfStamp()).not.toHaveProperty('mock_location');
  });

  it('omits it when there is no position at all', async () => {
    await stampToday('0042764', null);

    expect(bodyOfStamp()).toEqual({ staff_id: '0042764' });
  });
});
