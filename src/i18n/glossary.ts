import type { Locale } from "./locale";

export type NameRow = Record<Locale, string>;

function row(zh: string, en: string, ja: string, ko: string): NameRow {
  return { zh, en, ja, ko };
}

/** 开局写入存档的局名。界面和史书按观看语言显示，存档里的字符串不改。 */
export const WORLD_NAMES: Record<string, NameRow> = {
  "第一号实验局": row("第一号实验局", "Experiment One", "第一号実験局", "제일호 실험국"),
  "山河试玩": row("山河试玩", "River trial", "山河の試遊", "산하 시연"),
};

/** 史书与界面共用的通行写法。随机市民不在表内，四种语言都显示开局生成的名字。 */
export const PEOPLE: Record<string, NameRow> = {
  "cao-cao": row("曹操", "Cao Cao", "曹操（そうそう）", "조조"),
  "xiahou-dun": row("夏侯惇", "Xiahou Dun", "夏侯惇（かこうとん）", "하후돈"),
  "xun-yu": row("荀彧", "Xun Yu", "荀彧（じゅんいく）", "순욱"),
  "guo-jia": row("郭嘉", "Guo Jia", "郭嘉（かくか）", "곽가"),
  "liu-bei": row("刘备", "Liu Bei", "劉備（りゅうび）", "유비"),
  "guan-yu": row("关羽", "Guan Yu", "関羽（かんう）", "관우"),
  "zhang-fei": row("张飞", "Zhang Fei", "張飛（ちょうひ）", "장비"),
  "zhuge-liang": row("诸葛亮", "Zhuge Liang", "諸葛亮（しょかつりょう）", "제갈량"),
  "sun-quan": row("孙权", "Sun Quan", "孫権（そんけん）", "손권"),
  "zhou-yu": row("周瑜", "Zhou Yu", "周瑜（しゅうゆ）", "주유"),
  "lu-su": row("鲁肃", "Lu Su", "魯粛（ろしゅく）", "노숙"),
  "lu-xun": row("陆逊", "Lu Xun", "陸遜（りくそん）", "육손"),
  "lv-bu": row("吕布", "Lu Bu", "呂布（りょふ）", "여포"),
  "yuan-shao": row("袁绍", "Yuan Shao", "袁紹（えんしょう）", "원소"),
  "sima-yi": row("司马懿", "Sima Yi", "司馬懿（しばい）", "사마의"),
  "pang-tong": row("庞统", "Pang Tong", "龐統（ほうとう）", "방통"),
  "zhao-yun": row("赵云", "Zhao Yun", "趙雲（ちょううん）", "조운"),
  "dian-wei": row("典韦", "Dian Wei", "典韋（てんい）", "전위"),
  "gan-ning": row("甘宁", "Gan Ning", "甘寧（かんねい）", "감녕"),
  "huang-zhong": row("黄忠", "Huang Zhong", "黄忠（こうちゅう）", "황충"),
};

export const CITIES: Record<string, NameRow> = {
  luoyang: row("洛阳", "Luoyang", "洛陽", "낙양"),
  changan: row("长安", "Chang'an", "長安", "장안"),
  xuchang: row("许昌", "Xuchang", "許昌", "허창"),
  ye: row("邺城", "Ye", "鄴", "업"),
  xiapi: row("下邳", "Xiapi", "下邳", "하비"),
  beiping: row("北平", "Beiping", "北平", "북평"),
  jinyang: row("晋阳", "Jinyang", "晋陽", "진양"),
  wuwei: row("武威", "Wuwei", "武威", "무위"),
  chengdu: row("成都", "Chengdu", "成都", "성도"),
  xiangyang: row("襄阳", "Xiangyang", "襄陽", "양양"),
  jiangling: row("江陵", "Jiangling", "江陵", "강릉"),
  jianye: row("建业", "Jianye", "建業", "건업"),
  kuaiji: row("会稽", "Kuaiji", "會稽", "회계"),
  shouchun: row("寿春", "Shouchun", "壽春", "수춘"),
  nanzheng: row("南郑", "Nanzheng", "南鄭", "남정"),
  hefei: row("合肥", "Hefei", "合肥", "합비"),
  jiangzhou: row("江州", "Jiangzhou", "江州", "강주"),
  changsha: row("长沙", "Changsha", "長沙", "장사"),
  lingling: row("零陵", "Lingling", "零陵", "영릉"),
  puyang: row("濮阳", "Puyang", "濮陽", "복양"),
  pingyuan: row("平原", "Pingyuan", "平原", "평원"),
  handan: row("邯郸", "Handan", "邯鄲", "한단"),
  qiao: row("谯县", "Qiao", "譙", "초"),
  wuhuan: row("襄平", "Xiangping", "襄平", "양평"),
};

