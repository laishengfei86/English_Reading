// 生成小学/初中/高中（各版本）+ 四六级/雅思/托福 练习素材，写入 materials.json
// 内容按「国家英语课标话题 + 各版本典型单元主题」生成（不复制原版课文，规避版权），可直接跟读评分。
import fs from 'fs';

const FILE = 'public/data/materials.json';
const m = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// ---------- 话题内容库（美式 IPA） ----------
const T = {
  // ===== 小学 =====
  greet: {
    words: [['hello','/həˈloʊ/','你好'],['hi','/haɪ/','嗨'],['name','/neɪm/','名字'],['nice','/naɪs/','高兴的'],['meet','/miːt/','遇见'],['friend','/frend/','朋友'],['goodbye','/ɡʊdˈbaɪ/','再见'],['teacher','/ˈtiːtʃɚ/','老师'],['student','/ˈstuːdənt/','学生'],['morning','/ˈmɔːrnɪŋ/','早晨']],
    sentences: [['Good morning.','早上好。'],['What is your name?','你叫什么名字？'],['My name is Tom.','我叫汤姆。'],['Nice to meet you.','很高兴认识你。'],['How are you?','你好吗？'],['I am fine, thank you.','我很好，谢谢。'],['Goodbye!','再见！'],['See you tomorrow.','明天见。']],
    paragraph: ['Hello, I am a student. My teacher is very kind. I have many friends at school. We say "Good morning" every day.','你好，我是一名学生。我的老师很和蔼。我在学校有很多朋友。我们每天都说"早上好"。'],
  },
  school: {
    words: [['school','/skuːl/','学校'],['classroom','/ˈklæsruːm/','教室'],['book','/bʊk/','书'],['pencil','/ˈpensl/','铅笔'],['bag','/bæɡ/','书包'],['desk','/desk/','书桌'],['chair','/tʃer/','椅子'],['blackboard','/ˈblækbɔːrd/','黑板'],['eraser','/ɪˈreɪsɚ/','橡皮'],['ruler','/ˈruːlɚ/','尺子']],
    sentences: [['This is my school.','这是我的学校。'],['I have a new book.','我有一本新书。'],['Open your book.','打开你的书。'],['Sit down, please.','请坐。'],['We have English today.','今天我们有英语课。'],['The classroom is clean.','教室很干净。'],['Where is my pencil?','我的铅笔在哪？'],['I like my school.','我喜欢我的学校。']],
    paragraph: ['My school is big and beautiful. There are many classrooms. I read books in the library. My teachers help me learn. I love my school.','我的学校又大又漂亮。有很多教室。我在图书馆读书。老师帮助我学习。我爱我的学校。'],
  },
  family: {
    words: [['father','/ˈfɑːðɚ/','爸爸'],['mother','/ˈmʌðɚ/','妈妈'],['brother','/ˈbrʌðɚ/','兄弟'],['sister','/ˈsɪstɚ/','姐妹'],['grandpa','/ˈɡrænpɑː/','爷爷'],['grandma','/ˈɡrænmɑː/','奶奶'],['family','/ˈfæməli/','家庭'],['home','/hoʊm/','家'],['love','/lʌv/','爱'],['baby','/ˈbeɪbi/','宝宝']],
    sentences: [['This is my father.','这是我的爸爸。'],['I love my family.','我爱我的家人。'],['She is my sister.','她是我的妹妹。'],['We are a happy family.','我们是一个幸福的家庭。'],['Grandma is kind.','奶奶很和蔼。'],['Welcome to my home.','欢迎来我家。'],['I have a baby brother.','我有一个弟弟。'],['Family is important.','家庭很重要。']],
    paragraph: ['There are four people in my family. My father is a doctor. My mother is a teacher. I have a little sister. We love each other very much.','我家有四口人。爸爸是医生。妈妈是老师。我有一个小妹妹。我们非常相爱。'],
  },
  weather: {
    words: [['sunny','/ˈsʌni/','晴朗的'],['rainy','/ˈreɪni/','下雨的'],['windy','/ˈwɪndi/','有风的'],['cloudy','/ˈklaʊdi/','多云的'],['snow','/snoʊ/','雪'],['hot','/hɑːt/','热的'],['cold','/koʊld/','冷的'],['warm','/wɔːrm/','温暖的'],['weather','/ˈweðɚ/','天气'],['umbrella','/ʌmˈbrelə/','雨伞']],
    sentences: [['It is sunny today.','今天天气晴朗。'],['How is the weather?','天气怎么样？'],['It is raining.','正在下雨。'],['I like snow.','我喜欢雪。'],['It is cold in winter.','冬天很冷。'],['Take your umbrella.','带上你的雨伞。'],['The wind is strong.','风很大。'],['Spring is warm.','春天很温暖。']],
    paragraph: ['Today is a sunny day. The sky is blue and the birds are singing. I go outside with my dog. We play in the park. I like sunny days.','今天是个晴天。天空湛蓝，鸟儿在歌唱。我和我的狗出门。我们在公园玩耍。我喜欢晴天。'],
  },
  birthday: {
    words: [['birthday','/ˈbɜːrθdeɪ/','生日'],['cake','/keɪk/','蛋糕'],['candle','/ˈkændl/','蜡烛'],['gift','/ɡɪft/','礼物'],['party','/ˈpɑːrti/','聚会'],['happy','/ˈhæpi/','快乐的'],['song','/sɔːŋ/','歌曲'],['year','/jɪr/','年'],['old','/oʊld/','老的'],['wish','/wɪʃ/','愿望']],
    sentences: [['Happy birthday!','生日快乐！'],['How old are you?','你几岁了？'],['I am eight.','我八岁。'],['Thank you for the gift.','谢谢你的礼物。'],['Make a wish.','许个愿吧。'],['Blow out the candles.','吹灭蜡烛。'],['Let us sing a song.','我们唱首歌吧。'],['I love my birthday party.','我喜欢我的生日聚会。']],
    paragraph: ['Today is my birthday. My friends come to my party. There is a big cake with candles. I make a wish and blow them out. We eat cake and sing songs. I am very happy.','今天是我的生日。朋友们来参加我的聚会。有一个插着蜡烛的大蛋糕。我许愿并吹灭蜡烛。我们吃蛋糕、唱歌。我非常开心。'],
  },
  colour: {
    words: [['red','/red/','红色'],['blue','/bluː/','蓝色'],['yellow','/ˈjeloʊ/','黄色'],['green','/ɡriːn/','绿色'],['orange','/ˈɔːrɪndʒ/','橙色'],['purple','/ˈpɜːrpl/','紫色'],['pink','/pɪŋk/','粉色'],['black','/blæk/','黑色'],['white','/waɪt/','白色'],['colour','/ˈkʌlɚ/','颜色']],
    sentences: [['What colour is it?','它是什么颜色？'],['It is red.','它是红色的。'],['I like blue.','我喜欢蓝色。'],['The sky is blue.','天空是蓝色的。'],['My bag is green.','我的书包是绿色的。'],['Pink is beautiful.','粉色很漂亮。'],['Black and white.','黑和白。'],['Show me yellow.','给我看黄色。']],
    paragraph: ['I have many crayons. Red, blue, yellow and green. I draw a sun with yellow. I draw the sea with blue. Colours make my picture beautiful.','我有很多蜡笔。红色、蓝色、黄色和绿色。我用黄色画太阳，用蓝色画大海。颜色让我的画很漂亮。'],
  },
  fruit: {
    words: [['apple','/ˈæpl/','苹果'],['banana','/bəˈnænə/','香蕉'],['orange','/ˈɔːrɪndʒ/','橙子'],['grape','/ɡreɪp/','葡萄'],['peach','/piːtʃ/','桃子'],['pear','/per/','梨'],['watermelon','/ˈwɔːtɚmelən/','西瓜'],['fruit','/fruːt/','水果'],['eat','/iːt/','吃'],['sweet','/swiːt/','甜的']],
    sentences: [['I like apples.','我喜欢苹果。'],['Do you like bananas?','你喜欢香蕉吗？'],['The orange is sweet.','橙子很甜。'],['Fruit is healthy.','水果有益健康。'],['I eat a pear.','我吃一个梨。'],['Grapes are purple.','葡萄是紫色的。'],['Watermelon is big.','西瓜很大。'],['Let us eat fruit.','我们吃水果吧。']],
    paragraph: ['My favourite fruit is the apple. It is red and sweet. My mum buys fruit every week. We eat an apple a day. Fruit keeps us healthy and strong.','我最喜欢的水果是苹果。它又红又甜。妈妈每周都买水果。我们每天一个苹果。水果让我们健康强壮。'],
  },
  toys: {
    words: [['toy','/tɔɪ/','玩具'],['ball','/bɔːl/','球'],['doll','/dɑːl/','娃娃'],['car','/kɑːr/','汽车'],['bear','/ber/','熊'],['block','/blɑːk/','积木'],['kite','/kaɪt/','风筝'],['robot','/ˈroʊbɑːt/','机器人'],['play','/pleɪ/','玩'],['fun','/fʌn/','有趣的']],
    sentences: [['I have a toy car.','我有一辆玩具汽车。'],['Let us play!','我们玩吧！'],['The doll is cute.','这个娃娃很可爱。'],['This is my favourite toy.','这是我最喜欢的玩具。'],['Fly the kite.','放风筝。'],['The robot can walk.','机器人会走路。'],['Blocks are fun.','积木很好玩。'],['I share my toys.','我分享我的玩具。']],
    paragraph: ['I have many toys. A red car, a cute doll and a big bear. My favourite is the robot. It can walk and talk. I play with my toys every evening.','我有很多玩具。一辆红色汽车、一个可爱的娃娃和一只大熊。我最喜欢机器人。它会走会说话。我每天晚上都玩玩具。'],
  },
  animal: {
    words: [['cat','/kæt/','猫'],['dog','/dɔːɡ/','狗'],['bird','/bɜːrd/','鸟'],['fish','/fɪʃ/','鱼'],['rabbit','/ˈræbɪt/','兔子'],['tiger','/ˈtaɪɡɚ/','老虎'],['elephant','/ˈelɪfənt/','大象'],['monkey','/ˈmʌŋki/','猴子'],['zoo','/zuː/','动物园'],['animal','/ˈænɪml/','动物']],
    sentences: [['I have a cat.','我有一只猫。'],['The dog is big.','这只狗很大。'],['I like monkeys.','我喜欢猴子。'],['Let us go to the zoo.','我们去动物园吧。'],['The rabbit is small.','兔子很小。'],['The elephant is strong.','大象很强壮。'],['Birds can fly.','鸟会飞。'],['The fish is red.','这条鱼是红色的。']],
    paragraph: ['I went to the zoo with my family. We saw big elephants and small monkeys. The tigers were sleeping. My favourite animal is the panda. It is black and white and very cute.','我和家人去了动物园。我们看到了大象和猴子。老虎在睡觉。我最喜欢的动物是熊猫。它黑白相间，非常可爱。'],
  },
  body: {
    words: [['head','/hed/','头'],['eye','/aɪ/','眼睛'],['ear','/ɪr/','耳朵'],['nose','/noʊz/','鼻子'],['mouth','/maʊθ/','嘴'],['hand','/hænd/','手'],['foot','/fʊt/','脚'],['face','/feɪs/','脸'],['arm','/ɑːrm/','手臂'],['leg','/leɡ/','腿']],
    sentences: [['This is my head.','这是我的头。'],['I have two eyes.','我有两只眼睛。'],['Wash your hands.','洗你的手。'],['My face is clean.','我的脸很干净。'],['Touch your nose.','摸摸你的鼻子。'],['I have two feet.','我有两只脚。'],['My arms are long.','我的手臂很长。'],['Clap your hands.','拍拍手。']],
    paragraph: ['I have a body. My head is round. I have two eyes, two ears and one nose. My hands can write and my feet can run. I take care of my body every day.','我有一个身体。我的头圆圆的。我有两只眼睛、两只耳朵和一个鼻子。我的手会写字，脚会跑步。我每天爱护我的身体。'],
  },
  // ===== 初中 =====
  hobby: {
    words: [['hobby','/ˈhɑːbi/','爱好'],['collect','/kəˈlekt/','收集'],['photography','/fəˈtɑːɡrəfi/','摄影'],['painting','/ˈpeɪntɪŋ/','绘画'],['cycling','/ˈsaɪklɪŋ/','骑行'],['chess','/tʃes/','国际象棋'],['volunteer','/ˌvɑːlənˈtɪr/','志愿者'],['weekend','/ˈwiːkend/','周末'],['relax','/rɪˈlæks/','放松'],['interest','/ˈɪntrəst/','兴趣']],
    sentences: [['My hobby is reading.','我的爱好是阅读。'],['I collect stamps.','我集邮。'],['What do you do on weekends?','你周末做什么？'],['I enjoy playing chess.','我喜欢下棋。'],['Painting helps me relax.','绘画让我放松。'],['He is a volunteer.','他是一名志愿者。'],['Reading broadens my mind.','阅读开阔我的眼界。'],['We share the same interest.','我们有相同的兴趣。']],
    paragraph: ['Everyone has a hobby. Some like sports, and others enjoy music or reading. My hobby is taking photos of nature. On weekends I go to the park with my camera. A hobby makes life colourful and happy.','每个人都有自己的爱好。有人喜欢运动，有人喜欢音乐或阅读。我的爱好是拍摄自然。周末我带着相机去公园。爱好让生活多姿多彩、充满快乐。'],
  },
  environment: {
    words: [['environment','/ɪnˈvaɪrənmənt/','环境'],['pollution','/pəˈluːʃn/','污染'],['recycle','/riːˈsaɪkl/','回收'],['protect','/prəˈtekt/','保护'],['forest','/ˈfɔːrɪst/','森林'],['energy','/ˈenərdʒi/','能源'],['save','/seɪv/','节省'],['planet','/ˈplænɪt/','星球'],['reduce','/rɪˈduːs/','减少'],['waste','/weɪst/','浪费']],
    sentences: [['We should protect the environment.','我们应该保护环境。'],['Recycling helps the earth.','回收有助于地球。'],['Turn off the lights to save energy.','关灯以节约能源。'],['Plant more trees.','种更多的树。'],['Don’t waste water.','不要浪费水。'],['Air pollution is a problem.','空气污染是个问题。'],['Small actions make a difference.','小小的行动也能带来改变。'],['Our planet needs us.','我们的星球需要我们。']],
    paragraph: ['The earth is our only home. Today, pollution and climate change threaten it. We can help by recycling, saving water and planting trees. If everyone does a little, the world will be a better place for the next generation.','地球是我们唯一的家园。如今，污染和气候变化正威胁着它。我们可以通过回收、节水和植树来帮忙。如果每个人都做一点，世界将更美好，惠及下一代。'],
  },
  health: {
    words: [['healthy','/ˈhelθi/','健康的'],['exercise','/ˈeksərsaɪz/','锻炼'],['vegetable','/ˈvedʒtəbl/','蔬菜'],['balance','/ˈbæləns/','平衡'],['sleep','/sliːp/','睡眠'],['habit','/ˈhæbɪt/','习惯'],['doctor','/ˈdɑːktɚ/','医生'],['strong','/strɔːŋ/','强壮的'],['ill','/ɪl/','生病'],['fresh','/freʃ/','新鲜的']],
    sentences: [['Eating vegetables keeps you healthy.','吃蔬菜让你健康。'],['I exercise every day.','我每天锻炼。'],['Early to bed is a good habit.','早睡是个好习惯。'],['An apple a day keeps the doctor away.','一天一苹果，医生远离我。'],['We need enough sleep.','我们需要充足的睡眠。'],['Drink fresh water.','喝新鲜的水。'],['Running makes me strong.','跑步让我强壮。'],['Don’t eat too much junk food.','不要吃太多垃圾食品。']],
    paragraph: ['Health is the most important thing in life. To stay healthy, we need a balanced diet, regular exercise and enough sleep. Eat more vegetables and fruit, drink water, and go to bed early. Good habits build a strong body.','健康是人生中最重要的事。要保持健康，我们需要均衡饮食、规律运动和充足睡眠。多吃蔬菜水果，喝水，早睡。好习惯造就强壮的身体。'],
  },
  travel: {
    words: [['journey','/ˈdʒɜːrni/','旅程'],['ticket','/ˈtɪkɪt/','票'],['sightseeing','/ˈsaɪtsiːɪŋ/','观光'],['foreign','/ˈfɔːrən/','外国的'],['culture','/ˈkʌltʃɚ/','文化'],['local','/ˈloʊkl/','当地的'],['guide','/ɡaɪd/','导游'],['map','/mæp/','地图'],['luggage','/ˈlʌɡɪdʒ/','行李'],['abroad','/əˈbrɔːd/','国外']],
    sentences: [['I want to travel abroad.','我想去国外旅行。'],['We visited many cities.','我们参观了许多城市。'],['The local food was great.','当地的食物很棒。'],['Travel broadens the mind.','旅行开阔眼界。'],['Do you have a map?','你有地图吗？'],['The guide showed us around.','导游带我们参观。'],['I bought a ticket online.','我在网上买了票。'],['Sightseeing is tiring but fun.','观光累人但有趣。']],
    paragraph: ['Last summer I travelled to a foreign country with my parents. We visited old cities and tried local food. The people were friendly and the views were amazing. Travel taught me that the world is bigger and more colourful than I imagined.','去年夏天我和父母去了一个外国旅行。我们参观了古城，品尝了当地美食。人们很友好，风景令人惊叹。旅行让我明白，世界比我想象的更大、更精彩。'],
  },
  technology: {
    words: [['technology','/tekˈnɑːlədʒi/','科技'],['internet','/ˈɪntɚnet/','互联网'],['smartphone','/ˈsmɑːrtfoʊn/','智能手机'],['device','/dɪˈvaɪs/','设备'],['app','/æp/','应用程序'],['online','/ˌɑːnˈlaɪn/','在线的'],['digital','/ˈdɪdʒɪtl/','数字的'],['robot','/ˈroʊbɑːt/','机器人'],['convenient','/kənˈviːniənt/','方便的'],['AI','/ˌeɪ ˈaɪ/','人工智能']],
    sentences: [['Technology changes our life.','科技改变我们的生活。'],['I chat with friends online.','我在网上和朋友聊天。'],['Smartphones are very useful.','智能手机非常有用。'],['AI is developing fast.','人工智能发展很快。'],['The app helps me study.','这个应用帮助我学习。'],['Digital books save paper.','电子书节约纸张。'],['The device is convenient.','这个设备很方便。'],['We should use the internet wisely.','我们应该明智地使用互联网。']],
    paragraph: ['Technology has changed our daily life. We study, shop and talk with friends online. Smartphones and apps make things convenient. However, we should not spend too much time on screens. Used wisely, technology is a powerful tool for learning.','科技改变了我们的日常生活。我们在线学习、购物、与朋友交谈。智能手机和应用让事情变得方便。然而，我们不该在屏幕前花太多时间。明智使用，科技便是学习的利器。'],
  },
  friendship: {
    words: [['friend','/frend/','朋友'],['trust','/trʌst/','信任'],['support','/səˈpɔːrt/','支持'],['honest','/ˈɑːnɪst/','诚实的'],['share','/ʃer/','分享'],['care','/ker/','关心'],['help','/help/','帮助'],['company','/ˈkʌmpəni/','陪伴'],['laugh','/læf/','笑'],['difference','/ˈdɪfrəns/','差异']],
    sentences: [['A friend in need is a friend indeed.','患难见真情。'],['We should help each other.','我们应该互相帮助。'],['Good friends share happiness.','好朋友分享快乐。'],['Trust is important.','信任很重要。'],['She is honest and kind.','她诚实又善良。'],['Friends support one another.','朋友互相支持。'],['We laugh together.','我们一起欢笑。'],['True friends accept differences.','真正的朋友接纳差异。']],
    paragraph: ['A good friend is like a mirror. We trust and support each other. When I am sad, my friend listens and cares. When I succeed, my friend celebrates with me. Friendship makes life warmer and easier to bear.','好朋友像一面镜子。我们互相信任、互相支持。当我难过时，朋友倾听并关心我。当我成功时，朋友与我同庆。友谊让生活更温暖，也更易承受。'],
  },
  schoollife: {
    words: [['subject','/ˈsʌbdʒɪkt/','科目'],['experiment','/ɪkˈsperɪmənt/','实验'],['library','/ˈlaɪbreri/','图书馆'],['competition','/ˌkɑːmpəˈtɪʃn/','比赛'],['club','/klʌb/','社团'],['uniform','/ˈjuːnɪfɔːrm/','校服'],['homework','/ˈhoʊmwɜːrk/','家庭作业'],['exam','/ɪɡˈzæm/','考试'],['grade','/ɡreɪd/','成绩'],['classmate','/ˈklæsmeɪt/','同学']],
    sentences: [['My favourite subject is science.','我最喜欢的科目是科学。'],['We have a science club.','我们有一个科学社团。'],['The exam was difficult.','考试很难。'],['I joined the basketball club.','我加入了篮球社。'],['The library is quiet.','图书馆很安静。'],['We did an experiment today.','今天我们做了一个实验。'],['My classmate helped me.','我的同学帮助了我。'],['I got a good grade.','我取得了好成绩。']],
    paragraph: ['School life is busy but happy. Every day we have different subjects and do experiments in the lab. After class, I join the reading club in the library. My classmates are friendly. Though exams are stressful, they help me grow.','学校生活忙碌却快乐。每天我们有不同的科目，在实验室做实验。课后，我参加图书馆的阅读社。同学们很友好。尽管考试让人紧张，但它们帮助我成长。'],
  },
  dream: {
    words: [['dream','/driːm/','梦想'],['goal','/ɡoʊl/','目标'],['future','/ˈfjuːtʃɚ/','未来'],['success','/səkˈses/','成功'],['hardwork','/ˈhɑːrdwɜːrk/','努力'],['believe','/bɪˈliːv/','相信'],['achieve','/əˈtʃiːv/','实现'],['courage','/ˈkɜːrɪdʒ/','勇气'],['plan','/plæn/','计划'],['effort','/ˈefɚt/','努力']],
    sentences: [['I have a big dream.','我有一个大梦想。'],['Work hard to achieve your goal.','努力实现你的目标。'],['Never give up.','永不放弃。'],['Believe in yourself.','相信你自己。'],['Success needs effort.','成功需要努力。'],['Make a plan for the future.','为未来制定计划。'],['Courage helps us face fear.','勇气帮助我们面对恐惧。'],['Dreams come true with action.','梦想因行动而成真。']],
    paragraph: ['Everyone has a dream. Some want to be scientists, others want to help people. To achieve a dream, we need a clear goal, daily effort and the courage to fail and try again. The future belongs to those who keep moving forward.','每个人都有一个梦想。有人想当科学家，有人想帮助他人。要实现梦想，我们需要清晰的目标、日复一日的努力，以及面对失败再尝试的勇气。未来属于不断前行的人。'],
  },
  // ===== 高中 =====
  culture: {
    words: [['culture','/ˈkʌltʃɚ/','文化'],['tradition','/trəˈdɪʃn/','传统'],['custom','/ˈkʌstəm/','习俗'],['festival','/ˈfestɪvl/','节日'],['heritage','/ˈherɪtɪdʒ/','遗产'],['celebrate','/ˈselɪbreɪt/','庆祝'],['diversity','/daɪˈvɜːrsəti/','多样性'],['respect','/rɪˈspekt/','尊重'],['belief','/bɪˈliːf/','信仰'],['generation','/ˌdʒenəˈreɪʃn/','一代人']],
    sentences: [['Chinese culture is rich.','中国文化博大精深。'],['We should respect traditions.','我们应该尊重传统。'],['The festival is celebrated worldwide.','这个节日在世界各地庆祝。'],['Cultural diversity is valuable.','文化多样性很有价值。'],['Heritage connects generations.','遗产连接着一代代人。'],['Customs vary from place to place.','习俗因地而异。'],['We celebrate the Spring Festival.','我们庆祝春节。'],['Mutual respect builds friendship.','相互尊重建立友谊。']],
    paragraph: ['Culture is the soul of a nation. Through festivals, food and customs, we pass our heritage to the next generation. In a global world, understanding cultural diversity helps people respect one another. Only by knowing others can we better know ourselves.','文化是一个民族的灵魂。通过节日、饮食和习俗，我们把遗产传给下一代。在全球化的世界里，理解文化多样性有助于人们相互尊重。唯有了解他人，我们才能更好地认识自己。'],
  },
  achievement: {
    words: [['achievement','/əˈtʃiːvmənt/','成就'],['contribution','/ˌkɑːntrɪˈbjuːʃn/','贡献'],['discovery','/dɪˈskʌvəri/','发现'],['invent','/ɪnˈvent/','发明'],['scientific','/ˌsaɪənˈtɪfɪk/','科学的'],['advance','/ədˈvæns/','进步'],['progress','/ˈprɑːɡres/','进展'],['breakthrough','/ˈbreɪkθruː/','突破'],['research','/rɪˈsɜːrtʃ/','研究'],['nobel','/noʊˈbel/','诺贝尔']],
    sentences: [['His achievement inspired many.','他的成就激励了许多人。'],['Science brings progress.','科学带来进步。'],['The discovery changed the world.','这项发现改变了世界。'],['Hard work leads to success.','努力通向成功。'],['She made a breakthrough in medicine.','她在医学上取得了突破。'],['Research takes patience.','研究需要耐心。'],['Their contribution is great.','他们的贡献巨大。'],['Never stop exploring.','永不停止探索。']],
    paragraph: ['Human progress is built on the achievements of countless scientists. From the discovery of electricity to modern medicine, each breakthrough improves lives. Behind every success lies years of research, failure and persistence. We stand on the shoulders of giants.','人类的进步建立在无数科学家的成就之上。从电的发现到现代医学，每一次突破都改善了生活。每个成功背后，是多年的研究、失败与坚持。我们站在巨人的肩膀上。'],
  },
  education: {
    words: [['education','/ˌedʒuˈkeɪʃn/','教育'],['knowledge','/ˈnɑːlɪdʒ/','知识'],['quality','/ˈkwɑːləti/','质量'],['compulsory','/kəmˈpʌlsəri/','义务的'],['literacy','/ˈlɪtərəsi/','读写能力'],['skill','/skɪl/','技能'],['critical','/ˈkrɪtɪkl/','批判性的'],['thinking','/ˈθɪŋkɪŋ/','思维'],['value','/ˈvæljuː/','价值'],['develop','/dɪˈveləp/','发展']],
    sentences: [['Education is the key to the future.','教育是通往未来的钥匙。'],['Knowledge changes destiny.','知识改变命运。'],['We should think critically.','我们应该批判性思考。'],['Lifelong learning matters.','终身学习很重要。'],['Compulsory education helps all children.','义务教育帮助所有孩子。'],['Schools develop our skills.','学校培养我们的技能。'],['Reading builds knowledge.','阅读积累知识。'],['Education spreads values.','教育传播价值观。']],
    paragraph: ['Education is more than passing exams. It teaches us how to think, to question and to create. A good education develops both knowledge and character. In the 21st century, critical thinking and lifelong learning are the true keys to a meaningful life.','教育不只是通过考试。它教会我们如何思考、质疑和创造。好的教育同时培养知识和品格。在21世纪，批判性思维和终身学习才是通向有意义人生的真正钥匙。'],
  },
  society: {
    words: [['society','/səˈsaɪəti/','社会'],['community','/kəˈmjuːnəti/','社区'],['responsibility','/rɪˌspɑːnsəˈbɪləti/','责任'],['equality','/iˈkwɑːləti/','平等'],['welfare','/ˈwelfer/','福利'],['charity','/ˈtʃærəti/','慈善'],['donate','/doʊˈneɪt/','捐赠'],['volunteer','/ˌvɑːlənˈtɪr/','志愿者'],['harmony','/ˈhɑːrməni/','和谐'],['policy','/ˈpɑːləsi/','政策']],
    sentences: [['We have a duty to society.','我们对社会有责任。'],['Volunteering helps the community.','志愿服务帮助社区。'],['Equality is a basic right.','平等是一项基本权利。'],['A harmonious society benefits all.','和谐社会惠及所有人。'],['Charity begins with a kind heart.','慈善始于善心。'],['We should care for the elderly.','我们应该关爱老人。'],['Policy should serve people.','政策应服务于人民。'],['Small acts build a better society.','小小的行动构建更好的社会。']],
    paragraph: ['A healthy society depends on the responsibility of every citizen. When we volunteer, donate or simply help a neighbour, we weave a stronger community. True progress is not only economic, but also a fairer and more harmonious society for all.','一个健康的社会依赖于每位公民的责任感。当我们做志愿、捐赠，或只是帮助邻居时，我们就在编织一个更紧密的社区。真正的进步不只是经济上的，更是为所有人构建更公平、更和谐的社会。'],
  },
  science: {
    words: [['science','/ˈsaɪəns/','科学'],['experiment','/ɪkˈsperɪmənt/','实验'],['theory','/ˈθiːəri/','理论'],['observe','/əbˈzɜːrv/','观察'],['evidence','/ˈevɪdəns/','证据'],['conclude','/kənˈkluːd/','得出结论'],['hypothesis','/haɪˈpɑːθəsɪs/','假设'],['analysis','/əˈnæləsɪs/','分析'],['data','/ˈdeɪtə/','数据'],['phenomenon','/fəˈnɑːmɪnən/','现象']],
    sentences: [['Science is based on evidence.','科学以证据为基础。'],['We observe and conclude.','我们观察并得出结论。'],['The experiment proved the theory.','实验证明了理论。'],['Data must be analyzed.','数据必须被分析。'],['A hypothesis guides research.','假设指导研究。'],['Facts speak louder than opinions.','事实胜于雄辩。'],['Curiosity drives science.','好奇心推动科学。'],['Repeat the experiment to be sure.','重复实验以确保可靠。']],
    paragraph: ['Scientific thinking begins with observation. We form a hypothesis, test it through experiments, and analyze the data. Only when evidence is strong can we draw a conclusion. This careful method, not guesswork, is what makes science reliable and powerful.','科学思维始于观察。我们提出假设，通过实验检验，并分析数据。只有证据充分时才能得出结论。正是这种严谨的方法，而非猜测，使科学可靠而强大。'],
  },
  nature: {
    words: [['nature','/ˈneɪtʃɚ/','自然'],['ecosystem','/ˈiːkoʊsɪstəm/','生态系统'],['biodiversity','/ˌbaɪodaɪˈvɜːrsəti/','生物多样性'],['species','/ˈspiːʃiːz/','物种'],['survive','/sɚˈvaɪv/','生存'],['climate','/ˈklaɪmət/','气候'],['balance','/ˈbæləns/','平衡'],['threaten','/ˈθretn/','威胁'],['conserve','/kənˈsɜːrv/','保护'],['wildlife','/ˈwaɪldlaɪf/','野生动物']],
    sentences: [['We must protect wildlife.','我们必须保护野生动物。'],['Climate change is a threat.','气候变化是一种威胁。'],['Conserving nature is urgent.','保护自然刻不容缓。'],['Biodiversity keeps balance.','生物多样性维持平衡。'],['Every species has a role.','每个物种都有其作用。'],['Forests are the lungs of Earth.','森林是地球之肺。'],['Small changes help nature.','小小的改变也能帮助自然。'],['Respect all living things.','尊重一切生命。']],
    paragraph: ['Nature is a delicate web. Every species, from the smallest insect to the largest whale, plays a role in the ecosystem. Human activity now threatens this balance through climate change and habitat loss. To survive, we must learn to live in harmony with nature, not against it.','自然是一张精巧的网。从最小的昆虫到最大的鲸鱼，每个物种都在生态系统中扮演着角色。人类活动正通过气候变化和栖息地丧失威胁着这种平衡。为了生存，我们必须学会与自然和谐共处，而非对抗。'],
  },
  // ===== 考试 =====
  cet: {
    words: [['approximately','/əˈprɑːksɪmətli/','大约'],['significant','/sɪɡˈnɪfɪkənt/','显著的'],['phenomenon','/fəˈnɑːmɪnən/','现象'],['perspective','/pərˈspektɪv/','视角'],['inevitably','/ɪnˈevɪtəbli/','不可避免地'],['consequence','/ˈkɑːnsəkwens/','后果'],['fundamental','/ˌfʌndəˈmentl/','基本的'],['nevertheless','/ˌnevərðəˈles/','然而'],['comprehensive','/ˌkɑːmprɪˈhensɪv/','全面的'],['individual','/ˌɪndɪˈvɪdʒuəl/','个人的']],
    sentences: [['This phenomenon is significant.','这个现象很重要。'],['From my perspective, it matters.','在我看来，这很重要。'],['Nevertheless, we must act.','然而，我们必须行动。'],['The consequence is fundamental.','其后果是根本性的。'],['It is approximately 80 percent.','大约为百分之八十。'],['Education is a comprehensive task.','教育是一项全面的任务。'],['Each individual counts.','每个个体都很重要。'],['We need a broader view.','我们需要更广阔的视野。']],
    paragraph: ['With the rapid development of technology, the way people acquire knowledge has changed significantly. Online learning, once a supplement, is now a mainstream channel. Nevertheless, it cannot replace the comprehensive training of traditional education, which shapes not only skills but also character and critical thinking.','随着科技的快速发展，人们获取知识的方式发生了显著变化。在线学习曾是补充，如今已成为主流渠道。然而，它无法取代传统教育全面的培养——后者塑造的不仅是技能，还有品格与批判性思维。'],
  },
  ielts: {
    words: [['band','/bænd/','分数档'],['fluent','/ˈfluːənt/','流利的'],['coherent','/koʊˈhɪrənt/','连贯的'],['lexical','/ˈleksɪkl/','词汇的'],['task','/tæsk/','任务'],['cue','/kjuː/','提示'],['opinion','/əˈpɪnjən/','观点'],['illustrate','/ˈɪləstreɪt/','阐明'],['trend','/trend/','趋势'],['urban','/ˈɜːrbən/','城市的']],
    sentences: [['In my opinion, it is beneficial.','在我看来，这是有益的。'],['I will illustrate with an example.','我会用一个例子来说明。'],['The trend is clear.','趋势很明显。'],['Urban life has both pros and cons.','城市生活利弊并存。'],['A coherent answer scores higher.','连贯的回答得分更高。'],['Expand your lexical range.','扩大你的词汇量。'],['State your opinion clearly.','清楚地陈述你的观点。'],['Use the cue card wisely.','明智地使用提示卡。']],
    paragraph: ['Some people believe that living in a big city is better than living in the countryside. On the one hand, cities offer better jobs, schools and hospitals. On the other hand, they suffer from traffic and pollution. In my view, the best choice depends on one’s stage of life and personal values, rather than a simple right or wrong.','有人认为住大城市比住乡村更好。一方面，城市提供更好的工作、学校和医院；另一方面，城市饱受交通与污染之苦。在我看来，最佳选择取决于人生阶段与个人价值观，而非简单的对错。'],
  },
  toefl: {
    words: [['campus','/ˈkæmpəs/','校园'],['registrar','/ˈredʒɪstrɑːr/','注册处'],['seminar','/ˈsemɪnɑːr/','研讨课'],['lecture','/ˈlektʃɚ/','讲座'],['assignment','/əˈsaɪnmənt/','作业'],['deadline','/ˈdedlaɪn/','截止日期'],['faculty','/ˈfæklti/','教职员工'],['tuition','/tuˈɪʃn/','学费'],['undergraduate','/ˌʌndərˈɡrædʒuət/','本科生'],['integrate','/ˈɪntɪɡreɪt/','整合']],
    sentences: [['The lecture was informative.','那场讲座信息丰富。'],['I missed the registration deadline.','我错过了注册截止日期。'],['The seminar starts at three.','研讨课三点开始。'],['Tuition has increased this year.','今年学费上涨了。'],['She is an undergraduate.','她是一名本科生。'],['The assignment is due Friday.','作业周五截止。'],['Visit the registrar’s office.','去注册处办公室。'],['We must integrate the sources.','我们必须整合这些资料。']],
    paragraph: ['The university announced a new policy requiring all undergraduates to attend at least one seminar per semester. While some students worry about the extra workload before deadlines, faculty argue that seminars improve critical thinking far more than lectures alone. The administration will review the policy after one year.','大学宣布了一项新政策，要求所有本科生每学期至少参加一次研讨课。尽管一些学生担心在截止日期前增加负担，但教职员工认为研讨课比单纯听课更能提升批判性思维。校方将在一年后审查该政策。'],
  },
};

