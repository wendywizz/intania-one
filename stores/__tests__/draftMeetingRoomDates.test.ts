import {
  addDraftMeetingRoomDate,
  clearDraftMeetingRoomDates,
  getDraftMeetingRoomDate,
  getDraftMeetingRoomDates,
  removeDraftMeetingRoomDate,
  updateDraftMeetingRoomDate,
} from '@/stores/draftMeetingRoomDates';

describe('draftMeetingRoomDates', () => {
  beforeEach(() => {
    clearDraftMeetingRoomDates();
  });

  it('adds a slot so it appears in the list', () => {
    addDraftMeetingRoomDate({ date: '2026-01-10', startTime: '09:00', endTime: '12:00' });

    const rows = getDraftMeetingRoomDates();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ date: '2026-01-10', startTime: '09:00', endTime: '12:00' });
  });

  it('looks up one slot by id, and answers null for an id that was never added', () => {
    const id = addDraftMeetingRoomDate({ date: '2026-01-10', startTime: '09:00', endTime: '12:00' });

    expect(getDraftMeetingRoomDate(id)).toMatchObject({ date: '2026-01-10', startTime: '09:00', endTime: '12:00' });
    expect(getDraftMeetingRoomDate('does-not-exist')).toBeNull();
  });

  it('updates one slot in place, leaving its id and the other slots untouched', () => {
    const firstId = addDraftMeetingRoomDate({ date: '2026-01-10', startTime: '09:00', endTime: '12:00' });
    const secondId = addDraftMeetingRoomDate({ date: '2026-01-11', startTime: '13:00', endTime: '15:00' });

    updateDraftMeetingRoomDate(firstId, { date: '2026-01-12', startTime: '10:00', endTime: '11:00' });

    expect(getDraftMeetingRoomDate(firstId)).toEqual({
      id: firstId,
      date: '2026-01-12',
      startTime: '10:00',
      endTime: '11:00',
    });
    expect(getDraftMeetingRoomDate(secondId)).toMatchObject({ date: '2026-01-11', startTime: '13:00', endTime: '15:00' });
  });

  it('removes only the matching slot; an unknown id leaves the list unchanged', () => {
    const keepId = addDraftMeetingRoomDate({ date: '2026-01-10', startTime: '09:00', endTime: '12:00' });
    const dropId = addDraftMeetingRoomDate({ date: '2026-01-11', startTime: '13:00', endTime: '15:00' });

    removeDraftMeetingRoomDate(dropId);
    expect(getDraftMeetingRoomDates().map((row) => row.id)).toEqual([keepId]);

    removeDraftMeetingRoomDate('does-not-exist');
    expect(getDraftMeetingRoomDates().map((row) => row.id)).toEqual([keepId]);
  });

  it('clears every slot regardless of how many were added', () => {
    addDraftMeetingRoomDate({ date: '2026-01-10', startTime: '09:00', endTime: '12:00' });
    addDraftMeetingRoomDate({ date: '2026-01-11', startTime: '13:00', endTime: '15:00' });

    clearDraftMeetingRoomDates();

    expect(getDraftMeetingRoomDates()).toEqual([]);
  });
});
