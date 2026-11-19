// 按"各版本/各考试独立特色主题"重构初中(level 5)、高中(level 6)、考试(level 7-9)
// 每主题 12 词 + 3 句 + 1 段；绝不共用模板只改尾词
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('public/data/materials.json');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

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

/* ==================================================================
   初中：4 个版本，各 5 个特色主题
   ================================================================== */
const JUNIOR_THEMES = {
  pepj: [
    { id: 'u1-hobbies', name: '兴趣爱好与运动' },
    { id: 'u2-routine', name: '日常作息与时间' },
    { id: 'u3-shopping', name: '购物与价格' },
    { id: 'u4-health', name: '健康与就医' },
    { id: 'u5-past', name: '过去的经历' },
  ],
  fltrpj: [
    { id: 'u1-clubs', name: '校园生活与社团' },
    { id: 'u2-travel', name: '旅行与交通方式' },
    { id: 'u3-eating', name: '食物与饮食习惯' },
    { id: 'u4-science', name: '科学与技术' },
    { id: 'u5-famous', name: '名人故事' },
  ],
  ylj: [
    { id: 'u1-nature', name: '人与自然' },
    { id: 'u2-festivals', name: '节日与习俗' },
    { id: 'u3-music-art', name: '音乐与艺术' },
    { id: 'u4-social-media', name: '社交媒体与沟通' },
    { id: 'u5-volunteer', name: '志愿服务' },
  ],
  bnuj: [
    { id: 'u1-generation', name: '家庭与代沟' },
    { id: 'u2-study', name: '学习方法与习惯' },
    { id: 'u3-city-country', name: '城市与乡村' },
    { id: 'u4-safety', name: '安全与急救' },
    { id: 'u5-dreams', name: '梦想与职业' },
  ],
};