export const REGIONS: Record<string, NameRow> = {
  司隶: row("司隶", "Sili", "司隷", "사예"),
  豫州: row("豫州", "Yuzhou", "豫州", "예주"),
  冀州: row("冀州", "Jizhou", "冀州", "기주"),
  徐州: row("徐州", "Xuzhou", "徐州", "서주"),
  幽州: row("幽州", "Youzhou", "幽州", "유주"),
  并州: row("并州", "Bingzhou", "并州", "병주"),
  凉州: row("凉州", "Liangzhou", "涼州", "양주"),
  益州: row("益州", "Yizhou", "益州", "익주"),
  荆州: row("荆州", "Jingzhou", "荊州", "형주"),
  扬州: row("扬州", "Yangzhou", "揚州", "양주"),
  兖州: row("兖州", "Yanzhou", "兗州", "연주"),
  青州: row("青州", "Qingzhou", "青州", "청주"),
  辽东: row("辽东", "Liaodong", "遼東", "요동"),
};

export const FACTIONS: Record<string, NameRow> = {
  wei: row("魏", "Wei", "魏", "위"),
  shu: row("蜀", "Shu", "蜀", "촉"),
  wu: row("吴", "Wu", "呉", "오"),
};

export const OFFICES: Record<string, NameRow> = {
  lord: row("君主", "Lord", "君主（くんしゅ）", "군주"),
  advisor: row("谋臣", "Strategist", "軍師（ぐんし）", "군사"),
  general: row("武将", "General", "部将（ぶしょう）", "부장"),
  junior: row("低级武将", "Junior officer", "下級の部将", "하급 부장"),
  captain: row("队长", "Captain", "隊長（たいちょう）", "대장"),
  citizen: row("市民", "Citizen", "市民（しみん）", "시민"),
  wanderer: row("在野", "Unattached", "在野（ざいや）", "재야"),
  hidden: row("未现", "Unrevealed", "未現", "미현"),
  dead: row("已退场", "Fallen", "退場", "퇴장"),
  unknown: row("不详", "Unknown", "不詳", "미상"),
};

export const SEASONS: Record<string, NameRow> = {
  春: row("春", "Spring", "春", "봄"),
  夏: row("夏", "Summer", "夏", "여름"),
  秋: row("秋", "Autumn", "秋", "가을"),
  冬: row("冬", "Winter", "冬", "겨울"),
};

export const WEATHERS: Record<string, NameRow> = {
  晴: row("晴", "Clear", "晴れ", "맑음"),
  雨: row("雨", "Rain", "雨", "비"),
  雪: row("雪", "Snow", "雪", "눈"),
  雾: row("雾", "Fog", "霧", "안개"),
  旱: row("旱", "Drought", "旱", "가뭄"),
  不计: row("不计", "Ignored", "不计", "계산 안 함"),
};

export const DISASTERS: Record<string, NameRow> = {
  旱: row("旱", "Drought", "旱", "가뭄"),
  涝: row("涝", "Flood", "水害", "홍수"),
  蝗: row("蝗", "Locusts", "蝗", "황충"),
  瘟疫: row("瘟疫", "Plague", "疫病", "역병"),
};

