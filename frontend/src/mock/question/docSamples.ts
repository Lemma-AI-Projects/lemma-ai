// 文档样例 fixture（F01–F12、F16）：由 ./raw/*.html 按提案契约（src/types/question.ts）转写，
// 模拟后端解析器应当产出的结果。原始 HTML 留在 raw/ 作对照；后端解析器上线后，
// 用它对同一批 raw 的真实输出替换本文件，这里只是测试期望，不是第二份真相。
//
// 以下取值是 fixture 假设，不是学科网或后端给出的事实：typeName / courseName（按样例内容推测）、
// select（这些样例按单选处理）、F10 的 reuse（按七选五惯例取 exclusive）、F05 不对齐参考答案
// （三条答案是"任选其一"的整句示例，见方案 §1.3 第 4 条）。
import type { QuestionFixture } from './types'

/** 原始 HTML：raw/f01-chinese-idiom-single.html */
export const f01ChineseIdiomSingle: QuestionFixture = {
  view: {
    id: "q_f01",
    contentVersion: "fixture-v1",
    structure: "parsed",
    numbering: "none",
    stem: {
      html: "<p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">下列句子中加点词语</span><span style=\"font-family: 宋体;\" wave=\"\">运用恰当</span><span style=\"font-family: 宋体;\">的是（<span style=\"font-family: &#x27;Times New Roman&#x27;\" qml-space-size=\"3\">     </span>）</span></p>\n        <span data-og-id=\"q_f01:og1\"></span>"
    },
    slots: [
      {
        id: "q_f01:bk",
        mechanism: "choice",
        grading: "auto",
        optionGroupId: "q_f01:og1",
        select: "single",
        blank: null,
        anchored: false
      }
    ],
    optionGroups: [
      {
        id: "q_f01:og1",
        options: [
          {
            id: "q_f01:og1:A",
            label: "A",
            content: {
              html: "<span style=\"font-family: 宋体;\">一曲《春江花月夜》</span><span style=\"font-family: 宋体;\" em=\"\">轻歌曼舞</span><span style=\"font-family: 宋体;\">，让人觉得意犹未尽。</span>"
            }
          },
          {
            id: "q_f01:og1:B",
            label: "B",
            content: {
              html: "<span style=\"font-family: 宋体;\">仙女们</span><span style=\";font-family: 宋体;\" em=\"\">余音绕梁</span><span style=\"font-family: 宋体;\">，婀娜多姿，把幸福的花瓣撒向人间。</span>"
            }
          },
          {
            id: "q_f01:og1:C",
            label: "C",
            content: {
              html: "<span style=\"font-family: 宋体;\">殿内泥塑的舜帝坐像，头戴冕旒，身着衮服，神态庄严，</span><span style=\"font-family: 宋体;\" em=\"\">栩栩如生</span><span style=\"font-family: 宋体;\">。</span>"
            }
          },
          {
            id: "q_f01:og1:D",
            label: "D",
            content: {
              html: "<span style=\"font-family: 宋体;\">他的文章</span><span style=\"font-family: 宋体;\" em=\"\">高山流水</span><span style=\"font-family: 宋体;\">，不拘一格。</span>"
            }
          }
        ],
        cols: 1,
        layout: "table",
        reuse: null,
        anchored: true
      }
    ],
    subQuestions: [],
    media: [],
    meta: {
      source: {
        provider: "xkw",
        externalId: "doc-sample-f01",
        sourceKind: "premium"
      },
      typeId: null,
      typeName: "单选题",
      difficulty: null,
      difficultyLevel: null,
      knowledgePoints: [],
      years: [],
      sourcePapers: [],
      courseName: "初中语文"
    },
    raw: null
  },
  review: {
    questionId: "q_f01",
    contentVersion: "fixture-v1",
    referenceAnswers: [
      {
        slotId: "q_f01:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f01:og1:C"
          ]
        }
      }
    ],
    answerFallback: null,
    explanation: [
      {
        name: "详解",
        content: {
          html: "<p style=\"\"><span style=\"font-family: 宋体;\" u=\"\">本题考查学生对具体语境中成语的运用正误的辨析能力。</span></p>\n            <p style=\"text-align: left;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">A.</span><span style=\"font-family: 宋体;\">不恰当。轻歌曼舞：轻松愉快的音乐，柔和优美的舞蹈。《春江花月夜》只是音乐。</span></p>\n            <p style=\"text-align: left;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">B.</span><span style=\"font-family: 宋体;\">不恰当。余音绕梁：形容歌声或音乐优美，余音回旋不绝。也比喻诗文意味深长，耐人寻味。不能用来形容仙女们。</span></p>\n            <p style=\"text-align: left;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">C.</span><span style=\"font-family: 宋体;\">恰当。栩栩如生：形容艺术形象非常生动逼真，像活的一样。</span></p>\n            <p style=\"text-align: left;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">D.</span><span style=\"font-family: 宋体;\">不恰当。高山流水：比喻知己或知音。也比喻乐曲高妙。不能用来形容文章，适用对象错误。</span></p>\n            <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">故选C。</span></p>"
        },
        scope: {
          kind: "question"
        }
      },
      {
        name: "点睛",
        content: {
          html: "<p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">要结合积累的成语来分析，在平时的学习中，首先我们对于遇到的成语要做好积累，其次是注意可以从词义、词语的感情色彩、习惯用法等方面进行归纳。成语常见的错误有：望文生义、褒贬不当、搭配不当、用错对象、重复冗赘、谦敬错位、自相矛盾、不合语境等。</span></p>"
        },
        scope: {
          kind: "question"
        }
      }
    ],
    media: []
  }
}

/** 原始 HTML：raw/f02-biology-lab-blanks.html */
export const f02BiologyLabBlanks: QuestionFixture = {
  view: {
    id: "q_f02",
    contentVersion: "fixture-v1",
    structure: "parsed",
    numbering: "none",
    stem: {
      html: "<p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">请回答下列有关实验和探究的问题</span></p>\n        <p style=\"text-align: left;\">\n            <span style=\"font-family: 宋体;\">（1）某同学同时制作人的口腔上皮细胞和洋葱鳞片叶内表皮细胞临时装片时，先在两张载玻片中央分别滴了一滴</span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f02:bk1\"></span><span style=\"font-family: 宋体;\">和</span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f02:bk2\"></span>\n            <span style=\"font-family: 宋体;\">，由于没有编号，导致两种材料刚好放反了。此时用显微镜观察到人的口腔上皮细胞与正常情况下的细胞大小相比应</span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f02:bk3\"></span><span style=\"font-family: 宋体;\">（更大或更小或不变）；此时观察到洋葱缺片叶内表皮细胞与正常情况下的细胞大小相比应</span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f02:bk4\"></span><span style=\"font-family: 宋体;\">（更大或更小或不变），主要原因是它有</span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f02:bk5\"></span><span style=\"font-family: 宋体;\">。</span>\n        </p>\n        <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">（2）在“探究馒头在口腔中的变化”时，对3支试管作了以下处理。</span></p>\n        <p style=\"text-align: left;\"><img src=\"https://img.xkw.com/dksih/QBM/2018/7/22/1993982483308544/1999623782162432/STEM/ec479f59c87e4d90afdc34b87030390a.png?resizew=135\" width=\"135\" height=\"159\"></p>\n        <table style=\"border-width:0px 0px 0px 0px;border-style:solid;border-color:black;border-collapse: collapse;\">\n            <tbody><tr height=\"35px\">\n                <td class=\"slash-1\" style=\"width:62px;vertical-align:center;border-width:1px 0px 0px 1px;border-style:solid none none solid;border-color:black;\">\n                    <p style=\"text-align: right;\"><span style=\"font-family: 宋体;\">事件  </span></p>\n\t\t\t\t\t<p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">  编号</span></p>\n                </td>\n                <td style=\"width:102px;vertical-align:center;border-width:1px 0px 0px 1px;border-style:solid none none solid;border-color:black;\">\n                    <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">放入物体</span></p>\n                </td>\n                <td style=\"width:120px;vertical-align:center;border-width:1px 0px 0px 1px;border-style:solid none none solid;border-color:black;\">\n                    <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">液体</span></p>\n                </td>\n                <td style=\"width:113px;vertical-align:center;border-width:1px 1px 0px 1px;border-style:solid solid none solid;border-color:black;\">\n                    <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">处理</span></p>\n                </td>\n            </tr>\n            <tr height=\"34px\">\n                <td style=\"width:62px;vertical-align:center;border-width:1px 0px 0px 1px;border-style:solid none none solid;border-color:black;\">\n                    <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">①</span></p>\n                </td>\n                <td style=\"width:102px;vertical-align:center;border-width:1px 0px 0px 1px;border-style:solid none none solid;border-color:black;\">\n                    <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">馒头碎屑</span></p>\n                </td>\n                <td style=\"width:120px;vertical-align:center;border-width:1px 0px 0px 1px;border-style:solid none none solid;border-color:black;\">\n                    <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">2毫升唾液</span></p>\n                </td>\n                <td style=\"width:113px;vertical-align:center;border-width:1px 1px 0px 1px;border-style:solid solid none solid;border-color:black;\">\n                    <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">充分搅拌</span></p>\n                </td>\n            </tr>\n            <tr height=\"34px\">\n                <td style=\"width:62px;vertical-align:center;border-width:1px 0px 0px 1px;border-style:solid none none solid;border-color:black;\">\n                    <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">②</span></p>\n                </td>\n                <td style=\"width:102px;vertical-align:center;border-width:1px 0px 0px 1px;border-style:solid none none solid;border-color:black;\">\n                    <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">馒头碎屑</span></p>\n                </td>\n                <td style=\"width:120px;vertical-align:center;border-width:1px 0px 0px 1px;border-style:solid none none solid;border-color:black;\">\n                    <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">2毫升清水</span></p>\n                </td>\n                <td style=\"width:113px;vertical-align:center;border-width:1px 1px 0px 1px;border-style:solid solid none solid;border-color:black;\">\n                    <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">充分搅拌</span></p>\n                </td>\n            </tr>\n            <tr height=\"40px\">\n                <td style=\"width:62px;vertical-align:center;border-width:1px 0px 1px 1px;border-style:solid none solid solid;border-color:black;\">\n                    <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">③</span></p>\n                </td>\n                <td style=\"width:102px;vertical-align:center;border-width:1px 0px 1px 1px;border-style:solid none solid solid;border-color:black;\">\n                    <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">馒头块</span></p>\n                </td>\n                <td style=\"width:120px;vertical-align:center;border-width:1px 0px 1px 1px;border-style:solid none solid solid;border-color:black;\">\n                    <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">2毫升唾液</span></p>\n                </td>\n                <td style=\"width:113px;vertical-align:center;border-width:1px 1px 1px 1px;border-style:solid solid solid solid;border-color:black;\">\n                    <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">不搅拌</span></p>\n                </td>\n            </tr>\n        </tbody></table>\n        <p style=\"text-align: left;\">\n            <span style=\"font-family: 宋体;\">将3支试管一起放到37℃的温水中，5—10分钟后取出，各滴加2滴碘液，摇匀，观察颜色的变化，3支试管中不变蓝的是</span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f02:bk6\"></span><span style=\"font-family: 宋体;\">试管，原因是唾液中的</span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f02:bk7\"></span><span style=\"font-family: 宋体;\">将粉分解成了</span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f02:bk8\"></span><span style=\"font-family: 宋体;\">，它遇碘不变蓝。</span>\n        </p>\n        <p style=\"text-align: left;\">\n            <span style=\"font-family: 宋体;\">如果以唾液的有无作为变量，形成对照的是编号</span><span class=\"qml-bk\" data-slot-id=\"q_f02:bk9\"></span>\n            <span style=\"font-family: 宋体;\">试管，设置③号试管的目的是验证</span><span class=\"qml-bk\" data-slot-id=\"q_f02:bk10\"></span><span style=\"font-family: 宋体;\">在消化中的作用。</span>\n        </p>"
    },
    slots: [
      {
        id: "q_f02:bk1",
        mechanism: "text",
        grading: "unknown",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 8,
          inlineLabel: null
        },
        anchored: true
      },
      {
        id: "q_f02:bk2",
        mechanism: "text",
        grading: "unknown",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 8,
          inlineLabel: null
        },
        anchored: true
      },
      {
        id: "q_f02:bk3",
        mechanism: "text",
        grading: "unknown",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 8,
          inlineLabel: null
        },
        anchored: true
      },
      {
        id: "q_f02:bk4",
        mechanism: "text",
        grading: "unknown",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 8,
          inlineLabel: null
        },
        anchored: true
      },
      {
        id: "q_f02:bk5",
        mechanism: "text",
        grading: "unknown",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 16,
          inlineLabel: null
        },
        anchored: true
      },
      {
        id: "q_f02:bk6",
        mechanism: "text",
        grading: "unknown",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 9,
          inlineLabel: null
        },
        anchored: true
      },
      {
        id: "q_f02:bk7",
        mechanism: "text",
        grading: "unknown",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 9,
          inlineLabel: null
        },
        anchored: true
      },
      {
        id: "q_f02:bk8",
        mechanism: "text",
        grading: "unknown",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 9,
          inlineLabel: null
        },
        anchored: true
      },
      {
        id: "q_f02:bk9",
        mechanism: "text",
        grading: "unknown",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 9,
          inlineLabel: null
        },
        anchored: true
      },
      {
        id: "q_f02:bk10",
        mechanism: "text",
        grading: "unknown",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 9,
          inlineLabel: null
        },
        anchored: true
      }
    ],
    optionGroups: [],
    subQuestions: [],
    media: [],
    meta: {
      source: {
        provider: "xkw",
        externalId: "doc-sample-f02",
        sourceKind: "premium"
      },
      typeId: null,
      typeName: "实验探究题",
      difficulty: null,
      difficultyLevel: null,
      knowledgePoints: [],
      years: [],
      sourcePapers: [],
      courseName: "初中生物"
    },
    raw: null
  },
  review: {
    questionId: "q_f02",
    contentVersion: "fixture-v1",
    referenceAnswers: [
      {
        slotId: "q_f02:bk1",
        answer: {
          kind: "missing"
        }
      },
      {
        slotId: "q_f02:bk2",
        answer: {
          kind: "missing"
        }
      },
      {
        slotId: "q_f02:bk3",
        answer: {
          kind: "missing"
        }
      },
      {
        slotId: "q_f02:bk4",
        answer: {
          kind: "missing"
        }
      },
      {
        slotId: "q_f02:bk5",
        answer: {
          kind: "missing"
        }
      },
      {
        slotId: "q_f02:bk6",
        answer: {
          kind: "missing"
        }
      },
      {
        slotId: "q_f02:bk7",
        answer: {
          kind: "missing"
        }
      },
      {
        slotId: "q_f02:bk8",
        answer: {
          kind: "missing"
        }
      },
      {
        slotId: "q_f02:bk9",
        answer: {
          kind: "missing"
        }
      },
      {
        slotId: "q_f02:bk10",
        answer: {
          kind: "missing"
        }
      }
    ],
    answerFallback: null,
    explanation: [],
    media: []
  }
}