const JUNIOR = {
  pepj: {
    'u1-hobbies': {
      words: [
        w('hobby /ˈhɑːbi/ 爱好'), w('sport /spɔːrt/ 运动'), w('basketball /ˈbæskɪtbɔːl/ 篮球'),
        w('swim /swɪm/ 游泳'), w('guitar /ɡɪˈtɑːr/ 吉他'), w('collect /kəˈlekt/ 收集'),
        w('stamp /stæmp/ 邮票'), w('practice /ˈpræktɪs/ 练习'), w('team /tiːm/ 队伍'),
        w('match /mætʃ/ 比赛'), w('coach /koʊtʃ/ 教练'), w('relax /rɪˈlæks/ 放松'),
      ],
      sentences: [
        s('My hobby is playing basketball. [我的爱好是打篮球。]'),
        s('I practice the guitar for an hour every evening. [我每天晚上练一小时吉他。]'),
        s('Our team won the match yesterday. [我们队昨天赢了比赛。]'),
      ],
      paragraphs: [
        p('Everyone needs a hobby. My hobby is playing basketball with my friends after school. Our coach teaches us how to work as a team. When I feel tired, I play the guitar at home to relax. Hobbies make our life colourful. [每个人都需要爱好。我的爱好是放学后和朋友打篮球。教练教我们如何团队合作。累的时候我在家弹吉他放松。爱好让我们的生活丰富多彩。]'),
      ],
    },
    'u2-routine': {
      words: [
        w('routine /ruːˈtiːn/ 日常作息'), w('alarm /əˈlɑːrm/ 闹钟'), w('wake /weɪk/ 醒来'),
        w('brush /brʌʃ/ 刷'), w('hurry /ˈhɜːri/ 匆忙'), w('schedule /ˈskedʒuːl/ 日程'),
        w('quarter /ˈkwɔːrtɚ/ 一刻钟'), w('midnight /ˈmɪdnaɪt/ 午夜'), w('weekday /ˈwiːkdeɪ/ 工作日'),
        w('weekend /ˈwiːkend/ 周末'), w('asleep /əˈsliːp/ 睡着的'), w('early /ˈɜːrli/ 早的'),
      ],
      sentences: [
        s('My alarm wakes me up at six every morning. [我的闹钟每天早上六点叫醒我。]'),
        s('I brush my teeth and hurry to school. [我刷牙后匆忙去上学。]'),
        s('On weekends I get up late and relax. [周末我起得晚，放松一下。]'),
      ],
      paragraphs: [
        p('My daily routine is simple. On weekdays my alarm wakes me up at six. I brush my teeth, eat breakfast and hurry to school. I usually fall asleep before ten at night. On weekends I get up late and enjoy a slower schedule. [我的日常作息很简单。工作日闹钟六点叫醒我，我刷牙、吃早餐、匆忙上学。我通常十点前睡着。周末我起得晚，享受更慢的节奏。]'),
      ],
    },
    'u3-shopping': {
      words: [
        w('price /praɪs/ 价格'), w('cheap /tʃiːp/ 便宜的'), w('expensive /ɪkˈspensɪv/ 昂贵的'),
        w('bargain /ˈbɑːrɡən/ 便宜货'), w('size /saɪz/ 尺码'), w('customer /ˈkʌstəmɚ/ 顾客'),
        w('cashier /kæˈʃɪr/ 收银员'), w('receipt /rɪˈsiːt/ 收据'), w('discount /ˈdɪskaʊnt/ 折扣'),
        w('choose /tʃuːz/ 选择'), w('afford /əˈfɔːrd/ 买得起'), w('compare /kəmˈper/ 比较'),
      ],
      sentences: [
        s('This shirt is too expensive for me. [这件衬衫对我来说太贵了。]'),
        s('Can I try a bigger size? [我能试试大一号的吗？]'),
        s('The shop gives a discount to students. [这家店给学生打折。]'),
      ],
      paragraphs: [
        p('I like shopping with my mother on weekends. We compare prices in different shops before we buy. When something is too expensive, we look for a discount. The cashier gives us a receipt and we check it carefully. Shopping wisely helps us save money. [我喜欢周末和妈妈购物。买东西前我们比较不同店的价格。太贵时我们找折扣。收银员给我们收据，我们仔细核对。明智购物帮我们省钱。]'),
      ],
    },
    'u4-health': {
      words: [
        w('fever /ˈfiːvɚ/ 发烧'), w('headache /ˈhedeɪk/ 头痛'), w('cough /kɔːf/ 咳嗽'),
        w('medicine /ˈmedɪsn/ 药'), w('patient /ˈpeɪʃnt/ 病人'), w('nurse /nɜːrs/ 护士'),
        w('symptom /ˈsɪmptəm/ 症状'), w('rest /rest/ 休息'), w('ambulance /ˈæmbjələns/ 救护车'),
        w('appointment /əˈpɔɪntmənt/ 预约'), w('recover /rɪˈkʌvɚ/ 康复'), w('weak /wiːk/ 虚弱的'),
      ],
      sentences: [
        s('I have a fever and a bad headache. [我发烧了，头很痛。]'),
        s('The doctor told me to rest and drink water. [医生让我休息并多喝水。]'),
        s('It takes a week to recover from the flu. [流感需要一周才能康复。]'),
      ],
      paragraphs: [
        p('Last week I caught a bad cold. I had a fever, a headache and a cough. My mother made an appointment with the doctor. The nurse took my temperature and gave me some medicine. After a few days of rest I began to recover. [上周我得了重感冒。我发烧、头痛、咳嗽。妈妈帮我预约了医生。护士量了体温，给了我一些药。休息几天后我开始康复。]'),
      ],
    },
    'u5-past': {
      words: [
        w('experience /ɪkˈspɪriəns/ 经历'), w('memory /ˈmeməri/ 记忆'), w('journey /ˈdʒɜːrni/ 旅程'),
        w('once /wʌns/ 曾经'), w('suddenly /ˈsʌdənli/ 突然'), w('realize /ˈriːəlaɪz/ 意识到'),
        w('mistake /mɪˈsteɪk/ 错误'), w('childhood /ˈtʃaɪldhʊd/ 童年'), w('unforgettable /ˌʌnfərˈɡetəbl/ 难忘的'),
        w('youth /juːθ/ 青春'), w('trip /trɪp/ 旅行'), w('treasure /ˈtreʒɚ/ 珍视'),
      ],
      sentences: [
        s('I once visited my grandparents in the countryside. [我曾经去乡下看望爷爷奶奶。]'),
        s('That trip was an unforgettable experience. [那次旅行是难忘的经历。]'),
        s('I treasure the happy memories of my childhood. [我珍视童年的快乐回忆。]'),
      ],
      paragraphs: [
        p('Childhood memories stay with us forever. I once took a long journey to my grandparents’ village. The train was slow but the view was beautiful. Suddenly I realized how much I loved the quiet countryside. That trip is an unforgettable treasure. [童年记忆永远留在我们心中。我曾经坐长途车去爷爷奶奶的村庄。火车很慢但风景很美。突然我意识到自己多么喜欢安静的乡村。那次旅行是难忘的珍宝。]'),
      ],
    },
  },
  fltrpj: {
    'u1-clubs': {
      words: [
        w('club /klʌb/ 社团'), w('member /ˈmembɚ/ 成员'), w('activity /ækˈtɪvəti/ 活动'),
        w('join /dʒɔɪn/ 加入'), w('organise /ˈɔːrɡənaɪz/ 组织'), w('event /ɪˈvent/ 活动'),
        w('speech /spiːtʃ/ 演讲'), w('competition /ˌkɑːmpəˈtɪʃn/ 比赛'), w('stage /steɪdʒ/ 舞台'),
        w('audience /ˈɔːdiəns/ 观众'), w('confident /ˈkɑːnfɪdənt/ 自信的'), w('nervous /ˈnɜːrvəs/ 紧张的'),
      ],
      sentences: [
        s('I joined the English club last term. [我上学期加入了英语社团。]'),
        s('We organised a speaking competition for the school. [我们为学校组织了一场演讲比赛。]'),
        s('I felt nervous on the stage but became confident soon. [我在台上很紧张，但很快变得自信。]'),
      ],
      paragraphs: [
        p('School clubs make our life rich. I am a member of the English club. Last month we organised a speaking competition. I stood on the stage in front of a large audience. At first I was nervous, but soon I became confident and spoke well. [学校社团让生活丰富。我是英语社团的成员。上个月我们组织了一场演讲比赛。我站在台上，面对很多观众。一开始我很紧张，但很快就自信起来，讲得很好。]'),
      ],
    },
    'u2-travel': {
      words: [
        w('transport /ˈtrænspɔːrt/ 交通'), w('railway /ˈreɪlweɪ/ 铁路'), w('station /ˈsteɪʃn/ 车站'),
        w('passenger /ˈpæsɪndʒɚ/ 乘客'), w('flight /flaɪt/ 航班'), w('airport /ˈerpɔːrt/ 机场'),
        w('board /bɔːrd/ 登车/登机'), w('delay /dɪˈleɪ/ 延误'), w('luggage /ˈlʌɡɪdʒ/ 行李'),
        w('destination /ˌdestɪˈneɪʃn/ 目的地'), w('route /ruːt/ 路线'), w('ticket /ˈtɪkɪt/ 车票'),
      ],
      sentences: [
        s('The train leaves the station at eight. [火车八点离站。]'),
        s('Our flight was delayed by two hours. [我们的航班延误了两小时。]'),
        s('Please show your ticket before you board. [上车前请出示车票。]'),
      ],
      paragraphs: [
        p('Travelling by train is comfortable. I bought a ticket to the city and waited at the station. The railway route passes green fields and small towns. Passengers chat or look out of the window. When we reached our destination, I felt excited and happy. [坐火车旅行很舒服。我买了一张去城里的票，在车站等车。铁路线经过绿色的田野和小镇。乘客聊天或看窗外。到达目的地时我感到兴奋和开心。]'),
      ],
    },
    'u3-eating': {
      words: [
        w('habit /ˈhæbɪt/ 习惯'), w('diet /ˈdaɪət/ 饮食'), w('snack /snæk/ 零食'),
        w('fried /fraɪd/ 油炸的'), w('sugar /ˈʃʊɡɚ/ 糖'), w('balanced /ˈbælənst/ 均衡的'),
        w('nutrition /nuˈtrɪʃn/ 营养'), w('homemade /ˌhoʊmˈmeɪd/ 家常的'), w('appetite /ˈæpɪtaɪt/ 食欲'),
        w('overweight /ˌoʊvɚˈweɪt/ 超重的'), w('swallow /ˈswɑːloʊ/ 吞咽'), w('serve /sɜːrv/ 供应'),
      ],
      sentences: [
        s('A balanced diet keeps us healthy. [均衡饮食让我们健康。]'),
        s('I try to eat less fried food and sugar. [我尽量少吃油炸食品和糖。]'),
        s('Homemade meals are better than fast food. [家常菜比快餐好。]'),
      ],
      paragraphs: [
        p('Good eating habits are important. I used to love fried food and sweet snacks. Now I try to keep a balanced diet with more vegetables and less sugar. My mother cooks homemade meals full of nutrition. Since I changed my habits, I feel much better. [良好的饮食习惯很重要。我以前喜欢油炸食品和甜零食。现在我尽量保持均衡饮食，多吃蔬菜少吃糖。妈妈做的家常菜营养丰富。改变习惯后我感觉好多了。]'),
      ],
    },
    'u4-science': {
      words: [
        w('science /ˈsaɪəns/ 科学'), w('experiment /ɪkˈsperɪmənt/ 实验'), w('discover /dɪˈskʌvɚ/ 发现'),
        w('invent /ɪnˈvent/ 发明'), w('machine /məˈʃiːn/ 机器'), w('digital /ˈdɪdʒɪtl/ 数字的'),
        w('data /ˈdeɪtə/ 数据'), w('robot /ˈroʊbɑːt/ 机器人'), w('laboratory /ˈlæbrətɔːri/ 实验室'),
        w('research /rɪˈsɜːrtʃ/ 研究'), w('electricity /ɪˌlekˈtrɪsəti/ 电'), w('satellite /ˈsætəlaɪt/ 卫星'),
      ],
      sentences: [
        s('We did an interesting experiment in the laboratory. [我们在实验室做了一个有趣的实验。]'),
        s('Scientists discover new things every year. [科学家每年都有新发现。]'),
        s('Satellites send data back to the earth. [卫星把数据发回地球。]'),
      ],
      paragraphs: [
        p('Science changes our world. In the laboratory we do experiments and record data carefully. Scientists do research to discover new medicines and invent useful machines. Robots work in factories and satellites circle the earth. I want to study science when I grow up. [科学改变我们的世界。在实验室我们做实验并认真记录数据。科学家做研究以发现新药、发明有用的机器。机器人在工厂工作，卫星环绕地球。我长大后想学科学。]'),
      ],
    },
    'u5-famous': {
      words: [
        w('famous /ˈfeɪməs/ 著名的'), w('biography /baɪˈɑːɡrəfi/ 传记'), w('achieve /əˈtʃiːv/ 实现'),
        w('courage /ˈkɜːrɪdʒ/ 勇气'), w('effort /ˈefɚt/ 努力'), w('talent /ˈtælənt/ 天赋'),
        w('success /səkˈses/ 成功'), w('failure /ˈfeɪljɚ/ 失败'), w('inspiration /ˌɪnspəˈreɪʃn/ 鼓舞'),
        w('pioneer /ˌpaɪəˈnɪr/ 先驱'), w('award /əˈwɔːrd/ 奖项'), w('admire /ədˈmaɪɚ/ 钦佩'),
      ],
      sentences: [
        s('I admire the scientist for her courage. [我钦佩那位科学家的勇气。]'),
        s('He achieved success through hard effort. [他通过努力取得成功。]'),
        s('Failure taught him more than success. [失败教给他的比成功更多。]'),
      ],
      paragraphs: [
        p('I like reading biographies of famous people. Their stories show that talent is not enough; effort and courage matter more. Many pioneers failed many times before they achieved success. Their lives give me inspiration when I face difficulties. [我喜欢读名人传记。他们的故事说明光有天赋不够，努力和勇气更重要。许多先驱在成功前失败过很多次。他们的人生在我遇到困难时给我鼓舞。]'),
      ],
    },
  },
  ylj: {
    'u1-nature': {
      words: [
        w('nature /ˈneɪtʃɚ/ 自然'), w('protect /prəˈtekt/ 保护'), w('pollution /pəˈluːʃn/ 污染'),
        w('waste /weɪst/ 废物'), w('recycle /ˌriːˈsaɪkl/ 回收'), w('plastic /ˈplæstɪk/ 塑料'),
        w('rare /rer/ 稀有的'), w('species /ˈspiːʃiːz/ 物种'), w('habitat /ˈhæbɪtæt/ 栖息地'),
        w('survive /sɚˈvaɪv/ 生存'), w('balance /ˈbæləns/ 平衡'), w('destroy /dɪˈstrɔɪ/ 破坏'),
      ],
      sentences: [
        s('We should protect rare animals. [我们应该保护稀有动物。]'),
        s('Recycling plastic bottles saves resources. [回收塑料瓶能节约资源。]'),
        s('Pollution destroys the habitat of many species. [污染破坏了许多物种的栖息地。]'),
      ],
      paragraphs: [
        p('People and nature must live in balance. Pollution and plastic waste destroy the habitat of many species. Rare animals can hardly survive when forests disappear. If we recycle and reduce waste, we give nature a chance to heal. Protecting nature means protecting ourselves. [人与自然必须平衡共处。污染和塑料垃圾破坏许多物种的栖息地。森林消失时稀有动物难以生存。如果我们回收并减少废物，就给自然一个恢复的机会。保护自然就是保护我们自己。]'),
      ],
    },
    'u2-festivals': {
      words: [
        w('festival /ˈfestɪvl/ 节日'), w('custom /ˈkʌstəm/ 习俗'), w('celebrate /ˈseləbreɪt/ 庆祝'),
        w('lantern /ˈlæntɚn/ 灯笼'), w('reunion /riːˈjuːniən/ 团聚'), w('decorate /ˈdekəreɪt/ 装饰'),
        w('relative /ˈrelətɪv/ 亲戚'), w('firework /ˈfaɪɜːrwɜːrk/ 烟花'), w('tradition /trəˈdɪʃn/ 传统'),
        w('ceremony /ˈserəmoʊni/ 仪式'), w('symbol /ˈsɪmbl/ 象征'), w('gather /ˈɡæðɚ/ 聚集'),
      ],
      sentences: [
        s('Families gather for a reunion dinner. [家人聚在一起吃团圆饭。]'),
        s('We decorate the house with red lanterns. [我们用红灯笼装饰房子。]'),
        s('Fireworks are a symbol of happiness. [烟花是幸福的象征。]'),
      ],
      paragraphs: [
        p('Festivals bring families together. During the Spring Festival we decorate our house with red lanterns and visit relatives. At night the whole family gathers for a reunion dinner. We watch fireworks and children receive red packets. These customs keep our tradition alive. [节日让家人团聚。春节期间我们用红灯笼装饰房子、走亲戚。晚上全家聚在一起吃团圆饭。我们看烟花，孩子们收到红包。这些习俗让我们的传统延续。]'),
      ],
    },
    'u3-music-art': {
      words: [
        w('music /ˈmjuːzɪk/ 音乐'), w('instrument /ˈɪnstrəmənt/ 乐器'), w('violin /ˌvaɪəˈlɪn/ 小提琴'),
        w('melody /ˈmelədi/ 旋律'), w('rhythm /ˈrɪðəm/ 节奏'), w('concert /ˈkɑːnsɚt/ 音乐会'),
        w('gallery /ˈɡæləri/ 画廊'), w('sculpture /ˈskʌlptʃɚ/ 雕塑'), w('painting /ˈpeɪntɪŋ/ 绘画'),
        w('perform /pɚˈfɔːrm/ 表演'), w('creative /kriˈeɪtɪv/ 有创造力的'), w('talent /ˈtælənt/ 天赋'),
      ],
      sentences: [
        s('She plays the violin beautifully. [她小提琴拉得很美。]'),
        s('We went to a concert last night. [我们昨晚去听了一场音乐会。]'),
        s('The gallery shows modern paintings and sculptures. [画廊展出现代绘画和雕塑。]'),
      ],
      paragraphs: [
        p('Art makes life beautiful. My sister plays the violin and I love the melody and rhythm of her music. Last night we went to a concert and the performers played wonderfully. At weekends we visit the gallery to see paintings and sculptures. Art helps us become creative. [艺术让生活美好。我姐姐拉小提琴，我喜欢她音乐的旋律和节奏。昨晚我们去听音乐会，演奏者们表演得很精彩。周末我们去画廊看画和雕塑。艺术让我们变得有创造力。]'),
      ],
    },
    'u4-social-media': {
      words: [
        w('social /ˈsoʊʃl/ 社交的'), w('media /ˈmiːdiə/ 媒体'), w('message /ˈmesɪdʒ/ 消息'),
        w('online /ˌɔːnˈlaɪn/ 在线的'), w('share /ʃer/ 分享'), w('comment /ˈkɑːment/ 评论'),
        w('upload /ˈʌploʊd/ 上传'), w('network /ˈnetwɜːrk/ 网络'), w('contact /ˈkɑːntækt/ 联系'),
        w('misunderstand /ˌmɪsʌndɚˈstænd/ 误解'), w('reply /rɪˈplaɪ/ 回复'), w('privacy /ˈpraɪvəsi/ 隐私'),
      ],
      sentences: [
        s('Social media helps us contact friends far away. [社交媒体帮助我们联系远方的朋友。]'),
        s('Do not share your private information online. [不要在网上分享你的私人信息。]'),
        s('Please reply to my message when you are free. [有空请回复我的消息。]'),
      ],
      paragraphs: [
        p('Social media brings people closer, but we must be careful. We can send messages, share photos and upload videos to keep in touch. However, people sometimes misunderstand short comments. We should protect our privacy and think before we post. Using the network wisely is an important skill. [社交媒体拉近人与人之间的距离，但我们必须小心。我们可以发消息、分享照片、上传视频来保持联系。但人们有时会误解简短的评论。我们应该保护隐私，发帖前三思。明智地使用网络是一项重要技能。]'),
      ],
    },
    'u5-volunteer': {
      words: [
        w('volunteer /ˌvɑːlənˈtɪr/ 志愿者'), w('charity /ˈtʃærəti/ 慈善'), w('donate /ˈdoʊneɪt/ 捐赠'),
        w('community /kəˈmjuːnəti/ 社区'), w('serve /sɜːrv/ 服务'), w('elderly /ˈeldɚli/ 老年人'),
        w('shelter /ˈʃeltɚ/ 庇护所'), w('generous /ˈdʒenərəs/ 慷慨的'), w('support /səˈpɔːrt/ 支持'),
        w('kindness /ˈkaɪndnəs/ 善意'), w('worthwhile /ˌwɜːrθˈwaɪl/ 值得的'), w('together /təˈɡeðɚ/ 一起'),
      ],
      sentences: [
        s('I work as a volunteer in our community. [我在社区做志愿者。]'),
        s('We donated books and clothes to the shelter. [我们向庇护所捐赠了书和衣服。]'),
        s('Helping the elderly is worthwhile. [帮助老人是值得的。]'),
      ],
      paragraphs: [
        p('Volunteering makes our community warmer. Every month I help at a home for the elderly. We talk with them, clean the rooms and sometimes sing together. My friends organised a charity sale and donated the money to a shelter. Kindness is always worthwhile. [志愿服务让我们的社区更温暖。每个月我在养老院帮忙。我们陪老人聊天、打扫房间，有时一起唱歌。朋友们组织了一次义卖，把钱捐给了一个庇护所。善意永远是值得的。]'),
      ],
    },
  },
  bnuj: {
    'u1-generation': {
      words: [
        w('generation /ˌdʒenəˈreɪʃn/ 一代人'), w('gap /ɡæp/ 隔阂'), w('argue /ˈɑːrɡjuː/ 争吵'),
        w('patient /ˈpeɪʃnt/ 耐心的'), w('respect /rɪˈspekt/ 尊重'), w('opinion /əˈpɪnjən/ 看法'),
        w('communicate /kəˈmjuːnɪkeɪt/ 沟通'), w('teenager /ˈtiːneɪdʒɚ/ 青少年'), w('strict /strɪkt/ 严格的'),
        w('relationship /rɪˈleɪʃnʃɪp/ 关系'), w('quarrel /ˈkwɔːrəl/ 吵架'), w('understand /ˌʌndɚˈstænd/ 理解'),
      ],
      sentences: [
        s('My parents are strict but they love me. [我的父母很严格但他们爱我。]'),
        s('We should respect each other’s opinions. [我们应该尊重彼此的看法。]'),
        s('Good communication helps close the generation gap. [良好的沟通有助于缩小代沟。]'),
      ],
      paragraphs: [
        p('The generation gap can cause quarrels at home. Teenagers want freedom while parents worry about safety. I used to argue with my mother, but now we try to communicate patiently. When we respect each other’s opinions, our relationship becomes better. [代沟会在家里引发争吵。青少年想要自由，父母担心安全。我以前常和妈妈争吵，但现在我们努力耐心沟通。当我们尊重彼此的看法，关系就会变好。]'),
      ],
    },
    'u2-study': {
      words: [
        w('method /ˈmeθəd/ 方法'), w('review /rɪˈvjuː/ 复习'), w('preview /ˈpriːvjuː/ 预习'),
        w('note /noʊt/ 笔记'), w('concentrate /ˈkɑːnsntreɪt/ 集中注意力'), w('distract /dɪˈstrækt/ 分心'),
        w('summary /ˈsʌməri/ 总结'), w('revise /rɪˈvaɪz/ 复习'), w('schedule /ˈskedʒuːl/ 计划'),
        w('efficient /ɪˈfɪʃnt/ 高效的'), w('memory /ˈmeməri/ 记忆力'), w('progress /ˈprɑːɡres/ 进步'),
      ],
      sentences: [
        s('I take notes and review them every evening. [我记笔记并每晚复习。]'),
        s('A quiet place helps me concentrate. [安静的地方帮我集中注意力。]'),
        s('Good methods make study more efficient. [好方法让学习更高效。]'),
      ],
      paragraphs: [
        p('Good study habits bring progress. Before class I preview the new lesson and after class I review my notes. I make a weekly schedule and write a short summary of each subject. When my phone distracts me, I put it away. Efficient methods save time and improve memory. [良好的学习习惯带来进步。课前我预习新课，课后复习笔记。我制定每周计划，并为每门课写简短总结。手机让我分心时我就把它放远。高效的方法节省时间、增强记忆。]'),
      ],
    },
    'u3-city-country': {
      words: [
        w('city /ˈsɪti/ 城市'), w('countryside /ˈkʌntrisaɪd/ 乡村'), w('crowded /ˈkraʊdɪd/ 拥挤的'),
        w('traffic /ˈtræfɪk/ 交通'), w('peaceful /ˈpiːsfl/ 宁静的'), w('field /fiːld/ 田野'),
        w('apartment /əˈpɑːrtmənt/ 公寓'), w('noise /nɔɪz/ 噪音'), w('fresh /freʃ/ 新鲜的'),
        w('convenient /kənˈviːniənt/ 便利的'), w('village /ˈvɪlɪdʒ/ 村庄'), w('quiet /ˈkwaɪət/ 安静的'),
      ],
      sentences: [
        s('The city is convenient but crowded. [城市便利但拥挤。]'),
        s('The countryside is quiet and peaceful. [乡村安静而祥和。]'),
        s('I miss the fresh air of my village. [我想念村庄里的新鲜空气。]'),
      ],
      paragraphs: [
        p('Life in the city and the countryside is different. The city is convenient with shops and buses, but the traffic is heavy and the streets are crowded. My grandparents live in a small village where the fields are green and the air is fresh. I enjoy the peaceful life there. [城市和乡村的生活不同。城市有商店和公交，很便利，但交通拥挤、街道喧闹。我的爷爷奶奶住在一个小村庄，田野碧绿、空气清新。我喜欢那里宁静的生活。]'),
      ],
    },
    'u4-safety': {
      words: [
        w('safety /ˈseɪfti/ 安全'), w('aid /eɪd/ 救助'), w('emergency /iˈmɜːrdʒənsi/ 紧急情况'),
        w('danger /ˈdeɪndʒɚ/ 危险'), w('escape /ɪˈskeɪp/ 逃生'), w('burn /bɜːrn/ 烧伤'),
        w('bleed /bliːd/ 流血'), w('bandage /ˈbændɪdʒ/ 绷带'), w('calm /kɑːm/ 冷静的'),
        w('ambulance /ˈæmbjələns/ 救护车'), w('drill /drɪl/ 演练'), w('prevent /prɪˈvent/ 预防'),
      ],
      sentences: [
        s('Stay calm in an emergency. [紧急情况要保持冷静。]'),
        s('Cover the burn with a clean bandage. [用干净绷带盖住烧伤处。]'),
        s('Our school has a fire drill every term. [我们学校每学期有一次消防演练。]'),
      ],
      paragraphs: [
        p('Safety skills can save lives. Our school holds a fire drill every term and we learn how to escape quickly. In an emergency, the most important thing is to stay calm. If someone is bleeding, we cover the wound with a bandage and call an ambulance. Preventing danger is better than dealing with it. [安全技能能救命。我们学校每学期举行消防演练，学习如何快速逃生。紧急情况下最重要的是保持冷静。如果有人流血，我们用绷带盖住伤口并叫救护车。预防危险胜于处理危险。]'),
      ],
    },
    'u5-dreams': {
      words: [
        w('dream /driːm/ 梦想'), w('career /kəˈrɪr/ 职业'), w('future /ˈfjuːtʃɚ/ 未来'),
        w('engineer /ˌendʒɪˈnɪr/ 工程师'), w('lawyer /ˈlɔːjɚ/ 律师'), w('designer /dɪˈzaɪnɚ/ 设计师'),
        w('achieve /əˈtʃiːv/ 实现'), w('choose /tʃuːz/ 选择'), w('require /rɪˈkwaɪɚ/ 需要'),
        w('skill /skɪl/ 技能'), w('passion /ˈpæʃn/ 热情'), w('effort /ˈefɚt/ 努力'),
      ],
      sentences: [
        s('My dream is to become an engineer. [我的梦想是成为一名工程师。]'),
        s('This career requires skill and patience. [这个职业需要技能和耐心。]'),
        s('With passion and effort, I will achieve my goal. [有热情和努力，我会实现目标。]'),
      ],
      paragraphs: [
        p('Everyone has a dream for the future. I want to become a designer because I love drawing and creating. My friend dreams of being a lawyer. Any career requires skills, passion and hard effort. I study hard now so that I can achieve my dream one day. [每个人都有对未来的梦想。我想成为设计师，因为我喜欢画画和创造。我的朋友梦想成为律师。任何职业都需要技能、热情和努力。我现在努力学习，以便有一天能实现梦想。]'),
      ],
    },
  },
};
/* ==================================================================
   高中：4 个版本，各 5 个特色主题
   ================================================================== */
