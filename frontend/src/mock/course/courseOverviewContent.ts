interface UnitChapterIntro {
  title: string
  summary: string
}

interface UnitOverviewIntro {
  lead: string
  chapters: UnitChapterIntro[]
  takeaway: string
}

interface ChapterOverviewIntro {
  lead: string
  ideas: string[]
  goal: string
}

function createUnitOverview({
  lead,
  chapters,
  takeaway,
}: UnitOverviewIntro) {
  return `## What this unit is about

${lead}

### Chapter map

${chapters.map((chapter) => `- **${chapter.title}**: ${chapter.summary}`).join('\n')}

### What to keep in mind

${takeaway}`
}

function createChapterOverview({ lead, ideas, goal }: ChapterOverviewIntro) {
  return `## Why this matters

${lead}

### Key ideas

${ideas.map((idea) => `- ${idea}`).join('\n')}

### Learning goal

${goal}`
}

export const courseOverviewContent: Record<string, string> = {
  'linear-algebra-lecture-12-unit-1': createUnitOverview({
    lead:
      'This unit turns eigenvalues and eigenvectors from a calculation routine into a way of reading a matrix. You will see how a transformation can look complicated in ordinary coordinates, yet become much more understandable when you find its stable directions.',
    chapters: [
      {
        title: 'Why Eigenvectors Matter',
        summary:
          'Build the geometric intuition first: eigenvectors point along directions that a transformation preserves.',
      },
      {
        title: 'Computing Eigenvalues',
        summary:
          'Learn how the characteristic polynomial turns the search for stable directions into a concrete algebraic process.',
      },
      {
        title: 'Diagonalization Basics',
        summary:
          'Connect enough independent eigenvectors to a simpler coordinate system where the matrix mostly scales axes.',
      },
    ],
    takeaway:
      'Treat every formula in this unit as a tool for changing viewpoint. The goal is not just to find numbers, but to understand what the matrix is naturally trying to do.',
  }),
  'linear-algebra-lecture-12-unit-1-chapter-1': createChapterOverview({
    lead:
      'Eigenvectors are the directions a linear transformation respects. Most vectors are pushed into a new direction, but an eigenvector stays on its original line, only stretching, shrinking, or flipping.',
    ideas: [
      'An eigenvector keeps its direction under the transformation.',
      'The eigenvalue tells how strongly that direction is scaled.',
      'Geometrically, eigenvectors reveal the transformation paths that are easiest to describe.',
    ],
    goal:
      'By the end of this chapter, you should be able to look at a matrix as more than a grid of numbers and ask which directions it treats as special.',
  }),
  'linear-algebra-lecture-12-unit-1-chapter-2': createChapterOverview({
    lead:
      'Computing eigenvalues is where the geometry becomes algebra. The characteristic equation helps you find the scaling factors that make stable directions possible.',
    ideas: [
      'The equation det(A - lambda I) = 0 identifies candidate eigenvalues.',
      'Each eigenvalue leads to a null space problem for finding eigenvectors.',
      'Multiplicity matters because repeated eigenvalues may or may not provide enough directions.',
    ],
    goal:
      'You should leave this chapter comfortable moving from a matrix to its characteristic polynomial, then from eigenvalues to eigenspaces.',
  }),
  'linear-algebra-lecture-12-unit-1-chapter-3': createChapterOverview({
    lead:
      'Diagonalization is a change of coordinates that lets a matrix act like simple scaling. When it works, repeated matrix multiplication and transformation analysis become much cleaner.',
    ideas: [
      'A diagonal matrix is easy to interpret because each coordinate is scaled independently.',
      'The matrix P stores eigenvectors as a new basis.',
      'The identity A = P D P^-1 describes the same transformation from a better viewpoint.',
    ],
    goal:
      'The aim is to know when diagonalization is possible and to read each part of A = P D P^-1 with geometric meaning.',
  }),
  'linear-algebra-lecture-12-unit-2': createUnitOverview({
    lead:
      'This unit expands the eigenvector story into matrix decomposition. Instead of treating a matrix as one large object, you will practice breaking it into interpretable pieces that show structure, coordinates, and component behavior.',
    chapters: [
      {
        title: 'Change of Basis',
        summary:
          'Learn how the same transformation can become simpler when described with more suitable coordinate axes.',
      },
      {
        title: 'Spectral Decomposition',
        summary:
          'See how symmetric or well-behaved matrices can be assembled from independent directional components.',
      },
    ],
    takeaway:
      'Matrix decomposition is a language for explaining structure. Keep asking what each factor means, not only how to multiply it back together.',
  }),
  'linear-algebra-lecture-12-unit-2-chapter-1': createChapterOverview({
    lead:
      'A change of basis is like choosing a better set of measuring sticks. The underlying vector does not change, but its coordinates can become easier to reason about.',
    ideas: [
      'A basis determines how vectors are described numerically.',
      'Changing basis can simplify a linear transformation without changing the transformation itself.',
      'Eigenvector bases are powerful because they align with the matrix behavior.',
    ],
    goal:
      'After this chapter, you should be able to explain why a matrix can look complex in one basis and simple in another.',
  }),
  'linear-algebra-lecture-12-unit-2-chapter-2': createChapterOverview({
    lead:
      'Spectral decomposition shows how a transformation can be built from clean directional pieces. It is one of the places where linear algebra starts to feel like analysis of structure rather than symbol pushing.',
    ideas: [
      'Eigenvectors can define independent components of a transformation.',
      'Eigenvalues weight the contribution of those components.',
      'For suitable matrices, decomposition gives a stable and interpretable representation.',
    ],
    goal:
      'You should understand spectral decomposition as a way to separate a matrix into directions, weights, and reconstruction.',
  }),

  'python-data-structures-notes-unit-1': createUnitOverview({
    lead:
      'This unit focuses on Python sequences: the collections you reach for when order matters. Lists and tuples look similar at first, but their design signals different expectations about change, structure, and intent.',
    chapters: [
      {
        title: 'Sequence Fundamentals',
        summary:
          'Review indexing, slicing, iteration, and the mental model behind ordered collections.',
      },
      {
        title: 'Mutable vs Immutable Data',
        summary:
          'Separate collections that are meant to change from fixed records whose shape should stay stable.',
      },
    ],
    takeaway:
      'Good Python code chooses a data structure that communicates intent. Ask whether order, mutability, and shape are part of the meaning.',
  }),
  'python-data-structures-notes-unit-1-chapter-1': createChapterOverview({
    lead:
      'Sequences let you model ordered information: steps in a workflow, words in a sentence, samples in a dataset, or items in a queue. Python gives you compact tools for reaching into that order.',
    ideas: [
      'Indexing retrieves one element by position.',
      'Slicing extracts a range while preserving order.',
      'Iteration lets you process each element without manually managing indexes.',
    ],
    goal:
      'You should be able to choose between direct indexing, slicing, and iteration based on the question your code is asking.',
  }),
  'python-data-structures-notes-unit-1-chapter-2': createChapterOverview({
    lead:
      'Mutability is not just a technical detail. It affects how data flows through a program and how safely different parts of code can share the same object.',
    ideas: [
      'Lists are useful when the collection needs to grow, shrink, or be edited.',
      'Tuples are useful for fixed-shape records and stable return values.',
      'Unexpected mutation is a common source of subtle bugs.',
    ],
    goal:
      'By the end, you should be able to explain why a tuple can make code clearer even when a list would technically work.',
  }),
  'python-data-structures-notes-unit-2': createUnitOverview({
    lead:
      'This unit moves from ordered data to lookup and membership. Dictionaries and sets help you design programs around questions like "what value belongs to this key?" and "have I seen this before?"',
    chapters: [
      {
        title: 'Key-Value Modeling',
        summary:
          'Use dictionaries to express relationships between identifiers and the data attached to them.',
      },
      {
        title: 'Membership and Uniqueness',
        summary:
          'Use sets when uniqueness and fast membership checks are the core behavior.',
      },
      {
        title: 'Comprehensions',
        summary:
          'Build lists, dictionaries, and sets declaratively when transforming one collection into another.',
      },
    ],
    takeaway:
      'The best collection is the one that matches the operation you care about most: order, lookup, uniqueness, or transformation.',
  }),
  'python-data-structures-notes-unit-2-chapter-1': createChapterOverview({
    lead:
      "Dictionaries are Python's workhorse for named relationships. A good key design can turn repeated searching into a simple lookup.",
    ideas: [
      'Keys should represent the question you need to answer quickly.',
      'Values can be simple data or richer nested structures.',
      'Clear dictionary shapes make downstream code easier to read.',
    ],
    goal:
      'You should be able to design dictionary keys around real lookup needs instead of adding dictionaries only after the data becomes messy.',
  }),
  'python-data-structures-notes-unit-2-chapter-2': createChapterOverview({
    lead:
      'Sets are ideal when you care about whether something exists, not where it appears. They are small in syntax but powerful in intent.',
    ideas: [
      'Sets store unique values.',
      'Membership checks are fast and expressive.',
      'Set operations can describe overlap, difference, and union directly.',
    ],
    goal:
      'The goal is to recognize problems where a set makes the code shorter, faster, and closer to the underlying idea.',
  }),
  'python-data-structures-notes-unit-2-chapter-3': createChapterOverview({
    lead:
      'Comprehensions let you describe collection building in one focused expression. They work best when the transformation is simple and the intent stays readable.',
    ideas: [
      'List comprehensions transform or filter ordered data.',
      'Dictionary comprehensions build lookup tables from iterable input.',
      'Set comprehensions combine transformation with uniqueness.',
    ],
    goal:
      'You should be able to use comprehensions for clear transformations and know when a regular loop would be more readable.',
  }),

  'machine-learning-fundamentals-unit-1': createUnitOverview({
    lead:
      'This unit sets up the language of supervised learning. Before models become complex, you need a precise way to describe what the model sees, what it predicts, and how you judge whether it is improving.',
    chapters: [
      {
        title: 'Features, Labels, and Datasets',
        summary:
          'Frame prediction problems by separating input signals from target outcomes.',
      },
      {
        title: 'Loss Functions',
        summary:
          'Translate model mistakes into a measurable objective that training can optimize.',
      },
      {
        title: 'Train and Validation Splits',
        summary:
          'Check whether performance holds on data the model did not train on.',
      },
    ],
    takeaway:
      'Strong machine learning work starts with problem framing. A model can only learn from the structure you define for it.',
  }),
  'machine-learning-fundamentals-unit-1-chapter-1': createChapterOverview({
    lead:
      'Features and labels define the contract of a supervised learning problem. If that contract is vague, even a sophisticated model can learn the wrong task.',
    ideas: [
      'Features are the input signals available at prediction time.',
      'Labels are the outcomes the model is trained to predict.',
      'Dataset design should match the real decision or forecast you care about.',
    ],
    goal:
      'You should be able to describe a prediction problem in terms of available inputs, target outputs, and examples.',
  }),
  'machine-learning-fundamentals-unit-1-chapter-2': createChapterOverview({
    lead:
      'A loss function gives learning a direction. It turns mistakes into numbers so optimization can compare one model state with another.',
    ideas: [
      'Different tasks need different definitions of error.',
      'Loss functions shape what the model prioritizes during training.',
      'A lower training loss is useful only when it aligns with the real-world goal.',
    ],
    goal:
      'The chapter should leave you able to connect the choice of loss function to the behavior you want from the model.',
  }),
  'machine-learning-fundamentals-unit-1-chapter-3': createChapterOverview({
    lead:
      'Validation is how you ask whether a model learned a pattern or merely memorized examples. A good split makes that question fair.',
    ideas: [
      'Training data updates the model parameters.',
      'Validation data estimates performance on unseen examples.',
      'Leakage can make validation scores look better than reality.',
    ],
    goal:
      'You should understand why evaluation design is part of modeling, not a final checkbox after training.',
  }),
  'machine-learning-fundamentals-unit-2': createUnitOverview({
    lead:
      'This unit connects how models improve with why they sometimes fail outside the training set. Optimization helps a model fit data, while generalization asks whether that fit is trustworthy.',
    chapters: [
      {
        title: 'Gradient Descent',
        summary:
          'Understand the iterative process that nudges parameters toward lower loss.',
      },
      {
        title: 'Overfitting and Regularization',
        summary:
          'Learn why too much fit can hurt and how constraints can improve reliability.',
      },
    ],
    takeaway:
      'A useful model is not the one that only minimizes training loss. It is the one that learns signal robustly enough to handle new data.',
  }),
  'machine-learning-fundamentals-unit-2-chapter-1': createChapterOverview({
    lead:
      'Gradient descent is the basic rhythm of many learning algorithms: measure error, estimate a direction of improvement, then take a step.',
    ideas: [
      'The gradient points toward the steepest local increase in loss.',
      'Training steps move parameters in the opposite direction.',
      'Learning rate controls the size and stability of those steps.',
    ],
    goal:
      'You should be able to explain gradient descent as an iterative search process, not as a mysterious training spell.',
  }),
  'machine-learning-fundamentals-unit-2-chapter-2': createChapterOverview({
    lead:
      'Overfitting happens when a model becomes too loyal to the training examples. Regularization adds pressure toward simpler, more stable patterns.',
    ideas: [
      'A model can perform well on training data while failing on new data.',
      'Regularization discourages overly complex solutions.',
      'Validation behavior helps reveal the balance between underfitting and overfitting.',
    ],
    goal:
      'You should leave with a practical sense for diagnosing overfitting and choosing constraints that improve generalization.',
  }),

  'calculus-ii-integration-unit-1': createUnitOverview({
    lead:
      'This unit gives you the core techniques for turning difficult integrals into manageable ones. Each method is a way of recognizing structure: a hidden chain rule, a useful product rule reversal, or a trigonometric identity waiting to be used.',
    chapters: [
      {
        title: 'Substitution',
        summary:
          'Reverse the chain rule by replacing a complicated inner expression with a simpler variable.',
      },
      {
        title: 'Integration by Parts',
        summary:
          'Reverse the product rule to trade one integral for another that is easier to evaluate.',
      },
      {
        title: 'Trigonometric Integrals',
        summary:
          'Use identities and parity patterns to simplify powers of sine, cosine, tangent, and secant.',
      },
    ],
    takeaway:
      'The central skill is diagnosis. Before calculating, pause and ask which pattern the integrand is trying to show you.',
  }),
  'calculus-ii-integration-unit-1-chapter-1': createChapterOverview({
    lead:
      'Substitution is the first major pattern in integration because it turns nested expressions into simpler ones. It is the reverse of noticing a chain rule in differentiation.',
    ideas: [
      'Choose u to represent an inner expression that simplifies the integrand.',
      'Rewrite dx terms consistently using du.',
      'For definite integrals, change the bounds or substitute back before evaluating.',
    ],
    goal:
      'You should be able to spot chain-rule structure and perform a clean substitution without leaving mixed variables behind.',
  }),
  'calculus-ii-integration-unit-1-chapter-2': createChapterOverview({
    lead:
      'Integration by parts is useful when the integrand is a product and one factor becomes simpler after differentiation. It is a controlled trade rather than a magic formula.',
    ideas: [
      'The formula comes from rearranging the product rule.',
      'Choosing u well usually means choosing something that simplifies when differentiated.',
      'Repeated integration by parts can reveal cycles or reduction formulas.',
    ],
    goal:
      'The goal is to choose u and dv intentionally, then judge whether the resulting integral is actually easier.',
  }),
  'calculus-ii-integration-unit-1-chapter-3': createChapterOverview({
    lead:
      'Trigonometric integrals reward pattern recognition. The right identity can turn a stubborn expression into a familiar substitution or algebraic form.',
    ideas: [
      'Odd powers often leave one factor aside for substitution.',
      'Even powers often use half-angle identities.',
      'Tangent and secant patterns rely on derivative relationships between the two functions.',
    ],
    goal:
      'You should build a small decision tree for trigonometric powers so each integral feels less like guessing.',
  }),
  'calculus-ii-integration-unit-2': createUnitOverview({
    lead:
      'This unit moves beyond technique drills into integrals that need structural preparation or careful limits. You will split rational expressions apart and learn how to reason about integrals that stretch to infinity or approach discontinuities.',
    chapters: [
      {
        title: 'Partial Fractions',
        summary:
          'Break rational functions into simpler fractions whose antiderivatives are easier to recognize.',
      },
      {
        title: 'Improper Integrals',
        summary:
          'Evaluate integrals with infinite bounds or vertical asymptotes by taking limits carefully.',
      },
    ],
    takeaway:
      'Advanced integration is often about respecting the domain. Algebra can simplify the expression, but limits decide whether the integral truly converges.',
  }),
  'calculus-ii-integration-unit-2-chapter-1': createChapterOverview({
    lead:
      'Partial fractions turn one complicated rational function into a sum of simpler pieces. It is algebra in service of integration.',
    ideas: [
      'Factor the denominator before choosing the decomposition form.',
      'Linear and repeated factors require different numerator patterns.',
      'Once decomposed, many terms integrate into logarithms or arctangent forms.',
    ],
    goal:
      'You should be able to set up the decomposition cleanly and understand why the resulting terms are easier to integrate.',
  }),
  'calculus-ii-integration-unit-2-chapter-2': createChapterOverview({
    lead:
      'Improper integrals ask whether area still makes sense when an interval is infinite or the function misbehaves. The answer comes from limits, not from visual intuition alone.',
    ideas: [
      'Infinite bounds are handled by replacing infinity with a variable limit.',
      'Discontinuities inside or at the edge of an interval require splitting the integral.',
      'Convergence means the relevant limit exists and is finite.',
    ],
    goal:
      'You should be able to identify why an integral is improper and evaluate convergence with the correct limiting process.',
  }),

  'react-performance-patterns-unit-1': createUnitOverview({
    lead:
      'This unit builds a practical mental model of React rendering. Performance work becomes much easier when you know what triggers a render, how far an update travels, and where state actually belongs.',
    chapters: [
      {
        title: 'Component Render Flow',
        summary:
          'Trace how updates move through a component tree and what it means for a component to render.',
      },
      {
        title: 'State Placement',
        summary:
          'Keep state close to the UI that needs it so unrelated components avoid unnecessary work.',
      },
    ],
    takeaway:
      'Before reaching for optimization APIs, understand the shape of the update. Most performance fixes start with better ownership of state and boundaries.',
  }),
  'react-performance-patterns-unit-1-chapter-1': createChapterOverview({
    lead:
      'A render is React recalculating what the UI should look like. It is normal and necessary, but uncontrolled render flow can make an interface feel heavier than it needs to be.',
    ideas: [
      'State updates schedule renders for the component that owns the state.',
      'Child components may render when parents render.',
      'Rendering is separate from committing changes to the DOM.',
    ],
    goal:
      'You should be able to trace why a component rendered before deciding whether it needs optimization.',
  }),
  'react-performance-patterns-unit-1-chapter-2': createChapterOverview({
    lead:
      'State placement is one of the simplest and most reliable performance tools. The closer state lives to the components that use it, the less unrelated UI has to reconsider itself.',
    ideas: [
      'Lift state only when multiple branches truly need to share it.',
      'Local state can isolate frequent updates.',
      'Component boundaries can reduce the visible cost of interaction-heavy areas.',
    ],
    goal:
      'The goal is to choose state ownership deliberately rather than defaulting everything to the highest convenient parent.',
  }),
  'react-performance-patterns-unit-2': createUnitOverview({
    lead:
      'This unit focuses on interactions that users feel directly: large lists, repeated calculations, and inputs that need to stay responsive. The goal is to optimize for real bottlenecks without making the code harder to reason about.',
    chapters: [
      {
        title: 'Memoization Tradeoffs',
        summary:
          'Use memoization when it prevents meaningful repeated work, not as a blanket decoration.',
      },
      {
        title: 'Large Lists',
        summary:
          'Render long collections carefully so the browser handles only what the user needs now.',
      },
      {
        title: 'Input Responsiveness',
        summary:
          'Keep typing and navigation smooth by separating urgent UI updates from heavier work.',
      },
    ],
    takeaway:
      'React performance is a product experience topic. Measure the interaction, identify the bottleneck, then choose the smallest optimization that changes what the user feels.',
  }),
  'react-performance-patterns-unit-2-chapter-1': createChapterOverview({
    lead:
      'Memoization stores a previous result so React can avoid repeating work. It is helpful when the saved work is meaningful and the dependencies are stable.',
    ideas: [
      'useMemo caches computed values between renders.',
      'memo can skip child rendering when props are unchanged.',
      'Memoization has its own complexity and should solve a real cost.',
    ],
    goal:
      'You should learn to treat memoization as a targeted tool, not a default response to every render.',
  }),
  'react-performance-patterns-unit-2-chapter-2': createChapterOverview({
    lead:
      'Large lists can overwhelm the browser if every item renders at once. A better strategy is to align rendering work with what the user can actually see and interact with.',
    ideas: [
      'Virtualization renders a moving window of visible rows.',
      'Stable keys help React preserve identity across list changes.',
      'Row component design matters when every item repeats many times.',
    ],
    goal:
      'You should be able to recognize when list size is the bottleneck and choose rendering strategies that scale with the viewport, not the dataset.',
  }),
  'react-performance-patterns-unit-2-chapter-3': createChapterOverview({
    lead:
      'Input responsiveness is about keeping the interface ready for the next keystroke or click. Users notice delays here quickly, even when the rest of the app feels acceptable.',
    ideas: [
      'Urgent visual feedback should not wait for expensive derived work.',
      'Debouncing can reduce repeated network or computation pressure.',
      'Transitions can separate immediate input updates from slower rendering.',
    ],
    goal:
      'The goal is to keep direct manipulation smooth while still letting the application do heavier work in a controlled way.',
  }),

  'statistics-essentials-unit-1': createUnitOverview({
    lead:
      'This unit introduces the bridge between uncertainty and decisions. Random variables help you model uncertain outcomes numerically, while confidence intervals help you communicate estimates without pretending they are exact.',
    chapters: [
      {
        title: 'Random Variables',
        summary:
          'Turn uncertain outcomes into numerical quantities that can be summarized and modeled.',
      },
      {
        title: 'Confidence Intervals',
        summary:
          'Express estimation uncertainty with intervals built from sampling behavior.',
      },
    ],
    takeaway:
      'Statistics is careful language for uncertainty. The goal is not to remove uncertainty, but to measure and communicate it responsibly.',
  }),
  'statistics-essentials-unit-1-chapter-1': createChapterOverview({
    lead:
      'A random variable assigns numbers to uncertain outcomes. That simple move lets you calculate expectations, variability, and probabilities in a consistent way.',
    ideas: [
      'Discrete random variables count separated outcomes.',
      'Continuous random variables model quantities across intervals.',
      'Expected value summarizes long-run average behavior.',
    ],
    goal:
      'You should be able to define a random variable for a real situation and describe what its distribution tells you.',
  }),
  'statistics-essentials-unit-1-chapter-2': createChapterOverview({
    lead:
      'A confidence interval gives an estimate room to breathe. It acknowledges that a sample is informative but not identical to the full population.',
    ideas: [
      'Intervals combine a point estimate with a margin of error.',
      'Confidence level describes the behavior of the interval-building method.',
      'Wider intervals usually reflect more uncertainty or a higher confidence requirement.',
    ],
    goal:
      'You should be able to interpret a confidence interval carefully, especially what it does and does not claim.',
  }),

  'database-systems-notes-unit-1': createUnitOverview({
    lead:
      'This unit focuses on relational modeling: designing tables so data is connected without becoming tangled. Good models make queries simpler, updates safer, and meaning easier to preserve.',
    chapters: [
      {
        title: 'Keys and Relationships',
        summary:
          'Use primary and foreign keys to represent identity and connections between tables.',
      },
      {
        title: 'Normalization',
        summary:
          'Reduce duplication and update anomalies by organizing facts at the right level.',
      },
    ],
    takeaway:
      'A database schema is a long-term design choice. Aim for relationships that express the domain clearly before optimizing for convenience.',
  }),
  'database-systems-notes-unit-1-chapter-1': createChapterOverview({
    lead:
      'Keys are how relational databases keep track of identity. Relationships are how separate tables cooperate without copying the same facts everywhere.',
    ideas: [
      'Primary keys uniquely identify rows.',
      'Foreign keys connect rows across tables.',
      'Cardinality describes whether relationships are one-to-one, one-to-many, or many-to-many.',
    ],
    goal:
      'You should be able to model common relationships and explain why keys protect both meaning and consistency.',
  }),
  'database-systems-notes-unit-1-chapter-2': createChapterOverview({
    lead:
      'Normalization is the discipline of putting each fact in the right place. It helps prevent a database from disagreeing with itself after routine updates.',
    ideas: [
      'Duplicated facts can create update, insert, and delete anomalies.',
      'Functional dependencies guide how tables should be split.',
      'Normalization balances clarity with practical query needs.',
    ],
    goal:
      'The goal is to understand normalization as a design lens, not just a list of normal forms to memorize.',
  }),

  'product-analytics-workshop-unit-1': createUnitOverview({
    lead:
      'This unit introduces two core product analytics practices: finding where users drop off and deciding whether a change actually improved the experience. The focus is practical, decision-oriented analysis.',
    chapters: [
      {
        title: 'Activation Funnels',
        summary:
          'Break onboarding into measurable steps so drop-off becomes visible and actionable.',
      },
      {
        title: 'A/B Test Readouts',
        summary:
          'Interpret experiment results with lift, uncertainty, power, and guardrail metrics in mind.',
      },
    ],
    takeaway:
      'Product analytics is not just reporting numbers. It is a way to turn user behavior into clearer product decisions.',
  }),
  'product-analytics-workshop-unit-1-chapter-1': createChapterOverview({
    lead:
      'Activation funnels help you see the path from first contact to meaningful value. Each step should represent a user action that matters to the product experience.',
    ideas: [
      'A funnel step should be observable, meaningful, and ordered.',
      'Drop-off points suggest where users may be confused, blocked, or unconvinced.',
      'Segmenting funnels can reveal very different user journeys.',
    ],
    goal:
      'You should be able to define an activation funnel and use it to form product hypotheses, not just produce a chart.',
  }),
  'product-analytics-workshop-unit-1-chapter-2': createChapterOverview({
    lead:
      'A/B test readouts help teams decide whether a change is worth shipping. The challenge is to interpret results with both statistical care and product judgment.',
    ideas: [
      'Lift describes the observed difference between variants.',
      'Power and sample size affect whether a test can detect meaningful changes.',
      'Guardrail metrics protect against improving one metric while damaging another.',
    ],
    goal:
      'The goal is to read experiment results as evidence for a decision, including uncertainty and tradeoffs.',
  }),
}