export const CHARGES: Record<string, NameRow> = {
  neglect: row("玩忽职守", "Neglect of duty", "職務怠慢", "직무유기"),
  private_army: row("拥兵自重", "A private army", "私兵を擁す", "사병 보유"),
  collusion: row("交通敌国", "Collusion", "敵国との内通", "적국과 내통"),
  cruelty: row("残害同僚", "Cruelty to peers", "同僚を害す", "동료를 해침"),
  absence: row("长期缺席", "Prolonged absence", "長期欠席", "장기 결석"),
  unknown: row("未列罪名", "Unlisted charge", "罪名なし", "죄목 없음"),
};

export const ALLEGIANCE: Record<string, NameRow> = {
  submit: row("臣服", "Submit", "臣従", "복속"),
  surrender: row("投降", "Surrender", "降伏", "투항"),
  seek: row("投奔", "Seek a lord", "亡命", "투탁"),
  serve: row("出仕", "Take service", "出仕", "출사"),
  retire: row("下野", "Step down", "下野", "하야"),
  renounce: row("叛离", "Renounce", "離反", "배반"),
};

export const DIPLOMACY: Record<string, NameRow> = {
  alliance: row("结盟", "Alliance", "同盟", "동맹"),
  truce: row("停战", "Truce", "停戦", "정전"),
  vassal: row("称臣", "Vassalage", "称臣", "칭신"),
  defect: row("劝降", "Defection", "勧降", "권항"),
  submit: row("臣服", "Submit", "臣従", "복속"),
  surrender: row("投降", "Surrender", "降伏", "투항"),
  seek: row("投奔", "Seek a lord", "亡命", "투탁"),
  serve: row("出仕", "Take service", "出仕", "출사"),
};

export const MODES: Record<string, NameRow> = {
  main: row("主将", "Main", "主将", "주장"),
  deputy: row("副将", "Second", "副将", "부장"),
  regent: row("君主代指挥", "Lord in command", "君主代指揮", "군주가 지휘"),
};

export const CHOICES: Record<string, NameRow> = {
  aye: row("赞成", "Aye", "賛成", "찬성"),
  nay: row("反对", "Nay", "反対", "반대"),
};

export const FARM_NOTES: Record<string, NameRow> = {
  drought: row("旱天减产", "Drought cuts the harvest", "旱で減収", "가뭄으로 감산"),
  canal_partial: row("旱天减产，水渠略补", "Drought cuts it; the canal gives a little back", "旱で減収、水路が少し補う", "가뭄 감산, 수로가 조금 보탬"),
  canal_full: row("水渠补上旱田", "The canal covers the dry fields", "水路が旱田を補う", "수로가 한전을 메움"),
  winter: row("冬田减产", "Winter fields yield less", "冬田は減収", "겨울 농사는 감산"),
  fair: row("晴天小增", "Clear skies, a small gain", "晴れで少し増収", "맑아 조금 증산"),
};

export const RANKS: Record<string, NameRow> = {
  historical: row("武将", "Officer", "武将", "장수"),
  low: row("低级武将", "Junior officer", "下級武将", "하급 장수"),
};

export const BOUNTIES: Record<string, NameRow> = {
  dike: row("任一城堤防达到 2 级", "Any city dike reaches rank 2", "いずれかの城の堤が 2 級", "어느 성이든 제방 2단"),
  granary: row("任一城义仓达到 200", "Any city granary reaches 200", "いずれかの城の義倉が 200", "어느 성이든 의창 200"),
  clinic: row("任一城医营达到 2 级", "Any city clinic reaches rank 2", "いずれかの城の医営が 2 級", "어느 성이든 의영 2단"),
  relief: row("有人完成一次赈济", "Someone completes one relief convoy", "誰かが一度の賑恤を果たす", "누군가 구휼을 한 번 마침"),
};

