/* ============================================================
 * 珠江新城 · 地点信息图 — 种子数据
 * ------------------------------------------------------------
 * 坐标系统：lat / lng 一律存 WGS-84 十进制度（GPS 原始坐标）。
 *   站点运行时会自动转成 GCJ-02 去对齐高德瓦片，不要手填 GCJ-02，
 *   否则换底图（OSM 用 WGS-84）时会整体偏移 300–500 米。
 *
 * v 字段：1 = 坐标已人工校准；0 = 近似值，误差可能 100–300 米。
 *   站点会给 v:0 的点画空心圆环，并在详情里提示校准。
 *   在编辑模式里拖一下点，会自动置为 1。
 *
 * 范围：主体是珠江新城 CBD（花城广场 3 km 内），文件末尾另有
 *   「珠江新城以外」区块，放值得专门过江去的地点。
 *
 * price 字段：null = 还不知道，页面显示「—」；0 = 免费；>0 = 人均元。
 *   别用 0 表示未知，那会被显示成「免费」。
 *
 * 字段说明见 README.md。改完这个文件，网页刷新即生效。
 * ============================================================ */

window.PLACE_SEED_REV = 1;

window.PLACES = [
  /* ---------- Day1 中轴线 ---------- */
  {
    id: 'gd-museum',
    name: '广东省博物馆',
    en: 'Guangdong Museum',
    cat: '看',
    tags: ['室内', '免费', '需预约', '亲子'],
    lat: 23.11890, lng: 113.32540, v: 0,
    stay: 120, price: 0,
    hours: '09:00–17:00，周一闭馆',
    best: '开馆即入，10:30 后旅行团涌入',
    booking: true,
    note: '免费但必须提前在公众号预约，周末名额抢得很快。馆藏不算顶级，但常设展和临展的布展质量很稳。',
    link: ''
  },
  {
    id: 'gz-library',
    name: '广州图书馆',
    en: 'Guangzhou Library',
    cat: '看',
    tags: ['室内', '免费', '建筑'],
    lat: 23.11970, lng: 113.32430, v: 0,
    stay: 60, price: 0,
    hours: '09:00–21:00，周三闭馆',
    best: '工作日下午',
    booking: false,
    note: '南面靠江的阅览位视野极好，适合行程中途坐下来歇脚顺便看两眼书。',
    link: ''
  },
  {
    id: 'gz-opera-house',
    name: '广州大剧院',
    en: 'Guangzhou Opera House',
    cat: '看',
    tags: ['建筑', '室内', '演出', '拍照'],
    lat: 23.11760, lng: 113.32340, v: 0,
    stay: 60, price: 0,
    hours: '10:00–18:00，演出日延长',
    best: '上午侧光，外立面最出片',
    booking: false,
    note: '扎哈·哈迪德作品，外立面免费看，进厅要演出票。石头质感在阴天反而更好看。',
    link: ''
  },
  {
    id: 'huacheng-square',
    name: '花城广场',
    en: 'Flower City Square',
    cat: '看',
    tags: ['地标', '免费', '户外', '夜景'],
    lat: 23.11980, lng: 113.32090, v: 0,
    stay: 60, price: 0,
    hours: '全天',
    best: '日落后 30 分钟，灯光刚开',
    booking: false,
    note: '广州的城市客厅，南北向中轴约 1.5 公里。白天基本没遮阴，别在正午硬走。',
    link: ''
  },
  {
    id: 'haixinsha',
    name: '海心沙亚运公园',
    en: 'Haixinsha Asian Games Park',
    cat: '看',
    tags: ['户外', '免费', '夜景'],
    lat: 23.11120, lng: 113.32080, v: 0,
    stay: 45, price: 0,
    hours: '全天',
    best: '傍晚',
    booking: false,
    note: '广州塔正对面的观景带，拍塔的最佳机位之一，人也比塔下少。',
    link: ''
  },
  {
    id: 'canton-tower',
    name: '广州塔',
    en: 'Canton Tower',
    cat: '看',
    tags: ['地标', '夜景', '观景台', '需门票'],
    lat: 23.10660, lng: 113.32450, v: 0,
    stay: 120, price: 150,
    hours: '09:30–22:30',
    best: '日落前 1 小时上塔，白天夜景一次收',
    booking: true,
    note: '488 米观景台要提前订，摩天轮和极速云霄单独收费。不想花钱的话，塔下江边散步是免费的。',
    link: ''
  },

  /* ---------- Day2 公园 · 吃喝 ---------- */
  {
    id: 'zhujiang-park',
    name: '珠江公园',
    en: 'Zhujiang Park',
    cat: '公园',
    tags: ['户外', '免费', '安静'],
    lat: 23.12480, lng: 113.33000, v: 0,
    stay: 60, price: 0,
    hours: '06:00–22:00',
    best: '清晨',
    booking: false,
    note: 'CBD 里少见的绿量，走累了进来坐 40 分钟很值。南门出去就是猎德。',
    link: ''
  },
  {
    id: 'liede-food-street',
    name: '猎德村 · 猎德涌食街',
    en: 'Liede Village Food Street',
    cat: '吃',
    tags: ['粤菜', '本地', '夜宵', '烟火气'],
    lat: 23.11710, lng: 113.33120, v: 0,
    stay: 90, price: 80,
    hours: '11:00–24:00',
    best: '晚市',
    booking: false,
    note: '祠堂、河涌和排档混在一起，是这一片最不像 CBD 的角落。想吃得便宜又地道就来这里。',
    link: ''
  },
  {
    id: 'xingsheng-road',
    name: '兴盛路',
    en: 'Xingsheng Road',
    cat: '喝',
    tags: ['酒吧', '夜生活', '咖啡'],
    lat: 23.11860, lng: 113.33000, v: 0,
    stay: 90, price: 120,
    hours: '18:00–02:00',
    best: '21:00 之后',
    booking: false,
    note: '珠江新城夜生活的集中地。想安静聊天就别站主街，拐进巷子里的小店。',
    link: ''
  },

  /* ---------- Day3 天河路商圈 ---------- */
  {
    id: 'parc-central',
    name: '天环广场',
    en: 'Parc Central',
    cat: '逛',
    tags: ['商场', '室内', '设计'],
    lat: 23.13290, lng: 113.32280, v: 0,
    stay: 90, price: 120,
    hours: '10:00–22:00',
    best: '工作日下午',
    booking: false,
    note: '天河路商圈里体感最舒服的一个，建筑本身就是看点，人比天河城少。',
    link: ''
  },
  {
    id: 'taikoo-hui',
    name: '太古汇',
    en: 'Taikoo Hui',
    cat: '逛',
    tags: ['商场', '室内', '书店'],
    lat: 23.13480, lng: 113.32670, v: 0,
    stay: 120, price: 150,
    hours: '10:00–22:00',
    best: '周末上午',
    booking: false,
    note: '方所书店在 M 层，可以当半个景点逛。整体偏高端，纯逛街的话天环更划算。',
    link: ''
  },
  {
    id: 'teemall',
    name: '天河城',
    en: 'Teemall',
    cat: '逛',
    tags: ['商场', '亲子', '交通便利'],
    lat: 23.13340, lng: 113.32350, v: 0,
    stay: 90, price: 90,
    hours: '10:00–22:00',
    best: '任意时段',
    booking: false,
    note: '老牌商场，胜在和体育西路站直连——三条地铁线交汇，是这一带最好用的中转点。',
    link: ''
  },

  /* ---------- 未分组 ---------- */
  {
    id: 'ctf-finance',
    name: '周大福金融中心（东塔）',
    en: 'CTF Finance Centre',
    cat: '看',
    tags: ['地标', '观景台', '需门票'],
    lat: 23.11940, lng: 113.32690, v: 0,
    stay: 60, price: 0,
    hours: '以运营方公告为准',
    best: '日落前 1 小时',
    booking: true,
    note: '530 米，广州第一高楼。观景层并非长期开放，出发前务必查当天是否可上。',
    link: ''
  },
  {
    id: 'ifc-west',
    name: '广州国际金融中心（西塔）',
    en: 'Guangzhou IFC',
    cat: '看',
    tags: ['地标', '建筑', '商场'],
    lat: 23.11760, lng: 113.31870, v: 0,
    stay: 30, price: 0,
    hours: '全天，商场 10:00–22:00',
    best: '雨天当中转站用',
    booking: false,
    note: '四季酒店所在，B1 直连地铁。下大雨的时候，从西塔穿到花城广场基本不用淋雨。',
    link: ''
  },
  {
    id: 'lode-bridge',
    name: '猎德大桥',
    en: 'Liede Bridge',
    cat: '看',
    tags: ['地标', '夜景', '步行'],
    lat: 23.11450, lng: 113.32900, v: 0,
    stay: 20, price: 0,
    hours: '全天',
    best: '夜间',
    booking: false,
    note: '桥面可以步行过江，是拍广州塔和西塔同框的位置，风大注意保暖。',
    link: ''
  },
  {
    id: 'pearl-river-cruise',
    name: '珠江夜游（广州塔码头）',
    en: 'Pearl River Night Cruise',
    cat: '看',
    tags: ['夜景', '需门票', '亲子'],
    lat: 23.10580, lng: 113.32380, v: 0,
    stay: 90, price: 78,
    hours: '19:00–22:00，班次制',
    best: '19:30 班次',
    booking: true,
    note: '一定要提前订，现场买常常只剩最贵的舱位。坐哪一层差别不大，上甲板才是重点。',
    link: ''
  },
  {
    id: 'huachenghui',
    name: '花城汇广场',
    en: 'Flower City Mall',
    cat: '吃',
    tags: ['商场', '快餐', '雨天友好'],
    lat: 23.12030, lng: 113.32180, v: 0,
    stay: 60, price: 60,
    hours: '10:00–22:00',
    best: '午市',
    booking: false,
    note: '地下层连着地铁和花城广场，是这一带下雨天的兜底吃饭选择，选择多但没什么惊喜。',
    link: ''
  },
  {
    id: 'gaode-land',
    name: '高德置地广场',
    en: 'Gaode Land Plaza',
    cat: '吃',
    tags: ['商场', '商务餐'],
    lat: 23.12190, lng: 113.32290, v: 0,
    stay: 75, price: 90,
    hours: '10:00–22:00',
    best: '工作日午市要排队，错峰 13:00 后',
    booking: false,
    note: '春、夏、秋、冬四座连成一片，写字楼底商，餐厅密度全城前列。',
    link: ''
  },
  {
    id: 'kingold',
    name: '侨鑫国际',
    en: 'Kingold Century',
    cat: '吃',
    tags: ['商务餐', '粤菜', '安静'],
    lat: 23.12000, lng: 113.32480, v: 0,
    stay: 60, price: 100,
    hours: '11:00–22:00',
    best: '午市',
    booking: false,
    note: '写字楼底商，比商场里安静，适合坐下来谈事情或者慢慢吃一顿。',
    link: ''
  },
  {
    id: 'k11',
    name: 'K11 购物艺术中心',
    en: 'K11 Art Mall',
    cat: '逛',
    tags: ['商场', '艺术', '室内'],
    lat: 23.11990, lng: 113.31960, v: 0,
    stay: 60, price: 100,
    hours: '10:00–22:00',
    best: '任意时段',
    booking: false,
    note: '空间里有常设艺术装置，比纯商场多一层可看性，就在花城广场西侧。',
    link: ''
  },
  {
    id: 'ersha-island',
    name: '二沙岛艺术公园',
    en: 'Ersha Island Art Park',
    cat: '公园',
    tags: ['户外', '免费', '江景'],
    lat: 23.11400, lng: 113.31800, v: 0,
    stay: 60, price: 0,
    hours: '全天',
    best: '日落前 1 小时',
    booking: false,
    note: '广东美术馆在这一片，江边跑步和野餐的人很多。是全城看珠江新城天际线最舒服的对岸。',
    link: ''
  },
  {
    id: 'hongcheng-park',
    name: '宏城公园',
    en: 'Hongcheng Park',
    cat: '公园',
    tags: ['户外', '免费', '江景'],
    lat: 23.11600, lng: 113.31600, v: 0,
    stay: 40, price: 0,
    hours: '全天',
    best: '傍晚',
    booking: false,
    note: '二沙岛东端的小公园，看西塔一线的视角很正，人很少。',
    link: ''
  },
  {
    id: 'mtr-zhujiang-new-town',
    name: '珠江新城地铁站',
    en: 'Zhujiang New Town Station',
    cat: '交通',
    tags: ['地铁', '3 号线', '5 号线'],
    lat: 23.12000, lng: 113.32300, v: 0,
    stay: 0, price: 0,
    hours: '06:00–23:30',
    best: '避开 08:30–09:30 和 18:00–19:30',
    booking: false,
    note: '3 / 5 号线换乘，出站就是花城广场北端。早晚高峰这里非常挤。',
    link: ''
  },
  {
    id: 'mtr-liede',
    name: '猎德地铁站',
    en: 'Liede Station',
    cat: '交通',
    tags: ['地铁', '5 号线'],
    lat: 23.11700, lng: 113.33010, v: 0,
    stay: 0, price: 0,
    hours: '06:00–23:30',
    best: '任意时段',
    booking: false,
    note: '去猎德食街和兴盛路从这个站下最近，比从珠江新城站走过去省 15 分钟。',
    link: ''
  },
  {
    id: 'apm-huacheng-dadao',
    name: 'APM · 花城大道站',
    en: 'APM Huacheng Dadao',
    cat: '交通',
    tags: ['APM', '地铁'],
    lat: 23.12240, lng: 113.32210, v: 0,
    stay: 0, price: 0,
    hours: '07:00–23:00',
    best: '任意时段',
    booking: false,
    note: 'APM 是穿过中轴线的专用短线，比绕 3 号线换乘省时间，票价 2 元。',
    link: ''
  },
  {
    id: 'mtr-canton-tower',
    name: '广州塔地铁站',
    en: 'Canton Tower Station',
    cat: '交通',
    tags: ['地铁', '3 号线', 'APM'],
    lat: 23.10630, lng: 113.32500, v: 0,
    stay: 0, price: 0,
    hours: '06:00–23:30',
    best: '夜游散场前 20 分钟进站',
    booking: false,
    note: '广州塔下来直接进站，回程不用打车。夜游结束后这一站会限流，提前走。',
    link: ''
  },

  /* ---------- 珠江新城以外 ---------- */
  {
    id: 'xiaocang-canteen',
    name: '小仓食堂',
    en: '',
    cat: '吃',
    tags: ['太古仓', '海珠区', '需过江'],
    // 地址：广东省广州市海珠区太古仓 3 号码头入口 C1。
    // 坐标是从高德底图上量取的估计值（OSM 等地理编码在国内不可达），
    // 误差可能在 150 米上下——第一次去之前请在编辑模式里拖一下校准。
    lat: 23.09100, lng: 113.24800, v: 0,
    stay: 75, price: null,
    hours: '',
    best: '',
    booking: false,
    note: '太古仓码头 3 号码头入口 C1，在海珠区革新路，跟珠江新城隔一条江。距今为止的行程都在江北，来这里要专门留出过江的时间。人均和营业时间还没查，是空的。',
    link: ''
  }
];

// 初始行程分组（只是给个起点，随时可改；'' 表示未分组）
window.PLACE_DAY_SEED = {
  'gd-museum': 'Day1',
  'gz-library': 'Day1',
  'gz-opera-house': 'Day1',
  'huacheng-square': 'Day1',
  'haixinsha': 'Day1',
  'canton-tower': 'Day1',
  'zhujiang-park': 'Day2',
  'liede-food-street': 'Day2',
  'xingsheng-road': 'Day2',
  'parc-central': 'Day3',
  'teemall': 'Day3',
  'taikoo-hui': 'Day3'
};