/** 原始 HTML：raw/f03-listening-single.html */
export const f03ListeningSingle: QuestionFixture = {
  view: {
    id: "q_f03",
    contentVersion: "fixture-v1",
    structure: "parsed",
    numbering: "none",
    stem: {
      html: "<p style=\"text-align: left;\"><audio file-size=\"93401\" duration=\"11\" title=\"\" src=\"https://img.xkw.com/dksih/QBM/2020/4/22/2446810145964032/2446836295442432/STEM/17f4974913624373ada3ee58adef479c.mp3\" preload=\"metadata\" controls></audio></p>\n        <span data-og-id=\"q_f03:og1\"></span>"
    },
    slots: [
      {
        id: "q_f03:bk",
        mechanism: "choice",
        grading: "unknown",
        optionGroupId: "q_f03:og1",
        select: "single",
        blank: null,
        anchored: false
      }
    ],
    optionGroups: [
      {
        id: "q_f03:og1",
        options: [
          {
            id: "q_f03:og1:A",
            label: "A",
            content: {
              html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">It’s too late for the man to go to the concert .</span>"
            }
          },
          {
            id: "q_f03:og1:B",
            label: "B",
            content: {
              html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">The man can buy a standing-room ticket tomorrow .</span>"
            }
          },
          {
            id: "q_f03:og1:C",
            label: "C",
            content: {
              html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">The man must wait for two hours to buy a ticket .</span>"
            }
          },
          {
            id: "q_f03:og1:D",
            label: "D",
            content: {
              html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">People have already been standing in line for two hours;</span>"
            }
          }
        ],
        cols: 1,
        layout: "table",
        reuse: null,
        anchored: true
      }
    ],
    subQuestions: [],
    media: [],
    meta: {
      source: {
        provider: "xkw",
        externalId: "doc-sample-f03",
        sourceKind: "premium"
      },
      typeId: null,
      typeName: "听力选择题",
      difficulty: null,
      difficultyLevel: null,
      knowledgePoints: [],
      years: [],
      sourcePapers: [],
      courseName: "初中英语"
    },
    raw: null
  },
  review: {
    questionId: "q_f03",
    contentVersion: "fixture-v1",
    referenceAnswers: [
      {
        slotId: "q_f03:bk",
        answer: {
          kind: "missing"
        }
      }
    ],
    answerFallback: null,
    explanation: [],
    media: []
  }
}

/** 原始 HTML：raw/f04-chemistry-single.html */
export const f04ChemistrySingle: QuestionFixture = {
  view: {
    id: "q_f04",
    contentVersion: "fixture-v1",
    structure: "parsed",
    numbering: "none",
    stem: {
      html: "<p style=\"text-align: left;\">\n            <span style=\"font-family: 宋体;\">下列有关说法中不正确的是</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">(</span><span style=\"font-family: 宋体;\"> </span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">)</span>\n        </p>\n        <span data-og-id=\"q_f04:og1\"></span>"
    },
    slots: [
      {
        id: "q_f04:bk",
        mechanism: "choice",
        grading: "auto",
        optionGroupId: "q_f04:og1",
        select: "single",
        blank: null,
        anchored: false
      }
    ],
    optionGroups: [
      {
        id: "q_f04:og1",
        options: [
          {
            id: "q_f04:og1:A",
            label: "A",
            content: {
              html: "<span style=\"font-family: 宋体;\">酸溶液中都含有</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">H</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"><sup>+</sup></span>\n\t\t\t\t\t\t<span style=\"font-family: 宋体;\">，所以有相似的化学性质</span>"
            }
          },
          {
            id: "q_f04:og1:B",
            label: "B",
            content: {
              html: "<span style=\"font-family: 宋体;\">酸、碱在水溶液中都可解离出带电的粒子</span>"
            }
          },
          {
            id: "q_f04:og1:C",
            label: "C",
            content: {
              html: "<span style=\"font-family: 宋体;\">在实验室，常用浓硫酸来干燥某些气体</span>"
            }
          },
          {
            id: "q_f04:og1:D",
            label: "D",
            content: {
              html: "<span style=\"font-family: 宋体;\">医疗上的生理盐水是</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">0.9%</span><span style=\"font-family: 宋体;\">的纯碱溶液</span>"
            }
          }
        ],
        cols: 1,
        layout: "table",
        reuse: null,
        anchored: true
      }
    ],
    subQuestions: [],
    media: [],
    meta: {
      source: {
        provider: "xkw",
        externalId: "doc-sample-f04",
        sourceKind: "premium"
      },
      typeId: null,
      typeName: "单选题",
      difficulty: null,
      difficultyLevel: null,
      knowledgePoints: [],
      years: [],
      sourcePapers: [],
      courseName: "初中化学"
    },
    raw: null
  },
  review: {
    questionId: "q_f04",
    contentVersion: "fixture-v1",
    referenceAnswers: [
      {
        slotId: "q_f04:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f04:og1:D"
          ]
        }
      }
    ],
    answerFallback: null,
    explanation: [
      {
        name: "详解",
        content: {
          html: "<span>A、在水溶液中电离出的阳离子全部是氢离子的化合物是酸，故A正确；</span>\n            <p style=\"\"><span>B、在水溶液中电离出的阳离子全部是氢离子的化合物是酸，电离出的阴离子全部是氢氧根离子的混合物是碱，故B正确；</span></p>\n            <p style=\"\"><span>C、浓硫酸具有吸水性，在实验室，常用来干燥某些气体，故C正确；</span></p>\n            <p style=\"\"><span>D、医疗上的生理盐水是0.9%的氯化钠溶液，故D错误．</span></p>\n            <p style=\"\"><span>故选D．</span></p>\n            <p style=\"\"><span>【点评】本题主要考查了一些基础知识的记忆，难度不大，只要加强记忆即可解答．</span></p>\n            <p style=\"text-align: left;\">\n                <video file-size=\"4.74MB\" duration=\"126\" resolution=\"1280x720\" title=\"1df8c791-f367-4bff-bc84-6c39ad4fb1e4.mp4\" src=\"https://img.xkw.com/dksih/QBM/2015/7/3/1568558031806464/1568558036049920/EXPLANATION/1df8c791-f367-4bff-bc84-6c39ad4fb1e4.mp4\" poster=\"https://img.xkw.com/dksih/QBM/2015/7/3/1568558031806464/1568558036049920/EXPLANATION/1df8c791-f367-4bff-bc84-6c39ad4fb1e4.png\" preload=\"metadata\" controls></video>\n            </p>"
        },
        scope: {
          kind: "question"
        }
      }
    ],
    media: []
  }
}

/** 原始 HTML：raw/f05-classic-reading-blanks.html */
export const f05ClassicReadingBlanks: QuestionFixture = {
  view: {
    id: "q_f05",
    contentVersion: "fixture-v1",
    structure: "parsed",
    numbering: "none",
    stem: {
      html: "<p style=\"\"><span style=\"\">1. </span><span style=\"\">名著阅读。</span></p>\n        <p style=\"\"><span style=\"\">“理想是石，敲出星星之火；理想是火，点燃希望的灯；理想是灯，照亮前行的路。”名著中一些人物勇于追求理想，奏响了生命的乐章！请从下面的人物中任选其一，然后仿照示例写一句话。</span>\n        </p>\n        <p style=\"\"><span style=\"\">① 祥子            ② 简•爱          ③ 唐僧</span></p>\n        <p style=\"\"><span style=\"\">示例：尼摩船长是《海底两万里》中的人物，他用巨额财富支援被压迫的民众，追求正义、平等的理想。</span></p>\n        <p style=\"\"><span class=\"qml-bk\" data-slot-id=\"q_f05:bk1\"></span><span style=\"\">是《</span><span class=\"qml-bk\" data-slot-id=\"q_f05:bk2\"></span><span style=\"\">》中的人物，</span><span class=\"qml-bk\" data-slot-id=\"q_f05:bk3\"></span><span style=\"\">。</span></p>"
    },
    slots: [
      {
        id: "q_f05:bk1",
        mechanism: "text",
        grading: "none",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 10,
          inlineLabel: null
        },
        anchored: true
      },
      {
        id: "q_f05:bk2",
        mechanism: "text",
        grading: "none",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 10,
          inlineLabel: null
        },
        anchored: true
      },
      {
        id: "q_f05:bk3",
        mechanism: "text",
        grading: "none",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 20,
          inlineLabel: null
        },
        anchored: true
      }
    ],
    optionGroups: [],
    subQuestions: [],
    media: [],
    meta: {
      source: {
        provider: "xkw",
        externalId: "doc-sample-f05",
        sourceKind: "premium"
      },
      typeId: null,
      typeName: "名著阅读",
      difficulty: null,
      difficultyLevel: null,
      knowledgePoints: [],
      years: [],
      sourcePapers: [],
      courseName: "初中语文"
    },
    raw: null
  },
  review: {
    questionId: "q_f05",
    contentVersion: "fixture-v1",
    referenceAnswers: [
      {
        slotId: "q_f05:bk1",
        answer: {
          kind: "missing"
        }
      },
      {
        slotId: "q_f05:bk2",
        answer: {
          kind: "missing"
        }
      },
      {
        slotId: "q_f05:bk3",
        answer: {
          kind: "missing"
        }
      }
    ],
    answerFallback: {
      html: "<span class=\"qml-an-sq\"><span class=\"qml-an\"><span style=\"\">①祥子是《骆驼祥子》中的人物，他用攒了三年的钱买了第一辆新车，努力实现改变生活现状的理想。</span></span>    <span class=\"qml-an\"><span style=\"\">②简•爱是《简•爱》中的人物，她敢于放弃自己赖以生存的工作，追求人格独立、自由的理想。</span></span>     <span class=\"qml-an\"><span style=\"\">③唐僧是《西游记》中的人物，他历经九九八十一难实现去西天求取真经的理想。</span></span></span>"
    },
    explanation: [],
    media: []
  }
}

/** 原始 HTML：raw/f06-reading-compound.html */
export const f06ReadingCompound: QuestionFixture = {
  view: {
    id: "q_f06",
    contentVersion: "fixture-v1",
    structure: "parsed",
    numbering: "sequential",
    stem: {
      html: "<p style=\"text-align: left;text-indent: 28px;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">People celebrate birthdays in almost every country all over the world. Some ways are similar from country to country: candles, cakes, and birthday wishes. But there are also different ways to celebrate birthdays. Here are some:</span></p>\n        <p style=\"text-align: left;text-indent: 28px;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">In Denmark (</span><span style=\"font-family: 宋体;\">丹麦</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">), parents always prepare a birthday cake with the national flag on it for their birthday child. And they also put a flag outside their window. It means a child in the house is having a birthday.</span></p>\n        <p style=\"text-align: left;text-indent: 28px;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">In Holland (</span><span style=\"font-family: 宋体;\">荷兰</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">), all the people at the party must cover (</span><span style=\"font-family: 宋体;\">遮盖</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">) their eyes with cloth. And then, they look for the gifts in the house. The one who finds the gift can have it.</span></p>\n        <p style=\"text-align: left;text-indent: 28px;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">In Argentina (</span><span style=\"font-family: 宋体;\">阿根廷</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">), girls’ fifteenth birthday is the most important. Parents always have a big party to celebrate. At the party, the birthday girl must dance with her father first, and then the boys.</span></p>\n        <p style=\"text-align: left;text-indent: 28px;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">In India, children usually wear white clothes to school. But on their birthdays, children wear colourful clothes to school and give out chocolate to everyone in the class. Their best friends help them do this.</span></p>\n        <p style=\"text-align: left;text-indent: 28px;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">In Israel (</span><span style=\"font-family: 宋体;\">以色列</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">), the birthday child sits in a chair with lots of flowers. The friends and parents will </span><span style=\"text-decoration: underline;text-underline-position: underfont-family: &#x27;Times New Roman&#x27;;\" u=\"\">lift</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"> the chair. The times they lift are the birthday child’s age.</span></p>\n        <span data-sq-id=\"q_f06:sq1\"></span>\n        <span data-sq-id=\"q_f06:sq2\"></span>\n        <span data-sq-id=\"q_f06:sq3\"></span>\n        <span data-sq-id=\"q_f06:sq4\"></span>\n        <span data-sq-id=\"q_f06:sq5\"></span>"
    },
    slots: [],
    optionGroups: [],
    subQuestions: [
      {
        id: "q_f06:sq1",
        label: "1.",
        stem: {
          html: "<p style=\"\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">People in Denmark celebrate the children’s birthday by ________.</span></p>\n                <span data-og-id=\"q_f06:sq1:og1\"></span>"
        },
        slots: [
          {
            id: "q_f06:sq1:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f06:sq1:og1",
            select: "single",
            blank: null,
            anchored: false
          }
        ],
        optionGroups: [
          {
            id: "q_f06:sq1:og1",
            options: [
              {
                id: "q_f06:sq1:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">putting a national flag on the birthday cake</span>"
                }
              },
              {
                id: "q_f06:sq1:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">blowing out all the candles in one go</span>"
                }
              },
              {
                id: "q_f06:sq1:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">lifting the chair with the birthday child on it</span>"
                }
              },
              {
                id: "q_f06:sq1:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">having a big party</span>"
                }
              }
            ],
            cols: 1,
            layout: "table",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f06:sq2",
        label: "2.",
        stem: {
          html: "<p style=\"\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">In ________, the 15th birthday girl must dance with her father first.</span></p>\n                <span data-og-id=\"q_f06:sq2:og1\"></span>"
        },
        slots: [
          {
            id: "q_f06:sq2:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f06:sq2:og1",
            select: "single",
            blank: null,
            anchored: false
          }
        ],
        optionGroups: [
          {
            id: "q_f06:sq2:og1",
            options: [
              {
                id: "q_f06:sq2:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">Argentina</span>"
                }
              },
              {
                id: "q_f06:sq2:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">Holland</span>"
                }
              },
              {
                id: "q_f06:sq2:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">Israel</span>"
                }
              },
              {
                id: "q_f06:sq2:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">India</span>"
                }
              }
            ],
            cols: 4,
            layout: "table",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f06:sq3",
        label: "3.",
        stem: {
          html: "<p style=\"\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">What does the underlined word “lift” mean in Chinese?</span></p>\n                <span data-og-id=\"q_f06:sq3:og1\"></span>"
        },
        slots: [
          {
            id: "q_f06:sq3:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f06:sq3:og1",
            select: "single",
            blank: null,
            anchored: false
          }
        ],
        optionGroups: [
          {
            id: "q_f06:sq3:og1",
            options: [
              {
                id: "q_f06:sq3:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: 宋体;\">举起</span>"
                }
              },
              {
                id: "q_f06:sq3:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: 宋体;\">庆祝</span>"
                }
              },
              {
                id: "q_f06:sq3:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: 宋体;\">列举</span>"
                }
              },
              {
                id: "q_f06:sq3:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: 宋体;\">长大</span>"
                }
              }
            ],
            cols: 4,
            layout: "table",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f06:sq4",
        label: "4.",
        stem: {
          html: "<p style=\"\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">What can we learn from the passage?</span></p>\n                <span data-og-id=\"q_f06:sq4:og1\"></span>"
        },
        slots: [
          {
            id: "q_f06:sq4:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f06:sq4:og1",
            select: "single",
            blank: null,
            anchored: false
          }
        ],
        optionGroups: [
          {
            id: "q_f06:sq4:og1",
            options: [
              {
                id: "q_f06:sq4:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">Different countries have different ways to celebrate New Year.</span>"
                }
              },
              {
                id: "q_f06:sq4:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">In India, children can wear colourful clothes to school on their birthdays.</span>"
                }
              },
              {
                id: "q_f06:sq4:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">Only birthday children can look for the gifts in the house in Holland.</span>"
                }
              },
              {
                id: "q_f06:sq4:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">In Israel, the birthday child sits in a chair. Only their parents can lift the chair.</span>"
                }
              }
            ],
            cols: 1,
            layout: "table",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f06:sq5",
        label: "5.",
        stem: {
          html: "<p style=\"\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">What does the passage mainly tell us?</span></p>\n                <span data-og-id=\"q_f06:sq5:og1\"></span>"
        },
        slots: [
          {
            id: "q_f06:sq5:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f06:sq5:og1",
            select: "single",
            blank: null,
            anchored: false
          }
        ],
        optionGroups: [
          {
            id: "q_f06:sq5:og1",
            options: [
              {
                id: "q_f06:sq5:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">People celebrate birthdays all over the world.</span>"
                }
              },
              {
                id: "q_f06:sq5:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">People always celebrate birthdays for their children.</span>"
                }
              },
              {
                id: "q_f06:sq5:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">People in different countries celebrate birthdays in similar ways.</span>"
                }
              },
              {
                id: "q_f06:sq5:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">There are different ways to celebrate birthdays in different countries.</span>"
                }
              }
            ],
            cols: 1,
            layout: "table",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      }
    ],
    media: [],
    meta: {
      source: {
        provider: "xkw",
        externalId: "doc-sample-f06",
        sourceKind: "premium"
      },
      typeId: null,
      typeName: "阅读理解",
      difficulty: null,
      difficultyLevel: null,
      knowledgePoints: [],
      years: [],
      sourcePapers: [],
      courseName: "初中英语"
    },
    raw: null
  },
  review: {
    questionId: "q_f06",
    contentVersion: "fixture-v1",
    referenceAnswers: [
      {
        slotId: "q_f06:sq1:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f06:sq1:og1:A"
          ]
        }
      },
      {
        slotId: "q_f06:sq2:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f06:sq2:og1:A"
          ]
        }
      },
      {
        slotId: "q_f06:sq3:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f06:sq3:og1:A"
          ]
        }
      },
      {
        slotId: "q_f06:sq4:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f06:sq4:og1:B"
          ]
        }
      },
      {
        slotId: "q_f06:sq5:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f06:sq5:og1:D"
          ]
        }
      }
    ],
    answerFallback: null,
    explanation: [
      {
        name: "导语",
        content: {
          html: "<p style=\"\"><span>本文主要介绍了不同国家庆祝生日的不同方式。</span></p>"
        },
        scope: {
          kind: "question"
        }
      },
      {
        name: "(1)题详解",
        content: {
          html: "<p style=\"\"><span>细节理解题。根据第二段中的“In Denmark (丹麦), parents always prepare a birthday cake with the national flag on it for their birthday child.”可知，丹麦人会在生日蛋糕上放一面国旗。故选A。</span></p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f06:sq1"
        }
      },
      {
        name: "(2)题详解",
        content: {
          html: "<p style=\"\"><span>细节理解题。根据第四段中的“In Argentina (阿根廷), girls’ fifteenth birthday is the most important.”及“At the party, the birthday girl must dance with her father first”可知，在阿根廷，过十五岁生日的女孩在派对上必须先跟父亲跳舞。故选A。</span></p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f06:sq2"
        }
      },
      {
        name: "(3)题详解",
        content: {
          html: "<p style=\"\"><span>词义猜测题。根据文中的“the birthday child sits in a chair with lots of flowers. The friends and parents will lift the chair.”可知，过生日的孩子坐在一把有很多花的椅子上。朋友和父母会把椅子抬起来。划线词的意思是“举起”。故选A。</span></p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f06:sq3"
        }
      },
      {
        name: "(4)题详解",
        content: {
          html: "<p style=\"\"><span>细节理解题。根据第五段中的“In India...But on their birthdays, children wear colourful clothes to school”可知，在印度，孩子们在生日的时候可以穿五颜六色的衣服去上学。故选B。</span></p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f06:sq4"
        }
      },
      {
        name: "(5)题详解",
        content: {
          html: "<p style=\"\"><span>主旨大意题。本文主要介绍不同国家庆祝生日的方式不同。故选D。</span></p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f06:sq5"
        }
      }
    ],
    media: []
  }
}

