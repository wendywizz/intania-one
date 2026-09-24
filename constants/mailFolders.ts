import type { IconSymbolName } from '@/components/ui/icon-symbol';
import { TEXT } from '@/constants/text';

/**
 * The mail folders the app shows, as Microsoft Graph's well-known folder
 * names — which Graph accepts anywhere a folder id goes
 * (`/me/mailFolders/sentitems/messages`), so no folder-id lookup is needed
 * first. They exist in every Exchange mailbox whatever language Outlook is
 * set to.
 */
export type MailFolderKey = 'inbox' | 'drafts' | 'sentitems' | 'deleteditems' | 'junkemail';

/** Read/unread filter from the bottom bar's filter button. */
export type MailReadFilter = 'all' | 'unread' | 'read';

export type MailFolder = {
  key: MailFolderKey;
  label: string;
  icon: IconSymbolName;
  /** Rows name who the message went to, not who it came from — as Outlook
   * does for these folders, where the sender is always yourself. */
  showsRecipients: boolean;
};

// Inbox first and selected by default: the chips are how you get back to it.
export const MAIL_FOLDERS: readonly MailFolder[] = [
  { key: 'inbox', label: TEXT.MAIL_FOLDER_INBOX, icon: 'tray.fill', showsRecipients: false },
  { key: 'drafts', label: TEXT.MAIL_FOLDER_DRAFTS, icon: 'doc.pencil', showsRecipients: true },
  { key: 'sentitems', label: TEXT.MAIL_FOLDER_SENT, icon: 'paperplane.fill', showsRecipients: true },
  { key: 'deleteditems', label: TEXT.MAIL_FOLDER_DELETED, icon: 'trash.fill', showsRecipients: false },
  { key: 'junkemail', label: TEXT.MAIL_FOLDER_JUNK, icon: 'nosign', showsRecipients: false },
];

export function getMailFolder(key: MailFolderKey): MailFolder {
  return MAIL_FOLDERS.find((folder) => folder.key === key) ?? MAIL_FOLDERS[0]!;
}

export const MAIL_READ_FILTER_LABEL: Record<MailReadFilter, string> = {
  all: TEXT.MAIL_FILTER_ALL,
  unread: TEXT.MAIL_FILTER_UNREAD,
  read: TEXT.MAIL_FILTER_READ,
};
