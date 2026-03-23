export interface ScheduleEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  date: string
  color: string
}

export const scheduleEvents: ScheduleEvent[] = [
  // Monday
  { id: '1',  title: 'Linear Algebra Lecture',       startTime: '09:00', endTime: '10:30', date: '2026-03-23', color: 'blue' },
  { id: '2',  title: 'Python Lab',                   startTime: '11:00', endTime: '12:00', date: '2026-03-23', color: 'violet' },
  { id: '3',  title: 'Study Group — Calculus',        startTime: '14:00', endTime: '15:00', date: '2026-03-23', color: 'amber' },

  // Tuesday
  { id: '4',  title: 'ML Fundamentals',              startTime: '08:30', endTime: '10:00', date: '2026-03-24', color: 'sky' },
  { id: '5',  title: 'Office Hours — Prof. Chen',     startTime: '13:00', endTime: '13:30', date: '2026-03-24', color: 'emerald' },
  { id: '6',  title: 'IELTS Reading Practice',       startTime: '15:00', endTime: '16:30', date: '2026-03-24', color: 'orange' },

  // Wednesday
  { id: '7',  title: 'Data Structures Lecture',       startTime: '09:00', endTime: '10:30', date: '2026-03-25', color: 'violet' },
  { id: '8',  title: 'Calculus II Lecture',            startTime: '11:00', endTime: '12:30', date: '2026-03-25', color: 'blue' },
  { id: '9',  title: 'Algorithm Practice',            startTime: '14:00', endTime: '14:15', date: '2026-03-25', color: 'rose' },
  { id: '10', title: 'React Tutorial',                startTime: '16:00', endTime: '17:00', date: '2026-03-25', color: 'cyan' },

  // Thursday
  { id: '11', title: 'ML Lab Session',                startTime: '09:00', endTime: '11:00', date: '2026-03-26', color: 'sky' },
  { id: '12', title: 'Paper Reading — Attention',      startTime: '13:00', endTime: '14:00', date: '2026-03-26', color: 'fuchsia' },
  { id: '13', title: 'IELTS Listening Drill',         startTime: '15:30', endTime: '16:00', date: '2026-03-26', color: 'orange' },

  // Friday
  { id: '14', title: 'Linear Algebra Review',         startTime: '10:00', endTime: '11:30', date: '2026-03-27', color: 'blue' },
  { id: '15', title: 'CS229 Problem Set',             startTime: '13:00', endTime: '15:00', date: '2026-03-27', color: 'emerald' },
  { id: '16', title: 'Flashcard Review',              startTime: '16:00', endTime: '16:15', date: '2026-03-27', color: 'amber' },

  // Saturday
  { id: '17', title: 'Calculus Quiz Prep',            startTime: '10:00', endTime: '12:00', date: '2026-03-28', color: 'blue' },
  { id: '18', title: 'Frontend Project Work',         startTime: '14:00', endTime: '16:00', date: '2026-03-28', color: 'cyan' },

  // Sunday
  { id: '19', title: 'Weekly Review & Planning',      startTime: '10:00', endTime: '11:00', date: '2026-03-29', color: 'amber' },
  { id: '20', title: 'Light Reading — AI Ethics',      startTime: '15:00', endTime: '16:00', date: '2026-03-29', color: 'fuchsia' },
]