// ---------- 版本/学段映射 ----------
const VERSIONS = {
  primary: {
    name: '小学英语',
    desc: '小学阶段核心话题，覆盖主流教材版本典型单元主题，适合跟读打基础。',
    versions: {
      pep:   { name: '人教版 PEP（三起）', topics: ['greet', 'school', 'family'] },
      fltrp: { name: '外研社（一起/三起）', topics: ['weather', 'birthday', 'greet'] },
      yl:    { name: '译林版（牛津）', topics: ['colour', 'fruit', 'toys'] },
      sh:    { name: '沪教牛津', topics: ['animal', 'body', 'school'] },
    },
  },
  junior: {
    name: '初中英语',
    desc: '初中阶段功能句型与话题语篇，覆盖主流教材版本典型单元主题。',
    versions: {
      pepj:  { name: '人教版 Go for it', topics: ['hobby', 'environment', 'health'] },
      fltrpj:{ name: '外研社', topics: ['travel', 'technology', 'friendship'] },
      ylj:   { name: '译林版', topics: ['schoollife', 'dream', 'health'] },
      bnuj:  { name: '北师大版', topics: ['environment', 'friendship', 'travel'] },
    },
  },
  senior: {
    name: '高中英语',
    desc: '高中阶段语篇与思辨表达，覆盖主流教材版本典型单元主题。',
    versions: {
      peps:  { name: '人教版', topics: ['culture', 'achievement', 'education'] },
      fltrps:{ name: '外研社', topics: ['society', 'science', 'culture'] },
      bnus:  { name: '北师大版', topics: ['education', 'nature', 'achievement'] },
      yls:   { name: '译林版', topics: ['nature', 'society', 'science'] },
    },
  },
};