const SENIOR_THEMES = {
  peps: [
    { id: 'u1-culture', name: '文化交流' },
    { id: 'u2-technology', name: '科技与未来' },
    { id: 'u3-environment', name: '环境保护' },
    { id: 'u4-role-models', name: '人物榜样' },
    { id: 'u5-art', name: '艺术与审美' },
  ],
  fltrps: [
    { id: 'u1-social', name: '社会问题' },
    { id: 'u2-healthy', name: '健康生活' },
    { id: 'u3-adventure', name: '探险与旅行' },
    { id: 'u4-literature', name: '文学与阅读' },
    { id: 'u5-media', name: '媒体与新闻' },
  ],
  bnus: [
    { id: 'u1-innovation', name: '科学与创新' },
    { id: 'u2-choices', name: '人生选择' },
    { id: 'u3-global', name: '全球议题' },
    { id: 'u4-psychology', name: '心理学与情绪' },
    { id: 'u5-tradition', name: '传统与现代' },
  ],
  yls: [
    { id: 'u1-wonders', name: '自然奇观' },
    { id: 'u2-language', name: '语言学习' },
    { id: 'u3-history', name: '历史事件' },
    { id: 'u4-sports', name: '体育精神' },
    { id: 'u5-space', name: '太空探索' },
  ],
};

