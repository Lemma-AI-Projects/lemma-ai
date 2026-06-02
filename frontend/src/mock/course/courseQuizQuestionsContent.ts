import type { CourseQuizQuestion } from './courseItems'

export const courseQuizQuestionsContent: Record<string, CourseQuizQuestion[]> = {
  'linear-algebra-lecture-12-unit-1-chapter-1': [
    {
      id: 'linear-algebra-lecture-12-unit-1-chapter-1-q1',
      type: 'single-choice',
      stem: '为提高和展示学生的艺术水平，也为了激发学生的爱国热情，我校开展劳动节文艺汇演，共有 6 个节目，其中有两个舞蹈，三个唱歌，一个朗诵。若三个唱歌节目必须相邻，则有多少种不同排法？',
      options: [
        { id: 'A', label: 'A', text: '24' },
        { id: 'B', label: 'B', text: '36' },
        { id: 'C', label: 'C', text: '96' },
        { id: 'D', label: 'D', text: '144' },
      ],
      correctAnswer: 'D',
    },
  ],
}
