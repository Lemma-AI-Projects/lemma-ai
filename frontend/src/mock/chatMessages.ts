export interface ChatMessage {
  role: 'user' | 'assistant'
  message: string
  date: string
}

export const chatMessages: Record<string, ChatMessage[]> = {
  '1': [
    {
      role: 'user',
      message: '你能用直观一点的方式解释一下什么是反向传播吗？我总觉得它和链式法则之间的关系很抽象。',
      date: '2025-03-10T14:23:00',
    },
    {
      role: 'assistant',
      message: '可以把反向传播理解成“误差责任追踪”。模型先前向计算得到结果，再把最终误差从输出层往回分配给每一层参数。链式法则的作用就是把“后面这一层的变化会如何影响最终损失”逐层乘回去，所以每个权重都能知道自己应该往哪个方向调整、调整多少。',
      date: '2025-03-10T14:23:22',
    },
    {
      role: 'user',
      message: '那为什么深层网络里经常会出现梯度消失？如果真的消失了，训练时一般怎么缓解？',
      date: '2025-03-10T14:24:03',
    },
    {
      role: 'assistant',
      message: '梯度消失通常发生在反向传播时，很多层的导数连续相乘后变得非常小，越靠前的层拿到的更新信号就越弱。常见缓解方式包括使用 ReLU 这类更稳定的激活函数、合理初始化参数、加入残差连接、使用归一化层，以及在循环网络里改用 LSTM/GRU 等结构。',
      date: '2025-03-10T14:24:31',
    },
  ],
  '2': [
    {
      role: 'user',
      message: 'React 里的 useEffect cleanup 到底什么时候会执行？是只有组件卸载时才会跑吗？',
      date: '2025-03-11T09:12:00',
    },
    {
      role: 'assistant',
      message: '不只是卸载时。cleanup 会在两种情况下执行：一是组件卸载前，二是 effect 依赖变化、React 准备重新执行这个 effect 之前。也就是说，上一次 effect 产生的副作用会先被清理，再运行下一次 effect。',
      date: '2025-03-11T09:12:19',
    },
    {
      role: 'user',
      message: '如果 effect 里发了一个 fetch 请求，cleanup 需要做什么？是不是一定要取消请求？',
      date: '2025-03-11T09:13:01',
    },
    {
      role: 'assistant',
      message: '严格来说不是每次都“必须”取消，但如果请求结果可能在组件卸载后再返回，最好在 cleanup 里通过 AbortController 取消，或者至少忽略过期响应。这样可以避免状态更新打到已经失效的组件，也能减少并发请求造成的数据错位。',
      date: '2025-03-11T09:13:35',
    },
  ],
  '3': [
    {
      role: 'user',
      message: 'SQL 里 INNER JOIN、LEFT JOIN、RIGHT JOIN、FULL JOIN 的区别能不能用一个统一的例子讲清楚？',
      date: '2025-03-12T16:05:00',
    },
    {
      role: 'assistant',
      message: '可以用“学生表”和“选课表”来理解。INNER JOIN 只保留两边都匹配上的记录；LEFT JOIN 保留左表全部记录，没有匹配时右表列为 NULL；RIGHT JOIN 相反，保留右表全部记录；FULL JOIN 则把两边所有记录都保留，哪边没匹配上，另一边就补 NULL。',
      date: '2025-03-12T16:05:28',
    },
    {
      role: 'user',
      message: '那我在一对多表上 JOIN 之后经常出现重复行，这算正常吗？通常该怎么处理？',
      date: '2025-03-12T16:06:10',
    },
    {
      role: 'assistant',
      message: '这是正常现象，因为主表的一条记录会和子表中的多条记录分别匹配，结果自然会展开成多行。处理方式取决于你的目标：如果只想聚合统计，可以先 GROUP BY；如果只想拿一条代表记录，可以配合窗口函数或子查询；如果只是误把明细结果当成唯一结果看了，就需要重新确认 JOIN 的业务语义。',
      date: '2025-03-12T16:06:46',
    },
  ],
  '4': [
    {
      role: 'user',
      message: 'Big-O notation 到底是在描述什么？我知道它和效率有关，但总觉得概念很虚。',
      date: '2025-03-13T11:40:00',
    },
    {
      role: 'assistant',
      message: 'Big-O 描述的是当输入规模不断增大时，算法运行成本会怎样增长。它不关心一次具体运行是 3ms 还是 5ms，而更关注“数据量翻倍之后会变慢多少”。所以 O(n)、O(log n)、O(n^2) 本质上是在比较增长趋势，而不是比较某次运行的绝对时间。',
      date: '2025-03-13T11:40:21',
    },
    {
      role: 'user',
      message: '那为什么二分查找是 O(log n)？还有数组尾部 append 为什么经常说是 O(1)？',
      date: '2025-03-13T11:41:03',
    },
    {
      role: 'assistant',
      message: '二分查找每次都会把搜索范围缩小一半，所以问题规模从 n 变成 n/2、n/4、n/8，直到缩到 1，总步数就是对数级别。数组尾部 append 之所以常写成 O(1)，是因为大多数时候只是在末尾放入元素；虽然偶尔会触发扩容并复制旧数据，但把这些偶发成本均摊后，平均每次追加仍然可以看作摊还 O(1)。',
      date: '2025-03-13T11:41:39',
    },
  ],
  '5': [
    {
      role: 'user',
      message: 'Transformer architecture 的核心结构是什么？为什么后来很多任务都不用 RNN 而改用它了？',
      date: '2025-03-14T20:18:00',
    },
    {
      role: 'assistant',
      message: 'Transformer 的核心是 self-attention、前馈网络、残差连接和层归一化。相比 RNN 必须按时间步串行处理，Transformer 可以并行处理整段序列，还能直接建模远距离 token 之间的关系，因此训练效率更高、长程依赖建模也更强。',
      date: '2025-03-14T20:18:24',
    },
    {
      role: 'user',
      message: 'self-attention 和 multi-head attention 是什么关系？另外如果没有位置编码，会发生什么问题？',
      date: '2025-03-14T20:19:07',
    },
    {
      role: 'assistant',
      message: 'self-attention 是让序列中的每个位置都去关注同一序列里的其他位置；multi-head attention 则是在不同子空间里并行做多次 attention，让模型同时学习多种关系。没有位置编码时，模型只能看到 token 集合，却不知道它们的先后顺序，像“猫追狗”和“狗追猫”这种句子就很难区分。',
      date: '2025-03-14T20:19:42',
    },
  ],
}