/** 原始 HTML：raw/f07-cloze.html */
export const f07Cloze: QuestionFixture = {
  view: {
    id: "q_f07",
    contentVersion: "fixture-v1",
    structure: "parsed",
    numbering: "sequential",
    stem: {
      html: "<p style=\"text-indent: 28px;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">Over the past 38 years, Mr. Wang has pretended to be someone else many times,and has even learned to </span><span class=\"qml-bk\" data-slot-id=\"q_f07:sq1:bk\"></span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"> different dialects (</span><span style=\"font-family: 宋体;\">方言</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">), leading to him being described as an “Oscar-winning actor”. </span></p>\n        <p style=\"text-indent: 28px;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">The 60-year-old is not an actor, but a </span><span class=\"qml-bk\" data-slot-id=\"q_f07:sq2:bk\"></span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"> However,he is more devoted to his “</span><span class=\"qml-bk\" data-slot-id=\"q_f07:sq3:bk\"></span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"> ” than any real actor. </span></p>\n        <p style=\"text-indent: 28px;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">In the 1990s, a group of thieves often sold stolen goods with the help of some beggars. To look into the </span><span class=\"qml-bk\" data-slot-id=\"q_f07:sq4:bk\"></span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">, Wang disguised (</span><span style=\"font-family: 宋体;\">伪装</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">) himself and </span><span class=\"qml-bk\" data-slot-id=\"q_f07:sq5:bk\"></span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"> the beggars. Dirty shorts and old shoes gave him the </span><span class=\"qml-bk\" data-slot-id=\"q_f07:sq6:bk\"></span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"> of a real beggar and his convincing dialect soon won him the </span><span class=\"qml-bk\" data-slot-id=\"q_f07:sq7:bk\"></span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"> of the beggars. </span></p>\n        <p style=\"text-indent: 28px;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">“I often </span><span class=\"qml-bk\" data-slot-id=\"q_f07:sq8:bk\"></span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"> them to drink alcohol. Once they were </span><span class=\"qml-bk\" data-slot-id=\"q_f07:sq9:bk\"></span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">,they began to talk a lot,\"Wang said. “I'd then </span><span class=\"qml-bk\" data-slot-id=\"q_f07:sq10:bk\"></span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"> myself to use the toilet, </span><span class=\"qml-bk\" data-slot-id=\"q_f07:sq11:bk\"></span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"> what the beggars said, and send the </span><span class=\"qml-bk\" data-slot-id=\"q_f07:sq12:bk\"></span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"> to my teammates.” </span></p>\n        <p style=\"text-indent: 28px;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">Wang, who is often in </span><span class=\"qml-bk\" data-slot-id=\"q_f07:sq13:bk\"></span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"> situations, is also a judo (</span><span style=\"font-family: 宋体;\">柔道</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">) master.<span style=\"font-family: &#x27;Times New Roman&#x27;\" qml-space-size=\"2\">   </span>“As long as I get close enough, no criminal can </span><span class=\"qml-bk\" data-slot-id=\"q_f07:sq14:bk\"></span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"> from me,” he said. </span></p>\n        <p style=\"text-indent: 28px;\"><span style=\"font-family: &#x27;Times New Roman&#x27;;\">Wang's </span><span class=\"qml-bk\" data-slot-id=\"q_f07:sq15:bk\"></span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"> won him several honors, including a National May Day Labor Medal and 11 Citations of Merit.</span></p>\n        <span data-sq-id=\"q_f07:sq1\"></span>\n        <span data-sq-id=\"q_f07:sq2\"></span>\n        <span data-sq-id=\"q_f07:sq3\"></span>\n        <span data-sq-id=\"q_f07:sq4\"></span>\n        <span data-sq-id=\"q_f07:sq5\"></span>\n        <span data-sq-id=\"q_f07:sq6\"></span>\n        <span data-sq-id=\"q_f07:sq7\"></span>\n        <span data-sq-id=\"q_f07:sq8\"></span>\n        <span data-sq-id=\"q_f07:sq9\"></span>\n        <span data-sq-id=\"q_f07:sq10\"></span>\n        <span data-sq-id=\"q_f07:sq11\"></span>\n        <span data-sq-id=\"q_f07:sq12\"></span>\n        <span data-sq-id=\"q_f07:sq13\"></span>\n        <span data-sq-id=\"q_f07:sq14\"></span>\n        <span data-sq-id=\"q_f07:sq15\"></span>"
    },
    slots: [],
    optionGroups: [],
    subQuestions: [
      {
        id: "q_f07:sq1",
        label: "1.",
        stem: {
          html: "<span data-og-id=\"q_f07:sq1:og1\"></span>"
        },
        slots: [
          {
            id: "q_f07:sq1:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f07:sq1:og1",
            select: "single",
            blank: {
              style: "underline",
              size: 8,
              inlineLabel: "1"
            },
            anchored: true
          }
        ],
        optionGroups: [
          {
            id: "q_f07:sq1:og1",
            options: [
              {
                id: "q_f07:sq1:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">teach</span>"
                }
              },
              {
                id: "q_f07:sq1:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">compare</span>"
                }
              },
              {
                id: "q_f07:sq1:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">assess</span>"
                }
              },
              {
                id: "q_f07:sq1:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">speak</span>"
                }
              }
            ],
            cols: 4,
            layout: "inline",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f07:sq2",
        label: "2.",
        stem: {
          html: "<span data-og-id=\"q_f07:sq2:og1\"></span>"
        },
        slots: [
          {
            id: "q_f07:sq2:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f07:sq2:og1",
            select: "single",
            blank: {
              style: "underline",
              size: 8,
              inlineLabel: "2"
            },
            anchored: true
          }
        ],
        optionGroups: [
          {
            id: "q_f07:sq2:og1",
            options: [
              {
                id: "q_f07:sq2:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">lawyer</span>"
                }
              },
              {
                id: "q_f07:sq2:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">doctor</span>"
                }
              },
              {
                id: "q_f07:sq2:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">policeman</span>"
                }
              },
              {
                id: "q_f07:sq2:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">businessman</span>"
                }
              }
            ],
            cols: 4,
            layout: "inline",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f07:sq3",
        label: "3.",
        stem: {
          html: "<span data-og-id=\"q_f07:sq3:og1\"></span>"
        },
        slots: [
          {
            id: "q_f07:sq3:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f07:sq3:og1",
            select: "single",
            blank: {
              style: "underline",
              size: 8,
              inlineLabel: "3"
            },
            anchored: true
          }
        ],
        optionGroups: [
          {
            id: "q_f07:sq3:og1",
            options: [
              {
                id: "q_f07:sq3:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">role</span>"
                }
              },
              {
                id: "q_f07:sq3:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">study</span>"
                }
              },
              {
                id: "q_f07:sq3:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">family</span>"
                }
              },
              {
                id: "q_f07:sq3:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">audience</span>"
                }
              }
            ],
            cols: 4,
            layout: "inline",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f07:sq4",
        label: "4.",
        stem: {
          html: "<span data-og-id=\"q_f07:sq4:og1\"></span>"
        },
        slots: [
          {
            id: "q_f07:sq4:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f07:sq4:og1",
            select: "single",
            blank: {
              style: "underline",
              size: 8,
              inlineLabel: "4"
            },
            anchored: true
          }
        ],
        optionGroups: [
          {
            id: "q_f07:sq4:og1",
            options: [
              {
                id: "q_f07:sq4:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">minor</span>"
                }
              },
              {
                id: "q_f07:sq4:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">case</span>"
                }
              },
              {
                id: "q_f07:sq4:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">future</span>"
                }
              },
              {
                id: "q_f07:sq4:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">question</span>"
                }
              }
            ],
            cols: 4,
            layout: "inline",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f07:sq5",
        label: "5.",
        stem: {
          html: "<span data-og-id=\"q_f07:sq5:og1\"></span>"
        },
        slots: [
          {
            id: "q_f07:sq5:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f07:sq5:og1",
            select: "single",
            blank: {
              style: "underline",
              size: 8,
              inlineLabel: "5"
            },
            anchored: true
          }
        ],
        optionGroups: [
          {
            id: "q_f07:sq5:og1",
            options: [
              {
                id: "q_f07:sq5:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">interviewed</span>"
                }
              },
              {
                id: "q_f07:sq5:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">joined</span>"
                }
              },
              {
                id: "q_f07:sq5:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">arrested</span>"
                }
              },
              {
                id: "q_f07:sq5:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">assisted</span>"
                }
              }
            ],
            cols: 4,
            layout: "inline",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f07:sq6",
        label: "6.",
        stem: {
          html: "<span data-og-id=\"q_f07:sq6:og1\"></span>"
        },
        slots: [
          {
            id: "q_f07:sq6:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f07:sq6:og1",
            select: "single",
            blank: {
              style: "underline",
              size: 8,
              inlineLabel: "6"
            },
            anchored: true
          }
        ],
        optionGroups: [
          {
            id: "q_f07:sq6:og1",
            options: [
              {
                id: "q_f07:sq6:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">challenge</span>"
                }
              },
              {
                id: "q_f07:sq6:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">experience</span>"
                }
              },
              {
                id: "q_f07:sq6:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">appearance</span>"
                }
              },
              {
                id: "q_f07:sq6:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">freedom</span>"
                }
              }
            ],
            cols: 4,
            layout: "inline",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f07:sq7",
        label: "7.",
        stem: {
          html: "<span data-og-id=\"q_f07:sq7:og1\"></span>"
        },
        slots: [
          {
            id: "q_f07:sq7:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f07:sq7:og1",
            select: "single",
            blank: {
              style: "underline",
              size: 8,
              inlineLabel: "7"
            },
            anchored: true
          }
        ],
        optionGroups: [
          {
            id: "q_f07:sq7:og1",
            options: [
              {
                id: "q_f07:sq7:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">vote</span>"
                }
              },
              {
                id: "q_f07:sq7:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">sympathy</span>"
                }
              },
              {
                id: "q_f07:sq7:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">permission</span>"
                }
              },
              {
                id: "q_f07:sq7:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">trust</span>"
                }
              }
            ],
            cols: 4,
            layout: "inline",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f07:sq8",
        label: "8.",
        stem: {
          html: "<span data-og-id=\"q_f07:sq8:og1\"></span>"
        },
        slots: [
          {
            id: "q_f07:sq8:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f07:sq8:og1",
            select: "single",
            blank: {
              style: "underline",
              size: 8,
              inlineLabel: "8"
            },
            anchored: true
          }
        ],
        optionGroups: [
          {
            id: "q_f07:sq8:og1",
            options: [
              {
                id: "q_f07:sq8:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">invited</span>"
                }
              },
              {
                id: "q_f07:sq8:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">forced</span>"
                }
              },
              {
                id: "q_f07:sq8:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">helped</span>"
                }
              },
              {
                id: "q_f07:sq8:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">expected</span>"
                }
              }
            ],
            cols: 4,
            layout: "inline",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f07:sq9",
        label: "9.",
        stem: {
          html: "<span data-og-id=\"q_f07:sq9:og1\"></span>"
        },
        slots: [
          {
            id: "q_f07:sq9:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f07:sq9:og1",
            select: "single",
            blank: {
              style: "underline",
              size: 8,
              inlineLabel: "9"
            },
            anchored: true
          }
        ],
        optionGroups: [
          {
            id: "q_f07:sq9:og1",
            options: [
              {
                id: "q_f07:sq9:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">drunk</span>"
                }
              },
              {
                id: "q_f07:sq9:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">deserted</span>"
                }
              },
              {
                id: "q_f07:sq9:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">bored</span>"
                }
              },
              {
                id: "q_f07:sq9:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">lost</span>"
                }
              }
            ],
            cols: 4,
            layout: "inline",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f07:sq10",
        label: "10.",
        stem: {
          html: "<span data-og-id=\"q_f07:sq10:og1\"></span>"
        },
        slots: [
          {
            id: "q_f07:sq10:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f07:sq10:og1",
            select: "single",
            blank: {
              style: "underline",
              size: 8,
              inlineLabel: "10"
            },
            anchored: true
          }
        ],
        optionGroups: [
          {
            id: "q_f07:sq10:og1",
            options: [
              {
                id: "q_f07:sq10:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">guide</span>"
                }
              },
              {
                id: "q_f07:sq10:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">persuade</span>"
                }
              },
              {
                id: "q_f07:sq10:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">excuse</span>"
                }
              },
              {
                id: "q_f07:sq10:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">allow</span>"
                }
              }
            ],
            cols: 4,
            layout: "inline",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f07:sq11",
        label: "11.",
        stem: {
          html: "<span data-og-id=\"q_f07:sq11:og1\"></span>"
        },
        slots: [
          {
            id: "q_f07:sq11:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f07:sq11:og1",
            select: "single",
            blank: {
              style: "underline",
              size: 8,
              inlineLabel: "11"
            },
            anchored: true
          }
        ],
        optionGroups: [
          {
            id: "q_f07:sq11:og1",
            options: [
              {
                id: "q_f07:sq11:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">refer to</span>"
                }
              },
              {
                id: "q_f07:sq11:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">note down</span>"
                }
              },
              {
                id: "q_f07:sq11:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">ask about</span>"
                }
              },
              {
                id: "q_f07:sq11:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">miss out</span>"
                }
              }
            ],
            cols: 4,
            layout: "inline",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f07:sq12",
        label: "12.",
        stem: {
          html: "<span data-og-id=\"q_f07:sq12:og1\"></span>"
        },
        slots: [
          {
            id: "q_f07:sq12:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f07:sq12:og1",
            select: "single",
            blank: {
              style: "underline",
              size: 8,
              inlineLabel: "12"
            },
            anchored: true
          }
        ],
        optionGroups: [
          {
            id: "q_f07:sq12:og1",
            options: [
              {
                id: "q_f07:sq12:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">plan</span>"
                }
              },
              {
                id: "q_f07:sq12:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">agreement</span>"
                }
              },
              {
                id: "q_f07:sq12:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">direction</span>"
                }
              },
              {
                id: "q_f07:sq12:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">information</span>"
                }
              }
            ],
            cols: 4,
            layout: "inline",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f07:sq13",
        label: "13.",
        stem: {
          html: "<span data-og-id=\"q_f07:sq13:og1\"></span>"
        },
        slots: [
          {
            id: "q_f07:sq13:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f07:sq13:og1",
            select: "single",
            blank: {
              style: "underline",
              size: 8,
              inlineLabel: "13"
            },
            anchored: true
          }
        ],
        optionGroups: [
          {
            id: "q_f07:sq13:og1",
            options: [
              {
                id: "q_f07:sq13:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">awkward</span>"
                }
              },
              {
                id: "q_f07:sq13:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">dangerous</span>"
                }
              },
              {
                id: "q_f07:sq13:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">unfortunate</span>"
                }
              },
              {
                id: "q_f07:sq13:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">strange</span>"
                }
              }
            ],
            cols: 4,
            layout: "inline",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f07:sq14",
        label: "14.",
        stem: {
          html: "<span data-og-id=\"q_f07:sq14:og1\"></span>"
        },
        slots: [
          {
            id: "q_f07:sq14:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f07:sq14:og1",
            select: "single",
            blank: {
              style: "underline",
              size: 8,
              inlineLabel: "14"
            },
            anchored: true
          }
        ],
        optionGroups: [
          {
            id: "q_f07:sq14:og1",
            options: [
              {
                id: "q_f07:sq14:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">separate</span>"
                }
              },
              {
                id: "q_f07:sq14:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">recover</span>"
                }
              },
              {
                id: "q_f07:sq14:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">escape</span>"
                }
              },
              {
                id: "q_f07:sq14:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">hear</span>"
                }
              }
            ],
            cols: 4,
            layout: "inline",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f07:sq15",
        label: "15.",
        stem: {
          html: "<span data-og-id=\"q_f07:sq15:og1\"></span>"
        },
        slots: [
          {
            id: "q_f07:sq15:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f07:sq15:og1",
            select: "single",
            blank: {
              style: "underline",
              size: 8,
              inlineLabel: "15"
            },
            anchored: true
          }
        ],
        optionGroups: [
          {
            id: "q_f07:sq15:og1",
            options: [
              {
                id: "q_f07:sq15:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">courage</span>"
                }
              },
              {
                id: "q_f07:sq15:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">honesty</span>"
                }
              },
              {
                id: "q_f07:sq15:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">kindness</span>"
                }
              },
              {
                id: "q_f07:sq15:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">optimism</span>"
                }
              }
            ],
            cols: 4,
            layout: "inline",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      }
    ],
    media: [],
    meta: {
      source: {
        provider: "xkw",
        externalId: "doc-sample-f07",
        sourceKind: "premium"
      },
      typeId: null,
      typeName: "完形填空",
      difficulty: null,
      difficultyLevel: null,
      knowledgePoints: [],
      years: [],
      sourcePapers: [],
      courseName: "高中英语"
    },
    raw: null
  },
  review: {
    questionId: "q_f07",
    contentVersion: "fixture-v1",
    referenceAnswers: [
      {
        slotId: "q_f07:sq1:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f07:sq1:og1:D"
          ]
        }
      },
      {
        slotId: "q_f07:sq2:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f07:sq2:og1:C"
          ]
        }
      },
      {
        slotId: "q_f07:sq3:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f07:sq3:og1:A"
          ]
        }
      },
      {
        slotId: "q_f07:sq4:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f07:sq4:og1:B"
          ]
        }
      },
      {
        slotId: "q_f07:sq5:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f07:sq5:og1:B"
          ]
        }
      },
      {
        slotId: "q_f07:sq6:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f07:sq6:og1:C"
          ]
        }
      },
      {
        slotId: "q_f07:sq7:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f07:sq7:og1:D"
          ]
        }
      },
      {
        slotId: "q_f07:sq8:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f07:sq8:og1:A"
          ]
        }
      },
      {
        slotId: "q_f07:sq9:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f07:sq9:og1:A"
          ]
        }
      },
      {
        slotId: "q_f07:sq10:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f07:sq10:og1:C"
          ]
        }
      },
      {
        slotId: "q_f07:sq11:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f07:sq11:og1:B"
          ]
        }
      },
      {
        slotId: "q_f07:sq12:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f07:sq12:og1:D"
          ]
        }
      },
      {
        slotId: "q_f07:sq13:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f07:sq13:og1:B"
          ]
        }
      },
      {
        slotId: "q_f07:sq14:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f07:sq14:og1:C"
          ]
        }
      },
      {
        slotId: "q_f07:sq15:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f07:sq15:og1:A"
          ]
        }
      }
    ],
    answerFallback: null,
    explanation: [
      {
        name: "分析",
        content: {
          html: "<p style=\"\"><span style=\"\">本文是记叙文。讲述了警察王先生在过去的38年里，多次假扮别人，甚至学会了说不同的方言，不顾危险混入犯罪团伙，成功破案的故事。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "question"
        }
      },
      {
        name: "(1)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">考查动词词义辨析。句意：在过去的38年里，王先生多次假扮别人，甚至学会了说不同的方言，这让他被称为“奥斯卡获奖演员”。A.teach 教授；B.compare 比较；C.assess评估； D.speak讲话 。根据“Mr. Wang has pretended to be someone else many times”可知，能扮成别人，还会讲不同的方言。故填D。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f07:sq1"
        }
      },
      {
        name: "(2)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">考查名词词义辨析。句意：这位60岁的老人不是演员，而是警察 。A.lawyer 律师；B.doctor医生； C.policeman 警察；D.businessman 商人。根据“To look into the 　　　　　　　　，Wang disguised（伪装）himself”以及“including a National May Day Labor Medal and 11 Citations of Merit.Paris.”可知，王先生是一名警察。故填C。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f07:sq2"
        }
      },
      {
        name: "(3)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">考查名词词义辨析。句意：然而，他比任何真正的演员都更专注于</span><span style=\"\">他的“角色”</span><span style=\"\">。A.role 角色；B.study学习； C.family 家庭；D.audience观众 。根据“than any real actor.”可知，王投身于演员的角色中。故填A。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f07:sq3"
        }
      },
      {
        name: "(4)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">考查名词词义辨析。句意：为了调查这个案子,王伪装自己并加入了乞丐中。A.minor 未成年人，辅修；B.case 情况,案件；C.future 未来；D.question问题 。根据“In the 1990s, a group of thieves often sold stolen goods with the help of some beggars. ”可知，这是一起犯罪案件。故填B。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f07:sq4"
        }
      },
      {
        name: "(5)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">考查动词词义辨析。句意：为了调查这个案子,王伪装自己并加入了乞丐中。A.interviewed采访； B.joined 加入；C.arrested 逮捕；D.assisted协助。根据“To look into the”可知，他混入乞丐中。故填B。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f07:sq5"
        }
      },
      {
        name: "(6)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">考查名词词义辨析。句意：肮脏的短裤和旧鞋子使他看起来像一个真正的乞丐，他那令人信服的方言很快赢得了乞丐们的信任。A.challenge 挑战；B.experience 经历；C.appearance出现，外表； D.freedom自由 。根据“ Dirty shorts and old shoes”可知，这是描述外表。故填C。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f07:sq6"
        }
      },
      {
        name: "(7)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">考查名词词义辨析。句意：肮脏的短裤和旧鞋子使他看起来像一个真正的乞丐，他那令人信服的方言很快赢得了乞丐们的信任。A.vote 投票；B.sympathy 同情；C.permission 批准；D.trust 信任。根据“ his convincing dialect soon won him the”可知，他的方言讲得好，赢得乞丐们信任。故填D。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f07:sq7"
        }
      },
      {
        name: "(8)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">考查动词词义辨析。句意：“我经常邀请他们喝酒。一旦他们喝醉了，他们就开始说很多话。A.invited 邀请；B.forced 强迫；C.helped 帮助；D.expected期待。根据“them to drink alcohol”可知，为了套话，王先生请他们喝酒。故填A。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f07:sq8"
        }
      },
      {
        name: "(9)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">考查形容词词义辨析。句意：“我经常邀请他们喝酒。一旦他们喝醉了，他们就开始说很多话。A.drunk喝醉的； B.deserted抛弃的； C.bored 无聊的；D.lost失去的 。根据“them to drink alcohol”可知，话多是在喝醉后。故填A。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f07:sq9"
        }
      },
      {
        name: "(10)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">考查动词词义辨析。句意：然后我会借口自己去厕所，记下乞丐说了什么，然后把信息发给我的队友。A.guide 引导；B.persuade劝说； C.excuse 找借口；D.allow允许 。根据“and send the 　　　　　　　　 to my teammates.”可知，为了发送出信息，王借口去厕所。故填C。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f07:sq10"
        }
      },
      {
        name: "(11)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">考查动词短语词义辨析。句意：然后我会借口自己去厕所，记下乞丐说了什么，然后把信息发给我的队友。A.refer to 指的是；B.note down作记录; C.ask about 询问；D.miss out 错过，遗漏。根据“what the beggars said, ”可知，王把乞丐醉后真言记下来。故填B。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f07:sq11"
        }
      },
      {
        name: "(12)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">考查名词词义辨析。句意：然后我会借口自己去厕所，记下乞丐说了什么，然后把信息发给我的队友。A.plan 计划；B.agreement 同意；C.direction 指导；D.information 信息。根据“what the beggars said, ”可知，这是重要信息。故填D。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f07:sq12"
        }
      },
      {
        name: "(13)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">考查形容词词义辨析。句意：王是经常在危险的情况下,也是一个柔道大师。A.awkward 尴尬的；B.dangerous危险的； C.unfortunate 不幸的；D.strange奇怪的 。根据“ no criminal can 　　　　　　　　 from me,\"”可知，经常处于犯罪分子中，这是很危险的情况。故填B。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f07:sq13"
        }
      },
      {
        name: "(14)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">考查动词词义辨析。句意：“只要我离得够近，任何罪犯都逃不掉，”他说。A.separate 分离；B.recover恢复； C.escape 逃避；D.hear 听到。根据“ is also a judo （柔道） master. ”可知，身为柔道大师，他不放过罪犯。故填C。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f07:sq14"
        }
      },
      {
        name: "(15)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">考查名词词义辨析。句意：王的勇气为他赢得了许多荣誉，包括一枚全国五一劳动奖章和11项嘉奖。A.courage 勇气；B.honesty 诚实；C.kindness 善良；D.optimism 乐观。根据“Wang disguised（伪装）himself”可知，王乔装打扮混入罪犯团伙，勇气可嘉。故填A。</span>\n\t\t\t</p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f07:sq15"
        }
      },
      {
        name: "点睛",
        content: {
          html: "<p style=\"\"><span style=\"\"></span></p>"
        },
        scope: {
          kind: "question"
        }
      }
    ],
    media: []
  }
}

