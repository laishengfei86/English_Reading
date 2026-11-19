// 按"各版本特色主题"重构小学(level 4)，4 个版本的主题与词汇均不同
// 每版本 5 个主题，每主题 12 词 + 3 句 + 1 段
// 运行后：levels[4] 被替换；levels[0-3]、levels[5-9] 保留。
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('public/data/materials.json');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// === 解析辅助（紧凑写法）===
function w(line) {
  const m = line.match(/^(.+?)\s+\/(.+?)\/\s+(.+?)(?:\s+\[(.+?)\])?$/);
  if (!m) throw new Error('bad word line: ' + line);
  return { text: m[1].trim(), ipa: m[2].trim(), zh: m[3].trim(), focus: (m[4] || '').trim() };
}
function s(line) {
  const i = line.lastIndexOf(' [');
  if (i === -1) throw new Error('bad sentence line: ' + line);
  return { text: line.slice(0, i).trim(), zh: line.slice(i + 2, -1).trim() };
}
const p = s;

// === 各版本特色主题（每个版本互不相同）===
const VERSION_THEMES = {
  pep: [
    { id: 'u1-greetings', name: '问候与自我介绍' },
    { id: 'u2-stationery', name: '学校与学习用品' },
    { id: 'u3-family', name: '家庭与朋友' },
    { id: 'u4-food', name: '食物与饮食' },
    { id: 'u5-animals', name: '动物与自然' },
  ],
  fltrp: [
    { id: 'u1-weather', name: '天气与季节' },
    { id: 'u2-colours-numbers', name: '颜色与数字' },
    { id: 'u3-birthday', name: '生日与节日' },
    { id: 'u4-body', name: '身体与健康' },
    { id: 'u5-school-daily', name: '学校与日常' },
  ],
  yl: [
    { id: 'u1-shapes', name: '颜色与形状' },
    { id: 'u2-fruit', name: '水果与食物' },
    { id: 'u3-school-life', name: '学校生活' },
    { id: 'u4-pets', name: '动物与宠物' },
    { id: 'u5-home', name: '家庭与房间' },
  ],
  sh: [
    { id: 'u1-animals-body', name: '动物与身体' },
    { id: 'u2-family-friends', name: '家庭与朋友' },
    { id: 'u3-classroom', name: '学校与教室' },
    { id: 'u4-health', name: '食物与健康' },
    { id: 'u5-weather-activities', name: '天气与活动' },
  ],
};