const SENIOR = {
  peps: {
    'u1-culture': {
      words: [
        w('exchange /ɪksˈtʃeɪndʒ/ 交流'), w('culture /ˈkʌltʃɚ/ 文化'), w('tradition /trəˈdɪʃn/ 传统'),
        w('value /ˈvæljuː/ 价值观'), w('abroad /əˈbrɔːd/ 在国外'), w('custom /ˈkʌstəm/ 习俗'),
        w('diversity /daɪˈvɜːrsəti/ 多样性'), w('respect /rɪˈspekt/ 尊重'), w('misunderstanding /ˌmɪsʌndɚˈstændɪŋ/ 误解'),
        w('adapt /əˈdæpt/ 适应'), w('ceremony /ˈserəmoʊni/ 仪式'), w('identity /aɪˈdentəti/ 身份认同'),
      ],
      sentences: [
        s('Cultural exchange helps us understand each other. [文化交流帮助我们相互理解。]'),
        s('We should respect cultural diversity. [我们应该尊重文化多样性。]'),
        s('It takes time to adapt to life abroad. [适应国外生活需要时间。]'),
      ],
      paragraphs: [
        p('Cultural exchange is valuable in a global world. When we study abroad, we meet different customs and values. Misunderstandings may happen, but respect and patience solve most problems. Adapting to a new culture also helps us understand our own identity better. [文化交流在全球化世界很有价值。出国学习时我们会遇到不同的习俗和价值观。误会可能发生，但尊重和耐心能解决大部分问题。适应新文化也帮我们更好地理解自己的身份认同。]'),
      ],
    },
    'u2-technology': {
      words: [
        w('technology /tekˈnɑːlədʒi/ 科技'), w('artificial /ˌɑːrtɪˈfɪʃl/ 人工的'), w('intelligence /ɪnˈtelɪdʒəns/ 智能'),
        w('automation /ˌɔːtəˈmeɪʃn/ 自动化'), w('replace /rɪˈpleɪs/ 取代'), w('career /kəˈrɪr/ 职业'),
        w('innovate /ˈɪnəveɪt/ 创新'), w('breakthrough /ˈbreɪkθruː/ 突破'), w('ethical /ˈeθɪkl/ 伦理的'),
        w('risk /rɪsk/ 风险'), w('benefit /ˈbenɪfɪt/ 益处'), w('future /ˈfjuːtʃɚ/ 未来'),
      ],
      sentences: [
        s('Artificial intelligence is changing our daily life. [人工智能正在改变我们的日常生活。]'),
        s('Automation may replace some jobs. [自动化可能取代一些工作。]'),
        s('We should think about the ethical risks of new technology. [我们应该思考新技术的伦理风险。]'),
      ],
      paragraphs: [
        p('Technology brings both benefits and risks. Artificial intelligence and automation make work faster, but they may also replace some careers. Scientists make breakthroughs in medicine every year. As we enjoy these benefits, we must also discuss the ethical questions they raise. [科技带来好处也带来风险。人工智能和自动化让工作更快，但也可能取代一些职业。科学家每年在医学上取得突破。享受这些好处的同时，我们也必须讨论它们引发的伦理问题。]'),
      ],
    },
    'u3-environment': {
      words: [
        w('environment /ɪnˈvaɪrənmənt/ 环境'), w('carbon /ˈkɑːrbən/ 碳'), w('emission /iˈmɪʃn/ 排放'),
        w('renewable /rɪˈnuːəbl/ 可再生的'), w('energy /ˈenɚdʒi/ 能源'), w('climate /ˈklaɪmət/ 气候'),
        w('global /ˈɡloʊbl/ 全球的'), w('warming /ˈwɔːrmɪŋ/ 变暖'), w('sustainable /səˈsteɪnəbl/ 可持续的'),
        w('reduce /rɪˈduːs/ 减少'), w('resource /ˈriːsɔːrs/ 资源'), w('policy /ˈpɑːləsi/ 政策'),
      ],
      sentences: [
        s('We must reduce carbon emissions. [我们必须减少碳排放。]'),
        s('Renewable energy is cleaner than coal. [可再生能源比煤更清洁。]'),
        s('Sustainable development protects resources for the future. [可持续发展为未来保护资源。]'),
      ],
      paragraphs: [
        p('Global warming is one of the biggest challenges we face. To slow climate change, countries must reduce carbon emissions and use renewable energy such as wind and solar power. Sustainable development means using resources wisely. Good policy and daily habits together can protect our environment. [全球变暖是我们面临的最大挑战之一。为减缓气候变化，各国必须减少碳排放，使用风能和太阳能等可再生能源。可持续发展意味着明智地利用资源。好的政策和日常习惯共同能保护我们的环境。]'),
      ],
    },
    'u4-role-models': {
      words: [
        w('admire /ədˈmaɪɚ/ 钦佩'), w('contribution /ˌkɑːntrɪˈbjuːʃn/ 贡献'), w('devote /dɪˈvoʊt/ 奉献'),
        w('ordinary /ˈɔːrdneri/ 普通的'), w('extraordinary /ɪkˈstrɔːrdəneri/ 非凡的'), w('persevere /ˌpɜːrsəˈvɪr/ 坚持'),
        w('hardship /ˈhɑːrdʃɪp/ 困苦'), w('inspire /ɪnˈspaɪɚ/ 鼓舞'), w('humble /ˈhʌmbl/ 谦逊的'),
        w('achieve /əˈtʃiːv/ 成就'), w('legacy /ˈleɡəsi/ 传承'), w('role model /ˈroʊl ˈmɑːdl/ 榜样'),
      ],
      sentences: [
        s('My role model is a teacher who devoted her life to education. [我的榜样是一位把一生献给教育的老师。]'),
        s('Ordinary people can do extraordinary things. [普通人可以做出不平凡的事。]'),
        s('His perseverance through hardship inspired many people. [他在困境中的坚持鼓舞了很多人。]'),
      ],
      paragraphs: [
        p('Role models show us what we can become. They are often ordinary people who persevere through hardship. My role model is a doctor who devoted her life to helping poor villages. She is humble about her achievements, but her legacy inspires many young people to serve others. [榜样告诉我们能成为什么样的人。他们常常是在困境中坚持的普通人。我的榜样是一位把一生献给帮助贫困乡村的医生。她对自己的成就很谦逊，但她留下的精神鼓舞了许多年轻人去服务他人。]'),
      ],
    },
    'u5-art': {
      words: [
        w('aesthetic /esˈθetɪk/ 审美的'), w('appreciate /əˈpriːʃieɪt/ 欣赏'), w('masterpiece /ˈmæstɚpiːs/ 杰作'),
        w('exhibition /ˌeksɪˈbɪʃn/ 展览'), w('sculpture /ˈskʌlptʃɚ/ 雕塑'), w('classical /ˈklæsɪkl/ 古典的'),
        w('modern /ˈmɑːdɚn/ 现代的'), w('abstract /ˈæbstrækt/ 抽象的'), w('emotional /ɪˈmoʊʃənl/ 情感的'),
        w('beauty /ˈbjuːti/ 美'), w('creativity /ˌkriːeɪˈtɪvəti/ 创造力'), w('critic /ˈkrɪtɪk/ 评论家'),
      ],
      sentences: [
        s('I appreciate classical music and modern painting. [我欣赏古典音乐和现代绘画。]'),
        s('The exhibition shows many masterpieces. [展览展出了许多杰作。]'),
        s('Art creates an emotional connection between people. [艺术在人与人之间建立情感联系。]'),
      ],
      paragraphs: [
        p('Art develops our sense of beauty. At an exhibition we can see classical and modern works, from realistic sculptures to abstract paintings. Critics may disagree about what counts as a masterpiece, but everyone can feel the emotion in art. Creativity and appreciation make life richer. [艺术培养我们的美感。在展览上我们能看到古典和现代作品，从写实的雕塑到抽象的绘画。评论家对什么是杰作可能有分歧，但每个人都能感受到艺术中的情感。创造与欣赏让生活更丰富。]'),
      ],
    },
  },
  fltrps: {
    'u1-social': {
      words: [
        w('poverty /ˈpɑːvɚti/ 贫困'), w('inequality /ˌɪnɪˈkwɑːləti/ 不平等'), w('crime /kraɪm/ 犯罪'),
        w('welfare /ˈwelfer/ 福利'), w('urban /ˈɜːrbən/ 城市的'), w('rural /ˈrʊrəl/ 农村的'),
        w('unemployment /ˌʌnɪmˈplɔɪmənt/ 失业'), w('justice /ˈdʒʌstɪs/ 公正'), w('reform /rɪˈfɔːrm/ 改革'),
        w('gap /ɡæp/ 差距'), w('charity /ˈtʃærəti/ 慈善'), w('vulnerable /ˈvʌlnərəbl/ 脆弱的'),
      ],
      sentences: [
        s('Poverty and inequality remain serious problems. [贫困和不平等仍是严重问题。]'),
        s('The gap between urban and rural areas is narrowing. [城乡差距正在缩小。]'),
        s('Society should protect vulnerable groups. [社会应该保护弱势群体。]'),
      ],
      paragraphs: [
        p('Every society faces difficult issues. Poverty, unemployment and inequality affect millions of people. The gap between urban and rural areas creates unfair chances in education and work. Governments need reform and stronger welfare systems. Charity helps, but justice requires real change. [每个社会都面临难题。贫困、失业和不平等影响着数百万人。城乡差距造成教育和工作的机会不公。政府需要改革和更强的福利体系。慈善有帮助，但公正需要真正的改变。]'),
      ],
    },
    'u2-healthy': {
      words: [
        w('lifestyle /ˈlaɪfstaɪl/ 生活方式'), w('stress /stres/ 压力'), w('mental /ˈmentl/ 心理的'),
        w('physical /ˈfɪzɪkl/ 身体的'), w('balance /ˈbæləns/ 平衡'), w('nutrition /nuˈtrɪʃn/ 营养'),
        w('exercise /ˈeksɚsaɪz/ 锻炼'), w('disease /dɪˈziːz/ 疾病'), w('prevent /prɪˈvent/ 预防'),
        w('immune /ɪˈmjuːn/ 免疫的'), w('sleep /sliːp/ 睡眠'), w('anxiety /æŋˈzaɪəti/ 焦虑'),
      ],
      sentences: [
        s('Mental health is as important as physical health. [心理健康和身体健康同样重要。]'),
        s('Regular exercise prevents many diseases. [规律锻炼能预防许多疾病。]'),
        s('Too much stress causes anxiety and poor sleep. [压力过大会导致焦虑和睡眠不佳。]'),
      ],
      paragraphs: [
        p('A healthy lifestyle needs balance. We should eat food with good nutrition, exercise regularly and sleep enough. Stress at school or work can cause anxiety, so we must learn to relax. Taking care of both mental and physical health helps prevent disease and keeps our immune system strong. [健康的生活方式需要平衡。我们应该吃有营养的食物、规律锻炼、充足睡眠。学校或工作的压力会导致焦虑，所以我们要学会放松。兼顾心理和身体健康有助于预防疾病、增强免疫系统。]'),
      ],
    },
    'u3-adventure': {
      words: [
        w('adventure /ədˈventʃɚ/ 探险'), w('expedition /ˌekspəˈdɪʃn/ 远征'), w('remote /rɪˈmoʊt/ 偏远的'),
        w('summit /ˈsʌmɪt/ 顶峰'), w('desert /ˈdezɚt/ 沙漠'), w('jungle /ˈdʒʌŋɡl/ 丛林'),
        w('survive /sɚˈvaɪv/ 生存'), w('equipment /ɪˈkwɪpmənt/ 装备'), w('brave /breɪv/ 勇敢的'),
        w('challenge /ˈtʃælɪndʒ/ 挑战'), w('discovery /dɪˈskʌvəri/ 发现'), w('landscape /ˈlændskeɪp/ 地貌'),
      ],
      sentences: [
        s('The expedition reached the summit after three days. [探险队三天后登上了山顶。]'),
        s('They travelled through remote desert and jungle. [他们穿越了偏远的沙漠和丛林。]'),
        s('Good equipment is necessary to survive in the wild. [在野外生存需要好装备。]'),
      ],
      paragraphs: [
        p('Adventure teaches us courage. An expedition to a remote mountain or desert requires careful planning and good equipment. The landscape may be beautiful, but the challenge is real. Those who are brave enough to face it often return with a deeper understanding of themselves. [探险教会我们勇气。去偏远的山脉或沙漠探险需要周密计划和良好装备。风景可能很美，但挑战是真实的。敢于面对的人往往会带着对自我更深的理解归来。]'),
      ],
    },
    'u4-literature': {
      words: [
        w('literature /ˈlɪtərətʃɚ/ 文学'), w('novel /ˈnɑːvl/ 小说'), w('character /ˈkerəktɚ/ 人物'),
        w('plot /plɑːt/ 情节'), w('theme /θiːm/ 主题'), w('author /ˈɔːθɚ/ 作者'),
        w('imagine /ɪˈmædʒɪn/ 想象'), w('reflect /rɪˈflekt/ 反映'), w('classic /ˈklæsɪk/ 经典'),
        w('chapter /ˈtʃæptɚ/ 章节'), w('narrative /ˈnærətɪv/ 叙事'), w('interpret /ɪnˈtɜːrprət/ 解读'),
      ],
      sentences: [
        s('The novel has interesting characters and a surprising plot. [这本小说人物有趣、情节出人意料。]'),
        s('Classic literature reflects the society of its time. [古典文学反映了它所处时代的社会。]'),
        s('Readers may interpret the same story differently. [读者对同一个故事可能有不同的解读。]'),
      ],
      paragraphs: [
        p('Reading literature opens new worlds. A good novel has memorable characters and a plot that makes us think. Classic works reflect the society in which the author lived. Every reader interprets the story in their own way, and that is what makes literature alive. [阅读文学打开新的世界。好的小说有难忘的人物和引人思考的情节。经典作品反映作者所处的社会。每个读者以自己的方式解读故事，这正是文学的生命力所在。]'),
      ],
    },
    'u5-media': {
      words: [
        w('journalist /ˈdʒɜːrnəlɪst/ 记者'), w('report /rɪˈpɔːrt/ 报道'), w('source /sɔːrs/ 来源'),
        w('verify /ˈverɪfaɪ/ 核实'), w('bias /ˈbaɪəs/ 偏见'), w('influence /ˈɪnfluəns/ 影响'),
        w('audience /ˈɔːdiəns/ 受众'), w('headline /ˈhedlaɪn/ 标题'), w('reliable /rɪˈlaɪəbl/ 可靠的'),
        w('spread /spred/ 传播'), w('misleading /ˌmɪsˈliːdɪŋ/ 误导的'), w('critical /ˈkrɪtɪkl/ 批判的'),
      ],
      sentences: [
        s('A good journalist verifies information before reporting. [好记者在报道前会核实信息。]'),
        s('Some news headlines are misleading. [有些新闻标题具有误导性。]'),
        s('We should check the source of the news. [我们应该核实新闻来源。]'),
      ],
      paragraphs: [
        p('In the age of social media, news spreads fast. But not every report is reliable, and headlines can be misleading. A responsible journalist checks the source and verifies facts before publishing. As the audience, we should read critically and be aware of bias and influence. [在社交媒体时代，新闻传播很快。但并非每篇报道都可靠，标题也可能误导人。负责任的记者在发布前会核实来源和事实。作为受众，我们应该批判地阅读，注意偏见和影响。]'),
      ],
    },
  },
  bnus: {
    'u1-innovation': {
      words: [
        w('innovation /ˌɪnəˈveɪʃn/ 创新'), w('research /rɪˈsɜːrtʃ/ 研究'), w('breakthrough /ˈbreɪkθruː/ 突破'),
        w('theory /ˈθiːəri/ 理论'), w('experiment /ɪkˈsperɪmənt/ 实验'), w('evidence /ˈevɪdəns/ 证据'),
        w('method /ˈmeθəd/ 方法'), w('curiosity /ˌkjʊriˈɑːsəti/ 好奇心'), w('explore /ɪkˈsplɔːr/ 探索'),
        w('hypothesis /haɪˈpɑːθəsɪs/ 假设'), w('conclusion /kənˈkluːʒn/ 结论'), w('peer /pɪr/ 同行'),
      ],
      sentences: [
        s('Curiosity drives scientific research. [好奇心驱动科学研究。]'),
        s('The experiment gave clear evidence for the theory. [实验为这个理论提供了明确证据。]'),
        s('Scientists share results with their peers. [科学家与同行分享结果。]'),
      ],
      paragraphs: [
        p('Innovation begins with curiosity. Scientists form a hypothesis, design an experiment and collect evidence. If the results support the theory, they reach a conclusion and share it with their peers. This method has brought us countless breakthroughs, from electricity to modern medicine. [创新始于好奇心。科学家提出假设、设计实验、收集证据。如果结果支持理论，他们得出结论并与同行分享。这个方法给我们带来了无数突破，从电到现代医学。]'),
      ],
    },
    'u2-choices': {
      words: [
        w('choice /tʃɔɪs/ 选择'), w('decision /dɪˈsɪʒn/ 决定'), w('consequence /ˈkɑːnsəkwens/ 后果'),
        w('regret /rɪˈɡret/ 后悔'), w('opportunity /ˌɑːpɚˈtuːnəti/ 机会'), w('value /ˈvæljuː/ 看重'),
        w('priority /praɪˈɔːrəti/ 优先事项'), w('compromise /ˈkɑːmprəmaɪz/ 妥协'), w('risk /rɪsk/ 风险'),
        w('responsible /rɪˈspɑːnsəbl/ 负责的'), w('path /pæθ/ 道路'), w('mature /məˈtʃʊr/ 成熟的'),
      ],
      sentences: [
        s('Every choice has consequences. [每个选择都有后果。]'),
        s('We must set our priorities before deciding. [做决定前我们要确定优先事项。]'),
        s('A mature person takes responsibility for their decisions. [成熟的人为自己的决定负责。]'),
      ],
      paragraphs: [
        p('Life is full of choices. When we choose a path, we also accept its consequences. Sometimes we must compromise between what we want and what we value most. Taking a risk can bring new opportunities. What matters is to decide responsibly and not live with regret. [人生充满选择。当我们选择一条路，也接受了它的后果。有时我们必须在想要的东西和最看重的东西之间妥协。冒险能带来新机会。重要的是负责任地决定，不带着遗憾生活。]'),
      ],
    },
    'u3-global': {
      words: [
        w('global /ˈɡloʊbl/ 全球的'), w('hunger /ˈhʌŋɡɚ/ 饥饿'), w('epidemic /ˌepɪˈdemɪk/ 流行病'),
        w('refugee /ˌrefjuˈdʒiː/ 难民'), w('cooperation /koʊˌɑːpəˈreɪʃn/ 合作'), w('treaty /ˈtriːti/ 条约'),
        w('summit /ˈsʌmɪt/ 峰会'), w('organisation /ˌɔːrɡənəˈzeɪʃn/ 组织'), w('aid /eɪd/ 援助'),
        w('migration /maɪˈɡreɪʃn/ 移民'), w('security /sɪˈkjʊrəti/ 安全'), w('poverty /ˈpɑːvɚti/ 贫困'),
      ],
      sentences: [
        s('Global problems need international cooperation. [全球问题需要国际合作。]'),
        s('The summit discussed hunger and epidemic control. [峰会讨论了饥饿与流行病防控。]'),
        s('Countries signed a treaty on climate and security. [各国签署了一项关于气候与安全的条约。]'),
      ],
      paragraphs: [
        p('Some problems cross all borders. Hunger, epidemics and migration affect every region of the world. No single country can solve them alone, so international cooperation is essential. Through treaties, summits and organisations, nations provide aid and work together for common security. [有些问题跨越所有国界。饥饿、流行病和移民影响着世界每个地区。没有哪个国家能独自解决，因此国际合作至关重要。通过条约、峰会和组织，各国提供援助，共同致力于共同安全。]'),
      ],
    },
    'u4-psychology': {
      words: [
        w('emotion /ɪˈmoʊʃn/ 情绪'), w('anxiety /æŋˈzaɪəti/ 焦虑'), w('mood /muːd/ 心情'),
        w('pressure /ˈpreʃɚ/ 压力'), w('cope /koʊp/ 应对'), w('therapy /ˈθerəpi/ 治疗'),
        w('mindful /ˈmaɪndfl/ 正念的'), w('empathy /ˈempəθi/ 同理心'), w('motivate /ˈmoʊtɪveɪt/ 激励'),
        w('behaviour /bɪˈheɪvjɚ/ 行为'), w('personality /ˌpɜːrsəˈnæləti/ 性格'), w('well-being /ˈwel biːɪŋ/ 幸福感'),
      ],
      sentences: [
        s('Learning to cope with pressure is important. [学会应对压力很重要。]'),
        s('Mindful breathing can reduce anxiety. [正念呼吸可以减轻焦虑。]'),
        s('Empathy helps us understand others’ emotions. [同理心帮助我们理解他人的情绪。]'),
      ],
      paragraphs: [
        p('Understanding emotions improves our well-being. Pressure at school can cause anxiety and change our mood. Simple habits help us cope: mindful breathing, regular exercise and honest conversation. Empathy allows us to understand how others feel, and that understanding motivates kinder behaviour. [理解情绪能提升我们的幸福感。学校的压力会导致焦虑、改变情绪。简单的习惯帮我们应对：正念呼吸、规律锻炼、坦诚交流。同理心让我们理解他人的感受，这种理解会激发更友善的行为。]'),
      ],
    },
    'u5-tradition': {
      words: [
        w('heritage /ˈherɪtɪdʒ/ 遗产'), w('preserve /prɪˈzɜːrv/ 保存'), w('ancient /ˈeɪnʃənt/ 古老的'),
        w('contemporary /kənˈtempəreri/ 当代的'), w('craft /kræft/ 手工艺'), w('identity /aɪˈdentəti/ 认同'),
        w('adapt /əˈdæpt/ 适应'), w('ceremony /ˈserəmoʊni/ 仪式'), w('value /ˈvæljuː/ 价值'),
        w('modern /ˈmɑːdɚn/ 现代的'), w('custom /ˈkʌstəm/ 习俗'), w('revive /rɪˈvaɪv/ 复兴'),
      ],
      sentences: [
        s('We should preserve our cultural heritage. [我们应该保护文化遗产。]'),
        s('Ancient crafts can still be valuable today. [古老的手工艺在今天仍有价值。]'),
        s('Traditions must adapt to modern life. [传统必须适应现代生活。]'),
      ],
      paragraphs: [
        p('Tradition and modern life can live together. Ancient customs give us a sense of identity, while contemporary ideas bring new chances. We should preserve our heritage, such as old crafts and ceremonies, but also let them adapt. What we truly keep is not the form but the value behind it. [传统与现代生活可以共存。古老的习俗给我们身份认同感，而当代思想带来新机遇。我们应该保护遗产，如古老手工艺和仪式，但也让它们适应变化。我们真正保留的不是形式，而是其背后的价值。]'),
      ],
    },
  },
  yls: {
    'u1-wonders': {
      words: [
        w('wonder /ˈwʌndɚ/ 奇观'), w('canyon /ˈkænjən/ 峡谷'), w('waterfall /ˈwɔːtɚfɔːl/ 瀑布'),
        w('glacier /ˈɡleɪʃɚ/ 冰川'), w('volcano /vɑːlˈkeɪnoʊ/ 火山'), w('coral /ˈkɔːrəl/ 珊瑚'),
        w('cave /keɪv/ 洞穴'), w('cliff /klɪf/ 悬崖'), w('vast /væst/ 广阔的'),
        w('crystal /ˈkrɪstl/ 水晶般清澈的'), w('landscape /ˈlændskeɪp/ 景观'), w('breathtaking /ˈbreθteɪkɪŋ/ 令人惊叹的'),
      ],
      sentences: [
        s('The canyon is a breathtaking natural wonder. [这个峡谷是令人惊叹的自然奇观。]'),
        s('The glacier moves very slowly down the mountain. [冰川沿山体缓慢移动。]'),
        s('We saw coral and colourful fish in the sea. [我们在海里看到了珊瑚和彩色鱼群。]'),
      ],
      paragraphs: [
        p('The earth is full of natural wonders. Deep canyons, high waterfalls and vast glaciers show the power of nature. Inside a cave you may find crystal-clear pools, and under the sea coral reefs glow with colour. Such breathtaking landscapes remind us how small we are. [地球充满自然奇观。深邃的峡谷、高悬的瀑布、广阔的冰川展现自然的力量。在洞穴里你能找到清澈见底的水潭，海底的珊瑚礁色彩斑斓。这般令人惊叹的景观提醒我们有多渺小。]'),
      ],
    },
    'u2-language': {
      words: [
        w('vocabulary /vəˈkæbjəleri/ 词汇'), w('grammar /ˈɡræmɚ/ 语法'), w('fluent /ˈfluːənt/ 流利的'),
        w('accent /ˈæksent/ 口音'), w('pronounce /prəˈnaʊns/ 发音'), w('immersion /ɪˈmɜːrʒn/ 沉浸'),
        w('memorise /ˈmeməraɪz/ 记忆'), w('context /ˈkɑːntekst/ 语境'), w('translate /ˈtrænsleɪt/ 翻译'),
        w('phrase /freɪz/ 短语'), w('practise /ˈpræktɪs/ 练习'), w('bilingual /ˌbaɪˈlɪŋɡwəl/ 双语的'),
      ],
      sentences: [
        s('Reading in context helps me memorise new vocabulary. [在语境中阅读帮我记住新词。]'),
        s('She speaks fluent English with a clear accent. [她英语流利、口音清晰。]'),
        s('Immersion is the fastest way to learn a language. [沉浸式是学语言最快的方式。]'),
      ],
      paragraphs: [
        p('Learning a language takes time and practice. We need vocabulary, grammar and, above all, the courage to speak. Reading in context is better than memorising word lists. If you can immerse yourself in the language, progress comes faster. Being bilingual opens many doors. [学一门语言需要时间和练习。我们需要词汇、语法，最重要的是开口的勇气。在语境中阅读胜过背单词表。如果能沉浸在语言中，进步会更快。掌握双语能打开很多门。]'),
      ],
    },
    'u3-history': {
      words: [
        w('ancient /ˈeɪnʃənt/ 古代的'), w('empire /ˈempaɪɚ/ 帝国'), w('dynasty /ˈdaɪnəsti/ 王朝'),
        w('revolution /ˌrevəˈluːʃn/ 革命'), w('archaeologist /ˌɑːrkiˈɑːlədʒɪst/ 考古学家'), w('ruins /ˈruːɪnz/ 遗迹'),
        w('era /ˈɪrə/ 时代'), w('document /ˈdɑːkjumənt/ 文献'), w('evidence /ˈevɪdəns/ 证据'),
        w('decline /dɪˈklaɪn/ 衰落'), w('conquest /ˈkɑːŋkwest/ 征服'), w('treaty /ˈtriːti/ 条约'),
      ],
      sentences: [
        s('Archaeologists found ruins of an ancient empire. [考古学家发现了一个古代帝国的遗迹。]'),
        s('The treaty ended a long war. [这项条约结束了一场长期战争。]'),
        s('Documents give evidence about life in that era. [文献为那个时代的生活提供了证据。]'),
      ],
      paragraphs: [
        p('History helps us understand the present. Archaeologists study ruins and old documents to learn how people lived in another era. Empires rise through conquest and fall through slow decline. By studying the evidence, we see patterns that repeat across centuries. [历史帮助我们理解现在。考古学家研究遗迹和古文献，了解另一个时代人们如何生活。帝国因征服而兴起，因缓慢衰落而灭亡。通过研究证据，我们看到几个世纪以来重复出现的规律。]'),
      ],
    },
    'u4-sports': {
      words: [
        w('athlete /ˈæθliːt/ 运动员'), w('champion /ˈtʃæmpiən/ 冠军'), w('determination /dɪˌtɜːrmɪˈneɪʃn/ 决心'),
        w('defeat /dɪˈfiːt/ 失败'), w('victory /ˈvɪktəri/ 胜利'), w('teamwork /ˈtiːmwɜːrk/ 团队合作'),
        w('discipline /ˈdɪsəplɪn/ 自律'), w('fair /fer/ 公平的'), w('record /ˈrekɚd/ 纪录'),
        w('persist /pɚˈsɪst/ 坚持'), w('compete /kəmˈpiːt/ 竞争'), w('opponent /əˈpoʊnənt/ 对手'),
      ],
      sentences: [
        s('The champion won through determination and discipline. [冠军靠决心和自律取胜。]'),
        s('Fair competition means respecting your opponent. [公平竞争意味着尊重对手。]'),
        s('Defeat teaches more than easy victory. [失败比轻易的胜利教得更多。]'),
      ],
      paragraphs: [
        p('Sports teach us more than winning. A great athlete needs discipline, determination and respect for opponents. Teamwork turns individual talent into collective strength. Defeat is painful, but those who persist learn lessons that easy victory can never teach. [体育教给我们的不止是胜利。伟大的运动员需要自律、决心和对对手的尊重。团队合作把个人天赋转化为集体力量。失败是痛苦的，但坚持的人学到的东西，是轻易的胜利永远教不会的。]'),
      ],
    },
    'u5-space': {
      words: [
        w('astronaut /ˈæstrənɔːt/ 宇航员'), w('orbit /ˈɔːrbɪt/ 轨道'), w('launch /lɔːntʃ/ 发射'),
        w('satellite /ˈsætəlaɪt/ 卫星'), w('universe /ˈjuːnɪvɜːrs/ 宇宙'), w('galaxy /ˈɡæləksi/ 星系'),
        w('gravity /ˈɡrævəti/ 引力'), w('telescope /ˈtelɪskoʊp/ 望远镜'), w('mission /ˈmɪʃn/ 任务'),
        w('explore /ɪkˈsplɔːr/ 探索'), w('rocket /ˈrɑːkɪt/ 火箭'), w('planet /ˈplænɪt/ 行星'),
      ],
      sentences: [
        s('The rocket will launch next month. [火箭将于下月发射。]'),
        s('Astronauts orbit the earth in the space station. [宇航员在空间站绕地球飞行。]'),
        s('Telescopes help us see distant galaxies. [望远镜帮我们看遥远的星系。]'),
      ],
      paragraphs: [
        p('Space exploration expands our view of the universe. A rocket launch requires years of preparation, and astronauts train hard for each mission. From orbit they look back at our small blue planet. Telescopes now show us galaxies far away, and every answer brings new questions. [太空探索拓展我们对宇宙的认识。火箭发射需要数年准备，宇航员为每次任务刻苦训练。在轨道上他们回望我们小小的蓝色星球。望远镜如今向我们展示遥远的星系，而每一个答案都带来新的问题。]'),
      ],
    },
  },
};
/* ==================================================================
   考试：3 类，各 5 个话题（学术/生活场景，词表互不相同）
   ================================================================== */