const EXAM = {
  cet:    { name: '四六级（CET-4/6）', desc: '四六级核心词汇与写作语篇，计划后续批量导入数据库。', topics: ['cet'] },
  ielts:  { name: '雅思（IELTS）', desc: '雅思口语/写作话题语料，计划后续批量导入数据库。', topics: ['ielts'] },
  toefl:  { name: '托福（TOEFL）', desc: '托福校园/学术语料，计划后续批量导入数据库。', topics: ['toefl'] },
};

// ---------- 构建函数 ----------
function uniqWords(topics, limit = 14) {
  const seen = new Set(); const out = [];
  for (const t of topics) for (const w of T[t].words) {
    if (seen.has(w[0])) continue;
    seen.add(w[0]); out.push({ text: w[0], ipa: w[1], zh: w[2] });
    if (out.length >= limit) return out;
  }
  return out;
}
function sentencesOf(topics, limit = 12) {
  const out = [];
  for (const t of topics) for (const s of T[t].sentences) {
    out.push({ text: s[0], zh: s[1] });
    if (out.length >= limit) return out;
  }
  return out;
}
function paraOf(topic) {
  const p = T[topic].paragraph;
  return [{ text: p[0], zh: p[1] }];
}
function buildVersionGroups(prefix, verKey, verName, topics) {
  return [
    { id: `${prefix}-${verKey}-w`, type: 'word', title: `${verName} · 核心词汇`, desc: '按课标话题整理的高频词，可逐词跟读评分。', items: uniqWords(topics) },
    { id: `${prefix}-${verKey}-s`, type: 'sentence', title: `${verName} · 实用句型`, desc: '该版本典型单元功能句型，练语音语调。', items: sentencesOf(topics) },
    { id: `${prefix}-${verKey}-p`, type: 'paragraph', title: `${verName} · 阅读段落`, desc: '单元话题短文段，练长句节奏与连贯。', items: paraOf(topics[0]) },
  ];
}

