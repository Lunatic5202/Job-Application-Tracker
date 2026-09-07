import { apiClient } from './client';

export type CalendarEventType = 'Interview' | 'Deadline' | 'Follow-up' | 'Assessment';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  date: string; // YYYY-MM-DD
  time: string; // e.g. '09:30 AM'
  endTime?: string;
  company?: string;
  locationOrUrl?: string;
  notes?: string;
  googleCalendarEventId?: string;
  isSyncedWithGoogle?: boolean;
}

export interface GoogleCalendarSyncResult {
  success: boolean;
  syncedCount: number;
  lastSyncedAt?: string;
  accountEmail?: string;
}

/**
 * Calendar Sync Service backed by real FastAPI & MongoDB storage.
 * Supports exporting RFC 5545 iCalendar (.ics) files and syncing with backend Google Calendar webhook.
 */
export const calendarSyncApi = {
  /**
   * Fetches real user calendar events from backend MongoDB.
   */
  getEvents: async (): Promise<CalendarEvent[]> => {
    const res = await apiClient.get<CalendarEvent[]>('/calendar/events');
    return res.data;
  },

  /**
   * Persists a new schedule or interview event to backend MongoDB.
   */
  createEvent: async (event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
    const res = await apiClient.post<CalendarEvent>('/calendar/events', event);
    return res.data;
  },

  /**
   * Deletes a calendar event.
   */
  deleteEvent: async (eventId: string): Promise<void> => {
    await apiClient.delete(`/calendar/events/${eventId}`);
  },

  /**
   * Syncs calendar with Google Calendar on backend.
   */
  syncWithGoogle: async (): Promise<GoogleCalendarSyncResult> => {
    const res = await apiClient.post<GoogleCalendarSyncResult>('/calendar/google/sync');
    return res.data;
  },

  /**
   * Generates standard RFC 5545 iCalendar format string for importing to Google Calendar / Apple Calendar.
   */
  generateIcsContent: (events: CalendarEvent[]): string => {
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CareerX//Engineering Career Platform//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    events.forEach((evt) => {
      const dtStart = evt.date.replace(/-/g, '') + 'T120000Z';
      ics.push('BEGIN:VEVENT');
      ics.push(`UID:${evt.id}@careerx.io`);
      ics.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
      ics.push(`DTSTART:${dtStart}`);
      ics.push(`SUMMARY:${evt.title} (${evt.company || 'CareerX'})`);
      ics.push(`DESCRIPTION:${evt.notes || evt.type}`);
      if (evt.locationOrUrl) {
        ics.push(`LOCATION:${evt.locationOrUrl}`);
      }
      ics.push('STATUS:CONFIRMED');
      ics.push('END:VEVENT');
    });

    ics.push('END:VCALENDAR');
    return ics.join('\r\n');
  },

  /**
   * Triggers download of .ics file for Google Calendar import.
   */
  downloadIcs: (events: CalendarEvent[]) => {
    const icsString = calendarSyncApi.generateIcsContent(events);
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'careerx_schedule.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
