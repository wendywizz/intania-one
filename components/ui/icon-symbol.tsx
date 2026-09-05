// Individual CJS imports — avoids the lucide-react-native barrel which causes
// Metro to queue 1000+ .mjs files and stall the web bundler.
import ArrowLeft from 'lucide-react-native/dist/cjs/icons/arrow-left';
import Armchair from 'lucide-react-native/dist/cjs/icons/armchair';
import Baby from 'lucide-react-native/dist/cjs/icons/baby';
import Bell from 'lucide-react-native/dist/cjs/icons/bell';
import Briefcase from 'lucide-react-native/dist/cjs/icons/briefcase';
import Cpu from 'lucide-react-native/dist/cjs/icons/cpu';
import DoorOpen from 'lucide-react-native/dist/cjs/icons/door-open';
import Droplets from 'lucide-react-native/dist/cjs/icons/droplets';
import Hammer from 'lucide-react-native/dist/cjs/icons/hammer';
import Lightbulb from 'lucide-react-native/dist/cjs/icons/lightbulb';
import Mic from 'lucide-react-native/dist/cjs/icons/mic';
import Monitor from 'lucide-react-native/dist/cjs/icons/monitor';
import Network from 'lucide-react-native/dist/cjs/icons/network';
import Ellipsis from 'lucide-react-native/dist/cjs/icons/ellipsis';
import EllipsisVertical from 'lucide-react-native/dist/cjs/icons/ellipsis-vertical';
import Projector from 'lucide-react-native/dist/cjs/icons/projector';
import Replace from 'lucide-react-native/dist/cjs/icons/replace';
import PackagePlus from 'lucide-react-native/dist/cjs/icons/package-plus';
import PaintRoller from 'lucide-react-native/dist/cjs/icons/paint-roller';
import Printer from 'lucide-react-native/dist/cjs/icons/printer';
import Trees from 'lucide-react-native/dist/cjs/icons/trees';
import Wifi from 'lucide-react-native/dist/cjs/icons/wifi';
import Wind from 'lucide-react-native/dist/cjs/icons/wind';
import Zap from 'lucide-react-native/dist/cjs/icons/zap';
import CalendarClock from 'lucide-react-native/dist/cjs/icons/calendar-clock';
import LogIn from 'lucide-react-native/dist/cjs/icons/log-in';
import CalendarRange from 'lucide-react-native/dist/cjs/icons/calendar-range';
import Calendar from 'lucide-react-native/dist/cjs/icons/calendar';
import ChartBar from 'lucide-react-native/dist/cjs/icons/chart-bar';
import ChevronDown from 'lucide-react-native/dist/cjs/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/dist/cjs/icons/chevron-left';
import ChevronRight from 'lucide-react-native/dist/cjs/icons/chevron-right';
import MapPin from 'lucide-react-native/dist/cjs/icons/map-pin';
import Phone from 'lucide-react-native/dist/cjs/icons/phone';
import CircleCheck from 'lucide-react-native/dist/cjs/icons/circle-check';
import ClipboardList from 'lucide-react-native/dist/cjs/icons/clipboard-list';
import CircleUser from 'lucide-react-native/dist/cjs/icons/circle-user';
import Clock from 'lucide-react-native/dist/cjs/icons/clock';
import Code from 'lucide-react-native/dist/cjs/icons/code';
import Cross from 'lucide-react-native/dist/cjs/icons/cross';
import FileText from 'lucide-react-native/dist/cjs/icons/file-text';
import History from 'lucide-react-native/dist/cjs/icons/clock-arrow-left';
import House from 'lucide-react-native/dist/cjs/icons/house';
import Inbox from 'lucide-react-native/dist/cjs/icons/inbox';
import Info from 'lucide-react-native/dist/cjs/icons/info';
import Laptop from 'lucide-react-native/dist/cjs/icons/laptop';
import List from 'lucide-react-native/dist/cjs/icons/list';
import MessageSquareText from 'lucide-react-native/dist/cjs/icons/message-square-text';
import Tag from 'lucide-react-native/dist/cjs/icons/tag';
import Plus from 'lucide-react-native/dist/cjs/icons/plus';
import Search from 'lucide-react-native/dist/cjs/icons/search';
import Send from 'lucide-react-native/dist/cjs/icons/send';
import Settings from 'lucide-react-native/dist/cjs/icons/settings';
import Sun from 'lucide-react-native/dist/cjs/icons/sun';
import UserMinus from 'lucide-react-native/dist/cjs/icons/user-minus';
import UserRoundSearch from 'lucide-react-native/dist/cjs/icons/user-round-search';
import User from 'lucide-react-native/dist/cjs/icons/user';
import Users from 'lucide-react-native/dist/cjs/icons/users';
import Wrench from 'lucide-react-native/dist/cjs/icons/wrench';
import RotateCcw from 'lucide-react-native/dist/cjs/icons/rotate-ccw';
import CircleArrowRight from 'lucide-react-native/dist/cjs/icons/circle-arrow-right';
import CircleX from 'lucide-react-native/dist/cjs/icons/circle-x';
import Eye from 'lucide-react-native/dist/cjs/icons/eye';
import EyeOff from 'lucide-react-native/dist/cjs/icons/eye-off';
import TriangleAlert from 'lucide-react-native/dist/cjs/icons/triangle-alert';
import Trash from 'lucide-react-native/dist/cjs/icons/trash-2';
import Pencil from 'lucide-react-native/dist/cjs/icons/pencil';
import Check from 'lucide-react-native/dist/cjs/icons/check';
import X from 'lucide-react-native/dist/cjs/icons/x';
import LogOut from 'lucide-react-native/dist/cjs/icons/log-out';
import LockOpen from 'lucide-react-native/dist/cjs/icons/lock-open';
import ShoppingCart from 'lucide-react-native/dist/cjs/icons/shopping-cart';
import Presentation from 'lucide-react-native/dist/cjs/icons/presentation';
import type { LucideIcon } from 'lucide-react-native';
import { OpaqueColorValue, StyleProp, ViewStyle } from 'react-native';