const newLevels = [];
for (const [lvKey, lv] of Object.entries(VERSIONS)) {
  const groups = [];
  for (const [verKey, ver] of Object.entries(lv.versions)) {
    groups.push(...buildVersionGroups(lvKey, verKey, ver.name, ver.topics));
  }
  newLevels.push({ id: lvKey, name: lv.name, desc: lv.desc, groups });
}
for (const [exKey, ex] of Object.entries(EXAM)) {
  const groups = [];
  for (const t of ex.topics) {
    groups.push({ id: `${exKey}-${t}-w`, type: 'word', title: `${ex.name} · 核心词汇`, desc: ex.desc, items: uniqWords([t], 10) });
    groups.push({ id: `${exKey}-${t}-p`, type: 'paragraph', title: `${ex.name} · 语篇训练`, desc: ex.desc, items: paraOf(t) });
  }
  newLevels.push({ id: exKey, name: ex.name, desc: ex.desc, groups });
}

// ---------- 合并（保留原 4 个 level） ----------
const existing = m.levels.filter((l) => !newLevels.some((n) => n.id === l.id));
m.levels = [...existing, ...newLevels];
m.updatedAt = new Date().toISOString();

fs.writeFileSync(FILE, JSON.stringify(m, null, 2), 'utf8');

// 统计
let total = 0, gtotal = 0;
newLevels.forEach((l) => { gtotal += l.groups.length; l.groups.forEach((g) => total += g.items.length); });
console.log('新增 levels:', newLevels.length, '| 新增 groups:', gtotal, '| 新增 items:', total);
console.log('现有全部 levels:', m.levels.map((l) => l.id).join(', '));