export const ACTIONS: Record<string, NameRow> = {
  develop: row("开发", "Develop", "開発", "개발"),
  farm: row("屯田", "Farm", "屯田", "둔전"),
  recruit: row("征兵", "Recruit", "徴兵", "징병"),
  drill_prowess: row("练武", "Drill arms", "武練", "무예"),
  drill_command: row("练统", "Drill command", "統率", "통솔"),
  search: row("搜索", "Search", "搜索", "수색"),
  transport: row("运粮", "Haul grain", "運糧", "운량"),
  enlist: row("从军", "Enlist", "従軍", "종군"),
  open_gates: row("开门", "Open the gates", "開門", "개문"),
  hold_line: row("守城", "Hold", "守城", "수성"),
  raise_dike: row("修堤", "Raise dikes", "修堤", "제방"),
  store_grain: row("积谷", "Store grain", "積穀", "적곡"),
  raise_clinic: row("医营", "Clinic", "医営", "의영"),
  relieve: row("赈济", "Relieve", "賑恤", "구휼"),
  watch_sky: row("观天", "Read the sky", "観天", "관천"),
  mend_road: row("修路", "Mend the road", "修路", "수로"),
  dig_canal: row("开渠", "Dig a canal", "開渠", "개거"),
  reward: row("犒赏", "Reward", "犒賞", "犒賞"),
  swear: row("结义", "Swear brotherhood", "義盟", "결의"),
  break_bond: row("反目", "Break a bond", "反目", "반목"),
  scheme: row("计略", "Scheme", "計略", "계략"),
  release: row("释放", "Release", "釈放", "석방"),
  buy: row("购买", "Buy", "購入", "구매"),
  learn: row("学艺", "Learn a pattern", "技を学ぶ", "기술을 배우다"),
  forge: row("锻造", "Forge", "鍛造", "단조"),
  tame: row("驯养", "Tame", "調養", "조련"),
  equip: row("穿戴", "Equip", "装備", "착용"),
  unequip: row("卸下", "Unequip", "外す", "벗다"),
  donate: row("捐献", "Donate", "献納", "헌납"),
  draw: row("领取", "Draw", "受け取る", "수령"),
};

export const GEAR: Record<string, NameRow> = {
  iron: row("铁", "iron", "鉄", "쇠"),
  wood: row("木", "wood", "木", "나무"),
  leather: row("皮", "leather", "革", "가죽"),
  fodder: row("料", "fodder", "飼料", "마초"),
  coin: row("钱", "coin", "銭", "돈"),
  "snake-spear": row("蛇矛", "snake spear", "蛇矛", "사모"),
  crescent: row("偃月刀", "crescent blade", "偃月刀", "언월도"),
  halberd: row("方天画戟", "sky halberd", "方天画戟", "방천화극"),
  lamellar: row("札甲", "lamellar", "札甲", "찰갑"),
  "war-horse": row("战马", "war horse", "戦馬", "전마"),
  weapon: row("武器", "weapon", "武器", "무기"),
  armor: row("防具", "armor", "防具", "갑주"),
  mount: row("坐骑", "mount", "乗騎", "탈것"),
};

export const PLEAS: Record<string, NameRow> = {
  admit: row("认罪", "Admit", "認罪", "자복"),
  deny: row("辩无", "Deny", "弁疏", "무고"),
  silent: row("沉默", "Silence", "沈黙", "침묵"),
};

