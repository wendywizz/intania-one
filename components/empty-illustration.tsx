/**
 * Line-art illustrations for screens with nothing on them.
 *
 * A single glyph tells you a list is empty; it does not tell you how to feel
 * about it. These do. There are only three situations worth drawing:
 *
 * - `positive` — nothing here, and that is the good outcome (no missed stamps,
 *   no queue waiting, no history yet). A tray with a tick.
 * - `search` — a search or filter that came back with nothing. A page being
 *   looked at through a lens, with a cross where the result would be. A dead
 *   end, drawn as one.
 * - `offline` — the data never arrived. Signal arcs with the line cut through
 *   them: the list is not empty, we simply could not reach it.
 *
 * The rest are the same three ideas drawn for a subject in particular, so a
 * screen can say *what* is empty and not just how empty feels: `timestamp` for
 * the forgot-timestamp list (every day was stamped), `calendar` for a request
 * queue or a diary with nothing ahead in it, `history` for a log nothing has
 * been filed into yet, `meeting` for a room nobody is in, `repair` for a job
 * queue with nothing broken in it, `notice` for a building nothing has been
 * reported against, `room` for a room nobody has booked, `exam` for a sitting
 * nobody has been rostered to.
 *
 * Everything is drawn from theme tokens, as a ramp stepping *away from the
 * page*: `surfaceAlt` fills, then `border`, then `borderStrong`, then
 * `textFaint` for the strokes that carry the shape. Four small steps, so the
 * darkest line in the drawing is still a light grey and sits in the same family
 * as the message under it — never black, and never a white-filled shape, which
 * on a grey page reads as a cut-out rather than as a picture. In light mode the
 * ramp is successively darker greys; in dark mode the same tokens step lighter.
 * So the drawing is always a shade off its background, in either theme, without
 * a single hard-coded colour.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { useColors } from '@/constants/theme';

export type EmptyIllustrationName =
  | 'positive'
  | 'search'
  | 'offline'
  | 'timestamp'
  | 'calendar'
  | 'history'
  | 'meeting'
  | 'repair'
  | 'notice'
  | 'room'
  | 'exam';

/** The drawings are authored in this box and scaled from it. */
const VIEW_BOX_WIDTH = 180;
const VIEW_BOX_HEIGHT = 140;

type Palette = {
  /** Shape interiors — the first step off the page, and never lighter than it. */
  fill: string;
  /** Ground shadows and placeholder bars: the second step. */
  soft: string;
  /** Secondary strokes: ticks, marks, things read second. */
  line: string;
  /** The strokes that carry the shape — the darkest tone in the drawing. */
  ink: string;
  /** The page itself, for knocking a hole through what sits behind. */
  page: string;
};

/**
 * A four-point sparkle centred on (x, y). Two of these are what separate "the
 * list is empty" from "the list is empty and that's fine".
 */
function sparkle(x: number, y: number, size: number) {
  const arm = size / 3;
  return (
    `M${x} ${y - size} C${x} ${y - arm} ${x + arm} ${y} ${x + size} ${y} ` +
    `C${x + arm} ${y} ${x} ${y + arm} ${x} ${y + size} ` +
    `C${x} ${y + arm} ${x - arm} ${y} ${x - size} ${y} ` +
    `C${x - arm} ${y} ${x} ${y - arm} ${x} ${y - size} Z`
  );
}

/** The shadow every drawing stands on, so nothing floats. */
function Ground({ soft, cy = 126, rx = 52 }: { soft: string; cy?: number; rx?: number }) {
  return <Ellipse cx={90} cy={cy} rx={rx} ry={7} fill={soft} />;
}

/**
 * Empty means "you missed nothing": a clock, and a tick where the alarm would
 * be. Deliberately the same tick as `positive` — one idea, drawn twice.
 */
function TimestampArt({ fill, soft, line, ink, page }: Palette) {
  return (
    <G>
      <Ground soft={soft} rx={54} />

      <Path d={sparkle(36, 40, 8)} fill={line} />
      <Path d={sparkle(150, 34, 6)} fill={line} />

      <Circle cx={84} cy={64} r={38} fill={fill} stroke={ink} strokeWidth={3.5} />
      {/* The minute ring, as twelve dashes rather than twelve elements. */}
      <Circle
        cx={84}
        cy={64}
        r={30}
        fill="none"
        stroke={line}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="2 13.7"
      />

      <Path
        d="M84 64 V42 M84 64 L98 72"
        stroke={ink}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <Circle cx={84} cy={64} r={3.5} fill={ink} />

      {/* Knocked out of the page so it reads as sitting in front of the clock. */}
      <Circle cx={130} cy={100} r={20} fill={page} stroke={ink} strokeWidth={3.5} />
      <Path
        d="M120 100 L127 107 L140 92"
        fill="none"
        stroke={ink}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  );
}

