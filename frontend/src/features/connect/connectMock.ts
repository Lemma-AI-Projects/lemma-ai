import type {
  ConnectAssistant,
  ConnectFeedItem,
  ConnectMember,
  ConnectPage,
  ConnectPageContent,
  ConnectPartition,
  ConnectPartitionId,
} from './types'

// 原型数据。全部是编的，界面上有一枚「mock」标记（见 ConnectShell），
// 不要当成真实能力读。形状对齐 types.ts，将来换成真接口时只改这里。
//
// 每个页（Public Hall / UCLA / 2026 级 13 班）下面按 Classroom / Project 分两区，
// 两区各有自己的 Feed / 成员 / 聊天 / 成就 —— 右侧小菜单切的是「看哪一块」，
// 分区切的是「在哪一区里看」。

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const now = Date.now()

const at = (msAgo: number) => new Date(now - msAgo).toISOString()

function member(
  id: string,
  name: string,
  color: string,
  headline: string,
  role: ConnectMember['role'] = 'member',
  online = false
): ConnectMember {
  return { id, name, color, headline, role, online }
}

const ceaser = member('m-ceaser', 'Ceaser', '#FF8F50', '本科·计算机，转行做前端', 'member', true)
const lin = member('m-lin', '林可', '#6C8AE4', 'UCLA 应用数学 · 大二', 'member', true)
const zhao = member('m-zhao', '赵一鸣', '#4FB286', '2026 级 13 班 · 数学课代表', 'member')
const wang = member('m-wang', '王叙', '#C97BD1', '在做特征值可视化', 'member', true)
const chen = member('m-chen', '陈默', '#E4A15C', '线代助教 · 负责答疑', 'owner')
const lemma = member('m-lemma', 'Lemma 助手', '#3F3F46', '这个页的专属助手（mock）', 'assistant', true)
const an = member('m-an', '安和', '#8B7BD8', '在读 Rudin')
const song = member('m-song', '宋野', '#5FBF9F', '组会讲过一次泛函')
const qiu = member('m-qiu', '邱实', '#7C9CD9', '坐在最后一排')
const luo = member('m-luo', '罗青', '#D18C6C', '负责班级资料')
const xu = member('m-xu', '徐岸', '#5AA9C9', '刚加入')
const he = member('m-he', '何夕', '#D97C7C', '在准备期末')

function feedItem(overrides: Partial<ConnectFeedItem> & Pick<ConnectFeedItem, 'id' | 'kind' | 'body'>): ConnectFeedItem {
  return {
    author: lin,
    createdAt: at(3 * HOUR),
    title: null,
    tags: [],
    reactions: [],
    commentCount: 0,
    pinned: false,
    ...overrides,
  }
}

const publicHall: ConnectPage = {
  id: 'public-hall',
  name: 'Public Hall',
  kind: 'hall',
  subtitle: '公共大厅 · 所有人可见',
  color: '#3F3F46',
  memberCount: 1284,
  ownedByMe: false,
}

const ucla: ConnectPage = {
  id: 'ucla-math',
  name: 'UCLA 数学兴趣小组',
  kind: 'group',
  subtitle: '兴趣小组 · 18 人',
  color: '#6C8AE4',
  memberCount: 18,
  ownedByMe: true,
}

const class13: ConnectPage = {
  id: 'class-2026-13',
  name: '2026 级 13 班',
  kind: 'class',
  subtitle: '班级空间 · 42 人',
  color: '#4FB286',
  memberCount: 42,
  ownedByMe: true,
}

const assistantOf = (page: ConnectPage): ConnectAssistant => ({
  name: 'Lemma 助手',
  note: `带「${page.name}」的上下文与你的个人画像，与 global agent 不是同一个`,
})

function partition(
  id: ConnectPartitionId,
  name: string,
  subtitle: string,
  body: Pick<ConnectPartition, 'feed' | 'members' | 'messages' | 'achievements'>
): ConnectPartition {
  return { id, name, subtitle, ...body }
}

// —— Public Hall ——