export const CONDITIONS: Record<string, NameRow> = {
  cede_city: row("{to|f}须在三回合内向{from|f}割让一城", "{to|f} must cede one city to {from|f} within three turns", "{to|f}は三回合のうちに{from|f}へ一城を割譲する", "{to|f}은 세 회 안에 {from|f}에게 성 하나를 할양한다"),
  military_aid: row("{to|f}须在三回合内出兵", "{to|f} must march within three turns", "{to|f}は三回合のうちに出兵する", "{to|f}은 세 회 안에 출병한다"),
  truce_3: row("{to|f}与{from|f}附带三年之约式的停战条件", "{to|f} and {from|f} add a three-turn truce", "{to|f}と{from|f}は三回合の停戦を添える", "{to|f}과 {from|f}은 세 회의 정전을 붙인다"),
  alliance: row("{from|f}与{to|f}结盟", "{from|f} and {to|f} are allied", "{from|f}と{to|f}は同盟", "{from|f}과 {to|f}은 동맹"),
  vassal: row("{to|f}向{from|f}称臣", "{to|f} submits to {from|f}", "{to|f}は{from|f}に称臣", "{to|f}은 {from|f}에게 칭신"),
};

export const REASONS: Record<string, NameRow> = {
  cheat: row("作弊", "Cheating", "不正", "부정"),
  harass: row("骚扰", "Harassment", "嫌がらせ", "괴롭힘"),
};

