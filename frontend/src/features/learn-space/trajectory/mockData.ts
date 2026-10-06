import type { TrajectorySpace } from './types'

/**
 * Mock 轨迹 —— 三个刻意不同的学习过程。
 *
 * 为什么要三个而不是一个：Trajectory 声称能表达「一个 Space 如何走到今天」，
 * 而**不同类型的学习过程走法完全不同**。一个例子证明不了这个声称。
 *
 *   · TOEFL      —— 目标驱动、反复卡在同一个点、有一次三周的中断、回来后不一样了
 *   · 哲学论文    —— 以**作品**为中心推进、有修订、有反思、最终完成
 *   · 线性代数    —— 理解从模糊到独立重建、有迁移、有向新方向走
 *
 * ⚠️ **这里的数据是编的，但形状是认真的。** 每条 `evidence` 都尽量指向一种
 * Lemma 已经会记录的东西（一次 attempt / 一次独立重建 / 一次产物修订），
 * 而 `implication` 一律写成「这次变化改变了我们对下一步的理解」而不是
 * 「系统决定让你做 X」—— 因为后者是 Coordinator 的职责，不是本页的。
 *
 * 未来接入真实数据时：**这个文件整体被替换，组件不变。**
 */

const TOEFL: TrajectorySpace = {
  id: 'toefl',
  name: 'TOEFL 冲刺',
  domain: '考试 · 目标驱动',
  current: {
    goal: '三个月后考到 117 分',
    currently: '把口语的流利度问题从「想不到词」转成「不敢开口」',
    recentChange:
      '你可以在不看提示的情况下连续说满 45 秒而不切回中文。上周同样的题目，你 20 秒就停了。',
    whatRemains: '综合题里的长难句还在超时；写作的独立段落仍然需要先想例子再写。',
    span: 'Sep 3 – Oct 2 · 8 周',
    overviewMarks: [
      { id: 'm1', at: 0, label: '开始', kind: 'episode' },
      { id: 'm2', at: 0.16, label: '第一次尝试', kind: 'episode' },
      { id: 'm3', at: 0.34, label: '卡在流利度', kind: 'problem' },
      { id: 'm4', at: 0.55, label: '突破', kind: 'breakthrough' },
      { id: 'm5', at: 0.74, label: '回来', kind: 'return' },
      { id: 'm6', at: 1, label: '现在', kind: 'episode' },
    ],
  },
  periods: [
    {
      id: 'p1',
      title: '诊断与地基',
      dateRange: 'Sep 3 – Sep 14',
      summary: '摸清起点，把力气先放在最不像瓶颈的地方。',
      nodeIds: ['n1', 'n2'],
    },
    {
      id: 'p2',
      title: '流利度',
      dateRange: 'Sep 15 – Sep 28',
      summary: '两周在同一件事上打转，第三周才真的过去。',
      nodeIds: ['n3', 'n4', 'n5'],
    },
    {
      id: 'p3',
      title: '回来与重新校准',
      dateRange: 'Sep 29 – Oct 2',
      summary: '中断三周，回来发现丢的是口语不是阅读。',
      nodeIds: ['n6', 'n7'],
    },
  ],
  milestones: [
    {
      id: 'ms1',
      title: '第一次不靠提示地连说 45 秒',
      date: 'Sep 26',
      because:
        '在此之前所有「说满」的记录都发生在给过提示之后。这次的记录里没有提示，而时长第一次到了 45 秒。',
      kind: 'breakthrough',
      nodeId: 'n5',
    },
    {
      id: 'ms2',
      title: '把「说不出来」和「不敢说」分开',
      date: 'Oct 1',
      because:
        '这是一个诊断结论的改变，不是能力的改变 —— 而它决定了后面两周练的不是同一件事。',
      kind: 'direction-shift',
      nodeId: 'n7',
    },
  ],
  nodes: [
    {
      id: 'n1',
      kind: 'goal-shift',
      date: 'Sep 3',
      dateNote: '8 周前',
      title: '把目标写下来',
      whatHappened:
        '你说「我三个月后考试，目标 117」，确认之后它成了这个空间的方向。',
      whatChanged: '这个空间从「一堆待办」变成了「为 117 分服务的一组判断」。',
      evidence: [
        {
          id: 'e1',
          label: '目标确认',
          detail: '你确认了抽取出来的目标文本与用途（考试表现）。',
          sourceKind: 'conversation',
          sourceExcerpt: '「我三个月后考试，目标 117。」',
        },
      ],
      whatRemains: '还不知道 117 分里哪个部分最缺 —— 目标本身不回答这个问题。',
      implication:
        '有了方向之后，「我现在做的事有没有用」第一次变成一个可以问的问题。诊断因此变得必要。',
      relatedFocus: 'TOEFL',
    },
    {
      id: 'n2',
      kind: 'episode',
      date: 'Sep 10',
      dateNote: '7 周前',
      title: '第一次完整诊断',
      whatHappened:
        '做了一套完整题，然后逐项看时间分布。阅读/listening 正常，写作明显超时，口语是「答得出来但说不出」。',
      whatChanged: '你对「自己哪里弱」的判断从印象变成了一个分布。',
      evidence: [
        {
          id: 'e2',
          label: '首次诊断',
          detail: '四个部分各做一次，记录正确率与用时。',
          sourceKind: 'artifact',
          sourceExcerpt: '阅读 28/30 · 听力 25/30 · 写作 22 min（目标 30）· 口语 11 s/题',
        },
        {
          id: 'e3',
          label: '你自己指出的问题',
          detail: '你说「我最怕的是说完就没词了」。',
          sourceKind: 'conversation',
          sourceExcerpt: '「我最怕的是说完就没词了，写反而好一些。」',
        },
      ],
      whatRemains: '不知道「没词」是词汇量问题还是不敢开口。',
      implication:
        '这一步的价值不是结论，是把一个笼统的怕拆成了两个可以分别验证的可能 —— 而下面的两周就是在验证第二个。',
      relatedFocus: '口语 · 流利度',
    },
    {
      id: 'n3',
      kind: 'problem',
      date: 'Sep 18',
      dateNote: '5 周前',
      title: '同一件事卡了两周',
      whatHappened:
        '口语练习连续两周得分很低。每次都答对内容，但都超时。中间换过话题、换过难度，都一样。',
      whatChanged: '「多练就会好」这个假设第一次被数据否掉。',
      evidence: [
        {
          id: 'e4',
          label: '连续 9 次超时',
          detail: '同一题型连续 9 次作答，平均用时超出目标 40%。',
          sourceKind: 'evidence',
          sourceExcerpt: 'Sep 12 – Sep 24 · 9 次作答 · 平均超时 40% · 内容正确率 78%',
          count: 9,
        },
        {
          id: 'e5',
          label: '你开始说「我不知道怎么练这个」',
          detail: '第三次超时之后你说了一句。',
          sourceKind: 'conversation',
          sourceExcerpt: '「我知道答案，但我说不出来的时候不知道该怎么办。」',
        },
      ],
      whatRemains: '「不敢开口」这个猜测还没有被验证过 —— 它只是被提出来了。',
      implication:
        '内容正确率 78% 说明知识没缺。所以后面该试的不是补知识，而是换一个假设。',
      relatedFocus: '口语 · 流利度',
    },
    {
      id: 'n4',
      kind: 'episode',
      date: 'Sep 22',
      dateNote: '4 周前',
      title: '换一个假设：不是没词，是不敢停',
      whatHappened:
        '从「每题必须说完」改成「说满 15 秒就停，不追求完整」。当天第一次没有在 15 秒处卡住。',
      whatChanged: '瓶颈的位置从「词汇」移到了「停顿」。',
      evidence: [
        {
          id: 'e6',
          label: '规则改变后的第一次',
          detail: '改为限时 15 秒，第三题没有出现填充词。',
          sourceKind: 'artifact',
          sourceExcerpt: 'Sep 22 · 5 题 · 平均 14 s · 填充词 0 次（前一周平均 4.7 次）',
        },
        {
          id: 'e7',
          label: '仍然要提示',
          detail: '这 5 题的记录里都有提示 —— 所以还不能算成能力。',
          sourceKind: 'evidence',
          sourceExcerpt: 'independent: false（给过示范句式）',
          independent: false,
        },
      ],
      whatRemains: '全部记录都带着提示，所以还不能算作「他会了」。',
      implication:
        '这一条让「撤除帮助」这件事变得可操作 —— 而它需要系统能看见「这次有没有提示」才谈得上撤。',
      relatedFocus: '口语 · 停顿',
    },
    {
      id: 'n5',
      kind: 'breakthrough',
      date: 'Sep 26',
      dateNote: '3 周前',
      title: '第一次不靠提示连说 45 秒',
      whatHappened:
        '同一套题，第一次在没有示范句式的情况下连说了 45 秒，中间停顿两次但没有切回中文。',
      whatChanged: '「流利度」从「做不到」变成「偶尔做得到」。',
      evidence: [
        {
          id: 'e8',
          label: '独立重建',
          detail: '独立（无提示）+ 时长 45 s + 未切回母语，三个条件同时成立。',
          sourceKind: 'evidence',
          sourceExcerpt: 'Sep 26 · 第 3 题 · 45 s · independent: true',
          independent: true,
        },
        {
          id: 'e9',
          label: '前后的对比',
          detail: '同题型的三次记录。',
          sourceKind: 'artifact',
          sourceExcerpt: '9/22 · 15 s · 有提示\n9/24 · 22 s · 有提示\n9/26 · 45 s · 无提示',
        },
      ],
      whatRemains: '只出现过一次，还不能说是稳定能力。',
      implication:
        '重复「说不出来」的练习价值已经明显下降 —— 它不是不会，是没形成习惯。下一步更值得验证的是这个能力在别的题型上是否也在。',
      relatedFocus: '口语 · 流利度',
    },
    {
      id: 'n6',
      kind: 'return',
      date: 'Sep 29',
      dateNote: '3 周前',
      title: '三周后回来',
      whatHappened:
        '中断了 17 天。回来先做了一套旧题，发现阅读/listening 几乎没有掉，口语掉得最多。',
      whatChanged: '你以为「都忘了」，实际上是「口语先掉」。',
      evidence: [
        {
          id: 'e10',
          label: '中断时长',
          detail: '9/12 之后没有任何记录，直到 9/29。',
          sourceKind: 'evidence',
          sourceExcerpt: 'Sep 12 – Sep 29 · 17 天无记录',
          count: 17,
        },
        {
          id: 'e11',
          label: '回来后的自测',
          detail: '旧题重做，各部分与中断前对比。',
          sourceKind: 'artifact',
          sourceExcerpt: '阅读 -1 · 听力 -2 · 口语 -8 s · 写作 正常',
        },
      ],
      whatRemains: '不知道「掉的」是不是「原来就没稳的」。',
      implication:
        '这周的两周间隔本身是数据：它告诉你这个空间的遗忘速度在口语上明显更快 —— 而这是下一步该练什么的直接依据。',
      relatedFocus: '口语 · 保持',
    },
    {
      id: 'n7',
      kind: 'reflection',
      date: 'Oct 1',
      dateNote: '昨天',
      title: '把「说不出来」和「不敢说」分开',
      whatHappened:
        '你回看了 9/12 之后自己的十几条回答，发现你卡住的地方几乎都在「需要自己造句」而不是「需要回忆」。',
      whatChanged: '诊断结论从「词汇量不够」改成「启动速度不够」。',
      evidence: [
        {
          id: 'e12',
          label: '回看自己的回答',
          detail: '重读 9/12 – 9/24 的 9 条记录，标注每条卡住的位置。',
          sourceKind: 'conversation',
          sourceExcerpt: '9 条记录里，7 条的卡点在需要自造句子的位置；2 条是纯回忆卡住。',
          count: 9,
        },
        {
          id: 'e13',
          label: '你写下的判断',
          detail: '你自己下的结论。',
          sourceKind: 'artifact',
          sourceExcerpt: '「我不是不会，是我开不了口。」',
        },
      ],
      whatRemains: '这个结论只在口语里被验证过。',
      implication:
        '后面该练的东西变了：不是背更多句式，是降低「自己造句」的成本。这个方向的改变比上一个突破更重要，因为它决定接下来三周练什么。',
      relatedFocus: '口语 · 启动速度',
    },
    {
      id: 'n8',
      kind: 'episode',
      date: 'Oct 2',
      dateNote: '今天',
      title: '把 45 秒换到别的题型',
      whatHappened:
        '在综合题上试了一次连说，这次没有在 45 秒停，也没有切回中文，但中间有一次 6 秒的空白。',
      whatChanged: '「流利度」正在从单一题型变成一个跨题型的能力。',
      evidence: [
        {
          id: 'e14',
          label: '跨题型的一次',
          detail: '第一次把 45 秒用到综合题上。',
          sourceKind: 'evidence',
          sourceExcerpt: 'Oct 2 · 综合题第 2 题 · 47 s · independent: true',
          independent: true,
        },
      ],
      whatRemains: '6 秒空白还没有解释 —— 可能是检索，可能是编排句子。',
      implication:
        '如果空白在别的题型上不出现，那么问题就只剩一个：造句。这让下一步变得非常具体。',
      relatedFocus: '口语 · 迁移',
    },
  ],
}

