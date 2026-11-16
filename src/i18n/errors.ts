import type { Locale } from "./locale";

type Row = [string, string, string, string];

const ROWS: Row[] = [
  ["这个人物已经不在局里", "This person is no longer in the match.", "この人物はもう局にいない。", "이 인물은 이미 국에 없다."],
  ["这一局已经结束，不再接受指令", "This match is over. It takes no more orders.", "この局は終わった。指令は受けない。", "이 판은 끝났다. 명령을 받지 않는다."],
  ["指令格式无法识读", "The order cannot be read.", "指令の形式が読めない。", "명령 형식을 읽을 수 없다."],
  ["被俘期间只能回复劝降、自己提出投降，或参加本势力的臣服表决", "A captive may answer a defection, offer surrender, or vote on their faction's submission.", "捕虜は勧降への返信、自ら出す降伏、自勢力の臣従表決だけができる。", "포로는 권항에 답하거나, 스스로 투항하거나, 자기 세력의 복속 표결에만 참여할 수 있다."],
  ["表决太多或格式不对", "Too many votes, or the format is wrong.", "表決が多すぎるか、形式が違う。", "표결이 너무 많거나 형식이 다르다."],
  ["表决格式不对", "The vote format is wrong.", "表決の形式が違う。", "표결 형식이 다르다."],
  ["表决只能是附议、反对或沉默", "A vote is aye, nay, or silence.", "表決は附議、反対、沈黙だけ。", "표결은 찬성, 반대, 침묵만 된다."],
  ["当前菜单粒度不允许沉默", "This menu does not allow silence.", "今のメニューでは沈黙できない。", "지금의 메뉴는 침묵을 허락하지 않는다."],
  ["找不到这桩案子", "That case cannot be found.", "その案件は見つからない。", "그 안건을 찾을 수 없다."],
  ["这桩案子现在不在表决", "That case is not up for a vote.", "その案件は今、表決にない。", "그 안건은 지금 표결에 없다."],
  ["当前菜单粒度没有申辩", "This menu has no plea.", "今のメニューに申弁はない。", "지금의 메뉴에는 변명이 없다."],
  ["申辩格式不对", "The plea format is wrong.", "申弁の形式が違う。", "변명 형식이 다르다."],
  ["申辩只能从给定条目里选", "A plea must be chosen from the given list.", "申弁は与えられた条目から選ぶ。", "변명은 주어진 항목에서 고른다."],
  ["申辩没有对应的案子", "The plea has no matching case.", "申弁に対応する案件がない。", "변명에 대응하는 안건이 없다."],
  ["现在轮不到你申辩", "It is not your turn to plead.", "今はあなたの申弁の番ではない。", "지금은 당신의 변명 차례가 아니다."],
  ["动议格式不对", "The motion format is wrong.", "動議の形式が違う。", "동의 형식이 다르다."],
  ["没有这种动议", "There is no such motion.", "そのような動議はない。", "그런 동의는 없다."],
  ["只有在职人物能发起处置", "Only an officer can open a case.", "在職の人物だけが処分を起こせる。", "재직 인물만 처분을 낼 수 있다."],
  ["处决只能由君主提出", "Only a lord may move an execution.", "処刑は君主だけが出せる。", "처형은 군주만 낼 수 있다."],
  ["流放由君主或武将提出", "Exile is moved by a lord or a general.", "流罪は君主か武将が出す。", "유배는 군주나 장수가 낸다."],
  ["罪状只能从固定条目里选，不能手写", "A charge must be chosen from the fixed list. It cannot be written by hand.", "罪状は固定の条目から選ぶ。手では書けない。", "죄목은 고정 항목에서 고른다. 손으로 쓸 수 없다."],
  ["要指明另一个人", "Name another person.", "別の人を指せ。", "다른 사람을 짚어라."],
  ["处置对象必须是本阵营仍在世的人", "The target must be a living member of this faction.", "処分の対象は自陣でまだ世にある者。", "처분 대상은 이 진영에서 아직 살아있는 사람이어야 한다."],
  ["举荐由君主或谋臣提出", "A recommendation comes from a lord or a strategist.", "挙荐は君主か謀臣が出す。", "천거는 군주나 모신이 낸다."],
  ["举荐对象不在", "The person recommended is not here.", "挙荐の相手がいない。", "천거할 상대가 없다."],
  ["本局没有打开兵变", "Mutiny is closed in this match.", "この局は兵変を開いていない。", "이 판은 병변을 열지 않았다."],
  ["兵变由武将或谋臣联署", "A mutiny is signed by generals or strategists.", "兵変は武将か謀臣が連署する。", "병변은 장수나 모신이 연서한다."],
  ["兵变要指向本阵营的君主", "A mutiny must name this faction's lord.", "兵変は自陣の君主を指す。", "병변은 이 진영의 군주를 가리켜야 한다."],
  ["只有君主能让位或指定摄政", "Only a lord may abdicate or name a regent.", "譲位と摂政は君主だけができる。", "양위와 섭정은 군주만 할 수 있다."],
  ["本局没有打开摄政", "Regency is closed in this match.", "この局は摂政を開いていない。", "이 판은 섭정을 열지 않았다."],
  ["本局没有打开让位", "Abdication is closed in this match.", "この局は譲位を開いていない。", "이 판은 양위를 열지 않았다."],
  ["要指定本阵营的另一位在职人物", "Name another officer of this faction.", "自陣の別の在職者を指定せよ。", "이 진영의 다른 재직자를 지정하라."],
  ["这一局不能改参数", "This match cannot amend its numbers.", "この局は数値を改められない。", "이 판은 수치를 고칠 수 없다."],
  ["修规需要 rich 菜单", "Amendments need the rich menu.", "修規には rich メニューが要る。", "개규에는 rich 메뉴가 필요하다."],
  ["修规由在职人物提出", "An amendment is moved by an officer.", "修規は在職者が出す。", "개규는 재직자가 낸다."],
  ["这条参数不在白名单里", "That parameter is not on the whitelist.", "その数値は白名簿にない。", "그 수치는 허용 목록에 없다."],
  ["新数值必须是数字", "The new value must be a number.", "新しい数値は数字でなければならない。", "새 수치는 숫자여야 한다."],
  ["内政指令格式不对", "The domestic order is malformed.", "内政の指令の形式が違う。", "내정 명령의 형식이 다르다."],
  ["没有这种内政行动", "There is no such domestic action.", "そのような内政はない。", "그런 내정은 없다."],
  ["征兵和开发由在职人物执行", "Recruiting and development are done by officers.", "徴兵と開発は在職者が行う。", "징병과 개발은 재직자가 한다."],
  ["只有市民能从军", "Only a citizen may enlist.", "従軍できるのは市民だけ。", "종군은 시민만 할 수 있다."],
  ["开门献城是市民的集体行动", "Opening the gates is a citizens' action.", "開門献城は市民の共同行動。", "개문 헌성은 시민의 공동 행동이다."],
  ["只能通往相连的城", "The road must lead to a linked city.", "連なる城へしか行けない。", "이어진 성으로만 갈 수 있다."],
  ["赈济要指明一座城", "Relief must name a city.", "賑恤は城を一つ指せ。", "구휼은 성을 하나 짚어야 한다."],
  ["计略只能是离间、火攻或伪报", "A scheme is discord, fire, or a rumor.", "計略は離間、火攻、偽報だけ。", "계략은 이간, 화공, 허보만 된다."],
  ["离间要指明一个人", "Discord must name a person.", "離間は人を一人指せ。", "이간은 사람을 하나 짚어야 한다."],
  ["伪报要指明一座城", "A rumor must name a city.", "偽報は城を一つ指せ。", "허보는 성을 하나 짚어야 한다."],
  ["外交格式不对", "The diplomacy is malformed.", "外交の形式が違う。", "외교 형식이 다르다."],
  ["没有这种外交行动", "There is no such diplomatic action.", "そのような外交はない。", "그런 외교는 없다."],
  ["结盟、称臣、背盟和割地由君主发出", "Alliance, vassalage, breach, and cession come from a lord.", "同盟、称臣、背盟、割地は君主が出す。", "동맹, 칭신, 배맹, 할양은 군주가 낸다."],
  ["劝降由君主发出", "A call to defect comes from a lord.", "勧降は君主が出す。", "권항은 군주가 낸다."],
  ["臣服和叛离由君主提出", "Submission and renunciation come from a lord.", "臣従と離反は君主が出す。", "복속과 배반은 군주가 낸다."],
  ["投奔由部将或军师提出", "Seeking a lord comes from a general or a strategist.", "亡命は部将か軍師が出す。", "투탁은 부장이나 군사가 낸다."],
  ["下野由部将或军师提出", "Stepping down comes from a general or a strategist.", "下野は部将か軍師が出す。", "하야는 부장이나 군사가 낸다."],
  ["出仕只给已经露面、尚未属主的在野人", "Service is only for someone already revealed, still unattached.", "出仕はすでに現れ、まだ主のない在野の者だけ。", "출사는 이미 나타났고 아직 주인이 없는 재야만 된다."],
  ["投降由在职人物提出", "Surrender comes from an officer.", "降伏は在職者が出す。", "투항은 재직자가 낸다."],
  ["去向要指明接收的势力", "Name the faction that would receive you.", "行方には受ける勢力を指せ。", "행방에는 받을 세력을 짚어라."],
  ["不能把去向选成自己现在的势力", "You cannot choose your current faction.", "今の勢力を行方には選べない。", "지금 세력을 행방으로 고를 수 없다."],
  ["空席不能参加臣服表决", "An empty seat cannot vote on submission.", "空席は臣従の表決に加われない。", "빈 자리는 복속 표결에 참여할 수 없다."],
  ["表决要指明是哪一次", "Name which vote this is.", "どの表決かを指せ。", "어느 표결인지 짚어라."],
  ["表决只能投赞成或反对", "A ballot is aye or nay.", "表決は賛成か反対だけ。", "표결은 찬성이나 반대만 된다."],
  ["附带去向只能是下野或投奔", "A contingent path is stepping down or seeking a lord.", "添える行方は下野か亡命だけ。", "덧붙이는 행방은 하야나 투탁만 된다."],
  ["附带投奔要指明接收的势力", "A contingent search must name the receiving faction.", "添える亡命は受ける勢力を指せ。", "덧붙이는 투탁은 받을 세력을 짚어야 한다."],
  ["附带下野只给部将或军师", "A contingent step-down is only for a general or a strategist.", "添える下野は部将か軍師だけ。", "덧붙이는 하야는 부장이나 군사만 된다."],
  ["回复只能从菜单里选", "An answer must be chosen from the menu.", "返信はメニューから選ぶ。", "답은 메뉴에서 고른다."],
  ["当前菜单粒度只有同意或拒绝", "This menu allows only yes or no.", "今のメニューは同意か拒否だけ。", "지금의 메뉴는 동의나 거부만 된다."],
  ["附条件同意需要 rich 菜单", "A conditional yes needs the rich menu.", "条件つきの同意には rich メニューが要る。", "조건을 붙인 동의에는 rich 메뉴가 필요하다."],
  ["本局没有契约，不能附条件", "This match has no contracts, so no conditions.", "この局に契約はない。条件は添えられない。", "이 판에는 계약이 없다. 조건을 붙일 수 없다."],
  ["条件只能从给定条目里选", "A condition must be chosen from the given list.", "条件は与えられた条目から選ぶ。", "조건은 주어진 항목에서 고른다."],
  ["军令格式不对", "The war order is malformed.", "軍令の形式が違う。", "군령 형식이 다르다."],
  ["没有这种军令", "There is no such war order.", "そのような軍令はない。", "그런 군령은 없다."],
  ["出征由君主下令", "A march is ordered by the lord.", "出征は君主が命じる。", "출정은 군주가 명한다."],
  ["单挑由在职人物提出", "A duel is offered by an officer.", "単挑は在職者が出す。", "단도는 재직자가 낸다."],
  ["当前菜单没有委托", "This menu has no delegation.", "今のメニューに委託はない。", "지금의 메뉴에는 위임이 없다."],
  ["本局不能预留离线军令", "This match cannot store an offline war order.", "この局は離席の軍令を預けられない。", "이 판은 오프라인 군령을 남겨 둘 수 없다."],
  ["出征要指明目标城", "A march must name a target city.", "出征は目標の城を指せ。", "출정은 목표 성을 짚어야 한다."],
  ["君主必须身在自己控制的城里才能发兵", "A lord must be in a city they hold before sending troops.", "君主は自ら支配する城にいて初めて兵を出せる。", "군주는 자기가 쥔 성에 있어야 병을 낸다."],
  ["只能进攻相连的城", "You may attack only a linked city.", "攻められるのは連なる城だけ。", "칠 수 있는 것은 이어진 성뿐이다."],
  ["不能向自己的城出征", "You cannot march on your own city.", "自らの城へは出征できない。", "자기 성으로는 출정할 수 없다."],
  ["移驻由在职人物为自己下令", "An officer orders their own move.", "移駐は在職者が自分のために命じる。", "이주는 재직자가 자신을 위해 명한다."],
  ["空席不能移驻", "An empty seat cannot move.", "空席は移駐できない。", "빈 자리는 옮길 수 없다."],
  ["移驻要指明相邻的友方城", "A move must name an adjacent friendly city.", "移駐は隣の味方の城を指せ。", "이주는 이웃한 아군 성을 짚어야 한다."],
  ["移驻必须从自己势力控制的城出发", "A move must start from a city your faction holds.", "移駐は自勢力の城から出る。", "이주는 자기 세력이 쥔 성에서 출발해야 한다."],
  ["只能沿相邻道路移驻，不能穿越", "You may move only along an adjacent road. You cannot cross through.", "移駐は隣の道だけ。通り抜けはできない。", "이주는 이웃한 길만 된다. 가로질러 갈 수 없다."],
  ["目标城不是友方，不能移驻", "The target is not friendly. You cannot move there.", "目標の城は味方ではない。移駐できない。", "목표 성은 아군이 아니다. 옮길 수 없다."],
  ["已经在这座城里", "You are already in this city.", "すでにこの城にいる。", "이미 이 성에 있다."],
  ["这一局没有自由发言", "This match has no free speech.", "この局に自由な発言はない。", "이 판에는 자유 발언이 없다."],
  ["发言不能为空，也不能超过 280 字", "A remark cannot be empty or longer than 280 characters.", "発言は空にできず、280 字も超えられない。", "발언은 비울 수 없고, 280자를 넘을 수도 없다."],
  ["这一局没有私信", "This match has no letters.", "この局に私信はない。", "이 판에는 편지가 없다."],
  ["私信格式不对", "The letter is malformed.", "私信の形式が違う。", "편지 형식이 다르다."],
  ["私信需要收信人和不超过 280 字的正文", "A letter needs a recipient and a body of at most 280 characters.", "私信には受取人と 280 字以内の本文が要る。", "편지에는 받는 사람과 280자 이내의 본문이 필요하다."],
  ["收信人不在", "The recipient is not here.", "受取人がいない。", "받는 사람이 없다."],
  ["world.map_topology 不是已知地图", "world.map_topology is not a known map.", "world.map_topology は既知の地図ではない。", "world.map_topology 은 알려진 지도가 아니다."],
  ["三城窄门地图固定为 4 座城", "The tabletop map is fixed at 4 cities.", "三城の窄門は城 4 で固定。", "세 성의 좁은 문은 성 4로 고정이다."],
  ["山河图在参照实现里使用 8–12 座城", "The river map uses 8–12 cities in the reference build.", "山河図は参照実装で 8–12 城。", "산하도는 참조 구현에서 8–12성."],
  ["角色池装不下 12 名在职人物加上声明的在野席", "The pool cannot hold 12 officers plus the declared unattached seats.", "役の池は在職 12 と宣言した在野席を容れられない。", "역할 웅덩이는 재직 12명과 선언한 재야 자리를 담지 못한다."],
  ["turn.war_phase_mode 非法", "turn.war_phase_mode is illegal.", "turn.war_phase_mode は不正。", "turn.war_phase_mode 이 불법이다."],
  ["实验室时钟必须声明 duration_minutes", "A laboratory clock must declare duration_minutes.", "実験室の時計は duration_minutes を宣言せよ。", "실험실 시계는 duration_minutes 를 선언해야 한다."],
  ["未打开实验室时钟时不能用分钟计时", "Minutes cannot time a turn unless the laboratory clock is on.", "実験室の時計を開かずに分では計れない。", "실험실 시계를 열지 않으면 분으로 셀 수 없다."],
  ["turn.early_resolve 必须是布尔值", "turn.early_resolve must be a boolean.", "turn.early_resolve は真偽値。", "turn.early_resolve 은 불리언이어야 한다."],
  ["identity.lifespan 非法", "identity.lifespan is illegal.", "identity.lifespan は不正。", "identity.lifespan 이 불법이다."],
  ["identity.promotion_enabled 非法", "identity.promotion_enabled is illegal.", "identity.promotion_enabled は不正。", "identity.promotion_enabled 이 불법이다."],
  ["identity.promotion_path 过短", "identity.promotion_path is too short.", "identity.promotion_path が短すぎる。", "identity.promotion_path 이 너무 짧다."],
  ["comm.menu_expressiveness 非法", "comm.menu_expressiveness is illegal.", "comm.menu_expressiveness は不正。", "comm.menu_expressiveness 이 불법이다."],
  ["C1：禁用自由聊天时，菜单粒度至少是 standard", "C1: with free chat off, the menu must be at least standard.", "C1：自由な会話を閉じるなら、メニューは少なくとも standard。", "C1: 자유 대화를 끄면, 메뉴는 적어도 standard."],
  ["指挥顺位必须以系统托管收尾", "The command order must end in system custody.", "指揮の順位は系統の預かりで終わらねばならない。", "지휘 순서는 계통 위탁으로 끝나야 한다."],
  ["C4：指挥顺位里出现了会临场决策的档位", "C4: the command order contains a rank that decides on the spot.", "C4：指揮の順位に、その場で決する段がある。", "C4: 지휘 순서에 그 자리에서 결정하는 단이 있다."],
  ["C4：托管行为只能是预设或保守保底，不能临场决策", "C4: custody may only follow a preset or a conservative floor. It cannot decide on the spot.", "C4：預かりは予めか保守の保底だけ。その場で決してはならない。", "C4: 위탁은 미리 정한 것이나 보수적 밑바닥만. 그 자리에서 결정하면 안 된다."],
  ["war.handover_on_return 非法", "war.handover_on_return is illegal.", "war.handover_on_return は不正。", "war.handover_on_return 이 불법이다."],
  ["eco.resource_cap 至少为 1000", "eco.resource_cap must be at least 1000.", "eco.resource_cap は少なくとも 1000。", "eco.resource_cap 은 적어도 1000."],
  ["eco.search_discovers 不能为空", "eco.search_discovers cannot be empty.", "eco.search_discovers は空にできない。", "eco.search_discovers 은 비울 수 없다."],
  ["C7：统一控制比例不得超过 0.9", "C7: the unification ratio may not exceed 0.9.", "C7：統一の支配割合は 0.9 を超えてはならない。", "C7: 통일 지배 비율은 0.9를 넘을 수 없다."],
  ["endgame.unify.major_powers 非法", "endgame.unify.major_powers is illegal.", "endgame.unify.major_powers は不正。", "endgame.unify.major_powers 이 불법이다."],
  ["C3：赛季截止日期必须在开局时被明确确认", "C3: a season deadline must be confirmed when the match opens.", "C3：季節の期限は開局のときに明確に確認されねばならない。", "C3: 시즌 기한은 개국할 때 분명히 확인되어야 한다."],
  ["裁判范围只能是作弊与骚扰，不能把规则内的政治行为算作违规", "A referee covers only cheating and harassment. Politics inside the rules is not a violation.", "裁判の範囲は不正と嫌がらせだけ。規則の内の政治は違反ではない。", "재판의 범위는 부정과 괴롭힘뿐. 규칙 안의 정치는 위반이 아니다."],
  ["data.export_license 非法", "data.export_license is illegal.", "data.export_license は不正。", "data.export_license 이 불법이다."],
  ["data.export_format 含有未知格式", "data.export_format contains an unknown format.", "data.export_format に未知の形式がある。", "data.export_format 에 알 수 없는 형식이 있다."],
  ["rules.amendment_via_ingame_politics 非法", "rules.amendment_via_ingame_politics is illegal.", "rules.amendment_via_ingame_politics は不正。", "rules.amendment_via_ingame_politics 이 불법이다."],
  ["climate 缺失", "climate is missing.", "climate がない。", "climate 이 없다."],
  ["climate.enabled 必须是布尔值", "climate.enabled must be a boolean.", "climate.enabled は真偽値。", "climate.enabled 은 불리언이어야 한다."],
  ["climate.disasters_enabled 必须是布尔值", "climate.disasters_enabled must be a boolean.", "climate.disasters_enabled は真偽値。", "climate.disasters_enabled 은 불리언이어야 한다."],
  ["climate.snow_march_loss 不能低于冬日普通行军折损", "climate.snow_march_loss cannot be below the ordinary winter march loss.", "climate.snow_march_loss は冬の通常行軍の損を下回れない。", "climate.snow_march_loss 은 겨울 보통 행군의 손실보다 낮을 수 없다."],
  ["relief 缺失", "relief is missing.", "relief がない。", "relief 이 없다."],
  ["relief.enabled 必须是布尔值", "relief.enabled must be a boolean.", "relief.enabled は真偽値。", "relief.enabled 은 불리언이어야 한다."],
  ["堤防叠满也不能把涝灾减粮免成零", "A full dike cannot reduce flood grain loss to zero.", "堤を満てても水害の糧の減を零にはできない。", "제방을 가득 쌓아도 홍수의 군량 감소를 영으로 면할 수 없다."],
  ["医营叠满也不能把瘟疫减兵免成零", "A full clinic cannot reduce plague troop loss to zero.", "医営を満ても疫病の兵の減を零にはできない。", "의영을 가득 세워도 역병의 병력 감소를 영으로 면할 수 없다."],
  ["deeds 缺失", "deeds is missing.", "deeds がない。", "deeds 이 없다."],
  ["allegiance 缺失", "allegiance is missing.", "allegiance がない。", "allegiance 이 없다."],
  ["allegiance.vote_named 必须是布尔", "allegiance.vote_named must be a boolean.", "allegiance.vote_named は真偽値。", "allegiance.vote_named 은 불리언이어야 한다."],
  ["这一局刚被别人写过，请再试一次", "Someone else just wrote this match. Try again.", "この局はたった今、別の者が書いた。もう一度。", "이 판은 방금 다른 사람이 썼다. 다시 해 보라."],
  ["没有这一局", "There is no such match.", "そのような局はない。", "그런 판은 없다."],
  ["开局太频繁了", "Matches are being opened too fast.", "開局が速すぎる。", "개국이 너무 잦다."],
  ["局名用 1–24 个字，不要符号", "A match name is 1–24 characters, with no symbols.", "局の名は 1–24 字。記号は入れない。", "판 이름은 1–24자. 기호는 넣지 마라."],
  ["这台机器上的局已经太多", "This machine already holds too many matches.", "この機械の局はすでに多すぎる。", "이 기계의 판이 이미 너무 많다."],
  ["你已经有一局沙盘", "You already have a sandbox.", "あなたにはすでに沙盤が一局ある。", "당신에게는 이미 사반이 한 판 있다."],
  ["公开实验局已满。先把现有的一局打完，或开沙盘。", "The public experiments are full. Finish one, or open a sandbox.", "公開の実験局は満ちた。今の一局を終えるか、沙盤を開け。", "공개 실험국이 찼다. 있는 한 판을 끝내거나, 사반을 열어라."],
  ["操作太频繁", "That was too fast.", "操作が速すぎる。", "조작이 너무 잦다."],
  ["你已被逐出此局", "You have been removed from this match.", "あなたはこの局から除かれた。", "당신은 이 판에서 쫓겨났다."],
  ["这一局已经结束", "This match is over.", "この局は終わった。", "이 판은 끝났다."],
  ["实验局里不能换席", "You cannot change seats in an experiment.", "実験局では席を換えられない。", "실험국에서는 자리를 바꿀 수 없다."],
  ["你已经入席。实验局里一人一席。", "You are already seated. One person, one seat.", "あなたはすでに在席。実験局は一人一席。", "당신은 이미 재석이다. 실험국은 한 사람 한 자리."],
  ["市民要先选择落脚的城", "A citizen must first choose a city.", "市民はまず落ちつく城を選べ。", "시민은 먼저 머무를 성을 고른다."],
  ["没有这个席位", "There is no such seat.", "そのような席はない。", "그런 자리는 없다."],
  ["这个人已经退场，不能由别人顶替", "This person has left. No one may take their place.", "この人は退場した。他人が代わりに立てない。", "이 사람은 퇴장했다. 다른 사람이 대신할 수 없다."],
  ["这个人还没有被发现", "This person has not been discovered.", "この人はまだ見つかっていない。", "이 사람은 아직 발견되지 않았다."],
  ["此席已有人", "This seat is taken.", "この席にはすでに人がいる。", "이 자리에는 이미 사람이 있다."],
  ["指令太频繁", "Orders are coming too fast.", "指令が速すぎる。", "명령이 너무 잦다."],
  ["先入席，再下令", "Take a seat, then give orders.", "まず席に就き、それから命じよ。", "먼저 자리에 앉고, 그다음 명령하라."],
  ["你没有席位", "You have no seat.", "あなたに席はない。", "당신에게 자리가 없다."],
  ["裁判只能处理作弊或骚扰", "A referee handles only cheating or harassment.", "裁判が扱えるのは不正か嫌がらせだけ。", "재판이 다루는 것은 부정이나 괴롭힘뿐."],
  ["裁判令牌不对", "The referee token is wrong.", "裁判の令牌が違う。", "재판 패가 다르다."],
  ["没有完成", "Not completed.", "完了しなかった。", "마치지 못했다."],
  ["入席失败", "Could not take the seat.", "入席できなかった。", "입석하지 못했다."],
  ["指令被退回", "The order was returned.", "指令は戻された。", "명령이 되돌려졌다."],
  ["没能撤回", "Could not withdraw.", "撤回できなかった。", "거두지 못했다."],
  ["这条参数不在可修规的白名单里", "That number is not on the list that court may amend.", "この数は、朝議が改められる白名簿にない。", "이 수는 조의가 고칠 수 있는 명단에 없다."],
  ["没有这种形制", "There is no such pattern.", "そのような形はない。", "그런 형제는 없다."],
  ["器物名字太长或不能用", "That name is too long, or cannot be used.", "その名は長すぎるか、使えない。", "그 이름은 너무 길거나 쓸 수 없다."],
  ["要指明一件器物", "Name the piece.", "一つの品を指せ。", "기물 하나를 가리켜라."],
];