const PRIMARY = {
  /* ==================== 人教版 PEP ==================== */
  pep: {
    'u1-greetings': {
      words: [
        w('hello /həˈloʊ/ 你好'), w('hi /haɪ/ 嗨'), w('name /neɪm/ 名字'),
        w('nice /naɪs/ 高兴的'), w('meet /miːt/ 遇见'), w('friend /frend/ 朋友'),
        w('goodbye /ˌɡʊdˈbaɪ/ 再见'), w('teacher /ˈtiːtʃɚ/ 老师'), w('student /ˈstuːdənt/ 学生'),
        w('morning /ˈmɔːrnɪŋ/ 早上'), w('school /skuːl/ 学校'), w('welcome /ˈwelkəm/ 欢迎'),
      ],
      sentences: [
        s('Good morning, everyone. [大家早上好。]'),
        s('My name is Tom. What is your name? [我叫汤姆。你叫什么名字？]'),
        s('Nice to meet you. Let us be friends. [很高兴认识你。我们做朋友吧。]'),
      ],
      paragraphs: [
        p('Hello, I am a student. My name is Tom. I go to school every morning. My teacher is kind and my classmates are friendly. I like saying "hello" to everyone. School is a happy place for me. [你好，我是一名学生。我叫汤姆。我每天早上上学。我的老师和蔼，同学友善。我喜欢向每个人问好。学校对我来说是快乐的地方。]'),
      ],
    },
    'u2-stationery': {
      words: [
        w('book /bʊk/ 书'), w('pencil /ˈpensl/ 铅笔'), w('pen /pen/ 钢笔'),
        w('bag /bæɡ/ 书包'), w('desk /desk/ 书桌'), w('chair /tʃer/ 椅子'),
        w('blackboard /ˈblækbɔːrd/ 黑板'), w('eraser /ɪˈreɪsɚ/ 橡皮'), w('ruler /ˈruːlɚ/ 尺子'),
        w('paper /ˈpeɪpɚ/ 纸'), w('crayon /ˈkreɪɑːn/ 蜡笔'), w('sharpener /ˈʃɑːrpnɚ/ 卷笔刀'),
      ],
      sentences: [
        s('I put my books and pencils in my bag. [我把书和铅笔放进书包。]'),
        s('Please take out your ruler and paper. [请拿出尺子和纸。]'),
        s('The teacher writes on the blackboard. [老师在黑板上写字。]'),
      ],
      paragraphs: [
        p('I have many school things. There are books, pencils, a ruler and an eraser in my bag. I use a sharpener to make my pencil sharp. I also have a box of crayons for art class. I take good care of my school things. [我有很多学习用品。书包里有书、铅笔、尺子和橡皮。我用卷笔刀把铅笔削尖。我还有一盒蜡笔上美术课。我很爱惜我的学习用品。]'),
      ],
    },
    'u3-family': {
      words: [
        w('family /ˈfæməli/ 家庭'), w('father /ˈfɑːðɚ/ 父亲'), w('mother /ˈmʌðɚ/ 母亲'),
        w('brother /ˈbrʌðɚ/ 兄弟'), w('sister /ˈsɪstɚ/ 姐妹'), w('parent /ˈperənt/ 父或母'),
        w('grandpa /ˈɡrænpɑː/ 爷爷；外公'), w('grandma /ˈɡrænmɑː/ 奶奶；外婆'), w('uncle /ˈʌŋkl/ 叔叔'),
        w('aunt /ænt/ 姑姑；阿姨'), w('baby /ˈbeɪbi/ 婴儿'), w('together /təˈɡeðɚ/ 一起'),
      ],
      sentences: [
        s('There are five people in my family. [我家有五口人。]'),
        s('My uncle and aunt live in another city. [我的叔叔和姑姑住在另一个城市。]'),
        s('We have dinner together every evening. [我们每天晚上一起吃晚饭。]'),
      ],
      paragraphs: [
        p('My family is big and warm. I live with my father, my mother, my brother and my sister. My grandpa and grandma live near us and we visit them on Sundays. My uncle and aunt often send me gifts. I love spending time together with my family. [我的家庭又大又温暖。我和爸爸、妈妈、哥哥、姐姐住在一起。爷爷奶奶住得近，我们周日去看他们。叔叔和姑姑常给我寄礼物。我喜欢和家人共度时光。]'),
      ],
    },
    'u4-food': {
      words: [
        w('food /fuːd/ 食物'), w('rice /raɪs/ 米饭'), w('noodle /ˈnuːdl/ 面条'),
        w('bread /bred/ 面包'), w('egg /eɡ/ 鸡蛋'), w('milk /mɪlk/ 牛奶'),
        w('soup /suːp/ 汤'), w('dumpling /ˈdʌmplɪŋ/ 饺子'), w('meat /miːt/ 肉'),
        w('vegetable /ˈvedʒtəbl/ 蔬菜'), w('breakfast /ˈbrekfəst/ 早餐'), w('dinner /ˈdɪnɚ/ 晚餐'),
      ],
      sentences: [
        s('I eat noodles and an egg for breakfast. [我早餐吃面条和一个鸡蛋。]'),
        s('My mother makes dumplings for dinner. [妈妈晚餐包饺子。]'),
        s('Would you like some rice and soup? [你想来点米饭和汤吗？]'),
      ],
      paragraphs: [
        p('I like Chinese food very much. For breakfast I usually have noodles, an egg and a bowl of soup. At dinner my family eats rice, meat and vegetables. On festivals my mother makes dumplings for us. Home cooking is always the best. [我非常喜欢中国菜。早餐我通常吃面条、一个鸡蛋和一碗汤。晚餐我们家吃米饭、肉和蔬菜。过节时妈妈给我们包饺子。家常菜总是最好的。]'),
      ],
    },
    'u5-animals': {
      words: [
        w('animal /ˈænɪml/ 动物'), w('cat /kæt/ 猫'), w('dog /dɔːɡ/ 狗'),
        w('bird /bɜːrd/ 鸟'), w('fish /fɪʃ/ 鱼'), w('rabbit /ˈræbɪt/ 兔子'),
        w('tiger /ˈtaɪɡɚ/ 老虎'), w('elephant /ˈelɪfənt/ 大象'), w('monkey /ˈmʌŋki/ 猴子'),
        w('forest /ˈfɔːrɪst/ 森林'), w('river /ˈrɪvɚ/ 河流'), w('nature /ˈneɪtʃɚ/ 大自然'),
      ],
      sentences: [
        s('Many animals live in the forest. [许多动物住在森林里。]'),
        s('Fish swim in the river. [鱼在河里游。]'),
        s('We should protect nature. [我们应该保护大自然。]'),
      ],
      paragraphs: [
        p('Nature is full of life. In the forest there are tigers, monkeys and many birds. In the river the fish swim freely. Rabbits run on the grass and elephants walk slowly. We should love and protect nature so that animals can live happily. [大自然充满生机。森林里有老虎、猴子和许多鸟。鱼在河里自由地游。兔子在草地上跑，大象慢慢地走。我们应该热爱并保护大自然，让动物们快乐地生活。]'),
      ],
    },
  },

  /* ==================== 外研社 ==================== */
  fltrp: {
    'u1-weather': {
      words: [
        w('sunny /ˈsʌni/ 晴朗的'), w('rainy /ˈreɪni/ 下雨的'), w('windy /ˈwɪndi/ 有风的'),
        w('cloudy /ˈklaʊdi/ 多云的'), w('snow /snoʊ/ 雪'), w('hot /hɑːt/ 热的'),
        w('cold /koʊld/ 冷的'), w('warm /wɔːrm/ 温暖的'), w('cool /kuːl/ 凉爽的'),
        w('weather /ˈweðɚ/ 天气'), w('spring /sprɪŋ/ 春天'), w('summer /ˈsʌmɚ/ 夏天'),
      ],
      sentences: [
        s('It is sunny and warm today. [今天晴朗又暖和。]'),
        s('It often snows in winter. [冬天常常下雪。]'),
        s('What is the weather like in spring? [春天的天气怎么样？]'),
      ],
      paragraphs: [
        p('The weather changes with the seasons. Spring is warm and windy. Summer is hot and sunny. Autumn is cool and the leaves turn yellow. Winter is cold and it often snows. I enjoy every season of the year. [天气随季节变化。春天温暖有风。夏天炎热晴朗。秋天凉爽，树叶变黄。冬天寒冷且常下雪。我享受一年中的每个季节。]'),
      ],
    },
    'u2-colours-numbers': {
      words: [
        w('red /red/ 红色'), w('blue /bluː/ 蓝色'), w('yellow /ˈjeloʊ/ 黄色'),
        w('green /ɡriːn/ 绿色'), w('orange /ˈɔːrɪndʒ/ 橙色'), w('purple /ˈpɜːrpl/ 紫色'),
        w('black /blæk/ 黑色'), w('white /waɪt/ 白色'), w('colour /ˈkʌlɚ/ 颜色'),
        w('one /wʌn/ 一'), w('two /tuː/ 二'), w('ten /ten/ 十'),
      ],
      sentences: [
        s('What colour do you like best? [你最喜欢什么颜色？]'),
        s('I have two blue pens. [我有两支蓝色的笔。]'),
        s('Red and white make pink. [红色和白色混合成粉色。]'),
      ],
      paragraphs: [
        p('There are many colours around us. The sky is blue and the grass is green. My favourite colour is purple. I can count from one to ten in English. Learning colours and numbers is fun and useful. [我们周围有许多颜色。天空是蓝色的，草是绿色的。我最喜欢的颜色是紫色。我能用英语从一数到十。学习颜色和数字既有趣又实用。]'),
      ],
    },
    'u3-birthday': {
      words: [
        w('birthday /ˈbɜːrθdeɪ/ 生日'), w('cake /keɪk/ 蛋糕'), w('candle /ˈkændl/ 蜡烛'),
        w('gift /ɡɪft/ 礼物'), w('party /ˈpɑːrti/ 聚会'), w('happy /ˈhæpi/ 快乐的'),
        w('celebrate /ˈseləbreɪt/ 庆祝'), w('present /ˈpreznt/ 礼物'), w('card /kɑːrd/ 卡片'),
        w('wish /wɪʃ/ 愿望'), w('sing /sɪŋ/ 唱歌'), w('invite /ɪnˈvaɪt/ 邀请'),
      ],
      sentences: [
        s('Happy birthday to you! [祝你生日快乐！]'),
        s('We sing and eat cake at the party. [我们在聚会上唱歌、吃蛋糕。]'),
        s('I invite my friends to my party. [我邀请朋友来参加我的聚会。]'),
      ],
      paragraphs: [
        p('Yesterday was my birthday. My mother made a big cake with ten candles. I invited my friends to the party. We sang songs and I blew out the candles. I got many gifts and cards. It was a happy day for me. [昨天是我的生日。妈妈做了一个有十支蜡烛的大蛋糕。我邀请朋友来聚会。我们唱歌，我吹灭了蜡烛。我收到很多礼物和卡片。这对我来说是快乐的一天。]'),
      ],
    },
    'u4-body': {
      words: [
        w('head /hed/ 头'), w('eye /aɪ/ 眼睛'), w('ear /ɪr/ 耳朵'),
        w('nose /noʊz/ 鼻子'), w('mouth /maʊθ/ 嘴'), w('hand /hænd/ 手'),
        w('arm /ɑːrm/ 手臂'), w('leg /leɡ/ 腿'), w('foot /fʊt/ 脚'),
        w('face /feɪs/ 脸'), w('body /ˈbɑːdi/ 身体'), w('hair /her/ 头发'),
      ],
      sentences: [
        s('Wash your hands before you eat. [吃饭前要洗手。]'),
        s('I brush my hair every morning. [我每天早上梳头。]'),
        s('My legs are strong because I run every day. [我的腿很强壮，因为我每天跑步。]'),
      ],
      paragraphs: [
        p('Our body has many parts. We have a head, two eyes, two ears, a nose and a mouth. Our hands help us write and our legs help us run. We should wash our hands and keep our body clean every day. A healthy body makes us happy. [我们的身体有很多部位。我们有头、两只眼睛、两只耳朵、一个鼻子和一张嘴。手帮我们写字，腿帮我们跑步。我们应该洗手并每天保持身体清洁。健康的身体让我们快乐。]'),
      ],
    },
    'u5-school-daily': {
      words: [
        w('pupil /ˈpjuːpl/ 小学生'), w('classroom /ˈklæsruːm/ 教室'), w('playground /ˈpleɪɡraʊnd/ 操场'),
        w('football /ˈfʊtbɔːl/ 足球'), w('bell /bel/ 铃'), w('line /laɪn/ 队伍'),
        w('exercise /ˈeksɚsaɪz/ 锻炼'), w('library /ˈlaɪbreri/ 图书馆'), w('canteen /kænˈtiːn/ 食堂'),
        w('uniform /ˈjuːnɪfɔːrm/ 校服'), w('timetable /ˈtaɪmteɪbl/ 课程表'), w('together /təˈɡeðɚ/ 一起'),
      ],
      sentences: [
        s('We play football on the playground. [我们在操场上踢足球。]'),
        s('The bell rings and we stand in a line. [铃响了，我们排队。]'),
        s('We read books together in the library. [我们一起在图书馆看书。]'),
      ],
      paragraphs: [
        p('My school day starts at eight. When the bell rings, we stand in a line and go to the classroom. We do exercise on the playground every morning. At noon we have lunch in the canteen. In the afternoon we read together in the library. I like my busy school life. [我的学校生活八点开始。铃响时我们排队进教室。每天早上我们在操场锻炼。中午我们在食堂吃午饭。下午我们一起在图书馆看书。我喜欢我忙碌的学校生活。]'),
      ],
    },
  },

  /* ==================== 译林版（牛津）==================== */
  yl: {
    'u1-shapes': {
      words: [
        w('shape /ʃeɪp/ 形状'), w('circle /ˈsɜːrkl/ 圆形'), w('square /skwer/ 正方形'),
        w('triangle /ˈtraɪæŋɡl/ 三角形'), w('oval /ˈoʊvl/ 椭圆形'), w('star /stɑːr/ 星形'),
        w('heart /hɑːrt/ 心形'), w('round /raʊnd/ 圆形的'), w('side /saɪd/ 边'),
        w('corner /ˈkɔːrnɚ/ 角'), w('red /red/ 红色'), w('yellow /ˈjeloʊ/ 黄色'),
      ],
      sentences: [
        s('A circle is round. [圆形是圆的。]'),
        s('A square has four sides and four corners. [正方形有四条边和四个角。]'),
        s('I draw a red star on the paper. [我在纸上画一颗红色的星星。]'),
      ],
      paragraphs: [
        p('Shapes are everywhere in our life. A ball is a circle and it is round. A window is often a square with four sides. We can see a triangle in a slice of pizza and an oval in an egg. I like to draw stars and hearts in red and yellow. [形状在我们生活中无处不在。球是圆形的。窗户常常是有四条边的正方形。我们在一片披萨里看到三角形，在鸡蛋里看到椭圆形。我喜欢用红色和黄色画星星和心形。]'),
      ],
    },
    'u2-fruit': {
      words: [
        w('apple /ˈæpl/ 苹果'), w('banana /bəˈnænə/ 香蕉'), w('grape /ɡreɪp/ 葡萄'),
        w('peach /piːtʃ/ 桃子'), w('orange /ˈɔːrɪndʒ/ 橙子'), w('pear /per/ 梨'),
        w('mango /ˈmæŋɡoʊ/ 芒果'), w('fruit /fruːt/ 水果'), w('sweet /swiːt/ 甜的'),
        w('sour /ˈsaʊɚ/ 酸的'), w('juice /dʒuːs/ 果汁'), w('fresh /freʃ/ 新鲜的'),
      ],
      sentences: [
        s('I eat an apple after school. [放学后我吃一个苹果。]'),
        s('Grapes are sweet and lemons are sour. [葡萄是甜的，柠檬是酸的。]'),
        s('Would you like some fresh orange juice? [你想喝点新鲜橙汁吗？]'),
      ],
      paragraphs: [
        p('Fruit is good for our health. Apples and bananas are sweet and easy to eat. Grapes are small and juicy. In summer I like mangoes and peaches best. My mother makes fresh juice every morning. Eating fruit every day keeps me healthy. [水果对健康有益。苹果和香蕉又甜又方便吃。葡萄又小又多汁。夏天我最喜欢芒果和桃子。妈妈每天早上做新鲜果汁。每天吃水果让我保持健康。]'),
      ],
    },
    'u3-school-life': {
      words: [
        w('subject /ˈsʌbdʒɪkt/ 科目'), w('break /breɪk/ 休息'), w('lunch /lʌntʃ/ 午餐'),
        w('club /klʌb/ 社团'), w('project /ˈprɑːdʒekt/ 项目'), w('exam /ɪɡˈzæm/ 考试'),
        w('homework /ˈhoʊmwɜːrk/ 作业'), w('classmate /ˈklæsmeɪt/ 同学'), w('monitor /ˈmɑːnɪtɚ/ 班长'),
        w('group /ɡruːp/ 小组'), w('practise /ˈpræktɪs/ 练习'), w('improve /ɪmˈpruːv/ 提高'),
      ],
      sentences: [
        s('We have a short break after each lesson. [每节课后我们有一次短暂休息。]'),
        s('Our group is doing a science project. [我们小组正在做一个科学项目。]'),
        s('I practise speaking English to improve it. [我练习说英语来提高它。]'),
      ],
      paragraphs: [
        p('School life is busy but interesting. We study many subjects and do homework every day. After the break we work in groups on projects. I join the English club and practise speaking with my classmates. All this helps me improve quickly. [学校生活忙碌但有趣。我们每天学习很多科目、做作业。休息后我们分组做项目。我参加英语社团，和同学练习口语。这些都帮我快速提高。]'),
      ],
    },
    'u4-pets': {
      words: [
        w('pet /pet/ 宠物'), w('cat /kæt/ 猫'), w('dog /dɔːɡ/ 狗'),
        w('bird /bɜːrd/ 鸟'), w('fish /fɪʃ/ 鱼'), w('rabbit /ˈræbɪt/ 兔子'),
        w('panda /ˈpændə/ 熊猫'), w('tail /teɪl/ 尾巴'), w('cute /kjuːt/ 可爱的'),
        w('feed /fiːd/ 喂养'), w('bamboo /ˌbæmˈbuː/ 竹子'), w('zoo /zuː/ 动物园'),
      ],
      sentences: [
        s('My pet cat has a long tail. [我的宠物猫有一条长尾巴。]'),
        s('I feed my rabbit carrots every day. [我每天喂兔子胡萝卜。]'),
        s('Pandas eat bamboo at the zoo. [熊猫在动物园吃竹子。]'),
      ],
      paragraphs: [
        p('I love animals very much. My pet cat sleeps on my bed and my pet rabbit likes carrots. I feed them every day and clean their home. At the zoo I watch pandas eating bamboo slowly. Animals are our good friends and we should care for them. [我非常喜爱动物。我的宠物猫睡在我的床上，宠物兔喜欢胡萝卜。我每天喂它们并打扫它们的窝。在动物园我看熊猫慢慢地吃竹子。动物是我们的好朋友，我们应该爱护它们。]'),
      ],
    },
    'u5-home': {
      words: [
        w('home /hoʊm/ 家'), w('room /ruːm/ 房间'), w('kitchen /ˈkɪtʃɪn/ 厨房'),
        w('bedroom /ˈbedruːm/ 卧室'), w('bathroom /ˈbæθruːm/ 浴室'), w('living room /ˈlɪvɪŋ ruːm/ 客厅'),
        w('bed /bed/ 床'), w('sofa /ˈsoʊfə/ 沙发'), w('lamp /læmp/ 台灯'),
        w('door /dɔːr/ 门'), w('window /ˈwɪndoʊ/ 窗户'), w('shelf /ʃelf/ 架子'),
      ],
      sentences: [
        s('My mother cooks in the kitchen. [妈妈在厨房做饭。]'),
        s('There is a big bed and a lamp in my bedroom. [我的卧室里有一张大床和一盏台灯。]'),
        s('Please open the door and the window. [请打开门和窗户。]'),
      ],
      paragraphs: [
        p('My home is warm and comfortable. There is a kitchen, a living room, a bathroom and two bedrooms. In my bedroom there is a big bed, a small lamp and a shelf for my books. We put a soft sofa in the living room. Home is my favourite place in the world. [我的家温暖又舒适。有厨房、客厅、浴室和两间卧室。我的卧室里有一张大床、一盏小台灯和一个放书的架子。客厅里放着一张柔软的沙发。家是世界上我最喜欢的地方。]'),
      ],
    },
  },

  /* ==================== 沪教牛津 ==================== */
  sh: {
    'u1-animals-body': {
      words: [
        w('elephant /ˈelɪfənt/ 大象'), w('monkey /ˈmʌŋki/ 猴子'), w('tiger /ˈtaɪɡɚ/ 老虎'),
        w('giraffe /dʒəˈræf/ 长颈鹿'), w('wing /wɪŋ/ 翅膀'), w('tail /teɪl/ 尾巴'),
        w('trunk /trʌŋk/ 象鼻'), w('fur /fɜːr/ 皮毛'), w('climb /klaɪm/ 爬'),
        w('swim /swɪm/ 游泳'), w('strong /strɔːŋ/ 强壮的'), w('wide /waɪd/ 宽的'),
      ],
      sentences: [
        s('The elephant uses its long trunk to drink. [大象用长鼻子喝水。]'),
        s('Birds use their wings to fly. [鸟用翅膀飞行。]'),
        s('Monkeys can climb trees very fast. [猴子能很快地爬树。]'),
      ],
      paragraphs: [
        p('Animals have amazing bodies. An elephant uses its long trunk to drink water and pick up food. A giraffe has a very long neck to reach high leaves. Birds use their wings to fly and fish use their tails to swim. Each body part helps the animal live well. [动物有奇妙的身体。大象用长鼻子喝水和取食。长颈鹿有很长的脖子去够高处的树叶。鸟用翅膀飞行，鱼用尾巴游泳。每个身体部位都帮助动物更好地生存。]'),
      ],
    },
    'u2-family-friends': {
      words: [
        w('grandpa /ˈɡrænpɑː/ 爷爷；外公'), w('grandma /ˈɡrænmɑː/ 奶奶；外婆'), w('cousin /ˈkʌzn/ 堂/表兄弟姐妹'),
        w('neighbour /ˈneɪbɚ/ 邻居'), w('kind /kaɪnd/ 友善的'), w('help /help/ 帮助'),
        w('share /ʃer/ 分享'), w('care /ker/ 关心'), w('visit /ˈvɪzɪt/ 拜访'),
        w('together /təˈɡeðɚ/ 一起'), w('people /ˈpiːpl/ 人'), w('story /ˈstɔːri/ 故事'),
      ],
      sentences: [
        s('My grandma tells me interesting stories. [奶奶给我讲有趣的故事。]'),
        s('I share my toys with my cousin. [我和表弟分享玩具。]'),
        s('Our neighbour is very kind and helpful. [我们的邻居非常友善、乐于助人。]'),
      ],
      paragraphs: [
        p('Family and friends make life warm. My grandma tells me stories and my grandpa takes me to the park. I share my toys with my cousin and we play together. Our neighbour often helps my mother. Caring for each other makes everyone happy. [家人和朋友让生活温暖。奶奶给我讲故事，爷爷带我去公园。我和表弟分享玩具，一起玩耍。我们的邻居常帮妈妈。互相关心让每个人都快乐。]'),
      ],
    },
    'u3-classroom': {
      words: [
        w('blackboard /ˈblækbɔːrd/ 黑板'), w('chalk /tʃɔːk/ 粉笔'), w('screen /skriːn/ 屏幕'),
        w('projector /prəˈdʒektɚ/ 投影仪'), w('cupboard /ˈkʌbɚd/ 柜子'), w('notice /ˈnoʊtɪs/ 通知'),
        w('seat /siːt/ 座位'), w('aisle /aɪl/ 过道'), w('bright /braɪt/ 明亮的'),
        w('tidy /ˈtaɪdi/ 整洁的'), w('quiet /ˈkwaɪət/ 安静的'), w('raise /reɪz/ 举起'),
      ],
      sentences: [
        s('Please keep the classroom tidy and quiet. [请保持教室整洁和安静。]'),
        s('Raise your hand before you speak. [发言前请举手。]'),
        s('The teacher writes on the blackboard with chalk. [老师用粉笔在黑板上写字。]'),
      ],
      paragraphs: [
        p('Our classroom is bright and tidy. There is a big blackboard at the front and a screen for the projector. We put our bags in the cupboard and sit in our seats. When we have a question, we raise our hands. Everyone keeps quiet during the lesson. [我们的教室明亮整洁。前面有一块大黑板和一块投影屏幕。我们把书包放进柜子，坐在座位上。有问题时我们举手。上课时大家都保持安静。]'),
      ],
    },
    'u4-health': {
      words: [
        w('healthy /ˈhelθi/ 健康的'), w('strong /strɔːŋ/ 强壮的'), w('energy /ˈenɚdʒi/ 能量'),
        w('sleep /sliːp/ 睡觉'), w('exercise /ˈeksɚsaɪz/ 锻炼'), w('habit /ˈhæbɪt/ 习惯'),
        w('sugar /ˈʃʊɡɚ/ 糖'), w('enough /ɪˈnʌf/ 足够的'), w('ill /ɪl/ 生病的'),
        w('rest /rest/ 休息'), w('doctor /ˈdɑːktɚ/ 医生'), w('medicine /ˈmedɪsn/ 药'),
      ],
      sentences: [
        s('Good habits keep us healthy and strong. [好习惯让我们健康强壮。]'),
        s('I sleep eight hours and exercise every day. [我每天睡八小时并锻炼身体。]'),
        s('Too much sugar is bad for our teeth. [太多糖对牙齿不好。]'),
      ],
      paragraphs: [
        p('Staying healthy needs good habits. I sleep eight hours every night and do exercise every morning. I drink enough water and eat less sugar. When I feel ill, I rest at home and see a doctor if needed. Healthy habits give me energy to study and play. [保持健康需要好习惯。我每晚睡八小时，每天早上锻炼。我喝足够的水，少吃糖。生病时我在家休息，必要时去看医生。健康的习惯给我学习和玩耍的能量。]'),
      ],
    },
    'u5-weather-activities': {
      words: [
        w('kite /kaɪt/ 风筝'), w('park /pɑːrk/ 公园'), w('picnic /ˈpɪknɪk/ 野餐'),
        w('raincoat /ˈreɪnkoʊt/ 雨衣'), w('umbrella /ʌmˈbrelə/ 雨伞'), w('puddle /ˈpʌdl/ 水坑'),
        w('skate /skeɪt/ 滑冰'), w('cycle /ˈsaɪkl/ 骑车'), w('outside /ˌaʊtˈsaɪd/ 在外面'),
        w('sunshine /ˈsʌnʃaɪn/ 阳光'), w('breeze /briːz/ 微风'), w('season /ˈsiːzn/ 季节'),
      ],
      sentences: [
        s('It is windy, so let us fly a kite. [有风，我们去放风筝吧。]'),
        s('We have a picnic in the park on sunny days. [晴天我们在公园野餐。]'),
        s('Take your umbrella when it rains. [下雨时带上雨伞。]'),
      ],
      paragraphs: [
        p('The weather decides what we do outside. On sunny days we have a picnic in the park or cycle around the lake. When it is windy I fly a kite with my father. On rainy days I wear a raincoat and jump in puddles. Every season has its fun activities. [天气决定我们在外面做什么。晴天我们在公园野餐或环湖骑车。有风时我和爸爸放风筝。雨天我穿雨衣、踩水坑。每个季节都有有趣的活动。]'),
      ],
    },
  },
};

