// 课程放在哪、从哪里进「按课程看」：
// - sidebar：月历左边一栏。年月和翻月也在这一栏里，月历上方不再有顶栏；
// - menu：一个下拉，跟在年月标题后面；
// - task-hover：不另外放课程，鼠标移到一个任务上，就突出它所属的那门课；
// - legend：月历下方的一行图例。
export type CalendarCourseEntry = 'sidebar' | 'menu' | 'task-hover' | 'legend'
