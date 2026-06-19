type RepairStatusBadgeStyle = { background: string; text: string };

const STATUS_BADGE_STYLES: Record<string, RepairStatusBadgeStyle> = {
  '0':   { background: '#F3F4F6', text: '#374151' },  // new job
  '2':   { background: '#DBEAFE', text: '#1E40AF' },  // wait worker
  '2.1': { background: '#FEE2E2', text: '#991B1B' },  // worker reject
  '3':   { background: '#CCFBF1', text: '#0F766E' },  // worker accept
  '4':   { background: '#FFEDD5', text: '#9A3412' },  // working
  '4.1': { background: '#CFFAFE', text: '#0E7490' },  // wait close
  '4.2': { background: '#EDE9FE', text: '#6D28D9' },  // wait foreman
  '4.3': { background: '#E0E7FF', text: '#3730A3' },  // forward foreman
  '5':   { background: '#DCFCE7', text: '#166534' },  // finish
  '6':   { background: '#FFE4E6', text: '#9F1239' },  // wrong dept / reject
  '7':   { background: '#FEF9C3', text: '#854D0E' },  // wait approval
  '7.1': { background: '#E0F2FE', text: '#0369A1' },  // processing equipment
  '7.2': { background: '#FEE2E2', text: '#991B1B' },  // not approved
};

const DEFAULT_BADGE_STYLE: RepairStatusBadgeStyle = {
  background: '#F3F4F6',
  text: '#6B7280',
};

export function getRepairStatusBadgeStyle(status: string): RepairStatusBadgeStyle {
  return STATUS_BADGE_STYLES[status] ?? DEFAULT_BADGE_STYLE;
}