/** 原始 HTML：raw/f08-poem-subquestions.html */
export const f08PoemSubquestions: QuestionFixture = {
  view: {
    id: "q_f08",
    contentVersion: "fixture-v1",
    structure: "parsed",
    numbering: "per-question",
    stem: {
      html: "<p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">阅读下面的首宋诗，完成下面小题。</span></p>\n        <p style=\"text-align: center;\"><span style=\"font-family: 楷体;\"><span>怀嵩楼新开南轩与郡僚小饮</span><sup>①</sup></span>\n        </p>\n        <p style=\"text-align: center;\"><span style=\"font-family: 楷体;\">欧阳修</span></p>\n        <p style=\"text-align: center;\"><span style=\"font-family: 楷体;\">绕郭云烟匝几重，昔人曾此感怀嵩。</span></p>\n        <p style=\"text-align: center;\"><span style=\"font-family: 楷体;\">霜林落后山争出，野菊开时酒正浓。</span></p>\n        <p style=\"text-align: center;\"><span style=\"font-family: 楷体;\"><span>解带西风飘画角</span><sup>②</sup><span>，倚栏斜日照青松。</span></span>\n        </p>\n        <p style=\"text-align: center;\"><span style=\"font-family: 楷体;\">会须乘兴携佳客，踏雪来看群玉峰。</span></p>\n        <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">【注释】①此诗写于欧阳修被贬滁州期间。怀嵩楼为唐代名相李德裕被贬滁州时所建。②画角：乐器名，发声高亢。</span>\n        </p>\n        <span data-sq-id=\"q_f08:sq1\"></span>\n        <span data-sq-id=\"q_f08:sq2\"></span>"
    },
    slots: [],
    optionGroups: [],
    subQuestions: [
      {
        id: "q_f08:sq1",
        label: "（1）",
        stem: {
          html: "<span style=\"font-family: 宋体;\">下列对这首诗的理解和赏析，</span><span style=\"font-family: 宋体;\" em=\"\">不恰当</span><span style=\"font-family: 宋体;\">的一项是（<span style=\"font-family: &#x27;Times New Roman&#x27;\" qml-space-size=\"3\">     </span>）</span>\n                <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">【</span><span style=\"font-family: 宋体;\" em=\"\">提示</span><span style=\"font-family: 宋体;\">：请用2B铅笔将本题答案填涂在答题卡选择题区域的对应题号后】</span>\n                </p>\n                <span data-og-id=\"q_f08:sq1:og1\"></span>"
        },
        slots: [
          {
            id: "q_f08:sq1:bk",
            mechanism: "choice",
            grading: "auto",
            optionGroupId: "q_f08:sq1:og1",
            select: "single",
            blank: null,
            anchored: false
          }
        ],
        optionGroups: [
          {
            id: "q_f08:sq1:og1",
            options: [
              {
                id: "q_f08:sq1:og1:A",
                label: "A",
                content: {
                  html: "<span style=\"font-family: 宋体;\">这是一首七言律诗，写景自然流畅，于景物描绘中可以看出诗人的精神面貌。</span>"
                }
              },
              {
                id: "q_f08:sq1:og1:B",
                label: "B",
                content: {
                  html: "<span style=\"font-family: 宋体;\">“野菊开时酒正浓”描绘了深秋时节野菊竞相开放、诗人与郡僚举杯畅饮的画面。</span>"
                }
              },
              {
                id: "q_f08:sq1:og1:C",
                label: "C",
                content: {
                  html: "<span style=\"font-family: 宋体;\">颈联中“青松”意象耐人寻味，在斜日映照下，给人苍翠挺拔之感。</span>"
                }
              },
              {
                id: "q_f08:sq1:og1:D",
                label: "D",
                content: {
                  html: "<span style=\"font-family: 宋体;\">本诗采用了虚实结合的手法，表达了诗人被贬后的抑郁悲愤之情。</span>"
                }
              }
            ],
            cols: 1,
            layout: "table",
            reuse: null,
            anchored: true
          }
        ],
        media: []
      },
      {
        id: "q_f08:sq2",
        label: "（2）",
        stem: {
          html: "<span style=\"font-family: 宋体;\">赏析“霜林落后山</span><span style=\"font-family: 宋体;\" em=\"\">争</span><span style=\"font-family: 宋体;\">出”中“争”的妙处。</span>"
        },
        slots: [
          {
            id: "q_f08:sq2:bk",
            mechanism: "essay",
            grading: "none",
            optionGroupId: null,
            select: null,
            blank: null,
            anchored: false
          }
        ],
        optionGroups: [],
        media: []
      }
    ],
    media: [],
    meta: {
      source: {
        provider: "xkw",
        externalId: "doc-sample-f08",
        sourceKind: "premium"
      },
      typeId: null,
      typeName: "诗歌鉴赏",
      difficulty: null,
      difficultyLevel: null,
      knowledgePoints: [],
      years: [],
      sourcePapers: [],
      courseName: "高中语文"
    },
    raw: null
  },
  review: {
    questionId: "q_f08",
    contentVersion: "fixture-v1",
    referenceAnswers: [
      {
        slotId: "q_f08:sq1:bk",
        answer: {
          kind: "options",
          optionIds: [
            "q_f08:sq1:og1:D"
          ]
        }
      },
      {
        slotId: "q_f08:sq2:bk",
        answer: {
          kind: "rich",
          content: {
            html: "<span style=\"font-family: 宋体;\">示例1：“争”，运用了拟人的修辞手法，赋予群山人的情态，生动描绘出深秋霜林木落、景象萧疏，而群山仿佛争先恐后出现的画面，表现了诗人昂扬向上、傲岸不屈的精神。</span>\n            <p style=\"text-align: left;\"><span style=\"font-family: 宋体;\">示例2：“争”，化静为动，把静止的群山写活了，生动描绘出深秋霜林木落、景象萧疏，而群山仿佛争先恐后出现的画面，表现了诗人昂扬向上、傲岸不屈的精神。</span></p>"
          }
        }
      }
    ],
    answerFallback: null,
    explanation: [
      {
        name: "分析",
        content: {
          html: "<span></span>"
        },
        scope: {
          kind: "question"
        }
      },
      {
        name: "(1)小问详解",
        content: {
          html: "<p style=\"\"><span style=\"font-family: 宋体;\">本题考查对诗歌内容的理解与赏析。</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">D.</span><span style=\"font-family: 宋体;\">有误，本诗采用了虚实结合的手法，特别是从“会须乘兴携佳客，踏雪来看群玉峰”可以看出，表达了诗人从容面对政治风雨的潇洒和从容。故选</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">D</span><span style=\"font-family: 宋体;\">。</span></p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f08:sq1"
        }
      },
      {
        name: "(2)小问详解",
        content: {
          html: "<p style=\"\"><span style=\"font-family: 宋体;\">考查对词语的赏析。对于词语的赏析，要在把握诗文内容的基础上，结合诗文的主旨和具体的诗句分析作答。这类试题涉及到古诗的“炼字”技巧。采用答题格式是：先解释词语的意思，再结合诗句分析表达的内容，最后写其表达效果。诗句“霜林落后山争出”的“争”，是争相恐后的意思，这里运用拟人的修辞手法，同时又化静为动，赋予了“山”人的情态，生动形象地写出了秋霜下树林里木叶凋尽，众山显现的情景，表达了一种昂扬向上、傲岸不屈、豪放达观的精神，从而表现出诗人不畏政治风霜的风骨。据此理解赏析作答。</span>\n        </p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f08:sq2"
        }
      },
      {
        name: "点睛",
        content: {
          html: "<p style=\"\"><span style=\"font-family: 宋体;\">赏析与译文：</span>\n        </p>\n            <p style=\"text-indent: 28px;\"><span style=\"font-family: 宋体;\">《怀嵩楼新开南轩与郡僚小饮》是北宋文学家欧阳修创作的一首七言律诗。首联写登上高楼，于云烟弥漫之中追怀历史、遥想古人，借古伤今，气氛凝重。中间两联回到现实，写眼前所见所闻，这两联视野开阔，人与物浑融无间。诗人把个人独特的精神气质寓于精炼的景物描写之中：颔联写霜后“争出”的峭拔山峰和凌霜盛开的菊花，表现出作者不畏政治风霜的嶙峋风骨；颈联则以“解带西风”的举止和暮色中挺立的青松，透射出自己从容面对政治风雨的那份潇洒和从容。尾联遥想冬日重游，气象恢宏，群山银妆素裹冰清玉洁之态，仍是以景物暗喻人品。</span>\n            </p>\n            <p style=\"\"><span style=\"font-family: 宋体;\">译文：</span></p>\n            <p style=\"text-indent: 28px;\"><span style=\"font-family: 宋体;\">环绕城郭的浓浓云烟，迷迷朦朦不知有多少重，唐时的名相曾经在此地怀念嵩洛感慨无穷。秋霜下树林里木叶凋尽，众山争相显露各自面容，野菊开放的美好时令，我们畅饮醇酒逸兴正浓。西风中飘来画角清哀的声音，我解开衣带胸怀更加豪雄，斜倚着楼上高栏观赏夕阳照在苍翠的青松。我将要乘着醉意带领佳客，冬雪皑皑时再踏上如玉的群峰。</span>\n            </p>"
        },
        scope: {
          kind: "question"
        }
      }
    ],
    media: []
  }
}

