// 为 materials.json 的各 -p 段落组补充连贯短文（语篇厚度优先）
// 用法: node scripts/expand_paragraphs.mjs
// 仅追加条目，不改动现有条目与其他结构；version 升到 2。
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('public/data/materials.json');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// 每个 groupId -> 新增条目数组 { text, zh }
const ADD = {
  // ===== 小学 (level 4) =====
  'primary-pep-p': [
    { text: 'My name is Lily. I am ten years old. I have a small red bag and a new pencil. Every morning I walk to school with my brother.', zh: '我叫莉莉。我十岁了。我有一个红色的小书包和一支新铅笔。每天早上我和弟弟走路去上学。' },
    { text: 'We have many friends in our class. After lunch we play games together. Our teacher often reads us a fun story. School is a happy place for me.', zh: '我们班有很多朋友。午饭后我们一起玩游戏。老师常给我们读有趣的故事。学校对我来说是快乐的地方。' },
    { text: 'In the classroom there is a big blackboard and many desks. I like art class best because I can draw pictures. My friend Tom sits next to me.', zh: '教室里有一块大黑板和许多课桌。我最喜欢美术课，因为可以画画。我的朋友汤姆坐在我旁边。' },
  ],
  'primary-fltrp-p': [
    { text: 'It is rainy today. I cannot go outside, so I read a book at home. My cat sleeps on the sofa. I hope the sun comes out tomorrow.', zh: '今天下雨。我不能出去，就在家看书。我的猫睡在沙发上。希望明天太阳出来。' },
    { text: 'Yesterday was my birthday. My mother made a big cake. We sang a song and I blew out the candles. I got a blue toy car as a gift.', zh: '昨天是我的生日。妈妈做了一个大蛋糕。我们唱了歌，我吹灭了蜡烛。我收到一辆蓝色玩具车作礼物。' },
    { text: 'Spring is warm and windy. The trees turn green and flowers open. I like to fly a kite with my father in the park. The weather is nice.', zh: '春天温暖又有风。树变绿了，花开了。我喜欢和爸爸在公园放风筝。天气真好。' },
  ],
  'primary-yl-p': [
    { text: 'My favorite color is blue, like the sky. I have a yellow hat and a green schoolbag. My sister likes pink because it is bright and sweet.', zh: '我最喜欢蓝色，像天空一样。我有一顶黄帽子和绿色书包。妹妹喜欢粉色，因为明亮又可爱。' },
    { text: 'We went to the fruit shop. I bought red apples and purple grapes. Bananas are yellow and peaches are soft. Fruit is good for our health.', zh: '我们去了水果店。我买了红苹果和紫葡萄。香蕉是黄色的，桃子很软。水果对健康有益。' },
    { text: 'I draw a picture with my crayons. The sun is orange and the grass is green. A small brown dog sits under a tree. I show my picture to my teacher.', zh: '我用蜡笔画了一幅画。太阳是橙色的，草是绿色的。一只棕色的小狗坐在树下。我把画给老师看。' },
  ],
  'primary-sh-p': [
    { text: 'At the zoo I saw a tall giraffe and a fat panda. The monkey ate a banana with its small hands. The elephant used its long nose to drink water.', zh: '在动物园我看到了高高的长颈鹿和胖熊猫。猴子用小手吃香蕉。大象用长鼻子喝水。' },
    { text: 'I have two eyes, one nose and two ears. My hands can write and my legs can run. My head is round. I wash my face every morning.', zh: '我有两只眼睛、一个鼻子和两只耳朵。我的手会写字，腿会跑。我的头圆圆的。我每天早上洗脸。' },
    { text: 'My dog is white with black ears. It likes to play ball in the garden. When I come home, it wags its tail. I love my little friend.', zh: '我的狗是白色的，耳朵黑色。它喜欢在花园里玩球。我回家时它摇尾巴。我爱我的小伙伴。' },
  ],
  // ===== 初中 (level 5) =====
  'junior-pepj-p': [
    { text: 'Reading is my favorite hobby. I often spend two hours in the library after school. Books take me to different worlds and teach me new words. They make me calm and happy.', zh: '阅读是我最喜欢的爱好。放学后我常在图书馆待两小时。书带我去不同的世界，教我新词。它们让我平静又快乐。' },
    { text: 'My friend Lisa likes playing the guitar. She practices every evening and now she can sing many English songs. Music helps her relax after a busy day.', zh: '我的朋友丽莎喜欢弹吉他。她每天晚上练习，现在会唱很多英文歌。音乐帮她在忙碌一天后放松。' },
    { text: 'Some students enjoy sports such as swimming or basketball. Exercise keeps our bodies strong and our minds clear. A good hobby makes life more colorful.', zh: '一些同学喜欢游泳或篮球等运动。锻炼让身体强壮、头脑清醒。好的爱好让生活更精彩。' },
  ],
  'junior-fltrpj-p': [
    { text: 'Travelling opens our eyes to the world. Last winter I visited a small town in the mountains. The air was fresh and the people were kind. I tried local food and learned a few words of their language.', zh: '旅行让我们看到更广阔的世界。去年冬天我去了山里的小镇。空气清新，人们友善。我尝了当地食物，学了几个当地词。' },
    { text: 'Before a trip, I like to make a simple plan. I check the weather and pack light. A camera and a notebook are always in my bag. Good preparation makes the journey easier.', zh: '旅行前我喜欢做简单计划。我查天气、轻装出行。相机和笔记本总在包里。充分准备让旅程更轻松。' },
    { text: 'The best part of travel is meeting new friends. On the train I talked with a boy from another city. We shared snacks and stories. Those small moments became my favorite memories.', zh: '旅行最棒的是认识新朋友。在火车上我和另一个城市的男孩聊天。我们分享零食和故事。那些小瞬间成了我最爱的回忆。' },
  ],
  'junior-ylj-p': [
    { text: 'My school day starts at eight. We have Chinese, math, English and science. English class is lively because we often role-play dialogues. Our teacher encourages us to speak up.', zh: '我的学校生活八点开始。我们有语文、数学、英语和科学。英语课很活跃，因为我们常角色扮演对话。老师鼓励我们大胆说。' },
    { text: 'Group work helps me learn faster. Last week we did a project on recycling. My teammates and I collected bottles and made a poster. Presenting it in front of the class built my confidence.', zh: '小组合作帮我学得更快。上周我们做了回收项目。队友和我收集瓶子做了海报。在全班面前展示增强了我的信心。' },
    { text: 'After school I join the reading club. We pick one book a month and share ideas. Reading widely improves my writing and broadens my view. Learning is not only from textbooks.', zh: '放学后我参加读书社。我们每月选一本书交流想法。广泛阅读提升了写作，也开阔了视野。学习不只来自课本。' },
  ],
  'junior-bnuj-p': [
    { text: 'Our planet is facing serious problems. Rivers are polluted and forests are disappearing. If we do nothing, future generations will suffer. Small changes today can protect tomorrow.', zh: '我们的星球正面临严重问题。河流被污染，森林在消失。如果无所作为，后代将受苦。今天的小改变能守护明天。' },
    { text: 'We can live a greener life. Turn off lights when leaving a room. Use a cup instead of plastic. Walk or ride a bike for short trips. These habits cost little but mean a lot.', zh: '我们可以过更绿色的生活。离开房间关灯。用杯子代替塑料。短途步行或骑车。这些习惯成本低却意义大。' },
    { text: 'Many schools now teach environmental science. Students plant trees and clean parks on weekends. When young people care, the earth has hope. Everyone’s effort counts.', zh: '许多学校现在开设环境科学课。学生周末种树、清理公园。年轻人有心，地球就有希望。每个人的努力都重要。' },
  ],
  // ===== 高中 (level 6) =====
  'senior-peps-p': [
    { text: 'Food carries the memory of a culture. A simple bowl of noodles can tell a family’s story. When we taste dishes from other lands, we learn respect for difference. Culture is best shared at the table.', zh: '食物承载文化的记忆。一碗简单的面能讲出一个家庭的故事。当我们品尝异国菜肴，便学会尊重差异。文化最适合在餐桌上分享。' },
    { text: 'Festivals connect the young and the old. During the Spring Festival, families gather and pass down customs. Such moments keep a nation’s spirit alive. Tradition is not the past; it is a living bond.', zh: '节日连接年轻与老去的一代。春节时家人团聚、传承习俗。这些时刻让民族精神延续。传统不是过去，而是活着的纽带。' },
    { text: 'Learning a language is entering another mind. Words shape how people see time, family and duty. When we study English, we also meet new ways of thinking. That is the real gift of language.', zh: '学一门语言是进入另一种思维。词语塑造人们看待时间、家庭与责任的方式。学英语时我们也遇见新的思维方式。那是语言真正的馈赠。' },
  ],
  'senior-fltrps-p': [
    { text: 'A society grows healthy when citizens trust one another. Honesty in daily life builds that trust. Returning a lost wallet or keeping a promise may seem small. Yet these acts hold a community together.', zh: '当公民彼此信任，社会便健康成长。日常生活中的诚实建立这种信任。归还失物或信守诺言看似微小，却维系着整个社区。' },
    { text: 'Volunteering teaches more than textbooks can. Last holiday I helped at a nursing home. Listening to the elders’ stories, I felt the weight of time. Service turns concern into real connection.', zh: '志愿服务教的比课本更多。假期我在养老院帮忙。听老人讲故事，我感到时间的重量。服务把关怀变成真实的联结。' },
    { text: 'Rules exist to protect freedom, not to limit it. Traffic laws keep us safe; school rules guide our growth. A mature citizen obeys the law and also improves it. Responsibility is the price of liberty.', zh: '规则存在是为了保护自由，而非限制。交规保安全，校规助成长。成熟公民守法也完善法。责任是自由的代价。' },
  ],
  'senior-bnus-p': [
    { text: 'True education wakes curiosity. A good teacher asks questions more than gives answers. When students wonder why, they start to own their learning. Scores fade, but the habit of inquiry lasts.', zh: '真正的教育唤醒好奇心。好老师多提问而非给答案。当学生追问为什么，便开始主导自己的学习。分数会淡去，求知的习惯却长存。' },
    { text: 'Mistakes are not enemies of learning. Each wrong answer shows where we stand. Those who fear failure stop trying and stop growing. Courage to be wrong is the first step to be right.', zh: '错误不是学习的敌人。每个错答都标明我们的位置。怕失败的人停止尝试也停止成长。敢于出错是做对的第一步。' },
    { text: 'Education should prepare us for life, not only for exams. We need to manage money, care for others and think clearly. Schools that teach both knowledge and character raise better people. The goal is a full life.', zh: '教育应为生活而非仅为考试做准备。我们需要理财、关爱他人、清晰思考。既教知识也教品格的学校培养更完整的人。目标是完整的人生。' },
  ],
  'senior-yls-p': [
    { text: 'A forest is more than trees. It is a community where birds, insects and fungi depend on one another. Cut one thread and the whole web shakes. Protecting nature means protecting ourselves.', zh: '森林不只是树木。它是一个鸟类、昆虫与真菌相互依存的群落。扯断一根线，整张网都会颤。保护自然就是保护我们自己。' },
    { text: 'Rivers connect mountains to the sea. They carry minerals that feed the soil and the fish. When we dam or pollute them, distant lives suffer. Water reminds us that nothing is truly separate.', zh: '河流连接山与海。它们携带滋养土壤与鱼类的矿物。当我们筑坝或污染，远方生命受苦。水提醒我们：没有什么是真正孤立的。' },
    { text: 'Climate change is not a distant story. Glaciers shrink, seasons shift and storms grow strong. What we do this decade decides the world we hand to children. Nature keeps no debt unpaid.', zh: '气候变化不是遥远的故事。冰川退缩、季节偏移、风暴增强。这十年的作为决定我们交给孩子怎样的世界。自然从不会让债务烂账。' },
  ],
  // ===== 考试段 =====
  'cet-cet-p': [
    { text: 'Online learning has reshaped higher education. Students in remote areas can now attend lectures from top universities. Yet self-discipline becomes the real test. The screen offers access, but the mind must do the work.', zh: '在线学习重塑了高等教育。偏远地区学生也能听顶尖大学课程。但自律才是真正的考验。屏幕提供入口，思考仍需自己完成。' },
    { text: 'Renewable energy is no longer a dream. Solar and wind power now light millions of homes. The challenge is storage, not production. A greener grid asks for both technology and patience.', zh: '可再生能源已非梦想。太阳能与风能如今照亮千万家庭。难点在储存而非生产。更绿的电网需要技术与耐心。' },
    { text: 'Reading widely beats reading fast. A single deep article can change how we see a problem. In an age of short posts, the long form trains our attention. Slow reading is a quiet form of freedom.', zh: '广泛读胜过读得快。一篇有深度的文章就能改变我们看问题的方式。在短文盛行的时代，长文训练专注力。慢读是一种安静的自由。' },
  ],
  'ielts-ielts-p': [
    { text: 'Some argue that cities offer more chances, while the countryside brings peace. In fact, both shapes of life have trade-offs. Urban life rewards ambition but costs calm. Rural life gives space but may lack choice. The best answer is personal.', zh: '有人认为城市机会多，乡村更安宁。其实两种生活各有取舍。都市奖赏野心却剥夺平静；乡野给人空间却可能缺少选择。答案因人而异。' },
    { text: 'Education should balance knowledge and skill. A student who only memorizes may fail in real tasks. Those who practice thinking adapt better to change. Schools must teach both the book and the mind.', zh: '教育应平衡知识与技能。只记忆的学生可能在真实任务中失利。练习思考的人更适应变化。学校须既教书也教心。' },
    { text: 'Technology links us, yet it can also isolate us. We message more but meet less. A family may sit together, each on a screen. True connection needs presence, not just signal. Use the tool, do not let it use you.', zh: '科技连接我们，也可能孤立我们。我们发消息多却见面少。一家人同坐，却各看屏幕。真正的联结需要“在场”而非仅信号。用工具，别被工具用。' },
  ],
  'toefl-toefl-p': [
    { text: 'Biologists have long studied how birds navigate. Many species sense Earth’s magnetic field like a built-in compass. Combined with the position of the sun, this guides their thousands-mile migration. Such instincts need no teaching.', zh: '生物学家长期研究鸟类如何导航。许多物种像内置指南针般感知地磁场。结合太阳位置，它们得以完成数千公里迁徙。这种本能无需教导。' },
    { text: 'The history of writing began with pictures. Ancient people carved symbols on clay to record trade. Over centuries these signs grew abstract and phonetic. Writing turned memory into something that could outlive its writer.', zh: '文字史始于图画。古人把符号刻在黏土上记录交易。千年间这些记号变得抽象而表音。文字把记忆变成比书写者更长久的存在。' },
    { text: 'Volcanoes are destructive yet creative. Their eruptions bury towns, but the cooled ash enriches soil. Over time fertile land rises from ruin. Nature often builds through the same force that breaks.', zh: '火山具破坏也具创造。喷发掩埋城镇，冷却的灰烬却肥沃土壤。久而久之沃土生于废墟。自然常借破坏之力来建造。' },
  ],
};

// 校验：每个目标 groupId 必须存在
let missing = [];
for (const gid of Object.keys(ADD)) {
  let found = false;
  for (const lvl of data.levels) {
    if (lvl.groups.some(g => g.id === gid)) { found = true; break; }
  }
  if (!found) missing.push(gid);
}
if (missing.length) {
  console.error('找不到以下段落组，终止：', missing);
  process.exit(1);
}

// 追加
let addedTotal = 0;
for (const lvl of data.levels) {
  for (const g of lvl.groups) {
    if (ADD[g.id]) {
      const before = g.items.length;
      for (const it of ADD[g.id]) g.items.push({ text: it.text, zh: it.zh });
      addedTotal += g.items.length - before;
      console.log(`+ ${g.id}: ${before} -> ${g.items.length}`);
    }
  }
}

data.version = 2;
data.updatedAt = new Date().toISOString();
fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`\n完成：共新增 ${addedTotal} 条段落；version -> ${data.version}`);