/** An emptied tray with a tick over it: the work is done, not missing. */
function PositiveArt({ fill, soft, line, ink, page }: Palette) {
  return (
    <G>
      <Ground soft={soft} />

      <Path d={sparkle(38, 52, 7)} fill={line} />
      <Path d={sparkle(152, 78, 6)} fill={line} />

      <Path
        d="M40 88 L57 46 Q60 40 67 40 H113 Q120 40 123 46 L140 88 v18 a12 12 0 0 1 -12 12 H52 a12 12 0 0 1 -12 -12 Z"
        fill={fill}
        stroke={ink}
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
      <Path
        d="M40 88 h24 l6 10 h40 l6 -10 h24"
        fill="none"
        stroke={ink}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <Circle cx={128} cy={44} r={19} fill={page} stroke={ink} strokeWidth={3.5} />
      <Path
        d="M119 44 L126 51 L138 37"
        fill="none"
        stroke={ink}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  );
}

/**
 * Nothing waiting on a decision: a calendar with a tick. Leave is asked for in
 * days, so the queue that is empty is a calendar's worth of them — the same
 * tick as `positive`, over the thing the request is actually about.
 */
function CalendarArt({ fill, soft, line, ink, page }: Palette) {
  return (
    <G>
      <Ground soft={soft} rx={50} />

      <Path d={sparkle(30, 46, 6)} fill={line} />

      {/* The two hanging rings, drawn before the body so the body caps them. */}
      <Path
        d="M64 20 V36 M116 20 V36"
        stroke={ink}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <Rect
        x={40}
        y={30}
        width={100}
        height={86}
        rx={12}
        fill={fill}
        stroke={ink}
        strokeWidth={3.5}
      />
      <Path d="M40 54 H140" stroke={ink} strokeWidth={3.5} />

      {/* The month's days, as a grid of marks rather than as numbers. */}
      <Rect x={56} y={66} width={17} height={10} rx={3} fill={soft} />
      <Rect x={81} y={66} width={17} height={10} rx={3} fill={soft} />
      <Rect x={106} y={66} width={17} height={10} rx={3} fill={soft} />
      <Rect x={56} y={86} width={17} height={10} rx={3} fill={soft} />
      <Rect x={81} y={86} width={17} height={10} rx={3} fill={soft} />

      <Circle cx={128} cy={104} r={19} fill={page} stroke={ink} strokeWidth={3.5} />
      <Path
        d="M119 104 L125.5 110.5 L137 97"
        fill="none"
        stroke={ink}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  );
}

/**
 * Nothing to meet about: a presentation board on its easel with an empty panel
 * on it. No badge — a board with nothing on it already *is* the message, and a
 * tick beside it would be answering a question nobody asked.
 */
function MeetingArt({ fill, soft, line, ink }: Palette) {
  return (
    <G>
      <Ground soft={soft} rx={52} cy={130} />

      {/* The easel, drawn first so the board sits on top of where the legs
          meet it. */}
      <Path
        d="M60 88 L44 126 M120 88 L136 126"
        stroke={ink}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <Path d="M52 112 H128" stroke={line} strokeWidth={3} strokeLinecap="round" />

      <Rect
        x={34}
        y={18}
        width={112}
        height={72}
        rx={10}
        fill={fill}
        stroke={ink}
        strokeWidth={3.5}
      />
      {/* The dashed panel is the point of the whole drawing: a board with a
          space on it that nothing has been put in. A blank rectangle would just
          read as a board. */}
      <Rect
        x={50}
        y={32}
        width={80}
        height={44}
        rx={7}
        fill="none"
        stroke={line}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="7 8"
      />
    </G>
  );
}

/**
 * No jobs to fix: a closed toolbox with a tick. A toolbox rather than the
 * obvious screen-with-a-spanner, because a rectangle on a stand is already what
 * `meeting` is, and two modules should not open onto the same silhouette.
 */
function RepairArt({ fill, soft, line, ink, page }: Palette) {
  return (
    <G>
      <Ground soft={soft} rx={50} cy={124} />

      {/* The grip, drawn before the body so the body caps its two ends. */}
      <Path
        d="M74 62 V52 A8 8 0 0 1 82 44 H98 A8 8 0 0 1 106 52 V62"
        fill="none"
        stroke={ink}
        strokeWidth={3.5}
        strokeLinecap="round"
      />

      <Rect
        x={36}
        y={62}
        width={108}
        height={54}
        rx={12}
        fill={fill}
        stroke={ink}
        strokeWidth={3.5}
      />
      <Path d="M36 84 H144" stroke={ink} strokeWidth={3.5} />
      <Rect x={80} y={76} width={20} height={16} rx={4} fill={fill} stroke={ink} strokeWidth={3} />

      <Circle cx={132} cy={104} r={18} fill={page} stroke={ink} strokeWidth={3.5} />
      <Path
        d="M123.5 104 L129.5 110 L140.5 97.5"
        fill="none"
        stroke={ink}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  );
}

