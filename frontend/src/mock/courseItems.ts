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
        title: 'Unit 1: Eigenvalues and Eigenvectors',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'linear-algebra-lecture-12-unit-1-chapter-1',
            title: 'Chapter 1: Why Eigenvectors Matter',
            overview: emptyOverview(),
            video: { title: 'Video: Seeing Stable Directions in Linear Maps' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'linear-algebra-lecture-12-unit-1-chapter-2',
            title: 'Chapter 2: Computing Eigenvalues',
            overview: emptyOverview(),
            video: { title: 'Video: Characteristic Polynomials Step by Step' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'linear-algebra-lecture-12-unit-1-chapter-3',
            title: 'Chapter 3: Diagonalization Basics',
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
        title: 'Unit 2: Matrix Decomposition',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'linear-algebra-lecture-12-unit-2-chapter-1',
            title: 'Chapter 1: Change of Basis',
            overview: emptyOverview(),
            video: { title: 'Video: Reading Matrices Through Better Coordinates' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'linear-algebra-lecture-12-unit-2-chapter-2',
            title: 'Chapter 2: Spectral Decomposition',
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
        title: 'Unit 1: Lists and Tuples',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'python-data-structures-notes-unit-1-chapter-1',
            title: 'Chapter 1: Sequence Fundamentals',
            overview: emptyOverview(),
            video: { title: 'Video: Indexing, Slicing, and Iteration' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'python-data-structures-notes-unit-1-chapter-2',
            title: 'Chapter 2: Mutable vs Immutable Data',
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
        title: 'Unit 2: Dictionaries and Sets',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'python-data-structures-notes-unit-2-chapter-1',
            title: 'Chapter 1: Key-Value Modeling',
            overview: emptyOverview(),
            video: { title: 'Video: Designing Lookups with Dictionaries' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'python-data-structures-notes-unit-2-chapter-2',
            title: 'Chapter 2: Membership and Uniqueness',
            overview: emptyOverview(),
            video: { title: 'Video: Using Sets to Remove Duplicate Work' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'python-data-structures-notes-unit-2-chapter-3',
            title: 'Chapter 3: Comprehensions',
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
        title: 'Unit 1: Supervised Learning Foundations',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'machine-learning-fundamentals-unit-1-chapter-1',
            title: 'Chapter 1: Features, Labels, and Datasets',
            overview: emptyOverview(),
            video: { title: 'Video: Framing Prediction Problems Clearly' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'machine-learning-fundamentals-unit-1-chapter-2',
            title: 'Chapter 2: Loss Functions',
            overview: emptyOverview(),
            video: { title: 'Video: Measuring Model Mistakes' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'machine-learning-fundamentals-unit-1-chapter-3',
            title: 'Chapter 3: Train and Validation Splits',
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
        title: 'Unit 2: Optimization and Generalization',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'machine-learning-fundamentals-unit-2-chapter-1',
            title: 'Chapter 1: Gradient Descent',
            overview: emptyOverview(),
            video: { title: 'Video: Moving Parameters in the Right Direction' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'machine-learning-fundamentals-unit-2-chapter-2',
            title: 'Chapter 2: Overfitting and Regularization',
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
        title: 'Unit 1: Core Integration Techniques',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'calculus-ii-integration-unit-1-chapter-1',
            title: 'Chapter 1: Substitution',
            overview: emptyOverview(),
            video: { title: 'Video: Reversing the Chain Rule' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'calculus-ii-integration-unit-1-chapter-2',
            title: 'Chapter 2: Integration by Parts',
            overview: emptyOverview(),
            video: { title: 'Video: Trading Derivatives for Integrals' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'calculus-ii-integration-unit-1-chapter-3',
            title: 'Chapter 3: Trigonometric Integrals',
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
        title: 'Unit 2: Advanced Applications',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'calculus-ii-integration-unit-2-chapter-1',
            title: 'Chapter 1: Partial Fractions',
            overview: emptyOverview(),
            video: { title: 'Video: Breaking Rational Functions Apart' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'calculus-ii-integration-unit-2-chapter-2',
            title: 'Chapter 2: Improper Integrals',
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
        title: 'Unit 1: Rendering Fundamentals',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'react-performance-patterns-unit-1-chapter-1',
            title: 'Chapter 1: Component Render Flow',
            overview: emptyOverview(),
            video: { title: 'Video: Understanding What Actually Re-renders' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'react-performance-patterns-unit-1-chapter-2',
            title: 'Chapter 2: State Placement',
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
        title: 'Unit 2: Interaction and List Performance',
        overview: emptyOverview(),
        chapters: [
          {
            id: 'react-performance-patterns-unit-2-chapter-1',
            title: 'Chapter 1: Memoization Tradeoffs',
            overview: emptyOverview(),
            video: { title: 'Video: Using Memo Without Hiding Design Problems' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'react-performance-patterns-unit-2-chapter-2',
            title: 'Chapter 2: Large Lists',
            overview: emptyOverview(),
            video: { title: 'Video: Rendering Only What the User Can See' },
            quiz: emptyQuiz(),
            assignment: emptyAssignment(),
          },
          {
            id: 'react-performance-patterns-unit-2-chapter-3',
            title: 'Chapter 3: Input Responsiveness',
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