export const PROFILES: Record<string, { title: NameRow; question: NameRow; blurb: NameRow }> = {
  river_board: {
    title: row("山河试玩", "River trial", "山河の試遊", "산하 시연"),
    question: row("山河摆在面前时，路还走得通吗？", "With the rivers on the table, do the roads still hold?", "山河を前にして、道はまだ通るか。", "산하를 앞에 두면, 길은 아직 통하는가."),
    blurb: row(
      "十二座城按三国城址的相对位置摆。成都不连许昌。一条路是一回合，秦岭和三峡也只算一格。八分钟一回合，两位在席者都锁定后提前结算。不是以日计的经典对照。",
      "Twelve cities sit where the Three Kingdoms sites sit relative to each other. Chengdu is not next to Xuchang. One road is one turn, Qinling and the gorges included. Eight minutes a turn; two locked seats resolve early. Not the day-long classic control.",
      "十二城は三国の城址の相対位置に置く。成都は許昌と繋がらない。道一本が一回合。秦嶺も三峡も一マス。八分一回合。在席二人が锁定すれば早く決する。日単位の古典対照ではない。",
      "열두 성을 삼국 성지의 상대 위치에 둔다. 성도는 허창과 잇지 않는다. 길 하나가 한 회다. 진령과 삼협도 한 칸. 팔 분 한 회. 재석 둘이 잠그면 일찍 결산. 일 단위의 고전 대조가 아니다.",
    ),
  },
  tianxia_classic: {
    title: row("经典无剧本", "Classic, no script", "古典・無脚本", "고전, 각본 없음"),
    question: row("在最严格的公理组合下，统一是否可能？", "Under the strictest axioms, can anyone unify?", "最も厳しい公理の下で、統一は可能か。", "가장 엄한 공리 아래, 통일은 가능한가."),
    blurb: row("全部默认值。回合以日计。城与路用山河图。这是其他档案的对照组。参照实现的具名历史人物是 20 席，而不是规范草案里的 60。", "All defaults. Turns are measured in days. Cities and roads use the river map. This is the control. The reference build seats 20 named figures, not the draft's 60.", "既定値のまま。回合は日単位。城と道は山河図。他の档案の対照。参照実装の具名は 20 席で、草案の 60 ではない。", "기본값. 회는 일 단위. 성과 길은 산하도. 다른 문서의 대조군. 참조 구현의 기명 인물은 초안 60이 아니라 20석."),
  },
  free_talk_control: {
    title: row("自由沟通对照", "Free talk", "自由な対話", "자유 대화"),
    question: row("自由语言是统一的粘合剂，还是混乱的来源？", "Does free speech bind a realm, or unravel it?", "自由な言葉は統一の糊か、混乱の源か。", "자유로운 말은 통일의 풀인가, 혼란의 근원인가."),
    blurb: row("只打开自由发言和私信。弹劾罪状仍然不能手写。", "Speech and letters only. Charges stay on the fixed list.", "自由発言と私信だけを開く。弾劾の罪状は手書きできない。", "자유 발언과 편지 안에서만 연다. 탄핵 죄목은 손글씨가 아니다."),
  },
  high_pressure: {
    title: row("高压短局", "Short pressure", "短期の高圧", "단기 고압"),
    question: row("缩小规模、加快节奏之后，统一的难度如何移动？", "If the map shrinks and the clock speeds up, does unification move?", "規模を縮め拍を速めたとき、統一の難しさは動くか。", "규모를 줄이고 박자를 당기면, 통일의 난도는 움직이는가."),
    blurb: row("五座城，六小时一回合。结果不能外推到大规模匿名社会。", "Five cities, six hours a turn. Do not generalize this to a large anonymous society.", "五城、六時間一回合。大規模な匿名社会へ外挿しない。", "성 다섯, 여섯 시간 한 회. 큰 익명 사회로 외삽하지 않는다."),
  },
  season_mode: {
    title: row("赛季变体", "Season", "季節変体", "시즌"),
    question: row("有外部截止日期时，末段会不会出现冲刺统一？", "With a deadline, does the last stretch sprint for the throne?", "外部の期限があるとき、終盤は統一へ駆けるか。", "바깥 기한이 있으면, 막판에 통일로 달리는가."),
    blurb: row("六十日无人统一则按版图结算，不假装有人赢得了天下。", "If nobody unifies in sixty days, the map is scored. Nobody is declared emperor.", "六十日で統一がなければ版図で決する。天下を得たとは言わない。", "예순 날 안에 통일이 없으면 판도로 결산한다. 천하를 얻었다 하지 않는다."),
  },
  nomic_lab: {
    title: row("诺米克实验室", "Nomic lab", "ノミック実験室", "노믹 실험실"),
    question: row("社会会如何改写约束自己的参数？", "How does a society rewrite the numbers that bind it?", "社会は自らを縛る数値をどう書き換えるか。", "사회는 자기를 묶는 수치를 어떻게 고쳐 쓰는가."),
    blurb: row("朝议可以修改本局的若干数值。不改仓库里的代码。产出单独标注，不进入标准对照。", "Court may amend a few numbers for this match. The repository stays. The log is marked and kept out of the control set.", "朝議はこの局のいくつかの数値を改められる。倉庫のコードは改めない。記録は別標で、標準対照に入れない。", "조정이 이 판의 몇 수치를 고칠 수 있다. 창고의 코드는 그대로. 기록은 따로 표시하고 표준 대조에 넣지 않는다."),
  },
  tabletop_demo: {
    title: row("教学沙盘", "Teaching sandbox", "教学砂盤", "학습 사반"),
    question: row("规则走得通吗？这张图不是中国地理。", "Do the rules run? This picture is not the geography of China.", "規則は通るか。この図は中国の地理ではない。", "규칙은 통하는가. 이 그림은 중국 지리가 아니다."),
    blurb: row(
      "只有洛阳、许昌、成都、建业，而且成都紧挨许昌。这是简化教学沙盘，用来看指令，不能拿来认山河。默认试玩不进这一局。",
      "Only Luoyang, Xuchang, Chengdu and Jianye, and Chengdu sits against Xuchang. A simplified teaching sandbox for reading orders. Do not learn the rivers from it. The default trial does not open this match.",
      "洛陽、許昌、成都、建業だけで、成都は許昌に接している。指令を見るための簡略な教学砂盤。山河を覚える図ではない。既定の試遊はこの局に入らない。",
      "낙양, 허창, 성도, 건업뿐이고, 성도가 허창에 붙어 있다. 명령을 보는 단순 학습 사반이다. 산하를 익히는 그림이 아니다. 기본 시연은 이 판으로 들어가지 않는다.",
    ),
  },
};