/**
 * Nothing reported: a building with a tick. Notice-repair jobs are raised
 * against a place — every one of them carries a building and a room — so the
 * thing with nothing wrong with it is the building, not a device.
 */
function NoticeArt({ fill, soft, line, ink, page }: Palette) {
  return (
    <G>
      <Ground soft={soft} rx={50} />

      <Path d={sparkle(32, 40, 6)} fill={line} />

      <Rect
        x={48}
        y={26}
        width={84}
        height={92}
        rx={10}
        fill={fill}
        stroke={ink}
        strokeWidth={3.5}
      />

      <Rect x={62} y={44} width={16} height={14} rx={3} fill={soft} />
      <Rect x={102} y={44} width={16} height={14} rx={3} fill={soft} />
      <Rect x={62} y={68} width={16} height={14} rx={3} fill={soft} />
      <Rect x={102} y={68} width={16} height={14} rx={3} fill={soft} />

      {/* The door runs to the bottom edge, which is what turns a grid of
          windows into a building rather than a spreadsheet. */}
      <Path
        d="M79 118 V97 A11 11 0 0 1 101 97 V118"
        fill="none"
        stroke={ink}
        strokeWidth={3}
        strokeLinecap="round"
      />

      <Circle cx={126} cy={104} r={18} fill={page} stroke={ink} strokeWidth={3.5} />
      <Path
        d="M117.5 104 L123.5 110 L134.5 97.5"
        fill="none"
        stroke={ink}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  );
}

/**
 * A room nobody has taken: an open door with a tick. Open rather than shut,
 * because in a booking module an empty list means the room is *available*, and
 * a closed door says the opposite of that.
 */
function RoomArt({ fill, soft, line, ink, page }: Palette) {
  return (
    <G>
      <Ground soft={soft} rx={46} />

      <Path d={sparkle(36, 40, 6)} fill={line} />

      {/* The doorway: no bottom edge, so the floor reads as continuing under
          it rather than the whole thing being a picture frame. */}
      <Path
        d="M56 118 V22 A6 6 0 0 1 62 16 H122 A6 6 0 0 1 128 22 V118"
        fill="none"
        stroke={line}
        strokeWidth={3}
        strokeLinecap="round"
      />
      {/* The leaf, swung towards the reader: a trapezoid hinged on the frame's
          left post. */}
      <Path
        d="M56 20 L102 32 V106 L56 118 Z"
        fill={fill}
        stroke={ink}
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
      <Circle cx={93} cy={70} r={3.5} fill={ink} />

      <Circle cx={130} cy={100} r={18} fill={page} stroke={ink} strokeWidth={3.5} />
      <Path
        d="M121.5 100 L127.5 106 L138.5 93.5"
        fill="none"
        stroke={ink}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
  );
}

/**
 * No exam to invigilate: a paper with its answer bubbles still blank. The rows
 * of small circles are what make it an exam paper rather than the document in
 * `history` or `search` — nothing else in the set uses them.
 */
function ExamArt({ fill, soft, line, ink }: Palette) {
  const rows = [60, 81, 102];

  return (
    <G>
      <Ground soft={soft} rx={46} />

      <Path d={sparkle(34, 38, 6)} fill={line} />

      <Rect
        x={50}
        y={20}
        width={80}
        height={98}
        rx={10}
        fill={fill}
        stroke={ink}
        strokeWidth={3.5}
      />
      <Rect x={64} y={36} width={38} height={7} rx={3.5} fill={line} />

      {rows.map((y) => (
        <G key={y}>
          <Rect x={64} y={y - 3} width={13} height={6} rx={3} fill={soft} />
          <Circle cx={90} cy={y} r={4.5} fill="none" stroke={line} strokeWidth={2.5} />
          <Circle cx={104} cy={y} r={4.5} fill="none" stroke={line} strokeWidth={2.5} />
          <Circle cx={118} cy={y} r={4.5} fill="none" stroke={line} strokeWidth={2.5} />
        </G>
      ))}
    </G>
  );
}

/**
 * A log with nothing filed in it: a small stack of pages and a clock, the mark
 * this app already uses for "history". Not a failure — just early.
 */
