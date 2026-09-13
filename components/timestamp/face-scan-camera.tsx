import type {
  FaceScanCameraProps,
  FaceScanPermission,
} from '@/components/timestamp/face-scan-camera.types';

export type { FaceScanCameraHandle, FaceScanCameraProps, FaceScanPermission } from '@/components/timestamp/face-scan-camera.types';

/**
 * Web stand-in for face-scan-camera.native.tsx.
 *
 * The face scan needs the native camera and ML Kit, neither of which exists in
 * a browser, and importing them would break the web bundle. Metro picks the
 * .native file on iOS and Android and this one on web; the screen checks
 * FACE_SCAN_SUPPORTED and says the scan is phone-only instead of drawing a
 * camera.
 */
export const FACE_SCAN_SUPPORTED = false;

export function useFaceScanPermission(): FaceScanPermission {
  return {
    hasPermission: false,
    canRequestPermission: false,
    requestPermission: async () => false,
  };
}

export function FaceScanCamera(_props: FaceScanCameraProps) {
  return null;
}