const publicClassroom = partition('classroom', 'Classroom', '线性代数 · 2026 春 · 周三 3-4 节', {
  feed: [
    feedItem({
      id: 'ph-c-1',
      kind: 'announcement',
      author: chen,
      title: '本周主题：特征值与特征向量',
      body: '这周大家一起啃特征值。欢迎把自己的理解、踩过的坑、画过的图丢进来，形式不限。',
      tags: ['本周主题'],
      reactions: [{ emoji: '👍', count: 42 }, { emoji: '🔥', count: 11 }],
      commentCount: 16,
      pinned: true,
      createdAt: at(6 * HOUR),
    }),
    feedItem({
      id: 'ph-c-2',
      kind: 'question',
      author: zhao,
      title: '为什么特征向量方向不变？',
      body: '矩阵乘法大多数时候会把向量转走，为什么偏偏这几个方向只被拉伸？有没有不靠公式的讲法。',
      tags: ['特征值', '求解释'],
      reactions: [{ emoji: '🙋', count: 8 }],
      commentCount: 23,
      createdAt: at(9 * HOUR),
    }),
    feedItem({
      id: 'ph-c-3',
      kind: 'note',
      author: ceaser,
      body: '今天终于把「相似矩阵」和「同一个变换换基」对上号了 —— 之前一直把这两件事当成两个知识点背。',
      tags: ['今日收获'],
      reactions: [{ emoji: '💡', count: 12 }],
      commentCount: 4,
      createdAt: at(30 * MINUTE),
    }),
  ],
  members: [chen, lin, zhao, ceaser, xu],
  messages: [
    {
      id: 'ph-c-m1',
      author: chen,
      body: '今晚 8 点开个 20 分钟快问快答，主题还是特征值。',
      createdAt: at(5 * HOUR),
      fromMe: false,
    },
    { id: 'ph-c-m2', author: ceaser, body: '收到，我把卡住的那道题带过来。', createdAt: at(3 * HOUR), fromMe: true },
  ],
  achievements: [
    { id: 'ph-c-a1', title: '连续 7 天', description: '连续 7 天有产出', glyph: '7', earnedAt: at(3 * DAY), progress: null },
    { id: 'ph-c-a2', title: '被采纳', description: '回答被提问者采纳 5 次', glyph: '★', earnedAt: null, progress: { current: 3, total: 5 } },
  ],
})

const publicProject = partition('project', 'Project', '特征值可视化 · 三人协作', {
  feed: [
    feedItem({
      id: 'ph-p-1',
      kind: 'resource',
      author: wang,
      title: '一个把特征向量画出来的小工具',
      body: '拖一个向量，看它被同一个矩阵反复作用之后怎么收敛到特征方向。适合先建立直觉再看证明。',
      tags: ['可视化', '工具'],
      reactions: [{ emoji: '⭐', count: 31 }, { emoji: '👀', count: 19 }],
      commentCount: 7,
      pinned: true,
      createdAt: at(2 * DAY),
    }),
    feedItem({
      id: 'ph-p-2',
      kind: 'achievement',
      author: lin,
      title: '林可 拿到了「连续 7 天」',
      body: '在 Public Hall 连续 7 天有产出（笔记 / 提问 / 回答任一）。',
      tags: ['成就'],
      reactions: [{ emoji: '🎉', count: 26 }],
      commentCount: 5,
      createdAt: at(3 * DAY),
    }),
    feedItem({
      id: 'ph-p-3',
      kind: 'note',
      author: ceaser,
      body: '第一版动画跑通了：拖动向量能看到它一步步转到特征方向。下周补上「复特征值」那一种情况。',
      tags: ['进度'],
      reactions: [{ emoji: '🚀', count: 9 }],
      commentCount: 2,
      createdAt: at(90 * MINUTE),
    }),
  ],
  members: [wang, lin, ceaser, lemma],
  messages: [
    { id: 'ph-p-m1', author: wang, body: '动画那版我推到分支上了，你看看手感。', createdAt: at(4 * HOUR), fromMe: false },
    { id: 'ph-p-m2', author: ceaser, body: '看了，复特征值那块我来补。', createdAt: at(2 * HOUR), fromMe: true },
    { id: 'ph-p-m3', author: lemma, body: '（助手）已把这周的 3 个高频问题整理进本区。', createdAt: at(1 * HOUR), fromMe: false },
  ],
  achievements: [
    { id: 'ph-p-a1', title: '首个回答', description: '第一次回答别人的提问', glyph: '答', earnedAt: at(9 * DAY), progress: null },
    { id: 'ph-p-a2', title: '引路人', description: '带 3 位同学加入空间', glyph: '路', earnedAt: null, progress: { current: 1, total: 3 } },
  ],
})

// —— UCLA 数学兴趣小组 ——

const uclaClassroom = partition('classroom', 'Classroom', '泛函分析读书会 · 每周六', {
  feed: [
    feedItem({
      id: 'uc-c-1',
      kind: 'note',
      author: lin,
      title: '组会纪要 · 第 6 次',
      body: '这次讲完了紧集与连续映射。下次轮到宋野讲一致连续，先读 Rudin 4.19–4.26。',
      tags: ['组会', '纪要'],
      reactions: [{ emoji: '📌', count: 6 }],
      commentCount: 3,
      pinned: true,
      createdAt: at(20 * HOUR),
    }),
    feedItem({
      id: 'uc-c-2',
      kind: 'question',
      author: an,
      body: '一致连续和连续的区别，有没有一个"看着就不一样"的例子？我总觉得定义差一点点。',
      tags: ['分析', '求解释'],
      reactions: [{ emoji: '🙋', count: 4 }],
      commentCount: 9,
      createdAt: at(28 * HOUR),
    }),
  ],
  members: [lin, an, song, ceaser],
  messages: [{ id: 'uc-c-m1', author: lin, body: '周六下午 3 点，老地方。', createdAt: at(26 * HOUR), fromMe: false }],
  achievements: [
    { id: 'uc-c-a1', title: '首次开讲', description: '在组会里讲过一次', glyph: '讲', earnedAt: at(12 * DAY), progress: null },
  ],
})

