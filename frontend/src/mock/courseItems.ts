import { FileText, GraduationCap, PlayCircle, type LucideIcon } from 'lucide-react'

type CourseProgressStatus = 'not-started' | 'in-progress' | 'completed'

interface CourseOverview {
  blocks: string[]
  status: CourseProgressStatus
}

interface CourseQuiz {
  questions: string[]
  status: CourseProgressStatus
}

interface CourseAssignment {
  prompts: string[]
  status: CourseProgressStatus
}

interface CourseVideoLesson {
  title: string
  status: CourseProgressStatus
}

interface CourseChapter {
  id: string
  title: string
  overview: CourseOverview
  video: CourseVideoLesson
  quiz: CourseQuiz
  assignment: CourseAssignment
}

interface CourseUnit {
  id: string
  title: string
  overview: CourseOverview
  chapters: CourseChapter[]
  quiz: CourseQuiz
  assignment: CourseAssignment
}

interface CourseItem {
  id: string
  icon: LucideIcon
  label: string
  conversationIds: string[]
  units: CourseUnit[]
}

const emptyOverview = (
  status: CourseProgressStatus = 'not-started'
): CourseOverview => ({ blocks: [], status })
const emptyQuiz = (
  status: CourseProgressStatus = 'not-started'
): CourseQuiz => ({ questions: [], status })
const emptyAssignment = (
  status: CourseProgressStatus = 'not-started'
): CourseAssignment => ({ prompts: [], status })
const videoLesson = (
  title: string,
  status: CourseProgressStatus = 'not-started'
): CourseVideoLesson => ({ title, status })

