import { FileText, GraduationCap, PlayCircle, type LucideIcon } from 'lucide-react'

interface CourseOverview {
  blocks: string[]
}

interface CourseQuiz {
  questions: string[]
}

interface CourseAssignment {
  prompts: string[]
}

interface CourseVideoLesson {
  title: string
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
  units: CourseUnit[]
}

const emptyOverview = (): CourseOverview => ({ blocks: [] })
const emptyQuiz = (): CourseQuiz => ({ questions: [] })
const emptyAssignment = (): CourseAssignment => ({ prompts: [] })

export const courseItems: CourseItem[] = [
  {
    id: '1',
    icon: PlayCircle,
    label: 'Linear Algebra — Lecture 12',
    units: [
      {
        id: 'linear-algebra-lecture-12-unit-1',
        title: 'Eigenvalues and Eigenvectors',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'linear-algebra-lecture-12-unit-1-chapter-1',
            title: 'Why Eigenvectors Matter',
            overview: emptyOverview(),
            video: { title: 'Video: Seeing Stable Directions in Linear Maps' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'linear-algebra-lecture-12-unit-1-chapter-2',
            title: 'Computing Eigenvalues',
            overview: emptyOverview(),
            video: { title: 'Video: Characteristic Polynomials Step by Step' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'linear-algebra-lecture-12-unit-1-chapter-3',
            title: 'Diagonalization Basics',
            overview: emptyOverview(),
            video: { title: 'Video: Turning a Matrix into a Simpler Form' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
        ],
        quiz: emptyQuiz(),
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
            video: { title: 'Video: Reading Matrices Through Better Coordinates' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'linear-algebra-lecture-12-unit-2-chapter-2',
            title: 'Spectral Decomposition',
            overview: emptyOverview(),
            video: { title: 'Video: Splitting Transformations into Components' },
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
            video: { title: 'Video: Indexing, Slicing, and Iteration' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'python-data-structures-notes-unit-1-chapter-2',
            title: 'Mutable vs Immutable Data',
            overview: emptyOverview(),
            video: { title: 'Video: When Python Objects Can Change' },
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
            video: { title: 'Video: Designing Lookups with Dictionaries' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'python-data-structures-notes-unit-2-chapter-2',
            title: 'Membership and Uniqueness',
            overview: emptyOverview(),
            video: { title: 'Video: Using Sets to Remove Duplicate Work' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'python-data-structures-notes-unit-2-chapter-3',
            title: 'Comprehensions',
            overview: emptyOverview(),
            video: { title: 'Video: Building Collections Declaratively' },
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
            video: { title: 'Video: Framing Prediction Problems Clearly' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'machine-learning-fundamentals-unit-1-chapter-2',
            title: 'Loss Functions',
            overview: emptyOverview(),
            video: { title: 'Video: Measuring Model Mistakes' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'machine-learning-fundamentals-unit-1-chapter-3',
            title: 'Train and Validation Splits',
            overview: emptyOverview(),
            video: { title: 'Video: Checking Whether Learning Generalizes' },
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
            video: { title: 'Video: Moving Parameters in the Right Direction' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'machine-learning-fundamentals-unit-2-chapter-2',
            title: 'Overfitting and Regularization',
            overview: emptyOverview(),
            video: { title: 'Video: Keeping Models from Memorizing Noise' },
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
            video: { title: 'Video: Reversing the Chain Rule' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'calculus-ii-integration-unit-1-chapter-2',
            title: 'Integration by Parts',
            overview: emptyOverview(),
            video: { title: 'Video: Trading Derivatives for Integrals' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'calculus-ii-integration-unit-1-chapter-3',
            title: 'Trigonometric Integrals',
            overview: emptyOverview(),
            video: { title: 'Video: Pattern Matching with Identities' },
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
            video: { title: 'Video: Breaking Rational Functions Apart' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'calculus-ii-integration-unit-2-chapter-2',
            title: 'Improper Integrals',
            overview: emptyOverview(),
            video: { title: 'Video: Handling Infinite Bounds and Discontinuities' },
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
            video: { title: 'Video: Understanding What Actually Re-renders' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'react-performance-patterns-unit-1-chapter-2',
            title: 'State Placement',
            overview: emptyOverview(),
            video: { title: 'Video: Keeping Updates Close to Where They Matter' },
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
            video: { title: 'Video: Using Memo Without Hiding Design Problems' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'react-performance-patterns-unit-2-chapter-2',
            title: 'Large Lists',
            overview: emptyOverview(),
            video: { title: 'Video: Rendering Only What the User Can See' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'react-performance-patterns-unit-2-chapter-3',
            title: 'Input Responsiveness',
            overview: emptyOverview(),
            video: { title: 'Video: Keeping Typing and Navigation Smooth' },
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