/** 原始 HTML：raw/f09-judge.html */
export const f09Judge: QuestionFixture = {
  view: {
    id: "q_f09",
    contentVersion: "fixture-v1",
    structure: "parsed",
    numbering: "sequential",
    stem: {
      html: "<p style=\"text-align:justify;word-break:break-word\">\n        <span style=\"font-family: 宋体;\">走进叶圣陶笔下《稻草人》的世界，判断下列说法的正误，正确的打“√”，错误的打“×”。</span>\n    </p>\n    <span data-sq-id=\"q_f09:sq1\"></span>\n    <span data-sq-id=\"q_f09:sq2\"></span>"
    },
    slots: [],
    optionGroups: [],
    subQuestions: [
      {
        id: "q_f09:sq1",
        label: "1.",
        stem: {
          html: "<p style=\"\">\n                <span style=\"font-family: 宋体;\">稻草人的主人公是生病的孩子。</span><span class=\"qml-bk\" data-slot-id=\"q_f09:sq1:bk1\"></span>\n            </p>"
        },
        slots: [
          {
            id: "q_f09:sq1:bk1",
            mechanism: "judge",
            grading: "auto",
            optionGroupId: null,
            select: null,
            blank: {
              style: "bracket",
              size: 6,
              inlineLabel: null
            },
            anchored: true
          }
        ],
        optionGroups: [],
        media: []
      },
      {
        id: "q_f09:sq2",
        label: "2.",
        stem: {
          html: "<p style=\"\">\n                <span style=\"font-family: 宋体;\">稻草人发现自己看守的稻田里出现了小蛾产卵吃稻叶的问题，他非常焦急。 </span><span class=\"qml-bk\" data-slot-id=\"q_f09:sq2:bk2\"></span>\n            </p>"
        },
        slots: [
          {
            id: "q_f09:sq2:bk2",
            mechanism: "judge",
            grading: "auto",
            optionGroupId: null,
            select: null,
            blank: {
              style: "bracket",
              size: 6,
              inlineLabel: null
            },
            anchored: true
          }
        ],
        optionGroups: [],
        media: []
      }
    ],
    media: [],
    meta: {
      source: {
        provider: "xkw",
        externalId: "doc-sample-f09",
        sourceKind: "premium"
      },
      typeId: null,
      typeName: "判断题",
      difficulty: null,
      difficultyLevel: null,
      knowledgePoints: [],
      years: [],
      sourcePapers: [],
      courseName: "小学语文"
    },
    raw: null
  },
  review: {
    questionId: "q_f09",
    contentVersion: "fixture-v1",
    referenceAnswers: [
      {
        slotId: "q_f09:sq1:bk1",
        answer: {
          kind: "judge",
          value: false
        }
      },
      {
        slotId: "q_f09:sq2:bk2",
        answer: {
          kind: "judge",
          value: true
        }
      }
    ],
    answerFallback: null,
    explanation: [
      {
        name: "(1)题详解",
        content: {
          html: "<p style=\"\"><span style=\"font-family: 宋体;\">本题考查名著阅读。</span></p>\n        <p style=\"\">\n            <span style=\"font-family: 宋体;\"><span>《稻草人》</span><span>是叶圣陶1922年发表的中国现代童话。通过一个富有同情心而又无能为力的稻草人的所见所思，真实地描写了二十世纪二十年代中国农村风雨飘摇的人间百态，展现了当时劳动人民的苦难。《稻草人》的主人公是稻草人。题干表述错误。</span></span>\n        </p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f09:sq1"
        }
      },
      {
        name: "(2)题详解",
        content: {
          html: "<p style=\"\"><span style=\"font-family: 宋体;\">本题考查名著阅读。</span></p>\n        <p style=\"\">\n            <span style=\"font-family: 宋体;\">根据《稻草人》原文可知：小蛾是“稻子的仇敌，也是主人的仇敌”稻草人需要保护稻田，发现小蛾出在稻田中，但是自己却无法驱赶小蛾，而小蛾会在稻田中产卵吃稻叶，会破坏稻田，所以稻草人才会十分着急。题干表述正确。</span>\n        </p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f09:sq2"
        }
      }
    ],
    media: []
  }
}