const VERSIONS = {
  pep: { name: '人教版 PEP（三起）', desc: '按课标话题整理的高频词，可逐词跟读评分。' },
  fltrp: { name: '外研社（一起/三起）', desc: '按课标话题整理的高频词，可逐词跟读评分。' },
  yl: { name: '译林版（牛津）', desc: '按课标话题整理的高频词，可逐词跟读评分。' },
  sh: { name: '沪教牛津', desc: '按课标话题整理的高频词，可逐词跟读评分。' },
};

function buildLevel(id, name, desc, contentByVersion, themesByVersion) {
  const level = { id, name, desc, groups: [] };
  for (const vkey of Object.keys(contentByVersion)) {
    const v = VERSIONS[vkey];
    for (const t of themesByVersion[vkey]) {
      const c = contentByVersion[vkey][t.id];
      if (!c) throw new Error(`missing content: ${vkey}.${t.id}`);
      const baseId = `primary-${vkey}-${t.id}`;
      level.groups.push({
        id: `${baseId}-w`, type: 'word',
        title: `${v.name} · ${t.name} · 核心词汇`, desc: v.desc, items: c.words,
      });
      level.groups.push({
        id: `${baseId}-s`, type: 'sentence',
        title: `${v.name} · ${t.name} · 实用句型`, desc: '围绕本主题核心词的常用表达。', items: c.sentences,
      });
      level.groups.push({
        id: `${baseId}-p`, type: 'paragraph',
        title: `${v.name} · ${t.name} · 阅读段落`, desc: '一段连贯短文，适合整段朗读与评分。', items: c.paragraphs,
      });
    }
  }
  return level;
}

const newPrimary = buildLevel(
  'primary', '小学英语',
  '小学阶段核心话题，各版本按自身单元主题组织，覆盖问候、学习用品、天气、颜色、动物、家庭等。',
  PRIMARY, VERSION_THEMES,
);

data.levels[4] = newPrimary;
data.version = (data.version || 1) + 1;
data.updatedAt = new Date().toISOString();

fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
const totalItems = newPrimary.groups.reduce((a, g) => a + g.items.length, 0);
console.log(`primary rebuilt: ${newPrimary.groups.length} groups, ${totalItems} items`);
