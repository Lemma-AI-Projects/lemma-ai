import { FileText, GraduationCap, PlayCircle, type LucideIcon } from 'lucide-react'
import { courseOverviewContent } from './courseOverviewContent'

export type CourseProgressStatus = 'not-started' | 'in-progress' | 'completed'

export interface CourseOverview {
  markdown: string
  status: CourseProgressStatus
}

export interface CourseQuiz {
  questions: string[]
  status: CourseProgressStatus
}

export interface CourseAssignment {
  prompts: string[]
  status: CourseProgressStatus
}

export interface CourseVideoLesson {
  title: string
  status: CourseProgressStatus
}

export interface CourseChapter {
  id: string
  title: string
  overview: CourseOverview
  video: CourseVideoLesson
  quiz: CourseQuiz
  assignment: CourseAssignment
}

export interface CourseUnit {
  id: string
  title: string
  overview: CourseOverview
  chapters: CourseChapter[]
  quiz: CourseQuiz
  assignment: CourseAssignment
}

export interface CourseItem {
  id: string
  icon: LucideIcon
  label: string
  conversationIds: string[]
  units: CourseUnit[]
}

const courseOverview = (
  id: string,
  status: CourseProgressStatus = 'not-started'
): CourseOverview => ({ markdown: courseOverviewContent[id] ?? '', status })
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
        overview: courseOverview('linear-algebra-lecture-12-unit-1', 'completed'),
        chapters: [
          {
            id: 'linear-algebra-lecture-12-unit-1-chapter-1',
            title: 'Why Eigenvectors Matter',
            overview: courseOverview(
              'linear-algebra-lecture-12-unit-1-chapter-1',
              'completed'
            ),
            video: videoLesson('Video: Seeing Stable Directions in Linear Maps', 'completed'),
            quiz: emptyQuiz('completed'),
            assignment: emptyAssignment('completed'),
          },
          {
            id: 'linear-algebra-lecture-12-unit-1-chapter-2',
            title: 'Computing Eigenvalues',
            overview: courseOverview(
              'linear-algebra-lecture-12-unit-1-chapter-2',
              'completed'
            ),
            video: videoLesson('Video: Characteristic Polynomials Step by Step', 'in-progress'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'linear-algebra-lecture-12-unit-1-chapter-3',
            title: 'Diagonalization Basics',
            overview: courseOverview('linear-algebra-lecture-12-unit-1-chapter-3'),
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
        overview: courseOverview('linear-algebra-lecture-12-unit-2'),
        chapters: [
          {
            id: 'linear-algebra-lecture-12-unit-2-chapter-1',
            title: 'Change of Basis',
            overview: courseOverview('linear-algebra-lecture-12-unit-2-chapter-1'),
            video: videoLesson('Video: Reading Matrices Through Better Coordinates'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'linear-algebra-lecture-12-unit-2-chapter-2',
            title: 'Spectral Decomposition',
            overview: courseOverview('linear-algebra-lecture-12-unit-2-chapter-2'),
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
        overview: courseOverview('python-data-structures-notes-unit-1'),
        chapters: [
          {
            id: 'python-data-structures-notes-unit-1-chapter-1',
            title: 'Sequence Fundamentals',
            overview: courseOverview('python-data-structures-notes-unit-1-chapter-1'),
            video: videoLesson('Video: Indexing, Slicing, and Iteration'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'python-data-structures-notes-unit-1-chapter-2',
            title: 'Mutable vs Immutable Data',
            overview: courseOverview('python-data-structures-notes-unit-1-chapter-2'),
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
        overview: courseOverview('python-data-structures-notes-unit-2'),
        chapters: [
          {
            id: 'python-data-structures-notes-unit-2-chapter-1',
            title: 'Key-Value Modeling',
            overview: courseOverview('python-data-structures-notes-unit-2-chapter-1'),
            video: videoLesson('Video: Designing Lookups with Dictionaries'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'python-data-structures-notes-unit-2-chapter-2',
            title: 'Membership and Uniqueness',
            overview: courseOverview('python-data-structures-notes-unit-2-chapter-2'),
            video: videoLesson('Video: Using Sets to Remove Duplicate Work'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'python-data-structures-notes-unit-2-chapter-3',
            title: 'Comprehensions',
            overview: courseOverview('python-data-structures-notes-unit-2-chapter-3'),
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
        overview: courseOverview('machine-learning-fundamentals-unit-1'),
        chapters: [
          {
            id: 'machine-learning-fundamentals-unit-1-chapter-1',
            title: 'Features, Labels, and Datasets',
            overview: courseOverview('machine-learning-fundamentals-unit-1-chapter-1'),
            video: videoLesson('Video: Framing Prediction Problems Clearly'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'machine-learning-fundamentals-unit-1-chapter-2',
            title: 'Loss Functions',
            overview: courseOverview('machine-learning-fundamentals-unit-1-chapter-2'),
            video: videoLesson('Video: Measuring Model Mistakes'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'machine-learning-fundamentals-unit-1-chapter-3',
            title: 'Train and Validation Splits',
            overview: courseOverview('machine-learning-fundamentals-unit-1-chapter-3'),
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
        overview: courseOverview('machine-learning-fundamentals-unit-2'),
        chapters: [
          {
            id: 'machine-learning-fundamentals-unit-2-chapter-1',
            title: 'Gradient Descent',
            overview: courseOverview('machine-learning-fundamentals-unit-2-chapter-1'),
            video: videoLesson('Video: Moving Parameters in the Right Direction'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'machine-learning-fundamentals-unit-2-chapter-2',
            title: 'Overfitting and Regularization',
            overview: courseOverview('machine-learning-fundamentals-unit-2-chapter-2'),
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
        overview: courseOverview('calculus-ii-integration-unit-1'),
        chapters: [
          {
            id: 'calculus-ii-integration-unit-1-chapter-1',
            title: 'Substitution',
            overview: courseOverview('calculus-ii-integration-unit-1-chapter-1'),
            video: videoLesson('Video: Reversing the Chain Rule'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'calculus-ii-integration-unit-1-chapter-2',
            title: 'Integration by Parts',
            overview: courseOverview('calculus-ii-integration-unit-1-chapter-2'),
            video: videoLesson('Video: Trading Derivatives for Integrals'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'calculus-ii-integration-unit-1-chapter-3',
            title: 'Trigonometric Integrals',
            overview: courseOverview('calculus-ii-integration-unit-1-chapter-3'),
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
        overview: courseOverview('calculus-ii-integration-unit-2'),
        chapters: [
          {
            id: 'calculus-ii-integration-unit-2-chapter-1',
            title: 'Partial Fractions',
            overview: courseOverview('calculus-ii-integration-unit-2-chapter-1'),
            video: videoLesson('Video: Breaking Rational Functions Apart'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'calculus-ii-integration-unit-2-chapter-2',
            title: 'Improper Integrals',
            overview: courseOverview('calculus-ii-integration-unit-2-chapter-2'),
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
        overview: courseOverview('react-performance-patterns-unit-1'),
        chapters: [
          {
            id: 'react-performance-patterns-unit-1-chapter-1',
            title: 'Component Render Flow',
            overview: courseOverview('react-performance-patterns-unit-1-chapter-1'),
            video: videoLesson('Video: Understanding What Actually Re-renders'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'react-performance-patterns-unit-1-chapter-2',
            title: 'State Placement',
            overview: courseOverview('react-performance-patterns-unit-1-chapter-2'),
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
        overview: courseOverview('react-performance-patterns-unit-2'),
        chapters: [
          {
            id: 'react-performance-patterns-unit-2-chapter-1',
            title: 'Memoization Tradeoffs',
            overview: courseOverview('react-performance-patterns-unit-2-chapter-1'),
            video: videoLesson('Video: Using Memo Without Hiding Design Problems'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'react-performance-patterns-unit-2-chapter-2',
            title: 'Large Lists',
            overview: courseOverview('react-performance-patterns-unit-2-chapter-2'),
            video: videoLesson('Video: Rendering Only What the User Can See'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'react-performance-patterns-unit-2-chapter-3',
            title: 'Input Responsiveness',
            overview: courseOverview('react-performance-patterns-unit-2-chapter-3'),
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
  {
    id: '6',
    icon: GraduationCap,
    label: 'Statistics Essentials',
    conversationIds: ['course-conv-11'],
    units: [
      {
        id: 'statistics-essentials-unit-1',
        title: 'Probability and Inference',
        overview: courseOverview('statistics-essentials-unit-1', 'completed'),
        chapters: [
          {
            id: 'statistics-essentials-unit-1-chapter-1',
            title: 'Random Variables',
            overview: courseOverview(
              'statistics-essentials-unit-1-chapter-1',
              'completed'
            ),
            video: videoLesson('Video: Mapping Outcomes to Numbers', 'completed'),
            quiz: emptyQuiz('in-progress'),
            assignment: emptyAssignment(),
          },
          {
            id: 'statistics-essentials-unit-1-chapter-2',
            title: 'Confidence Intervals',
            overview: courseOverview('statistics-essentials-unit-1-chapter-2'),
            video: videoLesson('Video: Estimating with Uncertainty'),
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
    id: '7',
    icon: FileText,
    label: 'Database Systems Notes',
    conversationIds: ['course-conv-12'],
    units: [
      {
        id: 'database-systems-notes-unit-1',
        title: 'Relational Modeling',
        overview: courseOverview('database-systems-notes-unit-1'),
        chapters: [
          {
            id: 'database-systems-notes-unit-1-chapter-1',
            title: 'Keys and Relationships',
            overview: courseOverview('database-systems-notes-unit-1-chapter-1'),
            video: videoLesson('Video: Connecting Tables Without Duplication'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'database-systems-notes-unit-1-chapter-2',
            title: 'Normalization',
            overview: courseOverview('database-systems-notes-unit-1-chapter-2'),
            video: videoLesson('Video: Reducing Update Anomalies'),
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
    id: '8',
    icon: PlayCircle,
    label: 'Product Analytics Workshop',
    conversationIds: ['course-conv-13'],
    units: [
      {
        id: 'product-analytics-workshop-unit-1',
        title: 'Funnels and Experiments',
        overview: courseOverview('product-analytics-workshop-unit-1', 'completed'),
        chapters: [
          {
            id: 'product-analytics-workshop-unit-1-chapter-1',
            title: 'Activation Funnels',
            overview: courseOverview(
              'product-analytics-workshop-unit-1-chapter-1',
              'completed'
            ),
            video: videoLesson('Video: Finding Drop-off in Onboarding', 'completed'),
            quiz: emptyQuiz('completed'),
            assignment: emptyAssignment('completed'),
          },
          {
            id: 'product-analytics-workshop-unit-1-chapter-2',
            title: 'A/B Test Readouts',
            overview: courseOverview(
              'product-analytics-workshop-unit-1-chapter-2',
              'completed'
            ),
            video: videoLesson('Video: Reading Lift, Power, and Guardrails', 'in-progress'),
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
        ],
        quiz: emptyQuiz('in-progress'),
        assignment: emptyAssignment(),
      },
    ],
  },
]