const uclaProject = partition('project', 'Project', 'Rudin 习题集 · 共同维护', {
  feed: [
    feedItem({
      id: 'uc-p-1',
      kind: 'resource',
      author: wang,
      body: '整理了一份「本组读过的书 + 各自笔记」的索引，放在这里，新人可以直接从第 1 本接上。',
      tags: ['索引', '新人友好'],
      reactions: [{ emoji: '⭐', count: 9 }],
      commentCount: 2,
      pinned: true,
      createdAt: at(4 * DAY),
    }),
    feedItem({
      id: 'uc-p-2',
      kind: 'note',
      author: song,
      body: '第 4 章习题做到 4.22，卡在 4.20 的构造上，谁先做出来喊一声。',
      tags: ['进度'],
      reactions: [{ emoji: '🤝', count: 3 }],
      commentCount: 4,
      createdAt: at(30 * HOUR),
    }),
  ],
  members: [song, an, wang],
  messages: [{ id: 'uc-p-m1', author: song, body: '4.20 我想通了，晚上把过程写进索引。', createdAt: at(22 * HOUR), fromMe: false }],
  achievements: [
    { id: 'uc-p-a1', title: '读书如流水', description: '读完 5 本指定读物', glyph: '书', earnedAt: null, progress: { current: 2, total: 5 } },
  ],
})

// —— 2026 级 13 班 ——

const class13Classroom = partition('classroom', 'Classroom', '期末复习 · 每天一章', {
  feed: [
    feedItem({
      id: 'c13-c-1',
      kind: 'announcement',
      author: zhao,
      title: '期末复习安排',
      body: '下周三开始按章节过一遍，每天一章，晚上 7 点在教室。有想讲的章节直接在下面认领。',
      tags: ['期末', '安排'],
      reactions: [{ emoji: '👍', count: 21 }],
      commentCount: 11,
      pinned: true,
      createdAt: at(11 * HOUR),
    }),
    feedItem({
      id: 'c13-c-2',
      kind: 'achievement',
      author: ceaser,
      body: '把第 3 章的错题全部订正完了，终于不再错同一种。',
      tags: ['成就', '今日收获'],
      reactions: [{ emoji: '🎉', count: 14 }],
      commentCount: 3,
      createdAt: at(40 * MINUTE),
    }),
  ],
  members: [zhao, qiu, ceaser, he],
  messages: [{ id: 'c13-c-m1', author: zhao, body: '认领表我贴教室后墙了，还剩第 5、6 章没人。', createdAt: at(10 * HOUR), fromMe: false }],
  achievements: [
    { id: 'c13-c-a1', title: '一题不落', description: '整章错题订正完成', glyph: '✓', earnedAt: at(40 * MINUTE), progress: null },
    { id: 'c13-c-a2', title: '复习全勤', description: '连续参加 10 次复习', glyph: '勤', earnedAt: null, progress: { current: 6, total: 10 } },
  ],
})

const class13Project = partition('project', 'Project', '真题重组计划 · 按知识点刷', {
  feed: [
    feedItem({
      id: 'c13-p-1',
      kind: 'resource',
      author: luo,
      body: '把老师发的 3 份真题按知识点重新排了一遍，同一类的放一起，方便按弱点刷。',
      tags: ['真题', '资料'],
      reactions: [{ emoji: '⭐', count: 17 }],
      commentCount: 6,
      pinned: true,
      createdAt: at(2 * DAY),
    }),
    feedItem({
      id: 'c13-p-2',
      kind: 'question',
      author: qiu,
      body: '概率那部分的真题要不要也拆出来单独一份？感觉和前面几章混在一起很难按弱点刷。',
      tags: ['提议'],
      reactions: [{ emoji: '👍', count: 8 }],
      commentCount: 5,
      createdAt: at(7 * HOUR),
    }),
  ],
  members: [luo, qiu, ceaser],
  messages: [{ id: 'c13-p-m1', author: luo, body: '概率那份我拆好了，链接更新在 Feed 里。', createdAt: at(6 * HOUR), fromMe: false }],
  achievements: [
    { id: 'c13-p-a1', title: '整理者', description: '贡献一份被大家用起来的资料', glyph: '整', earnedAt: null, progress: { current: 1, total: 1 } },
  ],
})

export const connectPageContents: ConnectPageContent[] = [
  { page: publicHall, assistant: assistantOf(publicHall), partitions: [publicClassroom, publicProject] },
  { page: ucla, assistant: assistantOf(ucla), partitions: [uclaClassroom, uclaProject] },
  { page: class13, assistant: assistantOf(class13), partitions: [class13Classroom, class13Project] },
]

export const connectDefaultPageId = publicHall.id

export function getConnectPageContent(pageId: string): ConnectPageContent {
  return connectPageContents.find((content) => content.page.id === pageId) ?? connectPageContents[0]
}
