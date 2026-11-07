/* Coin-Rain locale + currency catalog.
 * UMD: loaded by <script> in the renderer, and require()-able from main.js.
 * All user-facing copy and all money definitions live here.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CoinRainLocale = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  /* html = <html lang>, num = number-formatting locale.
   * Number grouping/decimal separators follow the UI language; only the symbol
   * and the conversion rate follow the selected currency. */
  var LANGS = [
    { code: 'zh-CN', label: '简体中文', html: 'zh-CN', num: 'zh-CN' },
    { code: 'zh-TW', label: '繁體中文', html: 'zh-TW', num: 'zh-TW' },
    { code: 'en-US', label: 'English', html: 'en', num: 'en-US' },
    { code: 'ja-JP', label: '日本語', html: 'ja', num: 'ja-JP' }
  ];

  /* perCny = how many units of this currency equal 1 CNY.
   * These are built-in OFFLINE reference rates for a playful demo only.
   * No network calls, no live FX, never used for real payroll or trading. */
  var CURRENCIES = [
    { code: 'CNY', symbol: '¥',    glyph: '¥',  label: 'CNY ¥  · Chinese Yuan',      perCny: 1,     digits: 2, locale: 'zh-CN' },
    { code: 'USD', symbol: '$',    glyph: '$',  label: 'USD $  · US Dollar',         perCny: 0.14,  digits: 2, locale: 'en-US' },
    { code: 'EUR', symbol: '€',    glyph: '€',  label: 'EUR €  · Euro',              perCny: 0.129, digits: 2, locale: 'de-DE' },
    { code: 'GBP', symbol: '£',    glyph: '£',  label: 'GBP £  · British Pound',     perCny: 0.109, digits: 2, locale: 'en-GB' },
    { code: 'JPY', symbol: '¥',    glyph: '¥',  label: 'JPY ¥  · Japanese Yen',      perCny: 21.2,  digits: 0, locale: 'ja-JP' },
    { code: 'HKD', symbol: 'HK$',  glyph: '$',  label: 'HKD HK$ · Hong Kong Dollar', perCny: 1.09,  digits: 2, locale: 'zh-HK' },
    { code: 'TWD', symbol: 'NT$',  glyph: '$',  label: 'TWD NT$ · New Taiwan Dollar',perCny: 4.45,  digits: 2, locale: 'zh-TW' },
    { code: 'KRW', symbol: '₩',    glyph: '₩',  label: 'KRW ₩  · Korean Won',        perCny: 190,   digits: 0, locale: 'ko-KR' },
    { code: 'SGD', symbol: 'S$',   glyph: '$',  label: 'SGD S$ · Singapore Dollar',  perCny: 0.181, digits: 2, locale: 'en-SG' },
    { code: 'AUD', symbol: 'A$',   glyph: '$',  label: 'AUD A$ · Australian Dollar', perCny: 0.212, digits: 2, locale: 'en-AU' },
    { code: 'CAD', symbol: 'C$',   glyph: '$',  label: 'CAD C$ · Canadian Dollar',   perCny: 0.193, digits: 2, locale: 'en-CA' },
    { code: 'INR', symbol: '₹',    glyph: '₹',  label: 'INR ₹  · Indian Rupee',      perCny: 12.1,  digits: 2, locale: 'en-IN' },
    { code: 'CHF', symbol: 'CHF',  glyph: 'Fr', label: 'CHF Fr · Swiss Franc',       perCny: 0.122, digits: 2, locale: 'de-CH' }
  ];

  /* Purchasing-power goals and milestone amounts are CNY-based reference values;
   * they are converted into the active currency at render time. */
  var GOAL_VALUES = [18, 35, 50, 68, 100, 200, 500, 1000, 5000];
  var MILESTONES = [1, 10, 18, 50, 100, 200, 500, 1000, 5000, 10000];

  var zhCN = {
    'app.title': 'Coin-Rain · 每秒都在赚',
    'app.brand': 'Coin-Rain',
    'tray.tooltip': 'Coin-Rain · 每秒都在赚',
    'tip.expand': '展开 · 风格工坊',
    'tip.expanded': '风格工坊已展开',
    'tip.minimize': '最小化',
    'tip.close': '关闭程序',
    'tip.resize': '按住向下拖动可拉高窗口（不会小于挂机小窗）',
    'setup.tip': '先设定月收入，钱就开始掉',
    'goal.next': '下一站 · {0} {1}',
    'goal.allDone': '全部目标已解锁 · 继续涨',
    'achievement': '达成 {0} · 时间替你赚的',
    'scale.sec': '每秒', 'scale.min': '每分钟', 'scale.hour': '每小时',
    'scale.day': '每个工作日', 'scale.drama': '一集剧（45 分钟）',
    'goal.g1': '一杯奶茶', 'goal.g2': '一顿午饭', 'goal.g3': '一张电影票',
    'goal.g4': '一杯精品咖啡', 'goal.g5': '一次打车', 'goal.g6': '一顿火锅',
    'goal.g7': '一双好鞋', 'goal.g8': '一次短途旅行', 'goal.g9': '一部新手机',
    'praise': [
      '叮！这一下是到账的声音', '你在发呆，钱在到账', '摸鱼的每一秒，都在增值',
      '很好，保持这个姿势就行', '刚才那一秒，世界给你结了账', '不用做什么，时间自己会付钱',
      '稳稳的，一直在涨', '这一颗，是你刚才那口气赚的', '账户动了，你可以继续放空',
      '又一小笔，安静地进来了', '别紧张，它在自己涨', '今天的你，什么都没做也在赚'
    ],
    'panel.pause': '暂停', 'panel.resume': '继续',
    'panel.collapse': '收起 · 挂机小窗', 'panel.reset': '累计清零',
    'income.title': '收入设置',
    'income.hint': '输入后立刻隐藏。本机只保存折算速率，不保存月收入明文。',
    'income.placeholder': '输入月收入（不显示）',
    'income.set': '设定', 'income.days': '每月工作日', 'income.hours': '每天小时数',
    'income.scale': '时间标尺',
    'income.caliber': '口径：每月 {0} 天 × {1} 小时 = {2} 秒，按等效速率折算，趣味演示，不代表实际发放。',
    'studio.title': '风格工坊', 'studio.random': '随机一套',
    'theme.warm': '暖金喜悦', 'theme.cyber': '赛博金库',
    'theme.cream': '治愈奶油', 'theme.minimal': '极简账本',
    'shapes.tag': '粒子', 'shapes.coin': '金币', 'shapes.envelope': '红包', 'shapes.star': '星星',
    'slider.density': '金币密度', 'slider.speed': '下落速度', 'slider.motion': '动效强度',
    'slider.freq': '彩蛋频率', 'slider.idle': '沉浸等待',
    'unit.count': '{0} 颗', 'unit.off': '关闭', 'unit.seconds': '{0} 秒',
    'idle.title': '挂机设置', 'opt.sound': '叮声音效', 'opt.bump': '轻弹反馈',
    'opt.top': '窗口置顶', 'opt.awake': '防止屏幕休眠',
    'opt.immersive': '沉浸模式 · 鼠标静置后收起标题栏',
    'footer.privacy': '数据全部留在本机 · 退出后保留总额，下次接着涨',
    'footer.copyright': '© 2026 赞煜工作室 · All rights reserved.',
    'locale.title': '语言与货币', 'locale.language': '界面语言', 'locale.currency': '显示货币',
    'locale.note': '内置离线参考汇率，仅供趣味演示，非实时行情；切换货币会按参考汇率换算已累计金额。',
    'msg.invalidIncome': '请输入一个有效的月收入',
    'msg.incomeSet': '设定好了，钱开始掉了',
    'msg.random': '换一套心情',
    'msg.resume': '继续涨', 'msg.pause': '先歇一会儿',
    'msg.reset': '归零了，重新开始涨',
    'msg.resetConfirm': '把累计金额清零，从 0 重新开始？月收入设置会保留。',
    'msg.currencyChanged': '已切换货币，累计金额按参考汇率换算',
    'msg.resetTitle': '累计清零？',
    'onboard.eyebrow': '首次启动',
    'onboard.title': '先选好，再开始',
    'onboard.subtitle': '选择界面语言和显示货币，之后可以在「风格工坊」里随时更改。',
    'onboard.language': '界面语言', 'onboard.currency': '显示货币',
    'onboard.start': '开始收金币',
    'onboard.note': '全程离线 · 数据只留在本机 · 汇率为趣味演示',
    'dialog.cancel': '取消', 'dialog.confirm': '确定',
    'tray.show': '显示 / 隐藏', 'tray.top': '窗口置顶',
    'tray.auto': '开机自动启动', 'tray.quit': '退出'
  };

  var zhTW = {
    'app.title': 'Coin-Rain · 每秒都在賺',
    'app.brand': 'Coin-Rain',
    'tray.tooltip': 'Coin-Rain · 每秒都在賺',
    'tip.expand': '展開 · 風格工坊', 'tip.expanded': '風格工坊已展開',
    'tip.minimize': '最小化', 'tip.close': '關閉程式',
    'tip.resize': '按住向下拖曳可拉高視窗（不會小於掛機小窗）',
    'setup.tip': '先設定月收入，錢就開始掉',
    'goal.next': '下一站 · {0} {1}', 'goal.allDone': '全部目標已解鎖 · 繼續漲',
    'achievement': '達成 {0} · 時間替你賺的',
    'scale.sec': '每秒', 'scale.min': '每分鐘', 'scale.hour': '每小時',
    'scale.day': '每個工作日', 'scale.drama': '一集劇（45 分鐘）',
    'goal.g1': '一杯奶茶', 'goal.g2': '一頓午飯', 'goal.g3': '一張電影票',
    'goal.g4': '一杯精品咖啡', 'goal.g5': '一次搭車', 'goal.g6': '一頓火鍋',
    'goal.g7': '一雙好鞋', 'goal.g8': '一次短途旅行', 'goal.g9': '一支新手機',
    'praise': [
      '叮！這一筆剛剛到帳', '你在發呆，錢在到帳', '摸魚的每一秒，都在增值',
      '很好，保持這個姿勢就行', '剛才那一秒，世界替你結了帳', '不用做什麼，時間自己會付錢',
      '穩穩的，一直在漲', '這一顆，是你剛才那口氣賺的', '帳戶動了，你可以繼續放空',
      '又一小筆，安靜地進來了', '別緊張，它自己會漲', '今天的你，什麼都沒做也在賺'
    ],
    'panel.pause': '暫停', 'panel.resume': '繼續',
    'panel.collapse': '收起 · 掛機小窗', 'panel.reset': '累計歸零',
    'income.title': '收入設定',
    'income.hint': '輸入後立刻隱藏。本機只保存折算速率，不保存月收入明文。',
    'income.placeholder': '輸入月收入（不顯示）',
    'income.set': '設定', 'income.days': '每月工作日', 'income.hours': '每天小時數',
    'income.scale': '時間標尺',
    'income.caliber': '口徑：每月 {0} 天 × {1} 小時 = {2} 秒，依等效速率折算，趣味展示，不代表實際發放。',
    'studio.title': '風格工坊', 'studio.random': '隨機一套',
    'theme.warm': '暖金喜悅', 'theme.cyber': '賽博金庫',
    'theme.cream': '治癒奶油', 'theme.minimal': '極簡帳本',
    'shapes.tag': '粒子', 'shapes.coin': '金幣', 'shapes.envelope': '紅包', 'shapes.star': '星星',
    'slider.density': '金幣密度', 'slider.speed': '下落速度', 'slider.motion': '動效強度',
    'slider.freq': '彩蛋頻率', 'slider.idle': '沉浸等待',
    'unit.count': '{0} 顆', 'unit.off': '關閉', 'unit.seconds': '{0} 秒',
    'idle.title': '掛機設定', 'opt.sound': '叮聲音效', 'opt.bump': '輕彈回饋',
    'opt.top': '視窗置頂', 'opt.awake': '防止螢幕休眠',
    'opt.immersive': '沉浸模式 · 滑鼠靜置後收起標題列',
    'footer.privacy': '資料全部留在本機 · 退出後保留總額，下次接著漲',
    'footer.copyright': '© 2026 贊煜工作室 · All rights reserved.',
    'locale.title': '語言與貨幣', 'locale.language': '介面語言', 'locale.currency': '顯示貨幣',
    'locale.note': '內建離線參考匯率，僅供趣味展示，非即時行情；切換貨幣會依參考匯率換算已累計金額。',
    'msg.invalidIncome': '請輸入有效的月收入',
    'msg.incomeSet': '設定好了，錢開始掉了',
    'msg.random': '換一套心情', 'msg.resume': '繼續漲', 'msg.pause': '先歇一會兒',
    'msg.reset': '歸零了，重新開始漲',
    'msg.resetConfirm': '把累計金額歸零，從 0 重新開始？月收入設定會保留。',
    'msg.currencyChanged': '已切換貨幣，累計金額依參考匯率換算',
    'msg.resetTitle': '累計歸零？',
    'onboard.eyebrow': '首次啟動',
    'onboard.title': '先選好，再開始',
    'onboard.subtitle': '選擇介面語言與顯示貨幣，之後可在「風格工坊」隨時更改。',
    'onboard.language': '介面語言', 'onboard.currency': '顯示貨幣',
    'onboard.start': '開始收金幣',
    'onboard.note': '全程離線 · 資料只留在本機 · 匯率為趣味展示',
    'dialog.cancel': '取消', 'dialog.confirm': '確定',
    'tray.show': '顯示 / 隱藏', 'tray.top': '視窗置頂',
    'tray.auto': '開機自動啟動', 'tray.quit': '退出'
  };

  var enUS = {
    'app.title': 'Coin-Rain · earning every second',
    'app.brand': 'Coin-Rain',
    'tray.tooltip': 'Coin-Rain · earning every second',
    'tip.expand': 'Open Style Studio', 'tip.expanded': 'Style Studio open',
    'tip.minimize': 'Minimize', 'tip.close': 'Close',
    'tip.resize': 'Drag down to resize (mini height is the minimum)',
    'setup.tip': 'Set monthly income to start',
    'goal.next': 'Next · {0} {1}', 'goal.allDone': 'All goals unlocked · keep going',
    'achievement': '{0} reached · time earned it',
    'scale.sec': 'per second', 'scale.min': 'per minute', 'scale.hour': 'per hour',
    'scale.day': 'per workday', 'scale.drama': 'one episode (45 min)',
    'goal.g1': 'Bubble tea', 'goal.g2': 'Lunch', 'goal.g3': 'Movie ticket',
    'goal.g4': 'Specialty coffee', 'goal.g5': 'Taxi ride', 'goal.g6': 'Hotpot',
    'goal.g7': 'Nice shoes', 'goal.g8': 'Weekend trip', 'goal.g9': 'New phone',
    'praise': [
      'Ding! That one just landed.', "You're zoning out. Money isn't.",
      'Every idle second pays.', 'Nice. Stay exactly like that.',
      'The world just settled that second.', 'Do nothing. Time pays anyway.',
      'Steady. Still climbing.', 'That coin? You earned it breathing.',
      'Balance moved. Keep staring.', 'Another little deposit, quietly.',
      'Relax. It grows by itself.', 'Today you earned by doing nothing.'
    ],
    'panel.pause': 'Pause', 'panel.resume': 'Resume',
    'panel.collapse': 'Mini window', 'panel.reset': 'Reset',
    'income.title': 'Income',
    'income.hint': 'Hidden instantly. Only the derived rate is stored, never your salary.',
    'income.placeholder': 'Monthly income (hidden)',
    'income.set': 'Set', 'income.days': 'Workdays', 'income.hours': 'Hours / day',
    'income.scale': 'Time scale',
    'income.caliber': 'Basis: {0} days × {1} h = {2} s per month. Equivalent-rate demo, not real payroll.',
    'studio.title': 'Style Studio', 'studio.random': 'Surprise me',
    'theme.warm': 'Warm Gold', 'theme.cyber': 'Cyber Vault',
    'theme.cream': 'Cream', 'theme.minimal': 'Minimal',
    'shapes.tag': 'Particles', 'shapes.coin': 'Coin', 'shapes.envelope': 'Envelope', 'shapes.star': 'Star',
    'slider.density': 'Coin density', 'slider.speed': 'Fall speed', 'slider.motion': 'Effects',
    'slider.freq': 'Cheer frequency', 'slider.idle': 'Idle delay',
    'unit.count': '{0}', 'unit.off': 'Off', 'unit.seconds': '{0} s',
    'idle.title': 'Desktop', 'opt.sound': 'Coin sound', 'opt.bump': 'Bump feedback',
    'opt.top': 'Always on top', 'opt.awake': 'Keep screen awake',
    'opt.immersive': 'Immersive · hide titlebar when idle',
    'footer.privacy': 'All data stays local · total resumes next launch',
    'footer.copyright': '© 2026 ZanYu Studio · All rights reserved.',
    'locale.title': 'Language & Currency', 'locale.language': 'Language', 'locale.currency': 'Currency',
    'locale.note': 'Built-in offline reference rates, demo only — not live FX. Switching currency converts your running total.',
    'msg.invalidIncome': 'Enter a valid monthly income',
    'msg.incomeSet': 'All set, here comes the rain',
    'msg.random': 'Fresh look!', 'msg.resume': 'Keep earning', 'msg.pause': 'Taking a break',
    'msg.reset': 'Reset. Growing again',
    'msg.resetConfirm': 'Reset the running total to 0? Your income setting is kept.',
    'msg.currencyChanged': 'Currency changed; total converted at reference rate',
    'msg.resetTitle': 'Reset total?',
    'onboard.eyebrow': 'FIRST LAUNCH',
    'onboard.title': 'Make it yours',
    'onboard.subtitle': 'Pick your language and currency. You can change both anytime in Style Studio.',
    'onboard.language': 'Language', 'onboard.currency': 'Currency',
    'onboard.start': 'Start earning',
    'onboard.note': 'Fully offline · data stays on this device · demo rates only',
    'dialog.cancel': 'Cancel', 'dialog.confirm': 'Confirm',
    'tray.show': 'Show / Hide', 'tray.top': 'Always on top',
    'tray.auto': 'Launch at login', 'tray.quit': 'Quit'
  };

  var jaJP = {
    'app.title': 'Coin-Rain · 毎秒お金が増える',
    'app.brand': 'Coin-Rain',
    'tray.tooltip': 'Coin-Rain · 毎秒お金が増える',
    'tip.expand': 'スタイル工房を開く', 'tip.expanded': 'スタイル工房を表示中',
    'tip.minimize': '最小化', 'tip.close': '閉じる',
    'tip.resize': '下にドラッグで高さ変更（最小は小窓サイズ）',
    'setup.tip': '月収を設定してスタート',
    'goal.next': '次は {0} {1}', 'goal.allDone': '全目標達成 · まだ増える',
    'achievement': '{0} 達成 · 時間が稼いだ',
    'scale.sec': '毎秒', 'scale.min': '毎分', 'scale.hour': '毎時間',
    'scale.day': '営業日ごと', 'scale.drama': '1話（45分）',
    'goal.g1': 'タピオカ', 'goal.g2': 'ランチ', 'goal.g3': '映画チケット',
    'goal.g4': 'スペシャルティコーヒー', 'goal.g5': 'タクシー', 'goal.g6': '火鍋',
    'goal.g7': '良い靴', 'goal.g8': '小旅行', 'goal.g9': '新しいスマホ',
    'praise': [
    'チリン！今し方入金です', 'ぼーっとしていても、お金は増える',
    '怠ける一秒も無駄じゃない', 'いい調子。そのままで',
    '今の一秒、世界が精算しました', '何もしなくても時間が払ってくれる',
    '着実に、増え続けています', 'この一枚は、その息で稼いだ分',
    '残高が動きました。眺め続けて', 'また少し、静かに入ってきました',
    '安心して。勝手に増えます', '今日は何もしなくても稼いでいます'
    ],
    'panel.pause': '一時停止', 'panel.resume': '再開',
    'panel.collapse': '小窓へ', 'panel.reset': 'リセット',
    'income.title': '収入設定',
    'income.hint': '入力後すぐ非表示。保存されるのは換算レートのみで、月収は保存されません。',
    'income.placeholder': '月収を入力（非表示）',
    'income.set': '設定', 'income.days': '月の勤務日', 'income.hours': '1日の時間',
    'income.scale': '時間スケール',
    'income.caliber': '基準：月 {0} 日 × {1} 時間 = {2} 秒。換算レートによるデモで、実際の給与ではありません。',
    'studio.title': 'スタイル工房', 'studio.random': 'おまかせ',
    'theme.warm': '暖かな金', 'theme.cyber': 'サイバー金庫',
    'theme.cream': 'クリーム', 'theme.minimal': 'ミニマル',
    'shapes.tag': '粒子', 'shapes.coin': 'コイン', 'shapes.envelope': '封筒', 'shapes.star': '星',
    'slider.density': 'コイン密度', 'slider.speed': '落下速度', 'slider.motion': 'エフェクト',
    'slider.freq': '応援頻度', 'slider.idle': '待機時間',
    'unit.count': '{0} 個', 'unit.off': 'オフ', 'unit.seconds': '{0} 秒',
    'idle.title': '常駐設定', 'opt.sound': '効果音', 'opt.bump': '軽い振動',
    'opt.top': '常に最前面', 'opt.awake': 'スリープ防止',
    'opt.immersive': '没入モード · 待機時にタイトルバーを隠す',
    'footer.privacy': 'データは端末内のみ · 次回も累計を継続',
    'footer.copyright': '© 2026 ZanYu Studio · All rights reserved.',
    'locale.title': '言語と通貨', 'locale.language': '言語', 'locale.currency': '通貨',
    'locale.note': '内蔵のオフライン参考レート（デモ用・実勢レートではありません）。通貨変更時は累計額を換算します。',
    'msg.invalidIncome': '有効な月収を入力してください',
    'msg.incomeSet': '設定完了、コインが降ります',
    'msg.random': '気分を変更', 'msg.resume': '再開', 'msg.pause': 'ひと休み',
    'msg.reset': 'リセット、再スタート',
    'msg.resetConfirm': '累計を 0 にリセットしますか？収入設定は保持されます。',
    'msg.currencyChanged': '通貨を変更、累計を換算しました',
    'msg.resetTitle': '累計をリセット？',
    'onboard.eyebrow': '初回起動',
    'onboard.title': 'まずは設定',
    'onboard.subtitle': '言語と通貨を選んでください。後からスタイル工房でいつでも変更できます。',
    'onboard.language': '言語', 'onboard.currency': '通貨',
    'onboard.start': 'コインを受け取る',
    'onboard.note': '完全オフライン · データは端末内のみ · レートはデモ用',
    'dialog.cancel': 'キャンセル', 'dialog.confirm': '決定',
    'tray.show': '表示 / 非表示', 'tray.top': '常に最前面',
    'tray.auto': 'ログイン時に起動', 'tray.quit': '終了'
  };

  var STRINGS = { 'zh-CN': zhCN, 'zh-TW': zhTW, 'en-US': enUS, 'ja-JP': jaJP };

  /* Fresh installs start in English with US dollars. Unknown / missing values
   * fall back to the same pair so every renderer and the tray stay in sync. */
  function normalizeLang(v) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === v) return v;
    return 'en-US';
  }
  function langMeta(code) {
    var c = normalizeLang(code);
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === c) return LANGS[i];
    for (var j = 0; j < LANGS.length; j++) if (LANGS[j].code === 'en-US') return LANGS[j];
    return LANGS[0];
  }
  function normalizeCurrency(v) {
    for (var i = 0; i < CURRENCIES.length; i++) if (CURRENCIES[i].code === v) return v;
    return 'USD';
  }
  function currency(code) {
    var c = normalizeCurrency(code);
    for (var i = 0; i < CURRENCIES.length; i++) if (CURRENCIES[i].code === c) return CURRENCIES[i];
    for (var j = 0; j < CURRENCIES.length; j++) if (CURRENCIES[j].code === 'USD') return CURRENCIES[j];
    return CURRENCIES[0];
  }
  /* Convert an amount between two currencies using the offline reference table. */
  function convert(amount, fromCode, toCode) {
    return Number(amount) / currency(fromCode).perCny * currency(toCode).perCny;
  }

  function t(lang, key) {
    var args = Array.prototype.slice.call(arguments, 2);
    var table = STRINGS[normalizeLang(lang)] || enUS;
    var val = table[key];
    if (val === undefined) val = enUS[key];
    if (val === undefined) return key;
    if (Array.isArray(val) || typeof val === 'object') return val;
    return String(val).replace(/\{(\d+)\}/g, function (m, i) {
      return args[Number(i)] === undefined ? m : String(args[Number(i)]);
    });
  }
  function list(lang, key) {
    var table = STRINGS[normalizeLang(lang)] || enUS;
    return table[key] || enUS[key] || [];
  }
  function scales(lang) {
    return {
      sec: t(lang, 'scale.sec'), min: t(lang, 'scale.min'), hour: t(lang, 'scale.hour'),
      day: t(lang, 'scale.day'), drama: t(lang, 'scale.drama')
    };
  }
  function goals(lang) {
    var out = [];
    for (var i = 0; i < GOAL_VALUES.length; i++) {
      out.push({ name: t(lang, 'goal.g' + (i + 1)), v: GOAL_VALUES[i] });
    }
    return out;
  }

  return {
    LANGS: LANGS,
    CURRENCIES: CURRENCIES,
    GOAL_VALUES: GOAL_VALUES,
    MILESTONES: MILESTONES,
    normalizeLang: normalizeLang,
    langMeta: langMeta,
    normalizeCurrency: normalizeCurrency,
    currency: currency,
    convert: convert,
    t: t,
    list: list,
    scales: scales,
    goals: goals
  };
});
