import type { CourseQuizQuestion } from './courseItems'

export const courseQuizQuestionsContent: Record<string, CourseQuizQuestion[]> = {
  'linear-algebra-lecture-12-unit-1-chapter-1': [
    {
      id: 'linear-algebra-lecture-12-unit-1-chapter-1-q1',
      order: 1,
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
    {
      id: 'linear-algebra-lecture-12-unit-1-chapter-1-q2',
      order: 2,
      type: 'multiple-choice',
      stem: '甲，乙，丙，丁四人并排站成一排，下列说法正确的是（     ）',
      options: [
        {
          id: 'A',
          label: 'A',
          text: '若甲，乙必须相邻，则不同的排法有 12 种',
        },
        {
          id: 'B',
          label: 'B',
          text: '若最左端只能排甲或乙，则不同的排法有 6 种',
        },
        {
          id: 'C',
          label: 'C',
          text: '甲乙不相邻的排法有 24 种',
        },
        {
          id: 'D',
          label: 'D',
          text: '甲乙按从左到右的顺序排列的排法有 12 种',
        },
      ],
      correctAnswer: 'AD',
    },
    {
      id: 'linear-algebra-lecture-12-unit-1-chapter-1-q3',
      order: 3,
      type: 'fill-blank',
      stem: '某校篮球队的成员是来自学校高一 10 个班的 12 位同学，其中高一（3）班、高一（7）班各出 2 人，其余班级各出 1 人。从这 12 人中要选 6 人作为主力队员，则这 6 名主力队员来自不同的班级的概率为________．',
      correctAnswer: '19/33',
    },
  ],
}