const EXAM_THEMES = {
  cet: [
    { id: 't1-education', name: '教育学习' },
    { id: 't2-technology', name: '科技影响' },
    { id: 't3-env-health', name: '环境与健康' },
    { id: 't4-workplace', name: '职场与就业' },
    { id: 't5-social', name: '社会生活' },
  ],
  ielts: [
    { id: 't1-urbanisation', name: '城市化' },
    { id: 't2-education-system', name: '教育体制' },
    { id: 't3-environment', name: '环境保护' },
    { id: 't4-globalisation', name: '文化全球化' },
    { id: 't5-healthcare', name: '健康医疗' },
  ],
  toefl: [
    { id: 't1-biology', name: '生物学' },
    { id: 't2-geology', name: '地质与气候' },
    { id: 't3-civilisation', name: '历史文明' },
    { id: 't4-psychology', name: '心理学' },
    { id: 't5-astronomy', name: '天文学' },
  ],
};

const EXAM = {
  cet: {
    't1-education': {
      words: [
        w('education /ˌedʒuˈkeɪʃn/ 教育'), w('curriculum /kəˈrɪkjələm/ 课程'), w('academic /ˌækəˈdemɪk/ 学术的'),
        w('lecture /ˈlektʃɚ/ 讲座'), w('seminar /ˈsemɪnɑːr/ 研讨课'), w('assignment /əˈsaɪnmənt/ 作业'),
        w('degree /dɪˈɡriː/ 学位'), w('graduate /ˈɡrædʒueɪt/ 毕业生'), w('research /rɪˈsɜːrtʃ/ 研究'),
        w('scholarship /ˈskɑːlɚʃɪp/ 奖学金'), w('tuition /tuˈɪʃn/ 学费'), w('campus /ˈkæmpəs/ 校园'),
      ],
      sentences: [
        s('The university offers a wide range of academic courses. [这所大学提供广泛的学术课程。]'),
        s('She won a scholarship to study abroad. [她获得了出国留学的奖学金。]'),
        s('Graduates face fierce competition in the job market. [毕业生面临激烈的就业竞争。]'),
      ],
      paragraphs: [
        p('Higher education shapes both knowledge and character. On campus students attend lectures, join seminars and finish assignments. A degree is important, but research experience and independent thinking matter just as much. Scholarships help talented students whose families cannot pay the tuition. [高等教育塑造知识与品格。在校园里学生听讲座、参加研讨、完成作业。学位重要，但研究经历和独立思考同样重要。奖学金帮助那些家庭无力支付学费的优秀学生。]'),
      ],
    },
    't2-technology': {
      words: [
        w('digital /ˈdɪdʒɪtl/ 数字的'), w('device /dɪˈvaɪs/ 设备'), w('smartphone /ˈsmɑːrtfoʊn/ 智能手机'),
        w('application /ˌæplɪˈkeɪʃn/ 应用'), w('network /ˈnetwɜːrk/ 网络'), w('innovation /ˌɪnəˈveɪʃn/ 创新'),
        w('impact /ˈɪmpækt/ 影响'), w('convenience /kənˈviːniəns/ 便利'), w('privacy /ˈpraɪvəsi/ 隐私'),
        w('data /ˈdeɪtə/ 数据'), w('dependence /dɪˈpendəns/ 依赖'), w('attention /əˈtenʃn/ 注意力'),
      ],
      sentences: [
        s('Smartphones bring great convenience to daily life. [智能手机给日常生活带来极大便利。]'),
        s('We should protect our personal data online. [我们应该保护网上个人数据。]'),
        s('Overdependence on digital devices can be harmful. [过度依赖数字设备可能有害。]'),
      ],
      paragraphs: [
        p('Digital technology has changed how we live and work. Smartphones and applications bring convenience, but they also create dependence. Companies collect huge amounts of data, so privacy becomes a serious concern. The real challenge is to enjoy the benefits of innovation while keeping control of our own attention. [数字技术改变了我们的生活和工作方式。智能手机和应用带来便利，但也造成依赖。企业收集大量数据，因此隐私成为严重问题。真正的挑战是在享受创新好处的同时，掌控自己的注意力。]'),
      ],
    },
    't3-env-health': {
      words: [
        w('pollution /pəˈluːʃn/ 污染'), w('emission /iˈmɪʃn/ 排放'), w('disease /dɪˈziːz/ 疾病'),
        w('respiratory /ˈrespərətɔːri/ 呼吸的'), w('industrial /ɪnˈdʌstriəl/ 工业的'), w('chemical /ˈkemɪkl/ 化学的'),
        w('exposure /ɪkˈspoʊʒɚ/ 接触'), w('prevention /prɪˈvenʃn/ 预防'), w('hygiene /ˈhaɪdʒiːn/ 卫生'),
        w('nutrition /nuˈtrɪʃn/ 营养'), w('urban /ˈɜːrbən/ 城市的'), w('chronic /ˈkrɑːnɪk/ 慢性的'),
      ],
      sentences: [
        s('Air pollution can cause respiratory diseases. [空气污染会导致呼吸道疾病。]'),
        s('Long-term exposure to chemicals is dangerous. [长期接触化学品是危险的。]'),
        s('Prevention is cheaper than treatment. [预防比治疗更便宜。]'),
      ],
      paragraphs: [
        p('Environmental problems affect public health directly. Industrial emissions and chemical exposure increase chronic and respiratory diseases, especially in urban areas. Prevention costs far less than treatment. Cleaner production, better hygiene and improved nutrition together can reduce the burden on hospitals. [环境问题直接影响公众健康。工业排放和化学品接触增加了慢性病和呼吸道疾病，尤其在城市地区。预防的成本远低于治疗。更清洁的生产、更好的卫生和营养共同能减轻医院负担。]'),
      ],
    },
    't4-workplace': {
      words: [
        w('employee /ɪmˈplɔɪiː/ 雇员'), w('employer /ɪmˈplɔɪɚ/ 雇主'), w('salary /ˈsæləri/ 薪水'),
        w('promotion /prəˈmoʊʃn/ 晋升'), w('resume /ˈrezəmeɪ/ 简历'), w('interview /ˈɪntɚvjuː/ 面试'),
        w('colleague /ˈkɑːliːɡ/ 同事'), w('productivity /ˌprɑːdʌkˈtɪvəti/ 效率'), w('remote /rɪˈmoʊt/ 远程的'),
        w('retire /rɪˈtaɪɚ/ 退休'), w('benefit /ˈbenɪfɪt/ 福利'), w('growth /ɡroʊθ/ 成长'),
      ],
      sentences: [
        s('A good resume helps you get an interview. [好的简历帮你获得面试机会。]'),
        s('Remote work improves productivity for some people. [远程办公对某些人提高了效率。]'),
        s('The company offers good salary and benefits. [这家公司提供不错的薪资和福利。]'),
      ],
      paragraphs: [
        p('A career is more than a salary. Employees look for growth, fair pay and benefits, while employers value productivity and teamwork. A clear resume and good interview skills open the door. Remote work is now common, and many people plan carefully for the day they retire. [职业不只是薪水。员工寻求成长、公平的薪酬和福利，而雇主看重效率和团队合作。清晰的简历和良好的面试技巧是敲门砖。远程办公如今很普遍，许多人为退休那天认真做规划。]'),
      ],
    },
    't5-social': {
      words: [
        w('community /kəˈmjuːnəti/ 社区'), w('volunteer /ˌvɑːlənˈtɪr/ 志愿者'), w('neighbour /ˈneɪbɚ/ 邻居'),
        w('relationship /rɪˈleɪʃnʃɪp/ 关系'), w('trust /trʌst/ 信任'), w('cooperate /koʊˈɑːpəreɪt/ 合作'),
        w('participate /pɑːrˈtɪsɪpeɪt/ 参与'), w('generation /ˌdʒenəˈreɪʃn/ 一代人'), w('elderly /ˈeldɚli/ 老年人'),
        w('youth /juːθ/ 青年'), w('support /səˈpɔːrt/ 支持'), w('harmony /ˈhɑːrməni/ 和谐'),
      ],
      sentences: [
        s('Trust is the foundation of any community. [信任是任何社区的基础。]'),
        s('Young people should participate in community activities. [年轻人应该参与社区活动。]'),
        s('Supporting the elderly builds a harmonious society. [支持老人能建设和谐社会。]'),
      ],
      paragraphs: [
        p('A healthy society depends on everyday connections. Neighbours who trust each other cooperate more easily. When young people participate in volunteer work, they learn responsibility and support those in need. Caring for the elderly and listening to the younger generation keeps a community in harmony. [健康的社会依赖日常的联系。彼此信任的邻居更容易合作。当年轻人参与志愿工作，他们学会责任并帮助有需要的人。关爱老人、倾听年轻一代，让社区保持和谐。]'),
      ],
    },
  },
  ielts: {
    't1-urbanisation': {
      words: [
        w('urbanisation /ˌɜːrbənəˈzeɪʃn/ 城市化'), w('migration /maɪˈɡreɪʃn/ 迁移'), w('infrastructure /ˈɪnfrəstrʌktʃɚ/ 基础设施'),
        w('housing /ˈhaʊzɪŋ/ 住房'), w('congestion /kənˈdʒestʃən/ 拥堵'), w('skyscraper /ˈskaɪskreɪpɚ/ 摩天楼'),
        w('suburb /ˈsʌbɜːrb/ 郊区'), w('resident /ˈrezɪdənt/ 居民'), w('facility /fəˈsɪləti/ 设施'),
        w('density /ˈdensəti/ 密度'), w('commute /kəˈmjuːt/ 通勤'), w('liveable /ˈlɪvəbl/ 宜居的'),
      ],
      sentences: [
        s('Rapid urbanisation brings both opportunities and problems. [快速的城市化既带来机遇也带来问题。]'),
        s('Congestion and housing shortages worry many residents. [拥堵和住房短缺困扰着许多居民。]'),
        s('Better public transport shortens the daily commute. [更好的公共交通缩短了日常通勤。]'),
      ],
      paragraphs: [
        p('Urbanisation is changing how we live. People migrate to cities for work, which raises population density and creates housing pressure. Congestion and long commutes reduce quality of life, while skyscrapers and new infrastructure change the skyline. Well-planned suburbs and public facilities can make city life far more liveable. [城市化正在改变我们的生活方式。人们为工作迁往城市，这提高了人口密度、造成住房压力。拥堵和长通勤降低生活质量，而摩天大楼和新基础设施改变了天际线。规划良好的郊区和公共设施能让城市生活宜居得多。]'),
      ],
    },
    't2-education-system': {
      words: [
        w('compulsory /kəmˈpʌlsəri/ 义务的'), w('primary /ˈpraɪmeri/ 初级的'), w('secondary /ˈsekənderi/ 中等的'),
        w('assessment /əˈsesmənt/ 评估'), w('examination /ɪɡˌzæmɪˈneɪʃn/ 考试'), w('literacy /ˈlɪtərəsi/ 读写能力'),
        w('vocational /voʊˈkeɪʃənl/ 职业的'), w('equity /ˈekwəti/ 公平'), w('standard /ˈstændɚd/ 标准'),
        w('income /ˈɪnkʌm/ 收入'), w('suitable /ˈsuːtəbl/ 合适的'), w('depth /depθ/ 深度'),
      ],
      sentences: [
        s('Secondary education is compulsory in most countries. [在多数国家中等教育是义务的。]'),
        s('Some students prefer vocational training to academic study. [有些学生更喜欢职业培训而非学术学习。]'),
        s('Equity in education remains a difficult goal. [教育公平仍是一个困难的目标。]'),
      ],
      paragraphs: [
        p('Education systems differ, but the aims are similar. Primary and secondary schooling builds basic literacy, while universities develop academic depth. Some students are better suited to vocational training than to examinations. The hardest question is equity: how to give every child the same standard regardless of family income. [教育体制不同，但目标相似。中小学教育打基础读写能力，大学发展学术深度。有些学生更适合职业培训而非考试。最难的问题是公平：如何让每个孩子无论家庭收入都达到同样的标准。]'),
      ],
    },
    't3-environment': {
      words: [
        w('conservation /ˌkɑːnsɚˈveɪʃn/ 保护'), w('biodiversity /ˌbaɪoʊdaɪˈvɜːrsəti/ 生物多样性'), w('habitat /ˈhæbɪtæt/ 栖息地'),
        w('sustainable /səˈsteɪnəbl/ 可持续的'), w('ecosystem /ˈekoʊsɪstəm/ 生态系统'), w('extinct /ɪkˈstɪŋkt/ 灭绝的'),
        w('deforestation /diːˌfɔːrɪˈsteɪʃn/ 森林砍伐'), w('renewable /rɪˈnuːəbl/ 可再生的'), w('recycle /ˌriːˈsaɪkl/ 回收'),
        w('emission /iˈmɪʃn/ 排放'), w('species /ˈspiːʃiːz/ 物种'), w('preserve /prɪˈzɜːrv/ 保护'),
      ],
      sentences: [
        s('Deforestation threatens the habitat of many species. [森林砍伐威胁许多物种的栖息地。]'),
        s('Renewable energy reduces carbon emissions. [可再生能源减少碳排放。]'),
        s('Conservation protects biodiversity for future generations. [保护为后代守护生物多样性。]'),
      ],
      paragraphs: [
        p('Protecting the environment is protecting ourselves. Deforestation and pollution destroy habitats and push species toward extinction. Conservation projects try to preserve whole ecosystems rather than single animals. Switching to renewable energy and recycling in daily life are small steps that together protect biodiversity. [保护环境就是保护自己。森林砍伐和污染破坏栖息地，把物种推向灭绝。保护项目试图保护整个生态系统而非单一动物。改用可再生能源和日常回收是小小的步骤，合起来能保护生物多样性。]'),
      ],
    },
    't4-globalisation': {
      words: [
        w('globalisation /ˌɡloʊbələˈzeɪʃn/ 全球化'), w('identity /aɪˈdentəti/ 认同'), w('homogenise /həˈmɑːdʒənaɪz/ 使同质化'),
        w('diversity /daɪˈvɜːrsəti/ 多样性'), w('fusion /ˈfjuːʒn/ 融合'), w('export /ˈekspɔːrt/ 输出'),
        w('local /ˈloʊkl/ 本土的'), w('heritage /ˈherɪtɪdʒ/ 遗产'), w('influence /ˈɪnfluəns/ 影响'),
        w('border /ˈbɔːrdɚ/ 国界'), w('erase /ɪˈreɪs/ 抹去'), w('survive /sɚˈvaɪv/ 存续'),
      ],
      sentences: [
        s('Globalisation spreads culture but may weaken local traditions. [全球化传播文化，但可能削弱本土传统。]'),
        s('Cultural diversity makes the world richer. [文化多样性让世界更丰富。]'),
        s('Cities often show a fusion of foreign and local styles. [城市常展现外来与本土风格的融合。]'),
      ],
      paragraphs: [
        p('Globalisation moves ideas, food and music across borders quickly. Some fear it will homogenise culture and erase local identity, while others enjoy the fusion of styles. The healthiest result is to keep our heritage while staying open to outside influence, so diversity survives alongside modern life. [全球化让思想、食物和音乐快速跨越国界。有人担心它会让文化同质化、抹去本土认同，有人则享受风格的融合。最健康的结果是保留自己的遗产，同时对外来影响保持开放，让多样性与现代生活共存。]'),
      ],
    },
    't5-healthcare': {
      words: [
        w('healthcare /ˈhelθker/ 医疗'), w('insurance /ɪnˈʃʊrəns/ 保险'), w('treatment /ˈtriːtmənt/ 治疗'),
        w('prevent /prɪˈvent/ 预防'), w('chronic /ˈkrɑːnɪk/ 慢性的'), w('symptom /ˈsɪmptəm/ 症状'),
        w('diagnosis /ˌdaɪəɡˈnoʊsɪs/ 诊断'), w('physician /fɪˈzɪʃn/ 医生'), w('surgery /ˈsɜːrdʒəri/ 外科手术'),
        w('recover /rɪˈkʌvɚ/ 康复'), w('vaccine /vækˈsiːn/ 疫苗'), w('access /ˈækses/ 获得'),
      ],
      sentences: [
        s('Prevention is more effective than treatment. [预防比治疗更有效。]'),
        s('Regular check-ups help detect chronic diseases early. [定期体检有助于及早发现慢性病。]'),
        s('Vaccines have saved millions of lives. [疫苗挽救了数百万人的生命。]'),
      ],
      paragraphs: [
        p('A good healthcare system values prevention. Regular check-ups and early diagnosis catch disease before it becomes serious. Vaccines have saved millions of lives, and modern surgery and medicine continue to improve recovery. But access still depends on cost and insurance, which remains a challenge in many countries. [好的医疗体系重视预防。定期体检和早期诊断能在疾病变严重前发现它。疫苗挽救了数百万人的生命，现代外科和药物不断提高康复率。但能否获得医疗服务仍取决于费用和保险，这在许多国家仍是挑战。]'),
      ],
    },
  },
  toefl: {
    't1-biology': {
      words: [
        w('organism /ˈɔːrɡənɪzəm/ 生物体'), w('cell /sel/ 细胞'), w('species /ˈspiːʃiːz/ 物种'),
        w('evolution /ˌevəˈluːʃn/ 进化'), w('adapt /əˈdæpt/ 适应'), w('gene /dʒiːn/ 基因'),
        w('habitat /ˈhæbɪtæt/ 栖息地'), w('predator /ˈpredətɚ/ 捕食者'), w('prey /preɪ/ 猎物'),
        w('reproduce /ˌriːprəˈduːs/ 繁殖'), w('enzyme /ˈenzaɪm/ 酶'), w('protein /ˈproʊtiːn/ 蛋白质'),
      ],
      sentences: [
        s('Every organism is made of cells. [每个生物都由细胞构成。]'),
        s('Species adapt to their habitat over many generations. [物种经过许多代适应其栖息地。]'),
        s('Enzymes help break down proteins in the body. [酶帮助分解体内的蛋白质。]'),
      ],
      paragraphs: [
        p('Biology studies living organisms and how they function. Every organism is built from cells, and genes carry information from one generation to the next. Through evolution, species adapt to their habitat. The relationship between predator and prey shapes whole ecosystems, while enzymes control the chemical reactions that keep cells alive. [生物学研究生物及其运作方式。每个生物都由细胞构成，基因把信息传给下一代。通过进化，物种适应其栖息地。捕食者与猎物的关系塑造整个生态系统，而酶控制着维持细胞存活的化学反应。]'),
      ],
    },
    't2-geology': {
      words: [
        w('geology /dʒiˈɑːlədʒi/ 地质学'), w('sediment /ˈsedɪmənt/ 沉积物'), w('erosion /ɪˈroʊʒn/ 侵蚀'),
        w('volcano /vɑːlˈkeɪnoʊ/ 火山'), w('magma /ˈmæɡmə/ 岩浆'), w('fossil /ˈfɑːsl/ 化石'),
        w('layer /ˈleɪɚ/ 岩层'), w('glacier /ˈɡleɪʃɚ/ 冰川'), w('tectonic /tekˈtɑːnɪk/ 构造的'),
        w('climate /ˈklaɪmət/ 气候'), w('atmosphere /ˈætməsfɪr/ 大气'), w('deposit /dɪˈpɑːzɪt/ 沉积'),
      ],
      sentences: [
        s('Sediment forms layers that record the earth’s history. [沉积物形成的岩层记录了地球历史。]'),
        s('Glaciers shape valleys through slow erosion. [冰川通过缓慢侵蚀塑造山谷。]'),
        s('Fossils in rock layers show how climate changed. [岩层中的化石显示了气候如何变化。]'),
      ],
      paragraphs: [
        p('Geology reads the history written in stone. Layers of sediment build up over millions of years, and fossils inside them record past life. Erosion by water and glaciers reshapes the land, while tectonic movement and volcanic magma build new mountains. Together these processes explain how climate has changed across the earth’s long history. [地质学解读写在石头里的历史。沉积层经过数百万年堆积，其中的化石记录了过去的生命。水和冰川的侵蚀重塑大地，而构造运动和火山岩浆造出新山脉。这些过程共同解释了地球漫长历史中气候如何变化。]'),
      ],
    },
    't3-civilisation': {
      words: [
        w('civilisation /ˌsɪvələˈzeɪʃn/ 文明'), w('archaeology /ˌɑːrkiˈɑːlədʒi/ 考古学'), w('artifact /ˈɑːrtɪfækt/ 文物'),
        w('settlement /ˈsetlmənt/ 定居点'), w('agriculture /ˈæɡrɪkʌltʃɚ/ 农业'), w('trade /treɪd/ 贸易'),
        w('empire /ˈempaɪɚ/ 帝国'), w('monument /ˈmɑːnjumənt/ 纪念建筑'), w('dynasty /ˈdaɪnəsti/ 王朝'),
        w('script /skrɪpt/ 文字'), w('decline /dɪˈklaɪn/ 衰落'), w('surplus /ˈsɜːrplʌs/ 剩余'),
      ],
      sentences: [
        s('Agriculture allowed people to build permanent settlements. [农业使人们能够建立永久定居点。]'),
        s('Trade connected distant civilisations. [贸易把遥远的文明连接起来。]'),
        s('Archaeologists study artifacts to understand ancient life. [考古学家研究文物以了解古代生活。]'),
      ],
      paragraphs: [
        p('Early civilisations began where agriculture could support large settlements. Surplus food allowed trade, and trade connected distant regions. Archaeologists study artifacts, monuments and early script to rebuild these stories. Most empires eventually faced decline, yet their ideas and inventions shaped the world that followed. [早期文明始于农业能够支撑大型定居点的地方。剩余的粮食带来贸易，贸易把遥远地区连接起来。考古学家研究文物、纪念碑和早期文字来重建这些故事。多数帝国最终走向衰落，但它们的思想和发明塑造了后来的世界。]'),
      ],
    },
    't4-psychology': {
      words: [
        w('psychology /saɪˈkɑːlədʒi/ 心理学'), w('behaviour /bɪˈheɪvjɚ/ 行为'), w('cognition /kɑːɡˈnɪʃn/ 认知'),
        w('memory /ˈmeməri/ 记忆'), w('perception /pɚˈsepʃn/ 知觉'), w('stimulus /ˈstɪmjələs/ 刺激'),
        w('response /rɪˈspɑːns/ 反应'), w('experiment /ɪkˈsperɪmənt/ 实验'), w('motivation /ˌmoʊtɪˈveɪʃn/ 动机'),
        w('emotion /ɪˈmoʊʃn/ 情绪'), w('social /ˈsoʊʃl/ 社会的'), w('disorder /dɪsˈɔːrdɚ/ 障碍'),
      ],
      sentences: [
        s('Psychologists study how memory and perception work. [心理学家研究记忆和知觉如何运作。]'),
        s('The experiment measured the response to a stimulus. [实验测量了对刺激的反应。]'),
        s('Motivation strongly influences human behaviour. [动机强烈影响人类行为。]'),
      ],
      paragraphs: [
        p('Psychology examines behaviour and the mind. Researchers design experiments to test how perception and memory work, and how people respond to a stimulus. Motivation and emotion guide much of what we do, and social pressure changes behaviour in surprising ways. This research also helps in treating mental disorders. [心理学研究行为与心智。研究者设计实验来检验知觉和记忆如何运作，以及人们如何对刺激作出反应。动机和情绪指引我们的大部分行为，社会压力以令人惊讶的方式改变行为。这项研究也有助于治疗精神障碍。]'),
      ],
    },
    't5-astronomy': {
      words: [
        w('astronomy /əˈstrɑːnəmi/ 天文学'), w('planet /ˈplænɪt/ 行星'), w('orbit /ˈɔːrbɪt/ 轨道'),
        w('telescope /ˈtelɪskoʊp/ 望远镜'), w('galaxy /ˈɡæləksi/ 星系'), w('universe /ˈjuːnɪvɜːrs/ 宇宙'),
        w('star /stɑːr/ 恒星'), w('comet /ˈkɑːmət/ 彗星'), w('gravity /ˈɡrævəti/ 引力'),
        w('satellite /ˈsætəlaɪt/ 卫星'), w('asteroid /ˈæstərɔɪd/ 小行星'), w('observe /əbˈzɜːrv/ 观测'),
      ],
      sentences: [
        s('Planets orbit the sun because of gravity. [行星因引力绕太阳运行。]'),
        s('Telescopes let us observe distant galaxies. [望远镜让我们观察遥远的星系。]'),
        s('Asteroids and comets pass near our planet. [小行星和彗星从我们星球附近掠过。]'),
      ],
      paragraphs: [
        p('Astronomy asks how the universe works. Planets orbit their star because gravity pulls them inward, and satellites circle larger worlds. With a telescope we can observe galaxies billions of years old. Comets and asteroids that pass near our planet remind us that space is active, not empty. [天文学追问宇宙如何运作。行星因引力向内拉扯而绕恒星运行，卫星环绕更大的天体。用望远镜我们能观察数十亿年历史的星系。掠过我们星球附近的彗星和小行星提醒我们：太空是活跃的，而非空无一物。]'),
      ],
    },
  },
};