export const ERRORS: Record<string, Record<Locale, string>> = Object.fromEntries(
  ROWS.map(([zh, en, ja, ko]) => [zh, { zh, en, ja, ko }]),
);

export function translateKnown(message: string, locale: Locale): string {
  const hit = ERRORS[message];
  if (hit) return hit[locale];
  const integer = message.match(/^(.*) 必须是 (.+)–(.+) 的整数$/);
  if (integer) {
    const [, path, min, max] = integer;
    if (locale === "en") return `${path} must be an integer from ${min} to ${max}.`;
    if (locale === "ja") return `${path} は ${min}–${max} の整数。`;
    if (locale === "ko") return `${path} 은 ${min}–${max}의 정수여야 한다.`;
    return message;
  }
  const number = message.match(/^(.*) 必须是 (.+)–(.+) 的数$/);
  if (number) {
    const [, path, min, max] = number;
    if (locale === "en") return `${path} must be a number from ${min} to ${max}.`;
    if (locale === "ja") return `${path} は ${min}–${max} の数。`;
    if (locale === "ko") return `${path} 은 ${min}–${max}의 수여야 한다.`;
    return message;
  }
  const red = message.match(/^(.*) 是红线，不能改成 (.*)$/);
  if (red) {
    const [, path, value] = red;
    if (locale === "en") return `${path} is a red line and cannot become ${value}.`;
    if (locale === "ja") return `${path} は紅線。${value} には改められない。`;
    if (locale === "ko") return `${path} 은 홍선이다. ${value} 로 고칠 수 없다.`;
    return message;
  }
  const search = message.match(/^C5：搜索不能包含「(.+)」。只发现存量，不新增历史人物$/);
  if (search) {
    const item = search[1];
    if (locale === "en") return `C5: search cannot include "${item}". It finds only what already exists. It creates no historical person.`;
    if (locale === "ja") return `C5：搜索は「${item}」を含められない。あるものだけを見つけ、歴史人物を新たに作らない。`;
    if (locale === "ko") return `C5: 수색은 「${item}」을 담을 수 없다. 있는 것만 찾고, 역사 인물을 새로 만들지 않는다.`;
    return message;
  }
  return message;
}
