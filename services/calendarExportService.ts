
import { PlannedWorkout } from '../types';

const formatIcalDate = (date: Date, timeStr?: string) => {
  const d = new Date(date);
  if (timeStr) {
    const [h, m] = timeStr.split(':');
    d.setHours(parseInt(h), parseInt(m), 0);
  } else {
    d.setHours(9, 0, 0); // Default morning if no time
  }
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const exportToGoogleCalendar = (workout: PlannedWorkout) => {
  const start = formatIcalDate(workout.date, workout.startTime);
  const end = formatIcalDate(workout.date, workout.endTime || (workout.startTime ? undefined : '10:00'));
  
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const params = new URLSearchParams({
    text: workout.title,
    dates: `${start}/${end}`,
    details: workout.description.replace(/\*\*/g, ''), // Clean markdown
    location: 'RunCoach AI App'
  });
  
  window.open(`${baseUrl}&${params.toString()}`, '_blank');
};

export const exportToAppleCalendar = (workout: PlannedWorkout) => {
  const start = formatIcalDate(workout.date, workout.startTime);
  const end = formatIcalDate(workout.date, workout.endTime || (workout.startTime ? undefined : '10:00'));
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RunCoachAI//NONSGML v1.0//IT',
    'BEGIN:VEVENT',
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${workout.title}`,
    `DESCRIPTION:${workout.description.replace(/\n/g, '\\n').replace(/\*\*/g, '')}`,
    'LOCATION:RunCoach AI App',
    `UID:${workout.id}@runcoachai.app`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${workout.title.replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportRangeToIcal = (workouts: PlannedWorkout[], filename: string = 'diario_runcoach.ics') => {
    if (workouts.length === 0) return;

    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//RunCoachAI//NONSGML v1.0//IT',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    workouts.forEach(w => {
        const start = formatIcalDate(w.date, w.startTime);
        const end = formatIcalDate(w.date, w.endTime || (w.startTime ? undefined : '10:00'));
        icsContent.push('BEGIN:VEVENT');
        icsContent.push(`DTSTAMP:${now}`);
        icsContent.push(`DTSTART:${start}`);
        icsContent.push(`DTEND:${end}`);
        icsContent.push(`SUMMARY:${w.title}`);
        icsContent.push(`DESCRIPTION:${w.description.replace(/\n/g, '\\n').replace(/\*\*/g, '')}`);
        icsContent.push('LOCATION:RunCoach AI App');
        icsContent.push(`UID:${w.id}@runcoachai.app`);
        icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