/* ==================================================================
   构建：替换 levels[5] ~ levels[9]
   ================================================================== */
const JUNIOR_VERSIONS = { pepj: '人教版 Go for it', fltrpj: '外研社', ylj: '译林版', bnuj: '北师大版' };
const SENIOR_VERSIONS = { peps: '人教版', fltrps: '外研社', bnus: '北师大版', yls: '译林版' };
const EXAM_NAMES = { cet: '四六级（CET-4/6）', ielts: '雅思（IELTS）', toefl: '托福（TOEFL）' };
const WORD_DESC = '按话题整理的高频词，可逐词跟读评分。';
const SENT_DESC = '围绕本话题核心词的常用表达。';
const PARA_DESC = '一段连贯语篇，适合整段朗读与评分。';

function buildLevel(id, name, desc, content, themes, names, idPrefix) {
  const level = { id: id, name: name, desc: desc, groups: [] };
  for (const vkey of Object.keys(content)) {
    const vname = names[vkey];
    for (const t of themes[vkey]) {
      const c = content[vkey][t.id];
      if (!c) throw new Error('missing content: ' + vkey + '.' + t.id);
      const baseId = idPrefix + '-' + vkey + '-' + t.id;
      level.groups.push({ id: baseId + '-w', type: 'word', title: vname + ' · ' + t.name + ' · 核心词汇', desc: WORD_DESC, items: c.words });
      level.groups.push({ id: baseId + '-s', type: 'sentence', title: vname + ' · ' + t.name + ' · 实用句型', desc: SENT_DESC, items: c.sentences });
      level.groups.push({ id: baseId + '-p', type: 'paragraph', title: vname + ' · ' + t.name + ' · 阅读语篇', desc: PARA_DESC, items: c.paragraphs });
    }
  }
  return level;
}

