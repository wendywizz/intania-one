// faceStampPhotoUri: a PSU sign-in uploads the camera picture, a demo session
// the bundled test photo.

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      localUri: 'file:///bundle/demo-face-test.jpg',
      downloadAsync: jest.fn(async () => undefined),
    })),
  },
}));

jest.mock('../demo/demoApi', () => ({
  installDemoFetch: jest.fn(),
  uninstallDemoFetch: jest.fn(),
}));

import { enterDemoMode, exitDemoMode, faceStampPhotoUri, faceStampStaffId } from '../demo/demoMode';

const CAMERA = 'file:///cache/face-scan.jpg';

afterEach(() => exitDemoMode());

describe('faceStampPhotoUri', () => {
  it('keeps the camera picture and the real staff id for a PSU sign-in', async () => {
    expect(await faceStampPhotoUri(CAMERA)).toBe(CAMERA);
    expect(faceStampStaffId('0042764')).toBe('0042764');
  });

  it('swaps in the bundled test photo and the test account in a demo session', async () => {
    enterDemoMode();

    expect(await faceStampPhotoUri(CAMERA)).toBe('file:///bundle/demo-face-test.jpg');
    expect(faceStampStaffId('0999901')).toBe('0099999');
  });
});
