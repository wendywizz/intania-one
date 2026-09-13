import type { Ref } from 'react';

import type { FramingVerdict } from '@/utils/face-framing';

/** What the stamping screen can ask of the camera. */
export type FaceScanCameraHandle = {
  /**
   * Take a still and prepare it for FaceValid: un-mirrored, JPEG, ~480 px wide.
   * Resolves with a file:// URI.
   */
  capture(): Promise<string>;
};

export type FaceScanCameraProps = {
  /** Run the camera. Off whenever the screen is not in the foreground. */
  active: boolean;
  /** The guide oval's outline — the screen tints it by state. */
  ringColor: string;
  /** The dim layer around the oval. */
  scrimColor: string;
  /** Called when the placement verdict changes, not on every frame. */
  onFramingChange: (framing: FramingVerdict) => void;
  /** Called once per completed blink of a well-placed face. */
  onBlink: () => void;
  onError: (message: string) => void;
  ref?: Ref<FaceScanCameraHandle>;
};

export type FaceScanPermission = {
  hasPermission: boolean;
  /** False once the OS will no longer prompt — only Settings can grant it then. */
  canRequestPermission: boolean;
  requestPermission: () => Promise<boolean>;
};