data.levels[5] = buildLevel('junior', '初中英语', '初中阶段核心话题，各版本按自身单元主题组织。', JUNIOR, JUNIOR_THEMES, JUNIOR_VERSIONS, 'junior');
data.levels[6] = buildLevel('senior', '高中英语', '高中阶段核心话题，各版本按自身单元主题组织。', SENIOR, SENIOR_THEMES, SENIOR_VERSIONS, 'senior');
// 考试段：每个考试只用自己的 5 个话题，不能遍历全部（否则三个考试内容会完全相同）
function buildExamLevel(id, name, desc, key) {
  const level = { id: id, name: name, desc: desc, groups: [] };
  const vname = EXAM_NAMES[key];
  for (const t of EXAM_THEMES[key]) {
    const c = EXAM[key][t.id];
    if (!c) throw new Error('missing content: ' + key + '.' + t.id);
    const baseId = key + '-' + t.id;
    level.groups.push({ id: baseId + '-w', type: 'word', title: vname + ' · ' + t.name + ' · 核心词汇', desc: WORD_DESC, items: c.words });
    level.groups.push({ id: baseId + '-s', type: 'sentence', title: vname + ' · ' + t.name + ' · 实用句型', desc: SENT_DESC, items: c.sentences });
    level.groups.push({ id: baseId + '-p', type: 'paragraph', title: vname + ' · ' + t.name + ' · 阅读语篇', desc: PARA_DESC, items: c.paragraphs });
  }
  return level;
}

data.levels[7] = buildExamLevel('cet', '四六级（CET-4/6）', '大学阶段常见话题，词汇与语篇并重。', 'cet');
data.levels[8] = buildExamLevel('ielts', '雅思（IELTS）', '雅思常考话题，适合口语与写作语料积累。', 'ielts');
data.levels[9] = buildExamLevel('toefl', '托福（TOEFL）', '托福学科背景知识，偏学术语篇。', 'toefl');

data.version = (data.version || 1) + 1;
data.updatedAt = new Date().toISOString();
fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');

for (const idx of [5, 6, 7, 8, 9]) {
  const lv = data.levels[idx];
  let n = 0;
  for (const g of lv.groups) n += g.items.length;
  console.log(lv.name + ': ' + lv.groups.length + ' groups, ' + n + ' items');
}