const PHILOSOPHY: TrajectorySpace = {
  id: 'philosophy',
  name: '哲学论文',
  domain: '写作 · 作品驱动',
  current: {
    goal: '完成一篇关于自由意志的论文，并给出可辩护的 thesis',
    currently: '给 thesis 找一个足够强的反驳，而不是一个容易躲开的',
    recentChange:
      '你可以在不依赖例子先行的情况下写出一个可辩护的 thesis。上个月你必须先想例子才知道自己要说什么。',
    whatRemains: '面对「决定论」这一条最强反驳时，回应仍然停在复述而不是回应。',
    span: 'Aug 12 – Oct 2 · 7 周',
    overviewMarks: [
      { id: 'm1', at: 0, label: '开始', kind: 'episode' },
      { id: 'm2', at: 0.22, label: '第一稿', kind: 'artifact' },
      { id: 'm3', at: 0.45, label: '推翻重写', kind: 'direction-shift' },
      { id: 'm4', at: 0.7, label: '反驳', kind: 'artifact' },
      { id: 'm5', at: 1, label: '现在', kind: 'episode' },
    ],
  },
  periods: [
    {
      id: 'p1',
      title: '从主题到 thesis',
      dateRange: 'Aug 12 – Aug 26',
      summary: '两周只做一件事：把「自由意志」缩成一个能被反驳的命题。',
      nodeIds: ['p1n1', 'p1n2'],
    },
    {
      id: 'p2',
      title: '推翻与重写',
      dateRange: 'Aug 27 – Sep 9',
      summary: '第一稿被自己推翻。这件事在时间线上比第一稿更重要。',
      nodeIds: ['p2n1', 'p2n2'],
    },
    {
      id: 'p3',
      title: '让作品经得住反驳',
      dateRange: 'Sep 10 – Oct 2',
      summary: '从「写出来」转到「扛得住」。',
      nodeIds: ['p3n1', 'p3n2', 'p3n3'],
    },
  ],
  milestones: [
    {
      id: 'pms1',
      title: '第一稿存在了三天，然后被自己推翻',
      date: 'Aug 29',
      because: '这是这个空间里第一次「作品」不再是终点而是材料 —— 而它改变了后面七周的做法。',
      kind: 'direction-shift',
      nodeId: 'p2n1',
    },
    {
      id: 'pms2',
      title: 'Thesis 第一次不依赖例子先行',
      date: 'Sep 24',
      because: '这是「能不能自己造出一个可辩护的命题」的分界，与写得好不好无关。',
      kind: 'breakthrough',
      nodeId: 'p3n2',
    },
  ],
  nodes: [
    {
      id: 'p1n1',
      kind: 'episode',
      date: 'Aug 12',
      dateNote: '7 周前',
      title: '从主题缩到一个命题',
      whatHappened:
        '你说「想写关于自由意志的」，之后花了三天把范围缩到「在决定论成立的情况下，何种意义上的自由仍然可能」。',
      whatChanged: '选题从一个领域变成了一个可以被反驳的命题。',
      evidence: [
        {
          id: 'pe1',
          label: '范围的三次收窄',
          detail: '从领域 → 论题 → 可反驳命题。',
          sourceKind: 'conversation',
          sourceExcerpt: '8/12「自由意志」→「决定论下的自由」→「何种意义上仍然可能」',
        },
      ],
      whatRemains: '这个命题还很宽，强反驳还没找到。',
      implication:
        '一个能被反驳的命题才允许你判断它站不站得住 —— 而在此之前你只能判断它读起来好不好。',
      relatedFocus: 'thesis',
    },
    {
      id: 'p1n2',
      kind: 'artifact',
      date: 'Aug 20',
      dateNote: '6 周前',
      title: 'Thesis v1',
      whatHappened: '写下第一版 thesis，两句话，配三个例子。',
      whatChanged: '作品第一次存在，可以被评价了。',
      evidence: [
        {
          id: 'pe2',
          label: '产物 v1',
          detail: '第一版 thesis 全文。',
          sourceKind: 'artifact',
          sourceExcerpt:
            '「自由意志不是不被因果决定，而是在被决定时仍能认同其结果。」—— 配三个例子：职业选择、承诺、犹豫。',
        },
      ],
      whatRemains: '三个例子承担了全部说服力，命题本身还没被检验。',
      implication:
        '例子先行是一种有效的写法，但它掩盖了一个问题：**你到底相不相信这句话，还是只是知道这三个例子。**',
      relatedArtifact: {
        name: 'thesis-v1.md',
        excerpt: '自由意志不是不被因果决定，而是在被决定时仍能认同其结果。',
      },
      relatedFocus: 'thesis',
    },
    {
      id: 'p2n1',
      kind: 'direction-shift',
      date: 'Aug 29',
      dateNote: '5 周前',
      title: '把第一稿推翻',
      whatHappened:
        '你重读 v1，发现「认同」这个词在论文里没有定义，而整句话是靠模糊撑住的。你把它删了。',
      whatChanged: '这个空间的目的从「写完」变成了「写一个扛得住反驳的命题」。',
      evidence: [
        {
          id: 'pe3',
          label: '你自己发现的漏洞',
          detail: '重读时标注出的三处未定义术语。',
          sourceKind: 'artifact',
          sourceExcerpt: 'v1 批注：「认同」未定义 · 「结果」指什么 · 三个例子的共同点是什么',
        },
        {
          id: 'pe4',
          label: '重写而不是修补',
          detail: 'v1 没有被修改，被另存为 v0。',
          sourceKind: 'artifact',
          sourceExcerpt: 'v1 → 归档为 v0；新建 v2（空）',
        },
      ],
      whatRemains: '还没有新的 thesis。',
      implication:
        '推翻一次自己写的东西，是这个空间里发生过的最重要的一件事 —— 它意味着评价标准从「读起来」换成了「扛不扛得住」，而后面七周全部按新标准在做。',
      relatedArtifact: { name: 'thesis-v0.md', excerpt: '（已归档）' },
      relatedFocus: 'thesis',
    },
    {
      id: 'p2n2',
      kind: 'episode',
      date: 'Sep 9',
      dateNote: '3 周前',
      title: 'Thesis v2 成立',
      whatHappened:
        '新 thesis 不再用「认同」，改成「在理由空间里有可选项」。你明确说它不依赖例子先行。',
      whatChanged: '「能不能造出一个可辩护命题」这件事从不确定变成确定。',
      evidence: [
        {
          id: 'pe5',
          label: '产物 v2',
          detail: '第二版 thesis 全文，无例子。',
          sourceKind: 'artifact',
          sourceExcerpt:
            '「自由意志不在于不被决定，而在于理由空间里存在可选项：同一个我，在同一处境下本可以有不同的选择理由。」',
        },
        {
          id: 'pe6',
          label: '写作顺序的改变',
          detail: 'v2 是先写命题再找例子，v1 是反过来的。',
          sourceKind: 'artifact',
          sourceExcerpt: 'v1：例子 → 命题　v2：命题 → 例子',
        },
      ],
      whatRemains: '还没被任何强反驳攻击过。',
      implication:
        '命题自己站住了，于是后面的问题从「我说得对不对」变成「最强的反驳是什么」—— 那是完全不同的一类工作。',
      relatedArtifact: { name: 'thesis-v2.md' },
      relatedFocus: 'thesis',
    },
    {
      id: 'p3n1',
      kind: 'episode',
      date: 'Sep 15',
      dateNote: '2 周前',
      title: '写下第一个反驳',
      whatHappened: '你写出决定论者最强的一条反驳，并把它放进论文而不是脚注。',
      whatChanged: '论文第一次包含了针对自己的内容。',
      evidence: [
        {
          id: 'pe7',
          label: '反驳一节',
          detail: '论文第三节，从脚注升为正文一节。',
          sourceKind: 'artifact',
          sourceExcerpt: '「如果理由本身是被决定的，那么『理由空间里的可选项』只是幻觉。」',
        },
      ],
      whatRemains: '你回应这一条的方式仍然是复述它，而不是回答它。',
      implication:
        '把反驳放进正文是一个结构决定：它让「论文扛不扛得住」变成一个可以被观察的事，而不是一种感觉。',
      relatedFocus: 'counterargument',
    },
    {
      id: 'p3n2',
      kind: 'breakthrough',
      date: 'Sep 24',
      dateNote: '1 周前',
      title: '第一次不靠例子就写出可辩护的 thesis',
      whatHappened:
        '在讨论「兼容性论证」时，你直接写出了一个反直觉的 thesis 并当场给出理由，过程中没有找例子。',
      whatChanged: '「先想例子才知道自己要说什么」这个习惯不再成立了。',
      evidence: [
        {
          id: 'pe8',
          label: '独立构造',
          detail: '无例子先行，独立产出。',
          sourceKind: 'evidence',
          sourceExcerpt: 'Sep 24 · 独立构造 thesis v3 · 无例子 · independent: true',
          independent: true,
        },
        {
          id: 'pe9',
          label: '和 v2 的差别',
          detail: '同一命题的第三次表述。',
          sourceKind: 'artifact',
          sourceExcerpt: 'v2（8 周前）：需要例子支撑\nv3（本周）：理由自足',
        },
      ],
      whatRemains: 'v3 还没有被写进论文。',
      implication:
        '这条能力是可以在别的命题上复用的 —— 所以接下来该拿它去攻一条真正难的反驳，而不是继续打磨措辞。',
      relatedFocus: 'thesis',
    },
    {
      id: 'p3n3',
      kind: 'reflection',
      date: 'Oct 2',
      dateNote: '今天',
      title: '意识到自己在回避最强的那条',
      whatHappened:
        '你回看了自己三次写反驳的尝试，发现三次都选了容易回应的那条，从没碰决定论的核心版本。',
      whatChanged: '「缺什么」从「缺材料」变成「缺愿意正面处理的困难」。',
      evidence: [
        {
          id: 'pe10',
          label: '三次尝试',
          detail: '三次选中的反驳及其难度。',
          sourceKind: 'artifact',
          sourceExcerpt:
            '9/15 · 版本 A（你在正文里给它降权）\n9/18 · 版本 B（你后来自己删了）\n9/22 · 版本 A′（A 的改写）',
          count: 3,
        },
        {
          id: 'pe11',
          label: '你写下的判断',
          detail: '你自己下的结论。',
          sourceKind: 'artifact',
          sourceExcerpt: '「三次都在躲。」',
        },
      ],
      whatRemains: '还没有面对核心版本。',
      implication:
        '接下来最有价值的一步不是写第四个反驳，而是决定要不要碰那条最难的 —— 而这个决定本身比写任何东西都重要。',
      relatedFocus: 'counterargument',
    },
  ],
}