const MAPPING = {
  // Navigation / UI
  'arrow.left': ArrowLeft,
  'chevron.left': ChevronLeft,
  'chevron.left.forwardslash.chevron.right': Code,
  'chevron.right': ChevronRight,
  'chevron.down': ChevronDown,
  'mappin': MapPin,
  'phone.fill': Phone,
  'history': History,
  'house.fill': House,
  'plus': Plus,
  'logout': LogOut,
  'lock.open': LockOpen,
  // The booking cart. A shopping cart on purpose, however little is being
  // bought: it is the one glyph everyone reads as "things I have picked but not
  // committed to", which is exactly what a room draft is.
  'cart': ShoppingCart,
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
  // Clocking in for the day (ลงเวลาปฏิบัติราชการ). An arrow going in, not
  // another clock face: it shares a tab bar with 'calendar-range' and
  // 'clock.fill', and a third round dial there would be one clock too many to
  // tell apart at 28px.
  'log-in': LogIn,
  // Work
  'briefcase.fill': Briefcase,
  'doc.text.fill': FileText,
  'clipboard-list': ClipboardList,
  'list.bullet': List,
  'text.bubble': MessageSquareText,
  'tag.fill': Tag,
  'magnifyingglass': Search,
  'tray.fill': Inbox,
  'wrench.fill': Wrench,
  'laptop': Laptop,
  'user-round-search': UserRoundSearch,
  // A door rather than a calendar: the menu grid already carries three calendar
  // glyphs, so room booking needs to be tellable apart at a glance.
  'door.open': DoorOpen,
  // Meeting-room requests in the merged จองห้อง list — deliberately not
  // 'person.2.fill', which already marks the meetingv2 minutes/agenda module
  // on the home grid and would read as the same feature.
  'presentation': Presentation,
  // Repair categories
  'bolt.fill': Zap,
  'lightbulb.fill': Lightbulb,
  'drop.fill': Droplets,
  'wind': Wind,
  'wifi': Wifi,
  'cpu': Cpu,
  'printer.fill': Printer,
  'display': Monitor,
  'network': Network,
  'projector': Projector,
  'mic': Mic,
  'package.plus': PackagePlus,
  'replace': Replace,
  'ellipsis': Ellipsis,
  'ellipsis.vertical': EllipsisVertical,
  'chair': Armchair,
  'hammer.fill': Hammer,
  'paintroller': PaintRoller,
  'tree.fill': Trees,
  // Status
  'checkmark.circle.fill': CircleCheck,
  // Action icons
  'arrow.triangle.2.circlepath': RotateCcw,
  'arrow.right.circle': CircleArrowRight,
  'xmark.circle': CircleX,
  'xmark': X,
  'checkmark': Check,
  'eye': Eye,
  'eye.slash': EyeOff,
  'exclamationmark.triangle.fill': TriangleAlert,
  'trash.fill': Trash,
  'pencil': Pencil,
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
