import * as ImageManipulator from 'expo-image-manipulator';
import { memo, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Ellipse, Mask, Rect } from 'react-native-svg';
import {
  Camera,
  CommonResolutions,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';
import { useFaceDetectorOutput, type Face } from 'react-native-vision-camera-face-detector';

import type {
  FaceScanCameraProps,
  FaceScanPermission,
} from '@/components/timestamp/face-scan-camera.types';
import { createBlinkDetector } from '@/utils/blink-detector';
import { guideOval, judgeFraming, type FramingVerdict, type ViewSize } from '@/utils/face-framing';

export type { FaceScanCameraHandle, FaceScanCameraProps, FaceScanPermission } from '@/components/timestamp/face-scan-camera.types';

/** The face scan runs on the phone only; see face-scan-camera.tsx for web. */
export const FACE_SCAN_SUPPORTED = true;

export function useFaceScanPermission(): FaceScanPermission {
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();

  return { hasPermission, canRequestPermission, requestPermission };
}

/**
 * The front camera for the face-scan stamp: live preview behind a guide oval,
 * ML Kit face detection on every frame, and a still on request.
 *
 * Detection runs natively and reports each frame's faces here. Two things are
 * worked out from them and handed to the screen: whether the face is placed in
 * the oval, and when it blinks — the liveness check (see utils/blink-detector).
 * Nothing about WHOSE face it is is decided on the phone.
 */
export function FaceScanCamera({ ringColor, scrimColor, ...pipelineProps }: FaceScanCameraProps) {
  const [size, setSize] = useState<ViewSize | null>(null);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((previous) =>
      previous && previous.width === width && previous.height === height ? previous : { width, height },
    );
  }, []);

  return (
    <View style={styles.fill} onLayout={onLayout}>
      {size ? <CameraPipeline size={size} {...pipelineProps} /> : null}
      {size ? <GuideOval size={size} ringColor={ringColor} scrimColor={scrimColor} /> : null}
    </View>
  );
}

type PipelineProps = Omit<FaceScanCameraProps, 'ringColor' | 'scrimColor'> & { size: ViewSize };

/**
 * The camera itself, kept in its own memoised component on purpose.
 *
 * useFaceDetectorOutput() rebuilds its output whenever the component that calls
 * it renders (its memo depends on an options object made fresh each call), and
 * a new output reconfigures the whole camera session. So this renders only when
 * `active`, the view size, or the screen's (stable) callbacks change — the ring
 * colour and everything else the screen redraws live outside it.
 */
const CameraPipeline = memo(function CameraPipeline({
  active,
  size,
  onFramingChange,
  onBlink,
  onError,
  ref,
}: PipelineProps) {
  // Read through a ref so a frame always reaches the latest handler without
  // the handler itself being a reason to rebuild the pipeline.
  const handlers = useRef({ onFramingChange, onBlink, onError });
  handlers.current = { onFramingChange, onBlink, onError };

  const blink = useMemo(() => createBlinkDetector(), []);
  const lastFraming = useRef<FramingVerdict | null>(null);

  const photoOutput = usePhotoOutput({
    targetResolution: CommonResolutions.VGA_4_3,
    containerFormat: 'jpeg',
    quality: 0.85,
  });

  const faceOutput = useFaceDetectorOutput({
    performanceMode: 'fast',
    runClassifications: true,
    cameraFacing: 'front',
    // Bounds in this view's coordinates, rotated and mirrored natively, so
    // they can be compared with the oval drawn over the same view.
    autoMode: true,
    windowWidth: size.width,
    windowHeight: size.height,
    minFaceSize: 0.15,
    onFacesDetected(faces: Face[]) {
      const framing = judgeFraming(
        faces.map((face) => face.bounds),
        size,
      );

      if (framing !== lastFraming.current) {
        lastFraming.current = framing;
        handlers.current.onFramingChange(framing);
      }

      // A blink only counts for a face that is where the scan needs it.
      if (framing !== 'ok') {
        blink.reset();
        return;
      }

      const [face] = faces;
      const blinked = blink.push({
        leftOpen: face.leftEyeOpenProbability,
        rightOpen: face.rightEyeOpenProbability,
        at: Date.now(),
      });

      if (blinked) handlers.current.onBlink();
    },
    onError(error: Error) {
      handlers.current.onError(error.message);
    },
  });

  const outputs = useMemo(() => [faceOutput, photoOutput], [faceOutput, photoOutput]);

  useImperativeHandle(
    ref,
    () => ({
      async capture() {
        const photo = await photoOutput.capturePhoto({ flashMode: 'off', enableShutterSound: false }, {});

        try {
          const path = await photo.saveToTemporaryFileAsync();
          const uri = path.startsWith('file://') ? path : `file://${path}`;

          // The front camera hands back a mirror image, the way the preview
          // looks. The kiosk webcams do not, and a face compares best against
          // the registered one when it is the right way round.
          const actions: ImageManipulator.Action[] = photo.isMirrored
            ? [{ flip: ImageManipulator.FlipType.Horizontal }, { resize: { width: 480 } }]
            : [{ resize: { width: 480 } }];

          const result = await ImageManipulator.manipulateAsync(uri, actions, {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
          });

          return result.uri;
        } finally {
          photo.dispose();
        }
      },
    }),
    [photoOutput],
  );

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device="front"
      isActive={active}
      outputs={outputs}
      onError={(error: Error) => handlers.current.onError(error.message)}
    />
  );
});

/** The dim frame with an oval cut out, and the oval's outline. */
function GuideOval({ size, ringColor, scrimColor }: { size: ViewSize; ringColor: string; scrimColor: string }) {
  const oval = guideOval(size);

  return (
    <Svg style={StyleSheet.absoluteFill} width={size.width} height={size.height} pointerEvents="none">
      <Defs>
        <Mask id="face-scan-oval">
          <Rect x={0} y={0} width={size.width} height={size.height} fill="white" />
          <Ellipse cx={oval.cx} cy={oval.cy} rx={oval.rx} ry={oval.ry} fill="black" />
        </Mask>
      </Defs>
      <Rect x={0} y={0} width={size.width} height={size.height} fill={scrimColor} mask="url(#face-scan-oval)" />
      <Ellipse cx={oval.cx} cy={oval.cy} rx={oval.rx} ry={oval.ry} stroke={ringColor} strokeWidth={4} fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