const LINEAR_ALGEBRA: TrajectorySpace = {
  id: 'linear-algebra',
  name: '线性代数 · 特征值',
  domain: '理解 · 从模糊到独立',
  current: {
    goal: '真正理解特征值与特征向量，而不是会算',
    currently: '验证 eigenbasis 的理解能不能迁移到非对称矩阵',
    recentChange:
      '你能自己构造一个给定特征值的矩阵，而不是从定义往回凑 —— 这意味着理解已经不只是识别。',
    whatRemains: '同样的构造在非对称矩阵上做不出来；「为什么对称性重要」还只是背下来的。',
    span: 'Aug 20 – Oct 1 · 6 周',
    overviewMarks: [
      { id: 'm1', at: 0, label: '开始', kind: 'episode' },
      { id: 'm2', at: 0.2, label: '第一次尝试', kind: 'episode' },
      { id: 'm3', at: 0.45, label: '独立重建', kind: 'breakthrough' },
      { id: 'm4', at: 0.72, label: '迁移卡住', kind: 'problem' },
      { id: 'm5', at: 1, label: '现在', kind: 'episode' },
    ],
  },
  periods: [
    {
      id: 'l1',
      title: '定义与第一次尝试',
      dateRange: 'Aug 20 – Sep 2',
      summary: '两周在同一个概念上，第一次尝试就暴露了理解的形状。',
      nodeIds: ['l1n1', 'l1n2'],
    },
    {
      id: 'l2',
      title: '从复述到独立重建',
      dateRange: 'Sep 3 – Sep 20',
      summary: '这一段是这个空间的主线，也是最清楚的一次变化。',
      nodeIds: ['l2n1', 'l2n2'],
    },
    {
      id: 'l3',
      title: '迁移与新方向',
      dateRange: 'Sep 21 – Oct 1',
      summary: '会了之后立刻遇到它不成立的地方。',
      nodeIds: ['l3n1', 'l3n2'],
    },
  ],
  milestones: [
    {
      id: 'lms1',
      title: '第一次独立重建 Av 的含义',
      date: 'Sep 12',
      because:
        '此前所有正确的回答都发生在读过定义或看过例子之后。这次的记录里两者都没有。',
      kind: 'breakthrough',
      nodeId: 'l2n1',
    },
    {
      id: 'lms2',
      title: '第一次迁移失败',
      date: 'Sep 26',
      because: '它证明了「独立重建」只覆盖了熟悉的形式，而不覆盖概念本身。',
      kind: 'direction-shift',
      nodeId: 'l3n1',
    },
  ],
  nodes: [
    {
      id: 'l1n1',
      kind: 'episode',
      date: 'Aug 20',
      dateNote: '6 周前',
      title: '说不清「特征向量」是什么',
      whatHappened:
        '你打开空间说「我大概知道特征值是那个……特征向量是不被拉伸的那个？」自己先否定了。',
      whatChanged: '起点被明确成一个可测的东西：现在的理解有多模糊。',
      evidence: [
        {
          id: 'le1',
          label: '你的第一次表述',
          detail: '原始表述与自我修正都在记录里。',
          sourceKind: 'conversation',
          sourceExcerpt: '「特征向量是不被拉伸的那个？」→「我不太确定」，',
        },
      ],
      whatRemains: '「不被拉伸」这个说法对某些情况成立，但那不是定义。',
      implication:
        '起点写下来是有用的 —— 它让六周后能比较，而不能比较的起点等于没有起点。',
      relatedFocus: '特征值与特征向量',
    },
    {
      id: 'l1n2',
      kind: 'problem',
      date: 'Sep 1',
      dateNote: '5 周前',
      title: '算得出，说不清',
      whatHappened:
        '你完成了 14 道特征值计算题，正确率很高。但被问「为什么特征向量不被拉伸」时，你重述了定义。',
      whatChanged: '「会算」与「理解」之间的差距第一次被测量出来。',
      evidence: [
        {
          id: 'le2',
          label: '14 道计算题',
          detail: '正确率与难度分布。',
          sourceKind: 'evidence',
          sourceExcerpt: 'Aug 22 – Sep 1 · 14 题 · 正确率 93% · 3 题为三阶',
          count: 14,
        },
        {
          id: 'le3',
          label: '解释时的记录',
          detail: '同一周的一道解释题。',
          sourceKind: 'conversation',
          sourceExcerpt: '问：为什么 Av = λv？答：「因为 λ 就是那个……特征值。」',
        },
      ],
      whatRemains: '这个差距没有名字 —— 你不知道缺的是什么。',
      implication:
        '「算得出说��清」是一个状态，不是一个失败 —— 而它无法被当前的记录方式表达，因为记录只存对错。',
      relatedFocus: '特征值与特征向量',
    },
    {
      id: 'l2n1',
      kind: 'breakthrough',
      date: 'Sep 12',
      dateNote: '3 周前',
      title: '第一次独立重建 Av 的含义',
      whatHappened:
        '被问「A 作用在 v 上会怎样」时，你从「v 缩放后仍沿着同一条线」讲起，然后自己接上「所以 v 必须落在 A 留下的方向上」。',
      whatChanged: '从复述定义变成自己重建，并接上了下一步的推论。',
      evidence: [
        {
          id: 'le4',
          label: '独立重建',
          detail: '无定义可查、无例子在旁。',
          sourceKind: 'evidence',
          sourceExcerpt: 'Sep 12 · 独立重建 · 无提示 · independent: true',
          independent: true,
        },
        {
          id: 'le5',
          label: '你的原话',
          detail: '重建过程的转录。',
          sourceKind: 'conversation',
          sourceExcerpt:
            '「A 作用在 v 上，v 会被缩放，但方向不变。方向不变意味着 A 把它留在了自己那条线上 —— 所以 v 必须落在 A 留下的方向上。」',
        },
      ],
      whatRemains: '只在二维、三角矩阵上做过。',
      implication:
        '这条变化的价值在于它可以被复用 —— 所以接下来该问的不是「再解释一次」，而是「它还能用在哪」。',
      relatedFocus: '特征值与特征向量',
    },
    {
      id: 'l2n2',
      kind: 'artifact',
      date: 'Sep 18',
      dateNote: '2 周前',
      title: '写下自己的说明页',
      whatHappened:
        '把整个概念用自己的话写成一页，贴在空间里，作为之后判断对错的基准。',
      whatChanged: '评价标准从「书上怎么说」换成了「我自己怎么说」。',
      evidence: [
        {
          id: 'le6',
          label: '产物',
          detail: '一页的完整说明。',
          sourceKind: 'artifact',
          sourceExcerpt:
            '「特征向量是 A 留下来的方向。特征值是它被缩放的比例。方向变了就不是特征向量；比例可以是负数或零。」',
        },
      ],
      whatRemains: '这一页是关于对称矩阵写的。',
      implication:
        '把理解写成产物有一个副作用：它会变成可以被推翻的对象 —— 而这正是接下来发生的事。',
      relatedArtifact: {
        name: 'eigen-notes.md',
        excerpt: '特征向量是 A 留下来的方向。',
      },
      relatedFocus: '特征值与特征向量',
    },
    {
      id: 'l3n1',
      kind: 'problem',
      date: 'Sep 26',
      dateNote: '1 周前',
      title: '同样的构造在非对称矩阵上做不出来',
      whatHappened:
        '用一个非对称矩阵重做 9/12 那道题，做不出来。你意识到那一页的说明是关于对称矩阵的，不是关于特征向量的。',
      whatChanged: '「我理解了特征向量」被修正为「我理解了对称矩阵下的情形」。',
      evidence: [
        {
          id: 'le7',
          label: '迁移失败的一次',
          detail: '同一构造，换矩阵类型。',
          sourceKind: 'artifact',
          sourceExcerpt:
            '9/12 · 对称矩阵 · 能重建\n9/26 · 非对称矩阵 · 同一构造做不出来',
        },
        {
          id: 'le8',
          label: '你写下的判断',
          detail: '你自己下的结论。',
          sourceKind: 'conversation',
          sourceExcerpt: '「我一直在写对称的，把它当成了定义。」',
        },
      ],
      whatRemains: '非对称情形下的 eigenbasis 还不成立。',
      implication:
        '这是整条轨迹里最有用的一次失败：它把「理解」这个词从一个状态变成了一个范围，而范围是可以继续做的。',
      relatedFocus: '对称性',
    },
    {
      id: 'l3n2',
      kind: 'episode',
      date: 'Oct 1',
      dateNote: '昨天',
      title: '从给定特征值反向构造矩阵',
      whatHappened:
        '被要求「造一个特征值是 3 的 2×2 矩阵」时，你先想该放哪条特征向量，再倒推回去。',
      whatChanged: '理解从「识别」变成了「构造」—— 而构造要求你真的知道它在解什么问题。',
      evidence: [
        {
          id: 'le9',
          label: '一次成功的构造',
          detail: '无提示，独立完成。',
          sourceKind: 'evidence',
          sourceExcerpt: 'Oct 1 · 自主构造 · independent: true',
          independent: true,
        },
        {
          id: 'le10',
          label: '思路转录',
          detail: '你说的话。',
          sourceKind: 'conversation',
          sourceExcerpt: '「我得先想好 v 是什么，然后让 A 把 v 送到 3v 上去 —— A 在别的地方做什么都行。」',
        },
      ],
      whatRemains: '同样的构造在非对称矩阵上还做不到。',
      implication:
        '这说明理解已经不只是「认出特征向量」而是「知道该往哪里放东西」—— 而它给了下一步一个明确的问题：非对称情形下这条思路哪里断了。',
      relatedFocus: '特征值与特征向量',
    },
  ],
}

export const TRAJECTORY_SPACES: TrajectorySpace[] = [TOEFL, PHILOSOPHY, LINEAR_ALGEBRA]

export const DEFAULT_SPACE_ID = TOEFL.id