/** 原始 HTML：raw/f10-seven-choose-five.html */
export const f10SevenChooseFive: QuestionFixture = {
  view: {
    id: "q_f10",
    contentVersion: "fixture-v1",
    structure: "parsed",
    numbering: "none",
    stem: {
      html: "<p style=\"\"><span style=\"\">If the only reading you ever do is the novel or magazine, the speed at which you read -probably does not matter very much. But if you have to read a great deal for study, you will appreciate the benefits of being able to read more quickly. </span><span class=\"qml-bk\" data-slot-id=\"q_f10:bk1\"></span>\n        </p>\n        <p style=\"\"><span style=\"\">·Before you open the book, make sure that you are comfortable. You need a seat which supports your back and the book should be at the right distance from your eyes. </span><span class=\"qml-bk\" data-slot-id=\"q_f10:bk2\"></span>\n        </p>\n        <p style=\"\"><span class=\"qml-bk\" data-slot-id=\"q_f10:bk3\"></span><span style=\"\"> Look at the table of contents, the preface, the chapter heading,etc.This will help you to decide whether you really need to read the whole book or only certain parts of it. Ten minutes spent in this way could save you quite a lot of time in the long run.</span>\n        </p>\n        <p style=\"\"><span style=\"\">If you decide that you need to read the whole book, decide how much you can read at a time. </span><span class=\"qml-bk\" data-slot-id=\"q_f10:bk4\"></span><span style=\"\"> A history book which may contain the facts in story form will be easier to read than one dealing with scientific subjects. In the former case you may be able to read a chapter. In the latter you may only be able to read one page.</span>\n        </p>\n        <p style=\"\"><span style=\"\">Always keep a pencil and paper beside you. </span><span class=\"qml-bk\" data-slot-id=\"q_f10:bk5\"></span><span style=\"\">Note also the facts important for your purpose as well as anything which leads you to further research. You don't have to write these things in detail. It is enough to put the page number and one or two words as a reminder .</span>\n        </p>\n        <div class=\"\">\n            <span data-og-id=\"q_f10:og1\"></span>\n        </div>"
    },
    slots: [
      {
        id: "q_f10:bk1",
        mechanism: "pool-assign",
        grading: "auto",
        optionGroupId: "q_f10:og1",
        select: null,
        blank: {
          style: "underline",
          size: 9,
          inlineLabel: "1"
        },
        anchored: true
      },
      {
        id: "q_f10:bk2",
        mechanism: "pool-assign",
        grading: "auto",
        optionGroupId: "q_f10:og1",
        select: null,
        blank: {
          style: "underline",
          size: 9,
          inlineLabel: "2"
        },
        anchored: true
      },
      {
        id: "q_f10:bk3",
        mechanism: "pool-assign",
        grading: "auto",
        optionGroupId: "q_f10:og1",
        select: null,
        blank: {
          style: "underline",
          size: 9,
          inlineLabel: "3"
        },
        anchored: true
      },
      {
        id: "q_f10:bk4",
        mechanism: "pool-assign",
        grading: "auto",
        optionGroupId: "q_f10:og1",
        select: null,
        blank: {
          style: "underline",
          size: 9,
          inlineLabel: "4"
        },
        anchored: true
      },
      {
        id: "q_f10:bk5",
        mechanism: "pool-assign",
        grading: "auto",
        optionGroupId: "q_f10:og1",
        select: null,
        blank: {
          style: "underline",
          size: 9,
          inlineLabel: "5"
        },
        anchored: true
      }
    ],
    optionGroups: [
      {
        id: "q_f10:og1",
        options: [
          {
            id: "q_f10:og1:A",
            label: "A",
            content: {
              html: "<span style=\"\">Stop to have a rest now and then.</span>"
            }
          },
          {
            id: "q_f10:og1:B",
            label: "B",
            content: {
              html: "<span style=\"\">Spend a few minutes looking through the book.</span>"
            }
          },
          {
            id: "q_f10:og1:C",
            label: "C",
            content: {
              html: "<span style=\"\">This depends on the type of book you are reading.</span>"
            }
          },
          {
            id: "q_f10:og1:D",
            label: "D",
            content: {
              html: "<span style=\"\">Here are some tips to help improve your reading speed.</span>"
            }
          },
          {
            id: "q_f10:og1:E",
            label: "E",
            content: {
              html: "<span style=\"\">Make a note of any page which is of special importance.</span>"
            }
          },
          {
            id: "q_f10:og1:F",
            label: "F",
            content: {
              html: "<span style=\"\">You may find yourself having to leam something by heart.</span>"
            }
          },
          {
            id: "q_f10:og1:G",
            label: "G",
            content: {
              html: "<span style=\"\">Keep the room cool rather than warm to avoid feeling sleepy.</span>"
            }
          }
        ],
        cols: 1,
        layout: "table",
        reuse: "exclusive",
        anchored: true
      }
    ],
    subQuestions: [],
    media: [],
    meta: {
      source: {
        provider: "xkw",
        externalId: "doc-sample-f10",
        sourceKind: "premium"
      },
      typeId: null,
      typeName: "七选五",
      difficulty: null,
      difficultyLevel: null,
      knowledgePoints: [],
      years: [],
      sourcePapers: [],
      courseName: "高中英语"
    },
    raw: null
  },
  review: {
    questionId: "q_f10",
    contentVersion: "fixture-v1",
    referenceAnswers: [
      {
        slotId: "q_f10:bk1",
        answer: {
          kind: "options",
          optionIds: [
            "q_f10:og1:D"
          ]
        }
      },
      {
        slotId: "q_f10:bk2",
        answer: {
          kind: "options",
          optionIds: [
            "q_f10:og1:G"
          ]
        }
      },
      {
        slotId: "q_f10:bk3",
        answer: {
          kind: "options",
          optionIds: [
            "q_f10:og1:B"
          ]
        }
      },
      {
        slotId: "q_f10:bk4",
        answer: {
          kind: "options",
          optionIds: [
            "q_f10:og1:C"
          ]
        }
      },
      {
        slotId: "q_f10:bk5",
        answer: {
          kind: "options",
          optionIds: [
            "q_f10:og1:E"
          ]
        }
      }
    ],
    answerFallback: null,
    explanation: [
      {
        name: "分析",
        content: {
          html: "<p style=\"\"><span style=\"\">这是一篇说明文。文章主要介绍了一些帮助提高阅读速度的建议。</span></p>"
        },
        scope: {
          kind: "question"
        }
      },
      {
        name: "(1)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">根据上文“</span><span style=\"\">If the only reading you ever do is the novel or magazine, the speed at which you read -probably does not matter very much. But if you have to read a great deal for study, you will appreciate the benefits of being able to read more quickly.</span><span style=\"\">（如果你唯一的阅读是小说或杂志，那么你阅读的速度可能并不重要。但是，如果你必须大量阅读来学习，你就会感激能够更快地阅读的好处。）”可知，接下来要介绍提高阅读速度的方法。</span><span style=\"\">D</span><span style=\"\">项：</span><span style=\"\">Here are some tips to help improve your reading speed.</span><span style=\"\">（这里有一些帮助提高阅读速度的建议。）符合语境。故选</span><span style=\"\">D</span><span style=\"\">。</span></p>"
        },
        scope: {
          kind: "slot",
          slotId: "q_f10:bk1"
        }
      },
      {
        name: "(2)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">根据本段主题句“</span><span style=\"\">Before you open the book, make sure that you are comfortable.</span><span style=\"\">（在你打开书之前，确保你感到舒服。）”可知，本段主要说明要给自己创造舒适的阅读环境。</span><span style=\"\">G</span><span style=\"\">项：</span><span style=\"\">Keep the room cool rather than warm to avoid feeling sleepy.</span><span style=\"\">（保持房间凉爽而不是温暖以避免困倦。）符合语境。故选</span><span style=\"\">G</span><span style=\"\">。</span></p>"
        },
        scope: {
          kind: "slot",
          slotId: "q_f10:bk2"
        }
      },
      {
        name: "(3)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">空处为段落主题句。根据下文“</span><span style=\"\">Look at the table of contents, the preface, the chapter heading,etc</span><span style=\"\">（查看目录、前言、章节标题等。）”可知，本段主要讲述在阅读一本书之前要先浏览一下大致内容。</span><span style=\"\">B</span><span style=\"\">项：</span><span style=\"\">Spend a few minutes looking through the book.</span><span style=\"\">（花几分钟浏览一下这本书。）符合语境。故选</span><span style=\"\">B</span><span style=\"\">。</span></p>"
        },
        scope: {
          kind: "slot",
          slotId: "q_f10:bk3"
        }
      },
      {
        name: "(4)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">根据上文“</span><span style=\"\">If you decide that you need to read the whole book, decide how much you can read at a time.</span><span style=\"\">（如果你决定要读完整本书，决定一下你一次能读多少。）”和下文“</span><span style=\"\">A history book which may contain the facts in story form will be easier to read than one dealing with scientific subjects.</span><span style=\"\">（以故事形式包含事实的历史书比科学题材的书更容易阅读。）</span><span style=\"\">”</span><span style=\"\">可知，看书时间的长短取决于书的类型。</span><span style=\"\">C</span><span style=\"\">项：</span><span style=\"\">This depends on the type of book you are reading.</span><span style=\"\">（这取决于你读的书的类型。）符合语境。故选</span><span style=\"\">C</span><span style=\"\">。</span>\n            </p>"
        },
        scope: {
          kind: "slot",
          slotId: "q_f10:bk4"
        }
      },
      {
        name: "(5)题详解",
        content: {
          html: "<p style=\"\"><span style=\"\">根据段落主题句</span><span style=\"\">“Always keep a pencil and paper beside you.</span><span style=\"\">（总是在身边放一支铅笔和一张纸。）</span><span style=\"\">”</span><span style=\"\">可知，本段强调要随时注意记笔记。</span><span style=\"\">E</span><span style=\"\">项：</span><span style=\"\">Make a note of any page which is of special importance.</span><span style=\"\">（把任何有特别重要的一页都记下来。）符合语境。故选</span><span style=\"\">E</span><span style=\"\">。</span></p>"
        },
        scope: {
          kind: "slot",
          slotId: "q_f10:bk5"
        }
      }
    ],
    media: []
  }
}

/** 原始 HTML：raw/f11-exact-blanks.html */
export const f11ExactBlanks: QuestionFixture = {
  view: {
    id: "q_f11",
    contentVersion: "fixture-v1",
    structure: "parsed",
    numbering: "none",
    stem: {
      html: "<p style=\"\">\n            <span style=\"font-family: 宋体;\">根据短文内容和所给中文提示</span>\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;\">,\n            <span style=\"font-family: &#x27;Times New Roman&#x27;\" qml-space-size=\"2\">   </span>\n        </span>\n            <span style=\"font-family: 宋体;\">用单词的正确形式完成以下短文。</span>\n        </p>\n        <p style=\"\">\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;\">Mr. Brown had an umbrella shop in a small town. People </span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f11:bk1\"></span>\n            <span style=\"font-family: 宋体;\">（有时候）</span>\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;\">brought him broken umbrellas. He repaired some of them by himself and took the others to a big shop in London. They were usually repaired there in </span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f11:bk2\"></span>\n            <span style=\"font-family: 宋体;\">（十二）</span>\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;\">days.</span>\n        </p>\n        <p style=\"\">\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;\">One day Mr. Brown went to London by train. He </span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f11:bk3\"></span>\n            <span style=\"font-family: 宋体;\">（忘记）</span>\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;\">to take an umbrella with him that day. Sitting in front of him was an old man with an umbrella standing </span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f11:bk4\"></span>\n            <span style=\"font-family: 宋体;\">（在……旁边）</span>\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;\">the seat. When the train </span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f11:bk5\"></span>\n            <span style=\"font-family: 宋体;\">（到达）</span>\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;\">in London, Mr. Brown picked up the umbrella as he often did during his </span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f11:bk6\"></span>\n            <span style=\"font-family: 宋体;\">（旅途）</span>\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;\"> by train. Just as he was getting off, he was stopped by the old man. He said angrily, “That’s </span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f11:bk7\"></span>\n            <span style=\"font-family: 宋体;\">（我的）</span>\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;\">!” Mr. Brown’s face turned red. He gave it back to the old man at once. When Mr. Brown got to the big shop, the shopkeeper had got his six umbrellas ready. After a good look at each of them, he was </span>s\n            <span class=\"qml-bk\" data-slot-id=\"q_f11:bk8\"></span>\n            <span style=\"font-family: 宋体;\">（满意的）</span>\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;\">.</span>\n        </p>\n        <p style=\"\">\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;\">In the afternoon, with the repaired umbrellas, he got into the train again back to his town. </span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f11:bk9\"></span>\n            <span style=\"font-family: 宋体;\">（令人惊讶地）</span>\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;\">,\n            <span style=\"font-family: &#x27;Times New Roman&#x27;\" qml-space-size=\"2\">   </span>the same old man was sitting next to him. He looked at Mr. Brown and his six umbrellas, “You’ve had a\n        </span>\n            <span class=\"qml-bk\" data-slot-id=\"q_f11:bk10\"></span>\n            <span style=\"font-family: 宋体;\">（幸运的）</span>\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;\">day today.” he said.</span>\n        </p>"
    },
    slots: [
      {
        id: "q_f11:bk1",
        mechanism: "text",
        grading: "auto",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 8,
          inlineLabel: "1"
        },
        anchored: true
      },
      {
        id: "q_f11:bk2",
        mechanism: "text",
        grading: "auto",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 8,
          inlineLabel: "2"
        },
        anchored: true
      },
      {
        id: "q_f11:bk3",
        mechanism: "text",
        grading: "auto",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 8,
          inlineLabel: "3"
        },
        anchored: true
      },
      {
        id: "q_f11:bk4",
        mechanism: "text",
        grading: "auto",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 8,
          inlineLabel: "4"
        },
        anchored: true
      },
      {
        id: "q_f11:bk5",
        mechanism: "text",
        grading: "auto",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 8,
          inlineLabel: "5"
        },
        anchored: true
      },
      {
        id: "q_f11:bk6",
        mechanism: "text",
        grading: "auto",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 8,
          inlineLabel: "6"
        },
        anchored: true
      },
      {
        id: "q_f11:bk7",
        mechanism: "text",
        grading: "auto",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 8,
          inlineLabel: "7"
        },
        anchored: true
      },
      {
        id: "q_f11:bk8",
        mechanism: "text",
        grading: "auto",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 8,
          inlineLabel: "8"
        },
        anchored: true
      },
      {
        id: "q_f11:bk9",
        mechanism: "text",
        grading: "auto",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 8,
          inlineLabel: "9"
        },
        anchored: true
      },
      {
        id: "q_f11:bk10",
        mechanism: "text",
        grading: "auto",
        optionGroupId: null,
        select: null,
        blank: {
          style: "underline",
          size: 8,
          inlineLabel: "10"
        },
        anchored: true
      }
    ],
    optionGroups: [],
    subQuestions: [],
    media: [],
    meta: {
      source: {
        provider: "xkw",
        externalId: "doc-sample-f11",
        sourceKind: "premium"
      },
      typeId: null,
      typeName: "语法填空",
      difficulty: null,
      difficultyLevel: null,
      knowledgePoints: [],
      years: [],
      sourcePapers: [],
      courseName: "初中英语"
    },
    raw: null
  },
  review: {
    questionId: "q_f11",
    contentVersion: "fixture-v1",
    referenceAnswers: [
      {
        slotId: "q_f11:bk1",
        answer: {
          kind: "exact",
          accepted: [
            "sometimes"
          ],
          display: {
            html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">sometimes</span>"
          }
        }
      },
      {
        slotId: "q_f11:bk2",
        answer: {
          kind: "exact",
          accepted: [
            "twelve"
          ],
          display: {
            html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">twelve</span>"
          }
        }
      },
      {
        slotId: "q_f11:bk3",
        answer: {
          kind: "exact",
          accepted: [
            "forgot"
          ],
          display: {
            html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">forgot</span>"
          }
        }
      },
      {
        slotId: "q_f11:bk4",
        answer: {
          kind: "exact",
          accepted: [
            "beside"
          ],
          display: {
            html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">beside</span>"
          }
        }
      },
      {
        slotId: "q_f11:bk5",
        answer: {
          kind: "exact",
          accepted: [
            "arrived"
          ],
          display: {
            html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">arrived</span>"
          }
        }
      },
      {
        slotId: "q_f11:bk6",
        answer: {
          kind: "exact",
          accepted: [
            "trip",
            "journey"
          ],
          display: {
            html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">trip##journey</span>"
          }
        }
      },
      {
        slotId: "q_f11:bk7",
        answer: {
          kind: "exact",
          accepted: [
            "mine"
          ],
          display: {
            html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">mine</span>"
          }
        }
      },
      {
        slotId: "q_f11:bk8",
        answer: {
          kind: "exact",
          accepted: [
            "(s)atisfied"
          ],
          display: {
            html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">(s)atisfied</span>"
          }
        }
      },
      {
        slotId: "q_f11:bk9",
        answer: {
          kind: "exact",
          accepted: [
            "Surprisingly",
            "Amazingly"
          ],
          display: {
            html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">Surprisingly##Amazingly</span>"
          }
        }
      },
      {
        slotId: "q_f11:bk10",
        answer: {
          kind: "exact",
          accepted: [
            "lucky",
            "fortunate"
          ],
          display: {
            html: "<span style=\"font-family: &#x27;Times New Roman&#x27;;\">lucky##fortunate</span>"
          }
        }
      }
    ],
    answerFallback: null,
    explanation: [],
    media: []
  }
}