function HistoryArt({ fill, soft, line, ink, page }: Palette) {
  return (
    <G>
      <Ground soft={soft} rx={50} />

      {/* The page behind is drawn a step lighter, which is what makes two flat
          rectangles read as a stack. */}
      <Rect
        x={58}
        y={22}
        width={70}
        height={84}
        rx={10}
        fill={fill}
        stroke={line}
        strokeWidth={3}
      />
      <Rect
        x={44}
        y={34}
        width={70}
        height={84}
        rx={10}
        fill={fill}
        stroke={ink}
        strokeWidth={3.5}
      />

      <Rect x={58} y={54} width={42} height={6} rx={3} fill={soft} />
      <Rect x={58} y={70} width={36} height={6} rx={3} fill={soft} />
      <Rect x={58} y={86} width={26} height={6} rx={3} fill={soft} />

      <Circle cx={130} cy={96} r={19} fill={page} stroke={ink} strokeWidth={3.5} />
      <Path
        d="M130 96 V87 M130 96 L136.5 100"
        stroke={ink}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </G>
  );
}

/** Looked for, not found: a page under a lens with a cross in it. */
function SearchArt({ fill, soft, line, ink, page }: Palette) {
  return (
    <G>
      <Ground soft={soft} rx={48} />

      <Rect
        x={42}
        y={22}
        width={74}
        height={94}
        rx={12}
        fill={fill}
        stroke={ink}
        strokeWidth={3.5}
      />
      <Rect x={58} y={44} width={42} height={7} rx={3.5} fill={soft} />
      <Rect x={58} y={62} width={46} height={7} rx={3.5} fill={soft} />
      <Rect x={58} y={80} width={28} height={7} rx={3.5} fill={line} />

      <Path
        d="M139 109 L153 123"
        stroke={ink}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <Circle cx={121} cy={91} r={25} fill={page} stroke={ink} strokeWidth={3.5} />
      <Path
        d="M113 83 L129 99 M129 83 L113 99"
        stroke={ink}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </G>
  );
}

/** Not empty — unreachable. Signal arcs with the line cut through them. */
function OfflineArt({ soft, line, ink, page }: Palette) {
  return (
    <G>
      <Ground soft={soft} rx={46} />

      <Path
        d="M51.8 61.8 A54 54 0 0 1 128.2 61.8"
        fill="none"
        stroke={line}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="8 12"
      />
      <Path
        d="M63.1 73.1 A38 38 0 0 1 116.9 73.1"
        fill="none"
        stroke={line}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <Path
        d="M74.4 84.4 A22 22 0 0 1 105.6 84.4"
        fill="none"
        stroke={ink}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <Circle cx={90} cy={100} r={6.5} fill={ink} />

      {/* Cut twice: once in the page colour to clear a gutter, once in ink. */}
      <Path d="M52 120 L128 44" stroke={page} strokeWidth={11} strokeLinecap="round" />
      <Path d="M52 120 L128 44" stroke={ink} strokeWidth={4} strokeLinecap="round" />
    </G>
  );
}

const ART: Record<EmptyIllustrationName, (palette: Palette) => ReactElement> = {
  positive: PositiveArt,
  search: SearchArt,
  offline: OfflineArt,
  timestamp: TimestampArt,
  calendar: CalendarArt,
  history: HistoryArt,
  meeting: MeetingArt,
  repair: RepairArt,
  notice: NoticeArt,
  room: RoomArt,
  exam: ExamArt,
};

type EmptyIllustrationProps = {
  name: EmptyIllustrationName;
  /** Drawn width in points; the height follows the aspect ratio. */
  width?: number;
  /**
   * The colour the drawing sits on, for the shapes that knock a hole through
   * what is behind them. Defaults to the page; pass `surface` when the state
   * is inside a card.
   */
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function EmptyIllustration({
  name,
  width = 128,
  backgroundColor,
  style,
}: EmptyIllustrationProps) {
  const c = useColors();
  const height = (width * VIEW_BOX_HEIGHT) / VIEW_BOX_WIDTH;

  const palette: Palette = {
    fill: c.surfaceAlt,
    soft: c.border,
    line: c.borderStrong,
    // The darkest tone in the drawing, and still a light grey — the same family
    // the message under it is set in, one step lighter. Nothing here is ink
    // proper: the picture is a placeholder, not a headline.
    ink: c.textFaint,
    page: backgroundColor ?? c.background,
  };

  const Art = ART[name];

  return (
    <View style={[styles.wrap, style]} accessible={false} pointerEvents="none">
      <Svg width={width} height={height} viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`}>
        {Art(palette)}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
