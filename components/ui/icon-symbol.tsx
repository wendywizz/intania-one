// Individual CJS imports — avoids the lucide-react-native barrel which causes
// Metro to queue 1000+ .mjs files and stall the web bundler.
import ArrowLeft from 'lucide-react-native/dist/cjs/icons/arrow-left';
import Armchair from 'lucide-react-native/dist/cjs/icons/armchair';
import Baby from 'lucide-react-native/dist/cjs/icons/baby';
import Bell from 'lucide-react-native/dist/cjs/icons/bell';
import Briefcase from 'lucide-react-native/dist/cjs/icons/briefcase';
import Cpu from 'lucide-react-native/dist/cjs/icons/cpu';
import Droplets from 'lucide-react-native/dist/cjs/icons/droplets';
import Hammer from 'lucide-react-native/dist/cjs/icons/hammer';
import Lightbulb from 'lucide-react-native/dist/cjs/icons/lightbulb';
import Monitor from 'lucide-react-native/dist/cjs/icons/monitor';
import PaintRoller from 'lucide-react-native/dist/cjs/icons/paint-roller';
import Printer from 'lucide-react-native/dist/cjs/icons/printer';
import Trees from 'lucide-react-native/dist/cjs/icons/trees';
import Wifi from 'lucide-react-native/dist/cjs/icons/wifi';
import Wind from 'lucide-react-native/dist/cjs/icons/wind';
import Zap from 'lucide-react-native/dist/cjs/icons/zap';
import CalendarClock from 'lucide-react-native/dist/cjs/icons/calendar-clock';
import CalendarRange from 'lucide-react-native/dist/cjs/icons/calendar-range';
import Calendar from 'lucide-react-native/dist/cjs/icons/calendar';
import ChartBar from 'lucide-react-native/dist/cjs/icons/chart-bar';
import ChevronRight from 'lucide-react-native/dist/cjs/icons/chevron-right';
import CircleCheck from 'lucide-react-native/dist/cjs/icons/circle-check';
import CircleUser from 'lucide-react-native/dist/cjs/icons/circle-user';
import Clock from 'lucide-react-native/dist/cjs/icons/clock';
import Code from 'lucide-react-native/dist/cjs/icons/code';
import Cross from 'lucide-react-native/dist/cjs/icons/cross';
import FileText from 'lucide-react-native/dist/cjs/icons/file-text';
import History from 'lucide-react-native/dist/cjs/icons/history';
import House from 'lucide-react-native/dist/cjs/icons/house';
import Inbox from 'lucide-react-native/dist/cjs/icons/inbox';
import Info from 'lucide-react-native/dist/cjs/icons/info';
import Laptop from 'lucide-react-native/dist/cjs/icons/laptop';
import List from 'lucide-react-native/dist/cjs/icons/list';
import Search from 'lucide-react-native/dist/cjs/icons/search';
import Send from 'lucide-react-native/dist/cjs/icons/send';
import Settings from 'lucide-react-native/dist/cjs/icons/settings';
import Sun from 'lucide-react-native/dist/cjs/icons/sun';
import UserMinus from 'lucide-react-native/dist/cjs/icons/user-minus';
import UserRoundSearch from 'lucide-react-native/dist/cjs/icons/user-round-search';
import User from 'lucide-react-native/dist/cjs/icons/user';
import Users from 'lucide-react-native/dist/cjs/icons/users';
import Wrench from 'lucide-react-native/dist/cjs/icons/wrench';
import type { LucideIcon } from 'lucide-react-native';
import { OpaqueColorValue, StyleProp, ViewStyle } from 'react-native';

const MAPPING = {
  // Navigation / UI
  'arrow.left': ArrowLeft,
  'chevron.left.forwardslash.chevron.right': Code,
  'chevron.right': ChevronRight,
  'history': History,
  'house.fill': House,
  // Communication
  'bell.fill': Bell,
  'gearshape.fill': Settings,
  'paperplane.fill': Send,
  // People
  'person.fill': User,
  'person.2.fill': Users,
  'person.circle.fill': CircleUser,
  'person.crop.circle.badge.minus': UserMinus,
  // Time & Calendar
  'calendar': Calendar,
  'calendar-clock': CalendarClock,
  'calendar-range': CalendarRange,
  'clock.fill': Clock,
  // Work
  'briefcase.fill': Briefcase,
  'doc.text.fill': FileText,
  'list.bullet': List,
  'magnifyingglass': Search,
  'tray.fill': Inbox,
  'wrench.fill': Wrench,
  'laptop': Laptop,
  'user-round-search': UserRoundSearch,
  // Repair categories
  'bolt.fill': Zap,
  'lightbulb.fill': Lightbulb,
  'drop.fill': Droplets,
  'wind': Wind,
  'wifi': Wifi,
  'cpu': Cpu,
  'printer.fill': Printer,
  'display': Monitor,
  'chair': Armchair,
  'hammer.fill': Hammer,
  'paintroller': PaintRoller,
  'tree.fill': Trees,
  // Status
  'checkmark.circle.fill': CircleCheck,
  // Misc
  'chart.bar.fill': ChartBar,
  'cross.fill': Cross,
  'figure.child': Baby,
  'info.circle.fill': Info,
  'sun.max.fill': Sun,
} satisfies Record<string, LucideIcon>;

export type IconSymbolName = keyof typeof MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: string;
}) {
  const Icon = MAPPING[name];
  return <Icon size={size} color={color as string} style={style} />;
}