/** 原始 HTML：raw/f12-mathml-subquestions.html */
export const f12MathmlSubquestions: QuestionFixture = {
  view: {
    id: "q_f12",
    contentVersion: "fixture-v1",
    structure: "parsed",
    numbering: "per-question",
    stem: {
      html: "<p style=\"text-align: left;\">\n            <span style=\"font-family: 宋体;\">在直角坐标系</span>\n            <math latex=\"$xOy$\">\n                <mrow><mi>x</mi><mi>O</mi><mi>y</mi></mrow>\n            </math>\n            <span style=\"font-family: 宋体;\">中，已知圆</span>\n            <math latex=\"$C:5{{x}^{2}}+5{{y}^{2}}+10y-4=0$\">\n                <mrow>\n                    <mi>C</mi><mo>:</mo><mn>5</mn><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>5</mn><msup><mi>y</mi><mn>2</mn></msup><mo>+</mo><mn>10</mn><mi>y</mi><mo>−</mo><mn>4</mn><mo>=</mo><mn>0</mn>\n                </mrow>\n            </math>\n            <span style=\"font-family: 宋体;\">，</span><span style=\"font-family: &#x27;Times New Roman&#x27;;font-style: italic;\">A</span><span style=\"font-family: 宋体;\">、</span>\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;font-style: italic;\">B</span><span style=\"font-family: 宋体;\">是抛物线</span>\n            <math latex=\"$S:{{x}^{2}}=2py\\\\left( p>0 \\\\right)$\">\n                <mrow>\n                    <mi>S</mi><mo>:</mo><msup><mi>x</mi><mn>2</mn></msup><mo>=</mo><mn>2</mn><mi>p</mi><mi>y</mi>\n                    <mrow>\n                        <mo>(</mo><mrow><mi>p</mi><mo>></mo><mn>0</mn></mrow><mo>)</mo>\n                    </mrow>\n                </mrow>\n            </math>\n            <span style=\"font-family: 宋体;\">上两点，</span>\n            <math latex=\"$\\\\vartriangle OAB$\">\n                <mrow><mo>△</mo><mi>O</mi><mi>A</mi><mi>B</mi></mrow>\n            </math>\n            <span style=\"font-family: 宋体;\">的重心恰好为抛物线</span><span style=\"font-family: &#x27;Times New Roman&#x27;;font-style: italic;\">S</span><span style=\"font-family: 宋体;\">的焦点</span>\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;font-style: italic;\">F</span><span style=\"font-family: 宋体;\">，且</span>\n            <math latex=\"$\\\\vartriangle OAB$\">\n                <mrow><mo>△</mo><mi>O</mi><mi>A</mi><mi>B</mi></mrow>\n            </math>\n            <span style=\"font-family: 宋体;\">的面积为</span>\n            <math latex=\"$\\\\frac{3\\\\sqrt{6}}{2}$\">\n                <mrow>\n                    <mfrac>\n                        <mrow>\n                            <mn>3</mn><msqrt><mn>6</mn></msqrt>\n                        </mrow>\n                        <mn>2</mn>\n                    </mfrac>\n                </mrow>\n            </math>\n            <span style=\"font-family: &#x27;Times New Roman&#x27;;\">.</span>\n        </p>\n        <span data-sq-id=\"q_f12:sq1\"></span>\n        <span data-sq-id=\"q_f12:sq2\"></span>"
    },
    slots: [],
    optionGroups: [],
    subQuestions: [
      {
        id: "q_f12:sq1",
        label: "（1）",
        stem: {
          html: "<span style=\"font-family: 宋体;\">求</span><span style=\"font-family: &#x27;Times New Roman&#x27;;font-style: italic;\">p</span><span style=\"font-family: 宋体;\">的值；</span>"
        },
        slots: [
          {
            id: "q_f12:sq1:bk",
            mechanism: "essay",
            grading: "none",
            optionGroupId: null,
            select: null,
            blank: null,
            anchored: false
          }
        ],
        optionGroups: [],
        media: []
      },
      {
        id: "q_f12:sq2",
        label: "（2）",
        stem: {
          html: "<span style=\"font-family: 宋体;\">求</span>\n                <math latex=\"$\\\\odot C$\">\n                    <mrow><mo>⊙</mo><mi>C</mi></mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">与抛物线</span><span style=\"font-family: &#x27;Times New Roman&#x27;;font-style: italic;\">S</span><span style=\"font-family: 宋体;\">的公切线的方程</span>\n                <span style=\"font-family: &#x27;Times New Roman&#x27;;\">.</span>\n                <br>"
        },
        slots: [
          {
            id: "q_f12:sq2:bk",
            mechanism: "essay",
            grading: "none",
            optionGroupId: null,
            select: null,
            blank: null,
            anchored: false
          }
        ],
        optionGroups: [],
        media: []
      }
    ],
    media: [],
    meta: {
      source: {
        provider: "xkw",
        externalId: "doc-sample-f12",
        sourceKind: "premium"
      },
      typeId: null,
      typeName: "解答题",
      difficulty: null,
      difficultyLevel: null,
      knowledgePoints: [],
      years: [],
      sourcePapers: [],
      courseName: "高中数学"
    },
    raw: null
  },
  review: {
    questionId: "q_f12",
    contentVersion: "fixture-v1",
    referenceAnswers: [
      {
        slotId: "q_f12:sq1:bk",
        answer: {
          kind: "rich",
          content: {
            html: "<math latex=\"$p=2$\">\n\t\t\t\t\t<mrow><mi>p</mi><mo>=</mo><mn>2</mn></mrow>\n\t\t\t\t</math>"
          }
        }
      },
      {
        slotId: "q_f12:sq2:bk",
        answer: {
          kind: "rich",
          content: {
            html: "<math latex=\"$y=2x-4$\">\n\t\t\t\t\t<mrow><mi>y</mi><mo>=</mo><mn>2</mn><mi>x</mi><mo>−</mo><mn>4</mn></mrow>\n\t\t\t\t</math>\n\t\t\t\t<span style=\"font-family: 宋体;\">或</span>\n\t\t\t\t<math latex=\"$y=-2x-4$\">\n\t\t\t\t\t<mrow><mi>y</mi><mo>=</mo><mo>−</mo><mn>2</mn><mi>x</mi><mo>−</mo><mn>4</mn></mrow>\n\t\t\t\t</math>\n\t\t\t\t<span style=\"font-family: &#x27;Times New Roman&#x27;;\">.</span>"
          }
        }
      }
    ],
    answerFallback: null,
    explanation: [
      {
        name: "分析",
        content: {
          html: "<p style=\"\">\n                <span style=\"font-family: 宋体;\">（</span><span style=\"font-family: \\&#x27;Times New Roman\\&#x27;;\">1</span><span style=\"font-family: 宋体;\">）设</span>\n                <math latex=\"$A\\\\left( {{x}_{1}},\\\\frac{x_{1}^{2}}{2p} \\\\right),B\\\\left( {{x}_{2}},\\\\frac{x_{2}^{2}}{2p} \\\\right)$\">\n                    <mrow>\n                        <mi>A</mi>\n                        <mrow>\n                            <mo>(</mo>\n                            <mrow>\n                                <msub><mi>x</mi><mn>1</mn></msub><mo>,</mo>\n                                <mfrac>\n                                    <mrow>\n                                        <msubsup><mi>x</mi><mn>1</mn><mn>2</mn></msubsup>\n                                    </mrow>\n                                    <mrow><mn>2</mn><mi>p</mi></mrow>\n                                </mfrac>\n                            </mrow>\n                            <mo>)</mo>\n                        </mrow>\n                        <mo>,</mo><mi>B</mi>\n                        <mrow>\n                            <mo>(</mo>\n                            <mrow>\n                                <msub><mi>x</mi><mn>2</mn></msub><mo>,</mo>\n                                <mfrac>\n                                    <mrow>\n                                        <msubsup><mi>x</mi><mn>2</mn><mn>2</mn></msubsup>\n                                    </mrow>\n                                    <mrow><mn>2</mn><mi>p</mi></mrow>\n                                </mfrac>\n                            </mrow>\n                            <mo>)</mo>\n                        </mrow>\n                    </mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">，可根据</span>\n                <math latex=\"$\\\\vartriangle OAB$\">\n                    <mrow><mo>△</mo><mi>O</mi><mi>A</mi><mi>B</mi></mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">的重心恰好为抛物线</span><span style=\"font-style: italic;font-family: \\&#x27;Times New Roman\\&#x27;;\">S</span><span style=\"font-family: 宋体;\">的焦点</span>\n                <span style=\"font-style: italic;font-family: \\&#x27;Times New Roman\\&#x27;;\">F</span><span style=\"font-family: 宋体;\">得到坐标的关系，再根据面积可求</span>\n                <math latex=\"$p=2$\">\n                    <mrow><mi>p</mi><mo>=</mo><mn>2</mn></mrow>\n                </math>\n                <span style=\"font-family: \\&#x27;Times New Roman\\&#x27;;\">.</span>\n            </p>\n            <p style=\"\">\n                <span style=\"font-family: 宋体;\">（</span><span style=\"font-family: \\&#x27;Times New Roman\\&#x27;;\">2</span><span style=\"font-family: 宋体;\">）设公切线为</span>\n                <math latex=\"$y=kx+b$\">\n                    <mrow><mi>y</mi><mo>=</mo><mi>k</mi><mi>x</mi><mo>+</mo><mi>b</mi></mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">，则可得</span>\n                <math latex=\"$k,b$\">\n                    <mrow><mi>k</mi><mo>,</mo><mi>b</mi></mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">的方程组，求出其解后可得公切线的方程</span><span style=\"font-family: \\&#x27;Times New Roman\\&#x27;;\">.</span>\n            </p>"
        },
        scope: {
          kind: "question"
        }
      },
      {
        name: "(1)小问详解",
        content: {
          html: "<p style=\"\">\n                <span style=\"font-family: 宋体;\">设</span>\n                <math latex=\"$A\\\\left( {{x}_{1}},\\\\frac{x_{1}^{2}}{2p} \\\\right),B\\\\left( {{x}_{2}},\\\\frac{x_{2}^{2}}{2p} \\\\right)$\">\n                    <mrow>\n                        <mi>A</mi>\n                        <mrow>\n                            <mo>(</mo>\n                            <mrow>\n                                <msub><mi>x</mi><mn>1</mn></msub><mo>,</mo>\n                                <mfrac>\n                                    <mrow>\n                                        <msubsup><mi>x</mi><mn>1</mn><mn>2</mn></msubsup>\n                                    </mrow>\n                                    <mrow><mn>2</mn><mi>p</mi></mrow>\n                                </mfrac>\n                            </mrow>\n                            <mo>)</mo>\n                        </mrow>\n                        <mo>,</mo><mi>B</mi>\n                        <mrow>\n                            <mo>(</mo>\n                            <mrow>\n                                <msub><mi>x</mi><mn>2</mn></msub><mo>,</mo>\n                                <mfrac>\n                                    <mrow>\n                                        <msubsup><mi>x</mi><mn>2</mn><mn>2</mn></msubsup>\n                                    </mrow>\n                                    <mrow><mn>2</mn><mi>p</mi></mrow>\n                                </mfrac>\n                            </mrow>\n                            <mo>)</mo>\n                        </mrow>\n                    </mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">，</span>\n            </p>\n            <p style=\"\">\n                <span style=\"font-family: 宋体;\">因为</span>\n                <math latex=\"$\\\\vartriangle OAB$\">\n                    <mrow><mo>△</mo><mi>O</mi><mi>A</mi><mi>B</mi></mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">的重心恰好为抛物线</span><span style=\"font-style: italic;font-family: \\&#x27;Times New Roman\\&#x27;;\">S</span><span style=\"font-family: 宋体;\">的焦点</span>\n                <span style=\"font-style: italic;font-family: \\&#x27;Times New Roman\\&#x27;;\">F</span><span style=\"font-family: 宋体;\">，故</span>\n                <math latex=\"$\\\\left\\\\{ \\\\begin{align}  &#x26; \\\\frac{{{x}_{1}}+{{x}_{2}}+0}{3}=0 \\\\\\\\  &#x26; \\\\frac{\\\\frac{x_{1}^{2}}{2p}+\\\\frac{x_{2}^{2}}{2p}+0}{3}=\\\\frac{p}{2} \\\\\\\\ \\\\end{align} \\\\right.$\">\n                    <mrow>\n                        <mrow>\n                            <mo>{</mo>\n                            <mtable columnalign=\"left\">\n                                <mtr>\n                                    <mtd>\n                                        <mfrac>\n                                            <mrow>\n                                                <msub><mi>x</mi><mn>1</mn></msub><mo>+</mo><msub><mi>x</mi><mn>2</mn></msub><mo>+</mo><mn>0</mn>\n                                            </mrow>\n                                            <mn>3</mn>\n                                        </mfrac>\n                                        <mo>=</mo><mn>0</mn>\n                                    </mtd>\n                                </mtr>\n                                <mtr>\n                                    <mtd>\n                                        <mfrac>\n                                            <mrow>\n                                                <mfrac>\n                                                    <mrow>\n                                                        <msubsup><mi>x</mi><mn>1</mn><mn>2</mn></msubsup>\n                                                    </mrow>\n                                                    <mrow><mn>2</mn><mi>p</mi></mrow>\n                                                </mfrac>\n                                                <mo>+</mo>\n                                                <mfrac>\n                                                    <mrow>\n                                                        <msubsup><mi>x</mi><mn>2</mn><mn>2</mn></msubsup>\n                                                    </mrow>\n                                                    <mrow><mn>2</mn><mi>p</mi></mrow>\n                                                </mfrac>\n                                                <mo>+</mo><mn>0</mn>\n                                            </mrow>\n                                            <mn>3</mn>\n                                        </mfrac>\n                                        <mo>=</mo><mfrac><mi>p</mi><mn>2</mn></mfrac>\n                                    </mtd>\n                                </mtr>\n                            </mtable>\n                        </mrow>\n                    </mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">，</span>\n            </p>\n            <p style=\"\">\n                <span style=\"font-family: 宋体;\">所以</span>\n                <math latex=\"$\\\\left\\\\{ \\\\begin{align}  &#x26; {{x}_{1}}+{{x}_{2}}=0 \\\\\\\\  &#x26; x_{1}^{2}+x_{2}^{2}=3{{p}^{2}} \\\\\\\\ \\\\end{align} \\\\right.$\">\n                    <mrow>\n                        <mrow>\n                            <mo>{</mo>\n                            <mtable columnalign=\"left\">\n                                <mtr>\n                                    <mtd>\n                                        <msub><mi>x</mi><mn>1</mn></msub><mo>+</mo><msub><mi>x</mi><mn>2</mn></msub><mo>=</mo><mn>0</mn>\n                                    </mtd>\n                                </mtr>\n                                <mtr>\n                                    <mtd>\n                                        <msubsup><mi>x</mi><mn>1</mn><mn>2</mn></msubsup><mo>+</mo><msubsup><mi>x</mi><mn>2</mn><mn>2</mn></msubsup><mo>=</mo><mn>3</mn><msup><mi>p</mi><mn>2</mn></msup>\n                                    </mtd>\n                                </mtr>\n                            </mtable>\n                        </mrow>\n                    </mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">，故</span>\n                <math latex=\"$\\\\left\\\\{ \\\\begin{align}  &#x26; {{x}_{1}}=-{{x}_{2}} \\\\\\\\  &#x26; x_{1}^{2}=\\\\frac{3{{p}^{2}}}{2} \\\\\\\\ \\\\end{align} \\\\right.$\">\n                    <mrow>\n                        <mrow>\n                            <mo>{</mo>\n                            <mtable columnalign=\"left\">\n                                <mtr>\n                                    <mtd>\n                                        <msub><mi>x</mi><mn>1</mn></msub><mo>=</mo><mo>−</mo><msub><mi>x</mi><mn>2</mn></msub>\n                                    </mtd>\n                                </mtr>\n                                <mtr>\n                                    <mtd>\n                                        <msubsup><mi>x</mi><mn>1</mn><mn>2</mn></msubsup><mo>=</mo>\n                                        <mfrac>\n                                            <mrow>\n                                                <mn>3</mn><msup><mi>p</mi><mn>2</mn></msup>\n                                            </mrow>\n                                            <mn>2</mn>\n                                        </mfrac>\n                                    </mtd>\n                                </mtr>\n                            </mtable>\n                        </mrow>\n                    </mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">，所以</span>\n                <math latex=\"$AB$\">\n                    <mrow><mi>A</mi><mi>B</mi></mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">与</span><math latex=\"$x$\"><mi>x</mi></math><span style=\"font-family: 宋体;\">轴平行，</span>\n            </p>\n            <p style=\"\">\n                <span style=\"font-family: 宋体;\">故</span>\n                <math latex=\"$\\\\vartriangle OAB$\">\n                    <mrow><mo>△</mo><mi>O</mi><mi>A</mi><mi>B</mi></mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">的面积为</span>\n                <math latex=\"$\\\\frac{1}{2}\\\\times \\\\left| 2{{x}_{1}} \\\\right|\\\\times \\\\frac{x_{1}^{2}}{2p}=\\\\frac{\\\\sqrt{6}}{2}p\\\\times \\\\frac{3}{4}p=\\\\frac{3\\\\sqrt{6}}{2}$\">\n                    <mrow>\n                        <mfrac><mn>1</mn><mn>2</mn></mfrac><mo>×</mo>\n                        <mrow>\n                            <mo>|</mo>\n                            <mrow>\n                                <mn>2</mn><msub><mi>x</mi><mn>1</mn></msub>\n                            </mrow>\n                            <mo>|</mo>\n                        </mrow>\n                        <mo>×</mo>\n                        <mfrac>\n                            <mrow>\n                                <msubsup><mi>x</mi><mn>1</mn><mn>2</mn></msubsup>\n                            </mrow>\n                            <mrow><mn>2</mn><mi>p</mi></mrow>\n                        </mfrac>\n                        <mo>=</mo>\n                        <mfrac>\n                            <mrow>\n                                <msqrt><mn>6</mn></msqrt>\n                            </mrow>\n                            <mn>2</mn>\n                        </mfrac>\n                        <mi>p</mi><mo>×</mo><mfrac><mn>3</mn><mn>4</mn></mfrac><mi>p</mi><mo>=</mo>\n                        <mfrac>\n                            <mrow>\n                                <mn>3</mn><msqrt><mn>6</mn></msqrt>\n                            </mrow>\n                            <mn>2</mn>\n                        </mfrac>\n                    </mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">，故</span>\n                <math latex=\"$p=2$\">\n                    <mrow><mi>p</mi><mo>=</mo><mn>2</mn></mrow>\n                </math>\n                <span style=\"font-family: \\&#x27;Times New Roman\\&#x27;;\">.</span>\n            </p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f12:sq1"
        }
      },
      {
        name: "(2)小问详解",
        content: {
          html: "<p style=\"\">\n                <span style=\"font-family: 宋体;\">由（</span><span style=\"font-family: \\&#x27;Times New Roman\\&#x27;;\">1</span><span style=\"font-family: 宋体;\">）可得</span>\n                <math latex=\"$S:{{x}^{2}}=4y$\">\n                    <mrow>\n                        <mi>S</mi><mo>:</mo><msup><mi>x</mi><mn>2</mn></msup><mo>=</mo><mn>4</mn><mi>y</mi>\n                    </mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">，</span>\n            </p>\n            <p style=\"\">\n                <span style=\"font-family: 宋体;\">又</span>\n                <math latex=\"$\\\\odot C$\">\n                    <mrow><mo>⊙</mo><mi>C</mi></mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">：</span>\n                <math latex=\"${{x}^{2}}+{{\\\\left( y+1 \\\\right)}^{2}}=\\\\frac{9}{5}$\">\n                    <mrow>\n                        <msup><mi>x</mi><mn>2</mn></msup><mo>+</mo>\n                        <msup>\n                            <mrow>\n                                <mrow>\n                                    <mo>(</mo><mrow><mi>y</mi><mo>+</mo><mn>1</mn></mrow><mo>)</mo>\n                                </mrow>\n                            </mrow>\n                            <mn>2</mn>\n                        </msup>\n                        <mo>=</mo><mfrac><mn>9</mn><mn>5</mn></mfrac>\n                    </mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">，其圆心坐标为</span>\n                <math latex=\"$\\\\left( 0,-1 \\\\right)$\">\n                    <mrow>\n                        <mrow>\n                            <mo>(</mo><mrow><mn>0</mn><mo>,</mo><mo>−</mo><mn>1</mn></mrow><mo>)</mo>\n                        </mrow>\n                    </mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">，半径为</span>\n                <math latex=\"$\\\\frac{3\\\\sqrt{5}}{5}$\">\n                    <mrow>\n                        <mfrac>\n                            <mrow>\n                                <mn>3</mn><msqrt><mn>5</mn></msqrt>\n                            </mrow>\n                            <mn>5</mn>\n                        </mfrac>\n                    </mrow>\n                </math>\n                <span style=\"font-family: \\&#x27;Times New Roman\\&#x27;;\">.</span>\n            </p>\n            <p style=\"\">\n                <span style=\"font-family: 宋体;\">由题设可知公切线的斜率必存在，设公切线为</span>\n                <math latex=\"$y=kx+b$\">\n                    <mrow><mi>y</mi><mo>=</mo><mi>k</mi><mi>x</mi><mo>+</mo><mi>b</mi></mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">，</span>\n            </p>\n            <p style=\"\">\n                <span style=\"font-family: 宋体;\">由</span>\n                <math latex=\"$\\\\left\\\\{ \\\\begin{align}  &#x26; {{x}^{2}}=4y \\\\\\\\  &#x26; y=kx+b \\\\\\\\ \\\\end{align} \\\\right.$\">\n                    <mrow>\n                        <mrow>\n                            <mo>{</mo>\n                            <mtable columnalign=\"left\">\n                                <mtr>\n                                    <mtd>\n                                        <msup><mi>x</mi><mn>2</mn></msup><mo>=</mo><mn>4</mn><mi>y</mi>\n                                    </mtd>\n                                </mtr>\n                                <mtr>\n                                    <mtd><mi>y</mi><mo>=</mo><mi>k</mi><mi>x</mi><mo>+</mo><mi>b</mi></mtd>\n                                </mtr>\n                            </mtable>\n                        </mrow>\n                    </mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">可得</span>\n                <math latex=\"${{x}^{2}}-4kx-4b=0$\">\n                    <mrow>\n                        <msup><mi>x</mi><mn>2</mn></msup><mo>−</mo><mn>4</mn><mi>k</mi><mi>x</mi><mo>−</mo><mn>4</mn><mi>b</mi><mo>=</mo><mn>0</mn>\n                    </mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">，故</span>\n                <math latex=\"$\\\\Delta =16{{k}^{2}}+16b=0$\">\n                    <mrow>\n                        <mi mathvariant=\"normal\">Δ</mi><mo>=</mo><mn>16</mn><msup><mi>k</mi><mn>2</mn></msup><mo>+</mo><mn>16</mn><mi>b</mi><mo>=</mo><mn>0</mn>\n                    </mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">即</span>\n                <math latex=\"$b=-{{k}^{2}}$\">\n                    <mrow>\n                        <mi>b</mi><mo>=</mo><mo>−</mo><msup><mi>k</mi><mn>2</mn></msup>\n                    </mrow>\n                </math>\n                <span style=\"font-family: \\&#x27;Times New Roman\\&#x27;;\">.</span>\n            </p>\n            <p style=\"\">\n                <span style=\"font-family: 宋体;\">又</span>\n                <math latex=\"$\\\\frac{\\\\left| b+1 \\\\right|}{\\\\sqrt{1+{{k}^{2}}}}=\\\\frac{3\\\\sqrt{5}}{5}$\">\n                    <mrow>\n                        <mfrac>\n                            <mrow>\n                                <mrow>\n                                    <mo>|</mo><mrow><mi>b</mi><mo>+</mo><mn>1</mn></mrow><mo>|</mo>\n                                </mrow>\n                            </mrow>\n                            <mrow>\n                                <msqrt>\n                                    <mrow>\n                                        <mn>1</mn><mo>+</mo><msup><mi>k</mi><mn>2</mn></msup>\n                                    </mrow>\n                                </msqrt>\n                            </mrow>\n                        </mfrac>\n                        <mo>=</mo>\n                        <mfrac>\n                            <mrow>\n                                <mn>3</mn><msqrt><mn>5</mn></msqrt>\n                            </mrow>\n                            <mn>5</mn>\n                        </mfrac>\n                    </mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">，故</span>\n                <math latex=\"$b=-4$\">\n                    <mrow><mi>b</mi><mo>=</mo><mo>−</mo><mn>4</mn></mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">，</span>\n                <math latex=\"$k=\\\\pm 2$\">\n                    <mrow><mi>k</mi><mo>=</mo><mo>±</mo><mn>2</mn></mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">，</span>\n            </p>\n            <p style=\"\">\n                <span style=\"font-family: 宋体;\">故公切线的方程为：</span>\n                <math latex=\"$y=2x-4$\">\n                    <mrow><mi>y</mi><mo>=</mo><mn>2</mn><mi>x</mi><mo>−</mo><mn>4</mn></mrow>\n                </math>\n                <span style=\"font-family: 宋体;\">或</span>\n                <math latex=\"$y=-2x-4$\">\n                    <mrow><mi>y</mi><mo>=</mo><mo>−</mo><mn>2</mn><mi>x</mi><mo>−</mo><mn>4</mn></mrow>\n                </math>\n                <span style=\"font-family: \\&#x27;Times New Roman\\&#x27;;\">.</span>\n            </p>"
        },
        scope: {
          kind: "sub-question",
          subQuestionId: "q_f12:sq2"
        }
      }
    ],
    media: []
  }
}