export const courseItems: CourseItem[] = [
  {
    id: '1',
    icon: PlayCircle,
    label: 'Linear Algebra — Lecture 12',
    conversationIds: ['course-conv-1', 'course-conv-2'],
    units: [
      {
        id: 'linear-algebra-lecture-12-unit-1',
        title: 'Eigenvalues and Eigenvectors',
        overview: emptyOverview('completed'),
        chapters: [
          {
            id: 'linear-algebra-lecture-12-unit-1-chapter-1',
            title: 'Why Eigenvectors Matter',
            overview: emptyOverview('completed'),
            video: videoLesson('Video: Seeing Stable Directions in Linear Maps', 'completed'),
            quiz: emptyQuiz('completed'),
            assignment: emptyAssignment('completed'),
          },
          {
            id: 'linear-algebra-lecture-12-unit-1-chapter-2',
            title: 'Computing Eigenvalues',
            overview: emptyOverview('completed'),
            video: videoLesson('Video: Characteristic Polynomials Step by Step', 'in-progress'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'linear-algebra-lecture-12-unit-1-chapter-3',
            title: 'Diagonalization Basics',
            overview: emptyOverview(),
            video: videoLesson('Video: Turning a Matrix into a Simpler Form'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
        ],
        quiz: emptyQuiz('in-progress'),
        assignment: emptyAssignment(),
      },
      {
        id: 'linear-algebra-lecture-12-unit-2',
        title: 'Matrix Decomposition',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'linear-algebra-lecture-12-unit-2-chapter-1',
            title: 'Change of Basis',
            overview: emptyOverview(),
            video: videoLesson('Video: Reading Matrices Through Better Coordinates'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'linear-algebra-lecture-12-unit-2-chapter-2',
            title: 'Spectral Decomposition',
            overview: emptyOverview(),
            video: videoLesson('Video: Splitting Transformations into Components'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
        ],
        quiz: emptyQuiz(),
        assignment: emptyAssignment(),
      },
    ],
  },
  {
    id: '2',
    icon: FileText,
    label: 'Python Data Structures Notes',
    conversationIds: ['course-conv-3', 'course-conv-4'],
    units: [
      {
        id: 'python-data-structures-notes-unit-1',
        title: 'Lists and Tuples',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'python-data-structures-notes-unit-1-chapter-1',
            title: 'Sequence Fundamentals',
            overview: emptyOverview(),
            video: videoLesson('Video: Indexing, Slicing, and Iteration'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'python-data-structures-notes-unit-1-chapter-2',
            title: 'Mutable vs Immutable Data',
            overview: emptyOverview(),
            video: videoLesson('Video: When Python Objects Can Change'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
        ],
        quiz: emptyQuiz(),
        assignment: emptyAssignment(),
      },
      {
        id: 'python-data-structures-notes-unit-2',
        title: 'Dictionaries and Sets',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'python-data-structures-notes-unit-2-chapter-1',
            title: 'Key-Value Modeling',
            overview: emptyOverview(),
            video: videoLesson('Video: Designing Lookups with Dictionaries'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'python-data-structures-notes-unit-2-chapter-2',
            title: 'Membership and Uniqueness',
            overview: emptyOverview(),
            video: videoLesson('Video: Using Sets to Remove Duplicate Work'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'python-data-structures-notes-unit-2-chapter-3',
            title: 'Comprehensions',
            overview: emptyOverview(),
            video: videoLesson('Video: Building Collections Declaratively'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
        ],
        quiz: emptyQuiz(),
        assignment: emptyAssignment(),
      },
    ],
  },
  {
    id: '3',
    icon: GraduationCap,
    label: 'Machine Learning Fundamentals',
    conversationIds: ['course-conv-5', 'course-conv-6'],
    units: [
      {
        id: 'machine-learning-fundamentals-unit-1',
        title: 'Supervised Learning Foundations',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'machine-learning-fundamentals-unit-1-chapter-1',
            title: 'Features, Labels, and Datasets',
            overview: emptyOverview(),
            video: videoLesson('Video: Framing Prediction Problems Clearly'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'machine-learning-fundamentals-unit-1-chapter-2',
            title: 'Loss Functions',
            overview: emptyOverview(),
            video: videoLesson('Video: Measuring Model Mistakes'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'machine-learning-fundamentals-unit-1-chapter-3',
            title: 'Train and Validation Splits',
            overview: emptyOverview(),
            video: videoLesson('Video: Checking Whether Learning Generalizes'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
        ],
        quiz: emptyQuiz(),
        assignment: emptyAssignment(),
      },
      {
        id: 'machine-learning-fundamentals-unit-2',
        title: 'Optimization and Generalization',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'machine-learning-fundamentals-unit-2-chapter-1',
            title: 'Gradient Descent',
            overview: emptyOverview(),
            video: videoLesson('Video: Moving Parameters in the Right Direction'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'machine-learning-fundamentals-unit-2-chapter-2',
            title: 'Overfitting and Regularization',
            overview: emptyOverview(),
            video: videoLesson('Video: Keeping Models from Memorizing Noise'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
        ],
        quiz: emptyQuiz(),
        assignment: emptyAssignment(),
      },
    ],
  },
  {
    id: '4',
    icon: PlayCircle,
    label: 'Calculus II — Integration',
    conversationIds: ['course-conv-7', 'course-conv-8'],
    units: [
      {
        id: 'calculus-ii-integration-unit-1',
        title: 'Core Integration Techniques',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'calculus-ii-integration-unit-1-chapter-1',
            title: 'Substitution',
            overview: emptyOverview(),
            video: videoLesson('Video: Reversing the Chain Rule'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'calculus-ii-integration-unit-1-chapter-2',
            title: 'Integration by Parts',
            overview: emptyOverview(),
            video: videoLesson('Video: Trading Derivatives for Integrals'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'calculus-ii-integration-unit-1-chapter-3',
            title: 'Trigonometric Integrals',
            overview: emptyOverview(),
            video: videoLesson('Video: Pattern Matching with Identities'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
        ],
        quiz: emptyQuiz(),
        assignment: emptyAssignment(),
      },
      {
        id: 'calculus-ii-integration-unit-2',
        title: 'Advanced Applications',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'calculus-ii-integration-unit-2-chapter-1',
            title: 'Partial Fractions',
            overview: emptyOverview(),
            video: videoLesson('Video: Breaking Rational Functions Apart'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'calculus-ii-integration-unit-2-chapter-2',
            title: 'Improper Integrals',
            overview: emptyOverview(),
            video: videoLesson('Video: Handling Infinite Bounds and Discontinuities'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
        ],
        quiz: emptyQuiz(),
        assignment: emptyAssignment(),
      },
    ],
  },
  {
    id: '5',
    icon: FileText,
    label: 'React Performance Patterns',
    conversationIds: ['course-conv-9', 'course-conv-10'],
    units: [
      {
        id: 'react-performance-patterns-unit-1',
        title: 'Rendering Fundamentals',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'react-performance-patterns-unit-1-chapter-1',
            title: 'Component Render Flow',
            overview: emptyOverview(),
            video: videoLesson('Video: Understanding What Actually Re-renders'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'react-performance-patterns-unit-1-chapter-2',
            title: 'State Placement',
            overview: emptyOverview(),
            video: videoLesson('Video: Keeping Updates Close to Where They Matter'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
        ],
        quiz: emptyQuiz(),
        assignment: emptyAssignment(),
      },
      {
        id: 'react-performance-patterns-unit-2',
        title: 'Interaction and List Performance',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'react-performance-patterns-unit-2-chapter-1',
            title: 'Memoization Tradeoffs',
            overview: emptyOverview(),
            video: videoLesson('Video: Using Memo Without Hiding Design Problems'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'react-performance-patterns-unit-2-chapter-2',
            title: 'Large Lists',
            overview: emptyOverview(),
            video: videoLesson('Video: Rendering Only What the User Can See'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'react-performance-patterns-unit-2-chapter-3',
            title: 'Input Responsiveness',
            overview: emptyOverview(),
            video: videoLesson('Video: Keeping Typing and Navigation Smooth'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
        ],
        quiz: emptyQuiz(),
        assignment: emptyAssignment(),
      },
    ],
  },
]