/** F16：海量版只读降级。沿用 raw/f04-chemistry-single.html 的三段原文，不做结构解析。 */
export const f16RawMassive: QuestionFixture = {
  view: {
    id: "q_f16",
    contentVersion: "fixture-v1",
    structure: "raw",
    numbering: "none",
    stem: {
      html: ""
    },
    slots: [],
    optionGroups: [],
    subQuestions: [],
    media: [],
    meta: {
      source: {
        provider: "xkw",
        externalId: "doc-sample-f04-massive",
        sourceKind: "massive"
      },
      typeId: null,
      typeName: null,
      difficulty: null,
      difficultyLevel: null,
      knowledgePoints: [],
      years: [],
      sourcePapers: [],
      courseName: null
    },
    raw: {
      stem: {
        html: "<div class=\"qml-stem\">\n        <p style=\"text-align: left;\">\n            <span style=\"font-family: 宋体;\">下列有关说法中不正确的是</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">(</span><span style=\"font-family: 宋体;\"> </span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">)</span>\n        </p>\n        <div class=\"qml-og\">\n            <table class=\"qml-og\" style=\"width:100%\">\n                <tbody><tr>\n                    <td>\n                        A. \n                        <span class=\"qml-op\">\n\t\t\t\t\t\t<span style=\"font-family: 宋体;\">酸溶液中都含有</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">H</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\"><sup>+</sup></span>\n\t\t\t\t\t\t<span style=\"font-family: 宋体;\">，所以有相似的化学性质</span>\n\t\t\t\t\t</span>\n                    </td>\n                </tr>\n                <tr>\n                    <td>\n                        B. <span class=\"qml-op\"><span style=\"font-family: 宋体;\">酸、碱在水溶液中都可解离出带电的粒子</span></span>\n                    </td>\n                </tr>\n                <tr>\n                    <td>\n                        C. <span class=\"qml-op\"><span style=\"font-family: 宋体;\">在实验室，常用浓硫酸来干燥某些气体</span></span>\n                    </td>\n                </tr>\n                <tr>\n                    <td colspan=\"1\">\n                        D. <span class=\"qml-op\"><span style=\"font-family: 宋体;\">医疗上的生理盐水是</span><span style=\"font-family: &#x27;Times New Roman&#x27;;\">0.9%</span><span style=\"font-family: 宋体;\">的纯碱溶液</span></span>\n                    </td>\n                </tr>\n            </tbody></table>\n        </div>\n    </div>"
      },
      answer: {
        html: "<div class=\"qml-answer\">\n        <span class=\"qml-an-sq\"><span class=\"qml-an qml-isop\">D</span></span>\n    </div>"
      },
      explanation: {
        html: "<div class=\"qml-explanation\">\n        <div class=\"qml-seg\" seg-name=\"详解\">\n            【详解】<span>A、在水溶液中电离出的阳离子全部是氢离子的化合物是酸，故A正确；</span>\n            <p style=\"\"><span>B、在水溶液中电离出的阳离子全部是氢离子的化合物是酸，电离出的阴离子全部是氢氧根离子的混合物是碱，故B正确；</span></p>\n            <p style=\"\"><span>C、浓硫酸具有吸水性，在实验室，常用来干燥某些气体，故C正确；</span></p>\n            <p style=\"\"><span>D、医疗上的生理盐水是0.9%的氯化钠溶液，故D错误．</span></p>\n            <p style=\"\"><span>故选D．</span></p>\n            <p style=\"\"><span>【点评】本题主要考查了一些基础知识的记忆，难度不大，只要加强记忆即可解答．</span></p>\n            <p style=\"text-align: left;\">\n                <video file-size=\"4.74MB\" duration=\"126\" resolution=\"1280x720\" title=\"1df8c791-f367-4bff-bc84-6c39ad4fb1e4.mp4\" src=\"https://img.xkw.com/dksih/QBM/2015/7/3/1568558031806464/1568558036049920/EXPLANATION/1df8c791-f367-4bff-bc84-6c39ad4fb1e4.mp4\" poster=\"https://img.xkw.com/dksih/QBM/2015/7/3/1568558031806464/1568558036049920/EXPLANATION/1df8c791-f367-4bff-bc84-6c39ad4fb1e4.png\" preload=\"metadata\" controls></video>\n            </p>\n        </div>\n    </div>"
      }
    }
  },
  review: {
    questionId: "q_f16",
    contentVersion: "fixture-v1",
    referenceAnswers: [],
    answerFallback: null,
    explanation: [],
    media: []
  }
}
