const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.('#f6c945');
  tg.setBackgroundColor?.('#fffaf0');
  // Prevent Telegram's pull-down gesture from moving the whole Mini App.
  try { tg.disableVerticalSwipes?.(); } catch (_) {}
}

const STORAGE_KEY = 'street_to_president_v2';
const LEGACY_STORAGE_KEY = 'street_to_president_v1';
const CRITICAL_LIMIT_HOURS = 24;
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const fmt = n => Math.round(n).toLocaleString('ru-RU');
const random = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const chance = (probability, good, bad) => (Math.random() < adjustedChanceV23(probability) ? good() : bad());
const clampRate = rate => Math.max(30, Math.min(110, Math.round(rate * 100) / 100));

const defaultState = {
  rubles: 120, dollars: 0,
  exchangeRate: 92.00, previousExchangeRate: 92.00, exchangeRateBias: 0,
  health: 72, hunger: 52, happiness: 35,
  education: 0, reputation: 0, connections: 0, popularity: 0, influence: 0,
  strength: 0, intelligence: 0, charisma: 0, entrepreneurship: 0, politicsSkill: 0, luck: 0,
  difficulty: 'normal', difficultyChosen: false, tutorialCompleted: false, tutorialStep: 0, chapterIndex: 0,
  currentJob: null, jobExperience: 0, jobWarnings: 0, jobLevels: {}, selectedBranch: 'labor',
  lastDailyIncome: {assets:0,businesses:0,total:0},
  dayReports: [],
  dayStartSnapshot: {rubles:120,dollars:0,health:72,hunger:52,happiness:35},
  inventory: {}, businesses: {}, relations: {}, characterVisits: {}, pendingStories: [], stories: {}, endings: [],
  day: 1, hour: 8, careerIndex: 0, homeId: 'street', assets: {},
  totalEarned: 0, totalDollarEarned: 0, totalSpent: 0, actionsDone: 0, daysSurvived: 1,
  president: false, electionLosses: 0, electionBanUntil: 0, lastEventId: null,
  criticalHours: {health:0,hunger:0,happiness:0},
  criticalActive: {health:false,hunger:false,happiness:false},
  gameOver: false, deathReason: '', deathDay: 0,
  playerName: tg?.initDataUnsafe?.user?.first_name || 'Игрок'
};

const categories = [
  ['food','🍔','Еда'],['work','💼','Работа'],['health','❤️','Здоровье'],
  ['fun','🎮','Развлечения'],['education','🎓','Учёба'],['media','📣','Популярность'],['politics','🏛️','Политика']
];

const actions = [
  {
    "id": "find_food",
    "cat": "food",
    "icon": "🗑️",
    "name": "Поискать еду у магазина",
    "desc": "Проверить контейнеры возле магазина и найти что-нибудь съедобное.",
    "hours": 4,
    "hunger": 4,
    "happiness": -4,
    "health": -6,
    "min": 0,
    "max": 0
  },
  {
    "id": "bread",
    "cat": "food",
    "icon": "🍞",
    "name": "Купить батон",
    "desc": "Самый простой покупной перекус.",
    "hours": 2,
    "hunger": 7,
    "happiness": 0,
    "cost": 80,
    "health": -2
  },
  {
    "id": "tea_bun",
    "cat": "food",
    "icon": "☕",
    "name": "Чай с булочкой",
    "desc": "Недорогой перекус, который насыщает лучше батона.",
    "hours": 2,
    "hunger": 12,
    "happiness": 1,
    "cost": 200,
    "health": -1
  },
  {
    "id": "shawarma",
    "cat": "food",
    "icon": "🌯",
    "name": "Купить шаурму",
    "desc": "Сытная уличная еда, но не самая полезная.",
    "hours": 2,
    "hunger": 20,
    "happiness": 3,
    "health": -2,
    "cost": 500
  },
  {
    "id": "canteen",
    "cat": "food",
    "icon": "🥣",
    "name": "Поесть в столовой",
    "desc": "Горячая еда по доступной цене.",
    "hours": 1,
    "hunger": 35,
    "happiness": 9,
    "health": 3,
    "cost": 1200,
    "req": {
      "career": 1
    }
  },
  {
    "id": "cafe",
    "cat": "food",
    "icon": "🍲",
    "name": "Поесть в кафе",
    "desc": "Полноценный приём пищи и небольшой отдых.",
    "hours": 1,
    "hunger": 50,
    "happiness": 15,
    "health": 6,
    "cost": 3000,
    "req": {
      "career": 2
    }
  },
  {
    "id": "groceries",
    "cat": "food",
    "icon": "🛍️",
    "name": "Купить продукты",
    "desc": "Купить нормальные продукты и хорошо поесть дома.",
    "hours": 2,
    "hunger": 70,
    "happiness": 21,
    "health": 10,
    "cost": 7000,
    "req": {
      "career": 2
    }
  },
  {
    "id": "food_delivery",
    "cat": "food",
    "icon": "🥡",
    "name": "Заказать доставку еды",
    "desc": "Комфортный и очень сытный приём пищи.",
    "hours": 1,
    "hunger": 85,
    "happiness": 29,
    "health": 15,
    "cost": 15000,
    "req": {
      "career": 3
    }
  },
  {
    "id": "restaurant",
    "cat": "food",
    "icon": "🍽️",
    "name": "Ужин в ресторане",
    "desc": "Самая дорогая и приятная еда в этой категории.",
    "hours": 1,
    "hunger": 100,
    "happiness": 40,
    "health": 22,
    "cost": 35000,
    "req": {
      "career": 4
    }
  },
  {
    "id": "beg",
    "cat": "work",
    "icon": "🪙",
    "name": "Просить милостыню",
    "desc": "Попросить помощи у прохожих возле метро. Доход зависит от удачи.",
    "hours": 3,
    "hunger": -8,
    "happiness": -8,
    "reputation": -1,
    "min": 120,
    "max": 350,
    "health": -2
  },
  {
    "id": "bottles",
    "cat": "work",
    "icon": "♻️",
    "name": "Собирать бутылки",
    "desc": "Собирать и сдавать найденную тару.",
    "hours": 3,
    "hunger": -10,
    "happiness": -7,
    "health": -3,
    "min": 250,
    "max": 500
  },
  {
    "id": "flyers",
    "cat": "work",
    "icon": "📄",
    "name": "Раздавать листовки",
    "desc": "Стоять у метро и раздавать рекламу прохожим.",
    "hours": 4,
    "hunger": -11,
    "happiness": -6,
    "min": 550,
    "max": 900,
    "health": -2
  },
  {
    "id": "car_wash",
    "cat": "work",
    "icon": "🧽",
    "name": "Помыть машины",
    "desc": "Подработка на автомойке с оплатой после смены.",
    "hours": 4,
    "hunger": -12,
    "happiness": -6,
    "health": -4,
    "min": 900,
    "max": 1400
  },
  {
    "id": "loader",
    "cat": "work",
    "icon": "📦",
    "name": "Подработка грузчиком",
    "desc": "Тяжёлая физическая работа, но платят сразу.",
    "hours": 5,
    "hunger": -16,
    "happiness": -8,
    "health": -7,
    "min": 1400,
    "max": 2200,
    "req": {
      "health": 42
    }
  },
  {
    "id": "cleaner",
    "cat": "work",
    "icon": "🧼",
    "name": "Уборка помещений",
    "desc": "Регулярная подработка по уборке офисов и подъездов.",
    "hours": 6,
    "hunger": -17,
    "happiness": -7,
    "health": -5,
    "min": 2500,
    "max": 3800,
    "req": {
      "career": 1
    }
  },
  {
    "id": "courier",
    "cat": "work",
    "icon": "🚲",
    "name": "Смена курьером",
    "desc": "Первая стабильная работа с заметно большей оплатой.",
    "hours": 6,
    "hunger": -18,
    "happiness": -6,
    "health": -5,
    "min": 4500,
    "max": 6500,
    "req": {
      "career": 1,
      "health": 45
    }
  },
  {
    "id": "seller",
    "cat": "work",
    "icon": "🛒",
    "name": "Смена продавцом",
    "desc": "Постоянная работа и опыт общения с людьми.",
    "hours": 8,
    "hunger": -20,
    "happiness": -6,
    "reputation": 1,
    "min": 7000,
    "max": 10000,
    "req": {
      "career": 2,
      "education": 10
    },
    "health": -4
  },
  {
    "id": "taxi",
    "cat": "work",
    "icon": "🚕",
    "name": "Смена в такси",
    "desc": "Долгая смена за рулём с хорошим заработком.",
    "hours": 8,
    "hunger": -21,
    "happiness": -8,
    "health": -6,
    "min": 11000,
    "max": 16000,
    "req": {
      "career": 2,
      "health": 45
    }
  },
  {
    "id": "tutor",
    "cat": "work",
    "icon": "🧑‍🏫",
    "name": "Поработать репетитором",
    "desc": "Провести занятия и заработать своими знаниями.",
    "hours": 6,
    "hunger": -16,
    "happiness": -4,
    "reputation": 2,
    "min": 16000,
    "max": 23000,
    "req": {
      "career": 3,
      "education": 45,
      "reputation": 10
    },
    "health": -3
  },
  {
    "id": "office",
    "cat": "work",
    "icon": "💻",
    "name": "Работа в офисе",
    "desc": "Хорошая зарплата для образованного специалиста.",
    "hours": 8,
    "hunger": -20,
    "happiness": -5,
    "reputation": 2,
    "connections": 1,
    "min": 24000,
    "max": 36000,
    "req": {
      "career": 3,
      "education": 35
    },
    "health": -4
  },
  {
    "id": "director",
    "cat": "work",
    "icon": "👔",
    "name": "Работа директором",
    "desc": "Очень высокий рублёвый доход и рост влияния.",
    "hours": 9,
    "hunger": -22,
    "happiness": -8,
    "reputation": 4,
    "connections": 3,
    "influence": 2,
    "min": 75000,
    "max": 115000,
    "req": {
      "career": 5,
      "education": 60,
      "reputation": 35
    },
    "health": -6
  },
  {
    "id": "usd_freelance",
    "cat": "work",
    "icon": "🌐",
    "name": "Заказ для иностранца",
    "desc": "Удалённая подработка с оплатой в долларах.",
    "hours": 7,
    "hunger": -18,
    "happiness": -5,
    "reputation": 2,
    "min": 450,
    "max": 700,
    "currency": "USD",
    "req": {
      "career": 3,
      "education": 35
    },
    "health": -4
  },
  {
    "id": "usd_contract",
    "cat": "work",
    "icon": "💼",
    "name": "Зарубежный контракт",
    "desc": "Крупный контракт на иностранную компанию.",
    "hours": 10,
    "hunger": -24,
    "happiness": -9,
    "reputation": 4,
    "connections": 3,
    "min": 1400,
    "max": 2200,
    "currency": "USD",
    "req": {
      "career": 5,
      "education": 65,
      "reputation": 30
    },
    "health": -7
  },
  {
    "id": "rest",
    "cat": "health",
    "icon": "🪑",
    "name": "Отдохнуть на лавке",
    "desc": "Самый слабый бесплатный способ немного прийти в себя.",
    "hours": 2,
    "hunger": -6,
    "health": 2,
    "happiness": 2
  },
  {
    "id": "first_aid",
    "cat": "health",
    "icon": "🩹",
    "name": "Сходить в бесплатный медпункт",
    "desc": "Базовая бесплатная медицинская помощь.",
    "hours": 4,
    "health": 5,
    "happiness": -2,
    "hunger": -4
  },
  {
    "id": "sleep",
    "cat": "health",
    "icon": "😴",
    "name": "Поспать",
    "desc": "Восстановиться и пропустить значительную часть дня.",
    "hours": 8,
    "hunger": -18,
    "health": 8,
    "happiness": 5
  },
  {
    "id": "wash_up",
    "cat": "health",
    "icon": "🚰",
    "name": "Умыться и привести себя в порядок",
    "desc": "Простая гигиена и небольшое платное восстановление.",
    "hours": 1,
    "health": 10,
    "happiness": 6,
    "cost": 150,
    "hunger": -3
  },
  {
    "id": "shower",
    "cat": "health",
    "icon": "🚿",
    "name": "Принять горячий душ",
    "desc": "Снять усталость и улучшить самочувствие.",
    "hours": 2,
    "health": 14,
    "happiness": 9,
    "cost": 500,
    "hunger": -4
  },
  {
    "id": "sport",
    "cat": "health",
    "icon": "🏃",
    "name": "Тренировка",
    "desc": "Укрепить организм, потратив сытость и деньги.",
    "hours": 3,
    "hunger": -12,
    "health": 18,
    "happiness": 6,
    "cost": 1500,
    "req": {
      "health": 35
    }
  },
  {
    "id": "medicine",
    "cat": "health",
    "icon": "💊",
    "name": "Купить лекарства",
    "desc": "Заметно восстановить здоровье.",
    "hours": 1,
    "health": 25,
    "cost": 4000,
    "hunger": -2,
    "happiness": -1
  },
  {
    "id": "dentist",
    "cat": "health",
    "icon": "🦷",
    "name": "Посетить стоматолога",
    "desc": "Дорогое лечение накопившихся проблем.",
    "hours": 4,
    "health": 36,
    "happiness": -3,
    "cost": 12000,
    "req": {
      "career": 2
    },
    "hunger": -6
  },
  {
    "id": "clinic",
    "cat": "health",
    "icon": "🏥",
    "name": "Пройти лечение в клинике",
    "desc": "Самое сильное восстановление здоровья.",
    "hours": 5,
    "health": 55,
    "happiness": -4,
    "cost": 30000,
    "req": {
      "career": 1
    },
    "hunger": -8
  },
  {
    "id": "music",
    "cat": "fun",
    "icon": "🎧",
    "name": "Послушать музыку",
    "desc": "Бесплатно и ненадолго отвлечься.",
    "hours": 1,
    "hunger": -3,
    "happiness": 7,
    "health": -1
  },
  {
    "id": "park",
    "cat": "fun",
    "icon": "🌳",
    "name": "Погулять в парке",
    "desc": "Спокойно провести время на свежем воздухе.",
    "hours": 2,
    "hunger": -5,
    "happiness": 11,
    "health": -1
  },
  {
    "id": "internet_cafe",
    "cat": "fun",
    "icon": "🖥️",
    "name": "Посидеть в интернет-кафе",
    "desc": "Отдохнуть, посмотреть видео и немного поучиться.",
    "hours": 2,
    "hunger": -7,
    "happiness": 16,
    "education": 1,
    "cost": 500,
    "health": -2
  },
  {
    "id": "cinema",
    "cat": "fun",
    "icon": "🎬",
    "name": "Сходить в кино",
    "desc": "Хорошо отвлечься от повседневных проблем.",
    "hours": 3,
    "hunger": -8,
    "happiness": 22,
    "cost": 1500,
    "health": -2
  },
  {
    "id": "bowling",
    "cat": "fun",
    "icon": "🎳",
    "name": "Сходить в боулинг",
    "desc": "Активный отдых и возможность познакомиться с людьми.",
    "hours": 4,
    "hunger": -10,
    "happiness": 28,
    "connections": 1,
    "cost": 5000,
    "req": {
      "career": 2
    },
    "health": -3
  },
  {
    "id": "club",
    "cat": "fun",
    "icon": "🎉",
    "name": "Сходить в клуб",
    "desc": "Яркий вечер, эмоции и новые знакомства.",
    "hours": 5,
    "hunger": -14,
    "happiness": 35,
    "connections": 2,
    "cost": 12000,
    "req": {
      "career": 3
    },
    "health": -7
  },
  {
    "id": "concert",
    "cat": "fun",
    "icon": "🎵",
    "name": "Сходить на концерт",
    "desc": "Большое событие с сильным ростом настроения.",
    "hours": 6,
    "hunger": -16,
    "happiness": 43,
    "popularity": 2,
    "cost": 30000,
    "req": {
      "career": 4
    },
    "health": -5
  },
  {
    "id": "travel",
    "cat": "fun",
    "icon": "✈️",
    "name": "Отправиться в путешествие",
    "desc": "Самое сильное развлечение с бонусом к репутации.",
    "hours": 14,
    "hunger": -24,
    "happiness": 55,
    "reputation": 5,
    "cost": 100000,
    "req": {
      "career": 5
    },
    "health": -3
  },
  {
    "id": "newspaper",
    "cat": "education",
    "icon": "📰",
    "name": "Почитать бесплатную газету",
    "desc": "Самый простой способ немного повысить кругозор.",
    "hours": 2,
    "hunger": -4,
    "happiness": 0,
    "education": 2,
    "health": -1
  },
  {
    "id": "free_lesson",
    "cat": "education",
    "icon": "✏️",
    "name": "Посетить бесплатный урок",
    "desc": "Получить базовые знания без оплаты.",
    "hours": 3,
    "hunger": -6,
    "happiness": -2,
    "education": 4,
    "health": -2
  },
  {
    "id": "library",
    "cat": "education",
    "icon": "📚",
    "name": "Заниматься в библиотеке",
    "desc": "Регулярно читать и развивать образование.",
    "hours": 4,
    "hunger": -8,
    "happiness": -3,
    "education": 6,
    "health": -2
  },
  {
    "id": "evening_classes",
    "cat": "education",
    "icon": "📝",
    "name": "Ходить на вечерние курсы",
    "desc": "Получить больше практических знаний.",
    "hours": 5,
    "hunger": -10,
    "education": 8,
    "cost": 1500,
    "health": -3,
    "happiness": -4
  },
  {
    "id": "course",
    "cat": "education",
    "icon": "🧑‍💻",
    "name": "Пройти онлайн-курс",
    "desc": "Быстро повысить квалификацию.",
    "hours": 6,
    "hunger": -12,
    "education": 10,
    "cost": 5000,
    "health": -3,
    "happiness": -4
  },
  {
    "id": "certificate",
    "cat": "education",
    "icon": "📜",
    "name": "Получить профессиональный сертификат",
    "desc": "Подтвердить знания и улучшить репутацию.",
    "hours": 7,
    "hunger": -14,
    "education": 13,
    "reputation": 2,
    "cost": 15000,
    "req": {
      "career": 2,
      "education": 25
    },
    "health": -4,
    "happiness": -5
  },
  {
    "id": "college",
    "cat": "education",
    "icon": "🏫",
    "name": "Учиться в колледже",
    "desc": "Серьёзное образование для стабильной карьеры.",
    "hours": 8,
    "hunger": -17,
    "education": 16,
    "reputation": 2,
    "cost": 40000,
    "req": {
      "education": 12
    },
    "health": -5,
    "happiness": -6
  },
  {
    "id": "university",
    "cat": "education",
    "icon": "🎓",
    "name": "Учиться в университете",
    "desc": "Самый сильный рост образования и полезных связей.",
    "hours": 10,
    "hunger": -22,
    "education": 20,
    "reputation": 3,
    "connections": 2,
    "cost": 100000,
    "req": {
      "career": 3,
      "education": 32
    },
    "health": -7,
    "happiness": -8
  },
  {
    "id": "short_post",
    "cat": "media",
    "icon": "✍️",
    "name": "Написать пост о своей жизни",
    "desc": "Поделиться короткой историей и получить первых читателей.",
    "hours": 1,
    "hunger": -3,
    "happiness": -1,
    "popularity": 2,
    "health": -1
  },
  {
    "id": "trash_blog",
    "cat": "media",
    "icon": "📱",
    "name": "Вести уличный блог",
    "desc": "Регулярно рассказывать о жизни и пути наверх.",
    "hours": 2,
    "hunger": -5,
    "happiness": -2,
    "reputation": -1,
    "popularity": 3,
    "health": -2
  },
  {
    "id": "comments",
    "cat": "media",
    "icon": "💬",
    "name": "Ответить подписчикам",
    "desc": "Поддерживать общение и удерживать внимание аудитории.",
    "hours": 2,
    "hunger": -6,
    "happiness": -3,
    "popularity": 4,
    "req": {
      "education": 5
    },
    "health": -2
  },
  {
    "id": "metro_show",
    "cat": "media",
    "icon": "🎭",
    "name": "Уличное выступление",
    "desc": "Выступить у метро и привлечь прохожих.",
    "hours": 3,
    "hunger": -8,
    "happiness": -2,
    "reputation": -1,
    "popularity": 5,
    "health": -3
  },
  {
    "id": "volunteer",
    "cat": "media",
    "icon": "🙋",
    "name": "Стать волонтёром",
    "desc": "Помогать людям и становиться узнаваемее.",
    "hours": 4,
    "hunger": -10,
    "happiness": 3,
    "reputation": 5,
    "popularity": 6,
    "health": -3
  },
  {
    "id": "district_channel",
    "cat": "media",
    "icon": "📢",
    "name": "Завести районный канал",
    "desc": "Публиковать новости и истории своего района.",
    "hours": 4,
    "hunger": -10,
    "popularity": 8,
    "connections": 1,
    "cost": 1000,
    "req": {
      "education": 8
    },
    "health": -3,
    "happiness": -3
  },
  {
    "id": "useful_video",
    "cat": "media",
    "icon": "🎥",
    "name": "Снять полезное видео",
    "desc": "Качественный ролик повышает доверие и охваты.",
    "hours": 5,
    "hunger": -12,
    "popularity": 10,
    "reputation": 3,
    "cost": 4000,
    "req": {
      "education": 15
    },
    "health": -4,
    "happiness": -4
  },
  {
    "id": "local_interview",
    "cat": "media",
    "icon": "🎙️",
    "name": "Дать интервью паблику",
    "desc": "Рассказать местным о своём пути и планах.",
    "hours": 5,
    "hunger": -12,
    "popularity": 12,
    "reputation": 3,
    "connections": 2,
    "cost": 10000,
    "req": {
      "career": 2,
      "reputation": 8
    },
    "health": -4,
    "happiness": -5
  },
  {
    "id": "charity",
    "cat": "media",
    "icon": "💛",
    "name": "Провести благотворительную акцию",
    "desc": "Получить доверие людей и большой охват.",
    "hours": 5,
    "hunger": -13,
    "happiness": 4,
    "reputation": 8,
    "popularity": 15,
    "cost": 30000,
    "req": {
      "career": 4
    },
    "health": -4
  },
  {
    "id": "district_event",
    "cat": "media",
    "icon": "🎪",
    "name": "Организовать районное мероприятие",
    "desc": "Собрать много людей и получить новые связи.",
    "hours": 7,
    "hunger": -16,
    "happiness": -5,
    "popularity": 18,
    "reputation": 6,
    "connections": 4,
    "cost": 75000,
    "req": {
      "career": 4
    },
    "health": -6
  },
  {
    "id": "blogger_ads",
    "cat": "media",
    "icon": "🚀",
    "name": "Купить рекламу у крупных блогеров",
    "desc": "Самый быстрый и дорогой рост известности.",
    "hours": 3,
    "popularity": 24,
    "reputation": 2,
    "cost": 200000,
    "req": {
      "career": 4
    },
    "health": -2,
    "hunger": -5,
    "happiness": -3
  },
  {
    "id": "residents_meeting",
    "cat": "politics",
    "icon": "🏘️",
    "name": "Посетить собрание жителей",
    "desc": "Обсудить проблемы района и получить первый политический опыт.",
    "hours": 3,
    "hunger": -6,
    "connections": 1,
    "popularity": 1,
    "influence": 1,
    "req": {
      "career": 2
    },
    "health": -2,
    "happiness": -2
  },
  {
    "id": "public_appeal",
    "cat": "politics",
    "icon": "📨",
    "name": "Подать обращение в администрацию",
    "desc": "Добиться решения небольшой городской проблемы.",
    "hours": 3,
    "hunger": -6,
    "reputation": 2,
    "popularity": 2,
    "influence": 2,
    "req": {
      "education": 20
    },
    "health": -2,
    "happiness": -2
  },
  {
    "id": "campaign_helper",
    "cat": "politics",
    "icon": "🗂️",
    "name": "Помочь в политическом штабе",
    "desc": "Получить опыт организации кампаний.",
    "hours": 5,
    "hunger": -10,
    "connections": 3,
    "popularity": 3,
    "influence": 3,
    "req": {
      "career": 4
    },
    "health": -3,
    "happiness": -3
  },
  {
    "id": "networking",
    "cat": "politics",
    "icon": "🤝",
    "name": "Провести деловую встречу",
    "desc": "Найти полезных союзников и повысить влияние.",
    "hours": 4,
    "hunger": -9,
    "connections": 5,
    "reputation": 3,
    "popularity": 4,
    "influence": 4,
    "cost": 5000,
    "req": {
      "career": 3
    },
    "health": -3,
    "happiness": -3
  },
  {
    "id": "party",
    "cat": "politics",
    "icon": "🏛️",
    "name": "Вступить в партию",
    "desc": "Сделать первый серьёзный политический шаг.",
    "hours": 5,
    "hunger": -11,
    "reputation": 4,
    "connections": 6,
    "popularity": 5,
    "influence": 5,
    "cost": 20000,
    "req": {
      "career": 5,
      "reputation": 25
    },
    "health": -4,
    "happiness": -4
  },
  {
    "id": "public_hearing",
    "cat": "politics",
    "icon": "🏫",
    "name": "Организовать общественные слушания",
    "desc": "Провести встречу жителей и представителей власти.",
    "hours": 6,
    "hunger": -13,
    "reputation": 5,
    "connections": 7,
    "popularity": 7,
    "influence": 7,
    "cost": 60000,
    "req": {
      "career": 5
    },
    "health": -5,
    "happiness": -5
  },
  {
    "id": "speech",
    "cat": "politics",
    "icon": "🎤",
    "name": "Провести публичное выступление",
    "desc": "Заметно увеличить известность и политическое влияние.",
    "hours": 6,
    "hunger": -15,
    "popularity": 10,
    "reputation": 6,
    "connections": 8,
    "influence": 9,
    "cost": 150000,
    "req": {
      "career": 5,
      "reputation": 30
    },
    "health": -6,
    "happiness": -6
  },
  {
    "id": "campaign",
    "cat": "politics",
    "icon": "📣",
    "name": "Провести крупную агитацию",
    "desc": "Запустить масштабную политическую кампанию.",
    "hours": 8,
    "hunger": -18,
    "popularity": 15,
    "influence": 12,
    "cost": 400000,
    "req": {
      "career": 6
    },
    "health": -7,
    "happiness": -8
  },
  {
    "id": "debate",
    "cat": "politics",
    "icon": "🗣️",
    "name": "Участвовать в национальных дебатах",
    "desc": "Рискованное действие с крупной политической наградой.",
    "hours": 8,
    "hunger": -18,
    "custom": "debate",
    "cost": 900000,
    "req": {
      "career": 7,
      "education": 65
    },
    "health": -8,
    "happiness": -10
  },
  {
    "id": "election",
    "cat": "politics",
    "icon": "🗳️",
    "name": "Начать президентские выборы",
    "desc": "Трёхэтапная кампания с риском проиграть и попасть под санкции.",
    "hours": 12,
    "custom": "election",
    "cost": 2000000,
    "req": {
      "career": 8,
      "popularity": 70,
      "reputation": 60,
      "influence": 55,
      "connections": 50
    },
    "health": -10,
    "hunger": -24,
    "happiness": -12
  }
];

const careers = [
  {name:'Бомж',icon:'🪙',desc:'Ни жилья, ни работы, ни нормальной еды. Надо выжить.',req:()=>true,need:'Начальная ступень'},
  {name:'Бомж с подработками',icon:'🧹',desc:'Вы всё ещё бомж, но уже находите регулярные подработки.',req:s=>s.totalEarned>=5000,need:'Заработать всего 5 000 ₽'},
  {name:'Рабочий',icon:'🛒',desc:'Появились постоянная работа и крыша над головой.',req:s=>s.totalEarned>=25000&&s.homeId!=='street',need:'Заработать 25 000 ₽ и выбраться с улицы'},
  {name:'Специалист',icon:'💻',desc:'Теперь платят не только за спину, но и за мозги.',req:s=>s.education>=30&&s.reputation>=8,need:'Образование 30, репутация 8'},
  {name:'Предприниматель',icon:'🏪',desc:'Вы начинаете зарабатывать на собственных проектах и активах.',req:s=>s.totalEarned>=150000&&s.education>=40,need:'Заработать 150 000 ₽, образование 40'},
  {name:'Влиятельный бизнесмен',icon:'👔',desc:'У вас есть капитал, связи и серьёзное влияние в городе.',req:s=>s.reputation>=30&&s.connections>=20,need:'Репутация 30, связи 20'},
  {name:'Муниципальный депутат',icon:'🏙️',desc:'Вы добрались до власти и начали собирать электорат.',req:s=>s.influence>=15&&s.popularity>=20,need:'Влияние 15, популярность 20'},
  {name:'Губернатор',icon:'🏛️',desc:'Вы управляете регионом и готовитесь к вершине.',req:s=>s.influence>=40&&s.popularity>=50&&s.reputation>=50,need:'Влияние 40, популярность 50, репутация 50'},
  {name:'Кандидат в президенты',icon:'🗳️',desc:'Осталось выиграть национальные выборы.',req:s=>s.influence>=60&&s.popularity>=70&&s.connections>=50,need:'Влияние 60, популярность 70, связи 50'},
  {name:'Президент',icon:'⭐',desc:'Вы прошли путь от бомжа до главы государства.',req:s=>s.president,need:'Победить на выборах'}
];

const homes = [
  {id:'street',icon:'📦',name:'Место под мостом',price:0,daily:0,health:-4,desc:'Бесплатно, но некомфортно и вредно для здоровья.'},
  {id:'shelter',icon:'🛏️',name:'Ночлежка',price:1500,daily:150,health:1,desc:'Тесно и шумно, зато есть крыша над головой.'},
  {id:'room',icon:'🚪',name:'Комната в общежитии',price:18000,daily:750,health:3,desc:'Своя дверь, кровать и шанс нормально выспаться.'},
  {id:'flat',icon:'🏢',name:'Квартира',price:120000,daily:2200,health:5,desc:'Собственная квартира с базовым комфортом.'},
  {id:'house',icon:'🏡',name:'Загородный дом',price:650000,daily:6000,health:7,desc:'Просторный дом для обеспеченного человека.'},
  {id:'residence',icon:'🏰',name:'Президентская резиденция',price:3000000,daily:18000,health:10,desc:'Максимальный комфорт будущего президента.'}
];

const assets = [
  {id:'deposit',icon:'🏦',name:'Банковский вклад',price:25000,income:220,desc:'Надёжный небольшой доход.'},
  {id:'stocks',icon:'📊',name:'Портфель акций',price:60000,income:650,desc:'Доход меняется каждый день.'},
  {id:'business',icon:'🏪',name:'Малый бизнес',price:250000,income:4200,desc:'Серьёзный пассивный доход.'},
  {id:'company',icon:'🏭',name:'Компания',price:900000,income:16000,desc:'Большой доход и влияние.',req:{career:6}}
];

const events = [
  {id:'wallet',icon:'👛',title:'Кошелёк на тротуаре',text:'Внутри 5 000 ₽ и визитка владельца.',choices:[
    {text:'Забрать деньги',effect:s=>chance(.72,
      ()=>{s.rubles+=5000;s.reputation-=4;return 'Вы забрали 5 000 ₽. Никто не заметил, но репутация пострадала.'},
      ()=>{s.rubles=Math.max(0,s.rubles-2500);s.reputation-=8;return 'Вас заметила камера. Пришлось вернуть деньги и заплатить 2 500 ₽.'})},
    {text:'Найти владельца',effect:s=>chance(.68,
      ()=>{s.reputation+=7;s.connections+=3;s.rubles+=1500;return 'Владелец дал 1 500 ₽ награды и полезный контакт.'},
      ()=>{s.happiness-=4;return 'Вы потратили полдня, но владельца так и не нашли.'})}
  ]},
  {id:'illness',icon:'🤒',title:'Сильная простуда',text:'Температура растёт, а завтра важный день.',choices:[
    {text:'Купить лекарства за 700 ₽',can:s=>s.rubles>=700,effect:s=>chance(.82,
      ()=>{s.rubles-=700;s.health+=14;return 'Лекарства быстро поставили вас на ноги.'},
      ()=>{s.rubles-=700;s.health-=5;return 'Лекарство не подошло, здоровье ухудшилось.'})},
    {text:'Перетерпеть',effect:s=>chance(.28,
      ()=>{s.health+=3;s.happiness+=4;return 'Организм справился сам. Вы даже почувствовали прилив сил.'},
      ()=>{s.health-=16;return 'Болезнь сильно вас подкосила.'})}
  ]},
  {id:'viral_video',icon:'📸',title:'Ролик разлетается по сети',text:'Видео с вами внезапно набирает сотни тысяч просмотров.',choices:[
    {text:'Подхватить хайп',effect:s=>chance(.70,
      ()=>{s.popularity+=12;s.reputation+=2;return 'Вы грамотно использовали хайп: популярность резко выросла.'},
      ()=>{s.popularity+=4;s.reputation-=7;return 'Хайп обернулся травлей. Вас узнали, но репутация просела.'})},
    {text:'Сохранить серьёзный образ',effect:s=>chance(.62,
      ()=>{s.reputation+=7;s.popularity+=4;return 'Люди оценили вашу сдержанность.'},
      ()=>{s.popularity-=3;s.happiness-=5;return 'Аудитория быстро потеряла интерес.'})}
  ]},
  {id:'police',icon:'🚓',title:'Проверка документов',text:'Полиция требует документы и задаёт неудобные вопросы.',choices:[
    {text:'Спокойно сотрудничать',effect:s=>chance(.80,
      ()=>{s.reputation+=2;return 'Проверка закончилась без проблем.'},
      ()=>{s.rubles=Math.max(0,s.rubles-1200);s.happiness-=6;return 'Нашёлся старый штраф: списано 1 200 ₽.'})},
    {text:'Спорить',effect:s=>chance(.32,
      ()=>{s.popularity+=5;s.reputation+=1;return 'Прохожие сняли спор, и публика встала на вашу сторону.'},
      ()=>{s.reputation-=6;s.rubles=Math.max(0,s.rubles-3000);return 'Спор закончился штрафом 3 000 ₽.'})}
  ]},
  {id:'dog',icon:'🐕',title:'Потерявшаяся собака',text:'На ошейнике дорогой адрес и номер телефона.',choices:[
    {text:'Отвести хозяину',effect:s=>chance(.78,
      ()=>{s.rubles+=4000;s.reputation+=6;s.connections+=2;return 'Хозяин дал 4 000 ₽ и пообещал помочь.'},
      ()=>{s.health-=3;return 'Собака укусила вас по дороге.'})},
    {text:'Оставить себе',effect:s=>chance(.45,
      ()=>{s.happiness+=15;s.reputation+=2;return 'Пёс стал верным другом и поднял настроение.'},
      ()=>{s.rubles=Math.max(0,s.rubles-2500);s.happiness-=6;return 'Пришлось оплатить лечение и вернуть собаку владельцу.'})}
  ]},
  {id:'laptop',icon:'💻',title:'Слишком дешёвый ноутбук',text:'Незнакомец предлагает ноутбук за 8 000 ₽.',when:s=>s.rubles>=8000,choices:[
    {text:'Купить',effect:s=>chance(.58,
      ()=>{s.rubles-=8000;s.education+=8;s.happiness+=6;return 'Ноутбук оказался рабочим. Учиться стало гораздо проще.'},
      ()=>{s.rubles-=8000;s.happiness-=10;return 'Внутри оказался кирпич. Вы потеряли 8 000 ₽.'})},
    {text:'Отказаться',effect:s=>chance(.75,
      ()=>{s.reputation+=1;return 'Вы не согласились на сомнительную сделку.'},
      ()=>{s.happiness-=4;return 'Позже выяснилось, что ноутбук был настоящим и очень выгодным.'})}
  ]},
  {id:'dollar_rumor',icon:'💱',title:'Слухи о курсе доллара',text:'В сети спорят: завтра доллар резко вырастет или рухнет.',choices:[
    {text:'Поверить в рост',effect:s=>chance(.52,
      ()=>{s.exchangeRateBias=2;s.happiness+=5;return 'Прогноз выглядит убедительно. На следующий день рынок будет сильнее тянуться вверх.'},
      ()=>{s.exchangeRateBias=-1;s.happiness-=5;return 'Аналитики нашли ошибку в слухе. На следующий день рынок скорее потянется вниз.'})},
    {text:'Поверить в падение',effect:s=>chance(.52,
      ()=>{s.exchangeRateBias=-2;s.happiness+=4;return 'Прогноз на падение подтвердился. На следующий день рынок будет тянуться вниз.'},
      ()=>{s.exchangeRateBias=1;s.happiness-=4;return 'Прогноз оказался сомнительным. На следующий день рынок скорее пойдёт вверх.'})}
  ]},
  {id:'foreign_client',icon:'🌍',title:'Клиент из-за границы',text:'Вам предлагают срочную работу с оплатой в долларах.',when:s=>s.education>=25,choices:[
    {text:'Взяться за заказ',effect:s=>chance(Math.min(.85,.45+s.education/200),
      ()=>{const pay=random(45,110);s.dollars+=pay;s.totalDollarEarned+=pay;s.reputation+=2;return `Заказ принят: заработано $${pay}.`},
      ()=>{s.reputation-=4;return 'Вы сорвали срок и получили плохой отзыв.'})},
    {text:'Передать знакомому',effect:s=>chance(.65,
      ()=>{s.connections+=5;s.dollars+=15;s.totalDollarEarned+=15;return 'Знакомый поделился $15 и теперь должен вам услугу.'},
      ()=>{s.connections-=3;s.reputation-=2;return 'Знакомый провалил заказ и обвинил вас.'})}
  ]},
  {id:'investor',icon:'🦈',title:'Сомнительный инвестор',text:'Человек в дорогом костюме предлагает вложить 25 000 ₽ в перспективный проект.',when:s=>s.rubles>=25000,choices:[
    {text:'Вложиться',effect:s=>chance(.44,
      ()=>{s.rubles+=15000;s.totalEarned+=15000;s.connections+=3;return 'Схема сработала: чистая прибыль 15 000 ₽.'},
      ()=>{s.rubles-=25000;s.reputation-=3;return 'Инвестор исчез вместе с 25 000 ₽.'})},
    {text:'Проверить и отказаться',effect:s=>chance(.70,
      ()=>{s.reputation+=4;s.education+=2;return 'Вы нашли признаки мошенничества и избежали потерь.'},
      ()=>{s.happiness-=5;return 'На этот раз сделка была настоящей. Вы упустили прибыль.'})}
  ]},
  {id:'journalist',icon:'📰',title:'Журналист ищет сенсацию',text:'Вам предлагают большое интервью о пути со дна.',when:s=>s.careerIndex>=4,choices:[
    {text:'Рассказать всё честно',effect:s=>chance(.67,
      ()=>{s.popularity+=10;s.reputation+=7;return 'Честная история вызвала уважение.'},
      ()=>{s.popularity+=5;s.reputation-=8;return 'Ваши старые поступки вырвали из контекста.'})},
    {text:'Приукрасить историю',effect:s=>chance(.48,
      ()=>{s.popularity+=16;s.reputation+=2;return 'Красивая легенда отлично зашла публике.'},
      ()=>{s.reputation-=15;s.popularity-=5;return 'Журналист нашёл ложь и выпустил разоблачение.'})}
  ]},
  {id:'tax_audit',icon:'🧾',title:'Налоговая проверка',text:'Инспектор заинтересовался вашими активами.',when:s=>Object.values(s.assets||{}).some(v=>v>0),choices:[
    {text:'Показать документы',effect:s=>chance(.74,
      ()=>{s.reputation+=4;return 'Документы оказались в порядке.'},
      ()=>{const fine=Math.min(s.rubles,12000);s.rubles-=fine;return `Нашли ошибку. Штраф: ${fmt(fine)} ₽.`})},
    {text:'Попытаться договориться',effect:s=>chance(.42,
      ()=>{s.rubles=Math.max(0,s.rubles-5000);s.connections+=3;return 'За 5 000 ₽ проверка внезапно закончилась.'},
      ()=>{const fine=Math.min(s.rubles,30000);s.rubles-=fine;s.reputation-=10;return `Попытка провалилась. Штраф ${fmt(fine)} ₽ и удар по репутации.`})}
  ]},
  {id:'street_fight',icon:'🥊',title:'Драка у магазина',text:'Двое напали на прохожего. Вокруг никто не вмешивается.',choices:[
    {text:'Вмешаться',effect:s=>chance(.46,
      ()=>{s.reputation+=9;s.popularity+=5;s.health-=4;return 'Вы помогли человеку и стали местным героем.'},
      ()=>{s.health-=18;s.rubles=Math.max(0,s.rubles-1500);return 'Вас избили и забрали часть денег.'})},
    {text:'Позвать полицию',effect:s=>chance(.72,
      ()=>{s.reputation+=4;s.connections+=1;return 'Полиция приехала вовремя.'},
      ()=>{s.happiness-=7;s.reputation-=2;return 'Полиция приехала слишком поздно.'})}
  ]},
  {id:'protest',icon:'📢',title:'Стихийный митинг',text:'Толпа требует перемен, камеры уже включены.',when:s=>s.careerIndex>=6,choices:[
    {text:'Выступить перед толпой',effect:s=>chance(Math.min(.82,.4+s.popularity/200+s.education/300),
      ()=>{s.popularity+=12;s.influence+=6;return 'Речь стала главным событием дня.'},
      ()=>{s.popularity-=8;s.reputation-=6;return 'Толпа освистала вас.'})},
    {text:'Дистанцироваться',effect:s=>chance(.60,
      ()=>{s.reputation+=4;s.influence+=2;return 'Вы сохранили образ спокойного политика.'},
      ()=>{s.popularity-=6;return 'Избиратели решили, что вы боитесь народа.'})}
  ]},
  {id:'sanctions_rumor',icon:'🚫',title:'Угроза санкций',text:'Иностранные СМИ обсуждают ограничения против ваших компаний.',when:s=>s.careerIndex>=6,choices:[
    {text:'Вывести часть денег в доллары',effect:s=>chance(.57,
      ()=>{const purchaseRate=s.exchangeRate+2;const gain=Math.min(250,Math.floor(s.rubles/purchaseRate*.15));s.rubles-=Math.round(gain*purchaseRate);s.dollars+=gain;return `Удалось защитить капитал: куплено $${gain} по курсу ${purchaseRate.toFixed(2)} ₽.`},
      ()=>{s.exchangeRateBias=2;s.reputation-=3;return 'Перевод завис. На следующий день рынок получит сильный импульс к росту.'})},
    {text:'Оставить всё в рублях',effect:s=>chance(.55,
      ()=>{s.reputation+=5;return 'Угроза оказалась пустой, а ваш спокойный ответ оценили.'},
      ()=>{const loss=Math.min(s.rubles,40000);s.rubles-=loss;s.influence-=5;return `Ограничения ударили по счетам: потеряно ${fmt(loss)} ₽.`})}
  ]}
];



const difficultyModes = {
  easy:{name:'Лёгкая',income:1.20,cost:.82,decay:.78,eventRisk:.82,interview:12,deathHours:36},
  normal:{name:'Нормальная',income:1,cost:1,decay:1,eventRisk:1,interview:0,deathHours:24},
  hard:{name:'Сложная',income:.86,cost:1.20,decay:1.18,eventRisk:1.15,interview:-10,deathHours:24},
  survival:{name:'Выживание',income:.72,cost:1.42,decay:1.35,eventRisk:1.30,interview:-18,deathHours:24}
};

const chaptersV2 = [
  {name:'Бомж',icon:'🧔',goal:'Купите любое жильё и устройтесь на постоянную работу.',check:s=>true},
  {name:'Работяга',icon:'🧑‍🔧',goal:'Получите образование 20, развейте силу, интеллект или харизму до 25 и накопите 150 000 ₽.',check:s=>s.homeId!=='street'&&!!s.currentJob},
  {name:'Специалист',icon:'🧑‍💼',goal:'Откройте собственный бизнес.',check:s=>s.education>=20&&Math.max(s.strength,s.intelligence,s.charisma)>=25&&s.rubles>=150000},
  {name:'Предприниматель',icon:'🏪',goal:'Достигните репутации 35, связей 25 и популярности 25.',check:s=>Object.keys(s.businesses||{}).length>0},
  {name:'Влиятельный человек',icon:'👔',goal:'Получите политическую должность не ниже депутата и влияние 40.',check:s=>s.reputation>=35&&s.connections>=25&&s.popularity>=25},
  {name:'Политик',icon:'🏛️',goal:'Достигните популярности 70, влияния 60 и навыка политики 45.',check:s=>s.currentJob?.branch==='politics'&&s.currentJob.level>=3&&s.influence>=40},
  {name:'Кандидат в президенты',icon:'🗳️',goal:'Выиграйте президентские выборы.',check:s=>s.popularity>=70&&s.influence>=60&&s.politicsSkill>=45},
  {name:'Президент',icon:'⭐',goal:'Вы прошли основной путь игры.',check:s=>s.president}
];


function legacyCareerChapterV22(step){
  const n=Math.max(0,Number(step)||0);
  return Math.min(6,Math.max(0,n-1));
}
function jobSalaryV22(job,branchId){
  if(!job)return 0;
  const branch=careerBranchesV2[branchId];
  let pay=Number(job.salary||0)*difficultyCfg().income;
  if(branch){
    const skill=Number(state[branch.skill]||0);
    pay*=1+Math.min(.45,skill*.005);
  }
  if(branchId==='office'&&state.inventory?.suit)pay*=1.08;
  if(branchId==='it'&&state.inventory?.laptop)pay*=1.12;
  return Math.max(0,Math.round(pay));
}
function estimatedAssetIncomeV22(){
  return assets.reduce((sum,item)=>sum+(Number(state.assets?.[item.id])||0)*Math.round(item.income*difficultyCfg().income),0);
}
function estimatedBusinessIncomeV22(){
  return Object.entries(state.businesses||{}).reduce((sum,[id,owned])=>{
    const business=businessCatalogV2.find(x=>x.id===id);
    return sum+(business?businessIncomeV2(business,owned):0);
  },0);
}

const itemCatalog = [
  {id:'backpack',icon:'🎒',name:'Прочный рюкзак',price:7000,desc:'Доход от сбора бутылок и раздачи листовок +15%.'},
  {id:'phone',icon:'📱',name:'Смартфон',price:18000,desc:'Медиа-действия дают на 20% больше популярности.'},
  {id:'bike',icon:'🚲',name:'Велосипед',price:45000,desc:'Курьерская работа приносит на 30% больше.'},
  {id:'laptop',icon:'💻',name:'Ноутбук',price:120000,desc:'Открывает IT-собеседования и усиливает долларовые заказы.'},
  {id:'suit',icon:'🤵',name:'Деловой костюм',price:85000,desc:'Повышает шанс собеседований и результат выборов.'},
  {id:'car',icon:'🚗',name:'Автомобиль',price:900000,desc:'Долгие городские действия занимают на 1 час меньше.'},
  {id:'medkit',icon:'🩹',name:'Аптечка',price:20000,desc:'Расходник: мгновенно восстанавливает 25 здоровья.',consumable:true}
];

const careerBranchesV2 = {
  labor:{name:'Физический труд',icon:'🛠️',skill:'strength',jobs:[
    {name:'Грузчик',salary:5500,req:{strength:5,health:40}},
    {name:'Строитель',salary:13000,req:{strength:18,reputation:5}},
    {name:'Мастер',salary:29000,req:{strength:32,reputation:15}},
    {name:'Бригадир',salary:60000,req:{strength:45,charisma:20,connections:15}}
  ]},
  office:{name:'Офис',icon:'👔',skill:'charisma',jobs:[
    {name:'Курьер',salary:7000,req:{health:40}},
    {name:'Продавец',salary:15000,req:{education:12,charisma:8}},
    {name:'Менеджер',salary:34000,req:{education:28,charisma:22,reputation:10}},
    {name:'Директор',salary:85000,req:{education:50,charisma:38,reputation:30,connections:20}}
  ]},
  it:{name:'IT',icon:'💻',skill:'intelligence',jobs:[
    {name:'Стажёр',salary:15000,req:{item:'laptop',education:20,intelligence:15}},
    {name:'Программист',salary:42000,req:{item:'laptop',education:35,intelligence:30}},
    {name:'Ведущий разработчик',salary:100000,req:{education:55,intelligence:50,reputation:18}},
    {name:'Технический директор',salary:220000,req:{intelligence:70,charisma:25,connections:25}}
  ]},
  media:{name:'Медиа',icon:'📣',skill:'charisma',jobs:[
    {name:'Уличный блогер',salary:10000,req:{item:'phone',charisma:10}},
    {name:'Районный блогер',salary:28000,req:{popularity:18,charisma:24}},
    {name:'Известный блогер',salary:75000,req:{popularity:45,reputation:20,charisma:40}},
    {name:'Медиаменеджер',salary:160000,req:{popularity:70,charisma:58,connections:30}}
  ]},
  politics:{name:'Политика',icon:'🏛️',skill:'politicsSkill',jobs:[
    {name:'Активист',salary:12000,req:{reputation:12,charisma:12}},
    {name:'Помощник депутата',salary:32000,req:{connections:18,politicsSkill:15}},
    {name:'Депутат',salary:80000,req:{popularity:30,reputation:30,politicsSkill:30}},
    {name:'Губернатор',salary:180000,req:{influence:40,popularity:50,politicsSkill:50,connections:40}}
  ]}
};

const charactersV2 = [
  {id:'misha',icon:'🧔‍♂️',name:'Миша',desc:'Знакомый с улицы. Помнит, с чего вы начинали.',chapter:0},
  {id:'anna',icon:'👩‍⚕️',name:'Анна',desc:'Сотрудница ночлежки и волонтёр.',chapter:0},
  {id:'sergey',icon:'👨‍💼',name:'Сергей',desc:'Первый серьёзный работодатель.',chapter:1},
  {id:'irina',icon:'👩‍🏫',name:'Ирина',desc:'Преподаватель и карьерный наставник.',chapter:1},
  {id:'oleg',icon:'🧑‍💼',name:'Олег',desc:'Предприниматель, который любит риск.',chapter:3},
  {id:'marina',icon:'👩‍💻',name:'Марина',desc:'Журналист. Может помочь или выпустить компромат.',chapter:4},
  {id:'viktor',icon:'🧑‍⚖️',name:'Виктор',desc:'Опытный депутат и партийный переговорщик.',chapter:5},
  {id:'roman',icon:'🎤',name:'Роман',desc:'Главный политический соперник.',chapter:5}
];

const businessCatalogV2 = [
  {id:'stall',icon:'🥤',name:'Торговая точка',price:350000,income:9000,req:{chapter:2,entrepreneurship:8}},
  {id:'carwash',icon:'🚿',name:'Автомойка',price:850000,income:22000,req:{chapter:2,entrepreneurship:18}},
  {id:'cafeBiz',icon:'☕',name:'Кафе',price:1800000,income:48000,req:{chapter:2,entrepreneurship:28}},
  {id:'deliveryBiz',icon:'📦',name:'Служба доставки',price:4200000,income:115000,req:{chapter:4,entrepreneurship:42}},
  {id:'itBiz',icon:'🖥️',name:'IT-компания',price:10000000,income:280000,req:{chapter:4,entrepreneurship:60,intelligence:55,item:'laptop'}}
];

function normalizeBusinessV2(owned){
  owned.level=Math.max(1,Math.min(5,Number(owned.level)||1));
  owned.lastProfit=Math.max(0,Number(owned.lastProfit)||0);
  delete owned.staff;
  delete owned.advertising;
  delete owned.marketing;
  delete owned.lastCustomers;
  delete owned.lastRevenue;
  delete owned.lastExpenses;
  return owned;
}
function businessIncomeV2(b,owned){
  return Math.round(b.income*normalizeBusinessV2(owned).level*difficultyCfg().income);
}
function businessUpgradeCostV2(b,owned){
  const level=normalizeBusinessV2(owned).level;
  return level>=5?0:scaledCost(Math.round(b.price*(.35+level*.20)));
}

const endingCatalogV2 = [
  {id:'stable',icon:'🏠',name:'Стабильная жизнь'},
  {id:'specialist',icon:'🎓',name:'Известный специалист'},
  {id:'tycoon',icon:'🏢',name:'Владелец империи'},
  {id:'media',icon:'📺',name:'Медиамагнат'},
  {id:'governor',icon:'🏛️',name:'Губернатор'},
  {id:'president',icon:'⭐',name:'Президент'},
  {id:'survivor',icon:'🛡️',name:'100 дней выживания'},
  {id:'death',icon:'☠️',name:'Смерть'}
];

const workEventsV2 = [
  {title:'Лишняя смена',text:'Начальник просит остаться после работы.',choices:[
    {text:'Согласиться',run:()=>{const p=Math.round(jobSalaryV22(state.currentJob,state.currentJob?.branch)*.45);earn(p);addValue('health',-6);addValue('hunger',-8);addValue('happiness',-6);state.jobExperience+=3;return `Вы получили ${fmt(p)} ₽ и дополнительный опыт.`}},
    {text:'Отказаться',run:()=>{if(Math.random()<.35)state.jobWarnings++;else state.happiness=clamp(state.happiness+3);return state.jobWarnings?'Начальник выписал предупреждение.':'Начальник спокойно принял отказ.'}}
  ]},
  {title:'Ошибка коллеги',text:'Вы заметили ошибку, которая может дорого обойтись компании.',choices:[
    {text:'Исправить молча',run:()=>{state.jobExperience+=4;state.reputation=clamp(state.reputation+2);return 'Вы спасли проект и получили уважение коллег.'}},
    {text:'Доложить начальнику',run:()=>{if(Math.random()<.55){state.jobExperience+=5;state.connections=clamp(state.connections+2);return 'Начальник оценил вашу внимательность.'}state.happiness=clamp(state.happiness-5);return 'Коллектив решил, что вы подставили коллегу.'}}
  ]},
  {title:'Сложный клиент',text:'Клиент устроил скандал и требует компенсацию.',choices:[
    {text:'Успокоить клиента',run:()=>{const ok=Math.random()<Math.min(.9,.45+state.charisma/160);if(ok){state.reputation=clamp(state.reputation+3);state.jobExperience+=3;return 'Вы решили конфликт без потерь.'}state.jobWarnings++;return 'Клиент пожаловался руководству — предупреждение.'}},
    {text:'Позвать начальника',run:()=>{state.happiness=clamp(state.happiness-2);return 'Проблему решили без вас, но опыта вы не получили.'}}
  ]},
  {title:'Лишняя сдача',text:'Клиент случайно переплатил 8 000 ₽.',choices:[
    {text:'Вернуть',run:()=>{state.reputation=clamp(state.reputation+5);state.jobExperience+=2;return 'Честность заметили и запомнили.'}},
    {text:'Оставить',run:()=>{if(Math.random()<.55){earn(8000);return 'Вы оставили деньги себе, и никто не заметил.'}state.jobWarnings++;state.reputation=clamp(state.reputation-7);return 'Обман раскрыли — предупреждение и падение репутации.'}}
  ]}
];

// One action for every current job; all original 69 actions stay unchanged.
actions.push({id:'job_shift',cat:'work',icon:'🕘',name:'Выйти на смену',desc:'Отработать смену на текущей должности.',hours:8,custom:'job_shift'});
const electionActionV2=actions.find(a=>a.id==='election');if(electionActionV2)electionActionV2.req={chapter:6,popularity:70,reputation:55,influence:55,connections:45,politicsSkill:45};

let state = loadState();
let selectedCategory = 'food';
let toastTimer;
let suppressRandomEvent = false;

function freshState(){
  return {
    ...defaultState,
    assets:{},
    criticalHours:{...defaultState.criticalHours},
    criticalActive:{...defaultState.criticalActive}
  };
}
function loadState(){
  try {
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    const merged={
      ...freshState(),
      ...saved,
      assets:{...(saved.assets||{})},
      criticalHours:{...defaultState.criticalHours,...(saved.criticalHours||{})},
      criticalActive:{...defaultState.criticalActive,...(saved.criticalActive||{})}
    };
    delete merged.energy;
    delete merged.foodUsesToday;
    return merged;
  } catch { return freshState(); }
}
function saveState(){ delete state.energy; delete state.foodUsesToday; localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
function haptic(type='light'){ tg?.HapticFeedback?.impactOccurred?.(type); }
function showToast(text){
  const el=document.getElementById('toast'); el.textContent=text; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2200);
}
const fatalStats = {
  health:{name:'здоровье',reason:'критического состояния'},
  hunger:{name:'сытость',reason:'голода'},
  happiness:{name:'счастье',reason:'полной потери воли к жизни'}
};
function syncCriticalStates(){
  if(state.gameOver) return [];
  const newlyCritical=[];
  for(const key of Object.keys(fatalStats)){
    if(state[key]<=0){
      if(!state.criticalActive[key]){
        state.criticalActive[key]=true;
        state.criticalHours[key]=0;
        newlyCritical.push(key);
      }
    }else{
      state.criticalActive[key]=false;
      state.criticalHours[key]=0;
    }
  }
  return newlyCritical;
}
function criticalWarningText(keys){
  const names=keys.map(key=>fatalStats[key].name).join(', ');
  return `Показатель «${names}» достиг нуля. Если он непрерывно останется на нуле следующие ${CRITICAL_LIMIT_HOURS} игровых часа, персонаж умрёт.`;
}
function showCriticalWarning(keys){
  if(!keys.length||state.gameOver) return;
  openModal('⚠️','Смертельная опасность',criticalWarningText(keys),[]);
}
function advanceCriticalTimers(hours){
  if(state.gameOver||hours<=0) return;
  for(const key of Object.keys(fatalStats)){
    if(state.criticalActive[key]&&state[key]<=0){
      state.criticalHours[key]=Math.min(CRITICAL_LIMIT_HOURS,(Number(state.criticalHours[key])||0)+hours);
      if(state.criticalHours[key]>=CRITICAL_LIMIT_HOURS){
        endGame(key);
        return;
      }
    }
  }
}
function endGame(key){
  if(state.gameOver) return;
  state.gameOver=true;
  state.deathReason=fatalStats[key]?.reason||'тяжёлого состояния';
  state.deathDay=state.day;
  saveState();
  renderAll();
  showDeathScreen();
}
function showDeathScreen(){
  openModal('☠️','Игра окончена',`Персонаж умер из-за ${state.deathReason} на ${state.deathDay}-й день.`,[
    {text:'Начать новую игру',onClick:restartGame}
  ],{locked:true});
}
function restartGame(){
  localStorage.removeItem(STORAGE_KEY);
  state=freshState();
  document.getElementById('modalClose').hidden=false;
  closeModal(true);
  renderAll();
  showToast('Начата новая игра');
}
function requirementMet(req={}){
  if(req.health && state.health<req.health) return false;
  if(req.education && state.education<req.education) return false;
  if(req.reputation && state.reputation<req.reputation) return false;
  if(req.connections && state.connections<req.connections) return false;
  if(req.popularity && state.popularity<req.popularity) return false;
  if(req.influence && state.influence<req.influence) return false;
  if(req.rubles && state.rubles<req.rubles) return false;
  if(req.dollars && state.dollars<req.dollars) return false;
  if(req.career!==undefined && state.careerIndex<req.career) return false;
  return true;
}
function requirementText(req={}){
  const out=[];
  if(req.health) out.push(`здоровье ${req.health}`);
  if(req.education) out.push(`образование ${req.education}`);
  if(req.reputation) out.push(`репутация ${req.reputation}`);
  if(req.connections) out.push(`связи ${req.connections}`);
  if(req.popularity) out.push(`популярность ${req.popularity}`);
  if(req.influence) out.push(`влияние ${req.influence}`);
  if(req.rubles) out.push(`${fmt(req.rubles)} ₽`);
  if(req.dollars) out.push(`$${fmt(req.dollars)}`);
  if(req.career!==undefined) out.push(`карьера: ${careers[req.career].name}`);
  return out.join(', ');
}
function addValue(key,delta){ if(!delta) return; state[key]=clamp((state[key]||0)+delta); }
function spend(cost){ state.rubles-=cost; state.totalSpent+=cost; }
function earn(amount){ state.rubles+=amount; state.totalEarned+=amount; }
function earnDollars(amount){ state.dollars+=amount; state.totalDollarEarned+=amount; }
function buyUsdRate(){ return state.exchangeRate + 2; }
function sellUsdRate(){ return state.exchangeRate - 2; }
function buyUsdCost(amount=100){ return Math.ceil(buyUsdRate()*amount); }
function sellUsdRevenue(amount=100){ return Math.floor(sellUsdRate()*amount); }
function updateExchangeRate(){
  state.previousExchangeRate=state.exchangeRate;
  const randomChange=(Math.random()*6)-3;
  const dailyChangePercent=Math.max(-3,Math.min(3,randomChange+(Number(state.exchangeRateBias)||0)));
  state.exchangeRate=clampRate(state.exchangeRate*(1+dailyChangePercent/100));
  state.exchangeRateBias=0;
}
function exchangeTrend(){
  const diff=state.exchangeRate-state.previousExchangeRate;
  return diff>0.01?'up':diff<-0.01?'down':'flat';
}


function getExchangeAmount(){
  const input=document.getElementById('exchangeAmount');
  const amount=Math.floor(Number(input?.value)||0);
  return Math.max(1,Math.min(100000,amount));
}
function showExchangeWarningV22(text){
  const warning=document.getElementById('exchangeWarning');
  if(warning){
    warning.textContent=text;
    warning.hidden=false;
    warning.classList.remove('show');
    requestAnimationFrame(()=>warning.classList.add('show'));
  }else showToast(text);
  haptic('heavy');
}
function exchangeCurrency(direction){
  if(state.gameOver){showDeathScreen();return;}
  const amount=getExchangeAmount();
  if(direction==='buy'){
    const cost=buyUsdCost(amount);
    if(state.rubles<cost){showExchangeWarningV22(`Не хватает рублей: для покупки ${fmt(amount)} $ нужно ${fmt(cost)} ₽`);return;}
    state.rubles-=cost;
    state.dollars+=amount;
    showToast(`Куплено $${fmt(amount)} за ${fmt(cost)} ₽`);
  }else{
    if(state.dollars<amount){showExchangeWarningV22(`Не хватает долларов: для продажи нужно ${fmt(amount)} $`);return;}
    const revenue=sellUsdRevenue(amount);
    state.dollars-=amount;
    state.rubles+=revenue;
    showToast(`Продано $${fmt(amount)} за ${fmt(revenue)} ₽`);
  }
  state.actionsDone++;
  advanceTime(1);
  if(state.gameOver) return;
  saveState();
  renderAll();
  if(document.getElementById('modalTitle').textContent==='Обмен валют'){
    document.getElementById('modalText').textContent='';
    document.getElementById('modalChoices').innerHTML=exchangePanelHtml(amount);
  }
  haptic('medium');
}
function exchangePanelHtml(amount=10){
  return `<div class="exchange-simple">
    <div class="exchange-simple-rates">
      <span>Купить <strong>${buyUsdRate().toFixed(2)} ₽</strong></span>
      <span>Продать <strong>${sellUsdRate().toFixed(2)} ₽</strong></span>
    </div>
    <div class="exchange-simple-balance">${fmt(state.rubles)} ₽ &nbsp;·&nbsp; ${fmt(state.dollars)} $</div>
    <div class="exchange-warning" id="exchangeWarning" hidden></div>
    <div class="exchange-input-wrap"><span>$</span><input class="exchange-input" id="exchangeAmount" type="number" min="1" max="100000" step="1" value="${amount}" inputmode="numeric" aria-label="Количество долларов" /></div>
    <div class="exchange-actions">
      <button class="exchange-buy" data-exchange="buy">Купить</button>
      <button class="exchange-sell" data-exchange="sell">Продать</button>
    </div>
  </div>`;
}
function openExchangeMenu(){
  openModal('💱','Обмен валют','',[]);
  document.getElementById('modalChoices').innerHTML=exchangePanelHtml();
  setTimeout(()=>document.getElementById('exchangeAmount')?.select(),0);
}

function performAction(id){
  if(state.gameOver){showDeathScreen();return;}
  const a=actions.find(x=>x.id===id); if(!a) return;
  const availability=actionAvailability(a);
  if(availability.disabled){showToast(availability.reason);return;}
  if(a.custom){ performCustom(a); return; }

  if(a.cost) spend(a.cost);
  const reward=a.max?random(a.min||0,a.max):0;
  if(reward){ if(a.currency==='USD') earnDollars(reward); else earn(reward); }

  ['hunger','health','happiness','education','reputation','connections','popularity','influence'].forEach(k=>{
    addValue(k,a[k]||0);
  });

  advanceTime(a.hours||1);
  if(state.gameOver) return;
  state.actionsDone++;
  recalcCareer();
  saveState(); renderAll(); haptic();
  if(reward){
  }
}

function performCustom(a){
  if(a.cost && state.rubles<a.cost){showToast('Недостаточно рублей');return;}
  if(a.id==='debate'){
    spend(a.cost); ['hunger','health','happiness'].forEach(k=>addValue(k,a[k]||0)); const score=state.education+state.reputation+random(-25,25);
    if(score>105){state.popularity=clamp(state.popularity+15);state.influence=clamp(state.influence+8);showToast('Вы блестяще выиграли дебаты');}
    else{state.popularity=clamp(state.popularity-4);state.happiness=clamp(state.happiness-8);showToast('Дебаты прошли неудачно');}
    advanceTime(a.hours);
  }
  if(a.id==='election'){
    if(state.day<state.electionBanUntil){showToast(`Повторные выборы доступны с ${state.electionBanUntil}-го дня`);return;}
    spend(a.cost);
    ['hunger','health','happiness'].forEach(k=>addValue(k,a[k]||0));
    suppressRandomEvent=true;
    advanceTime(a.hours);
    suppressRandomEvent=false;
    if(state.gameOver) return;
    startElectionCampaign();
  }
  if(state.gameOver) return;
  state.actionsDone++; recalcCareer(); saveState(); renderAll(); haptic('medium');
}

function startElectionCampaign(){
  const campaign={bonus:0,history:[]};
  showElectionStageOne(campaign);
}
function showElectionStageOne(campaign){
  openModal('🗳️','Президентская кампания: старт','Штаб предлагает две стратегии. Каждая может сработать или обернуться скандалом.',[
    {text:'Честная кампания на репутации',onClick:()=>{
      const success=Math.random()<Math.min(.86,.48+state.reputation/220+state.education/500);
      if(success){campaign.bonus+=8;state.reputation=clamp(state.reputation+5);campaign.history.push('Честная кампания усилила доверие.');}
      else{campaign.bonus-=5;state.popularity=clamp(state.popularity-6);campaign.history.push('Программа показалась скучной, рейтинг упал.');}
      showElectionStageTwo(campaign);
    }},
    {text:'Чёрный пиар против соперника',onClick:()=>{
      const success=Math.random()<Math.min(.72,.38+state.influence/260+state.connections/300);
      if(success){campaign.bonus+=12;state.popularity=clamp(state.popularity+7);campaign.history.push('Компромат уничтожил рейтинг соперника.');}
      else{campaign.bonus-=10;state.reputation=clamp(state.reputation-12);campaign.history.push('Чёрный пиар раскрыли, начался скандал.');}
      showElectionStageTwo(campaign);
    }}
  ]);
}
function showElectionStageTwo(campaign){
  openModal('📺','Президентские дебаты','До голосования один день. Нужно выбрать стиль главных теледебатов.',[
    {text:'Давить фактами и программой',onClick:()=>{
      const success=Math.random()<Math.min(.88,.42+state.education/180+state.reputation/500);
      if(success){campaign.bonus+=10;state.popularity=clamp(state.popularity+5);campaign.history.push('Вы уверенно выиграли дебаты.');}
      else{campaign.bonus-=6;state.happiness=clamp(state.happiness-8);campaign.history.push('Вы запутались в цифрах и проиграли эфир.');}
      showElectionStageThree(campaign);
    }},
    {text:'Активно атаковать соперника',onClick:()=>{
      const success=Math.random()<Math.min(.74,.36+state.popularity/280+state.influence/350);
      if(success){campaign.bonus+=13;state.influence=clamp(state.influence+5);campaign.history.push('Атака заставила соперника оправдываться.');}
      else{campaign.bonus-=11;state.reputation=clamp(state.reputation-10);campaign.history.push('Агрессия оттолкнула умеренных избирателей.');}
      showElectionStageThree(campaign);
    }}
  ]);
}
function showElectionStageThree(campaign){
  openModal('📊','День голосования','Последний ход штаба может решить исход выборов.',[
    {text:'Мобилизовать своих сторонников',onClick:()=>{
      const success=Math.random()<Math.min(.90,.46+state.connections/240+state.influence/400);
      campaign.bonus+=success?9:-5;
      campaign.history.push(success?'Сторонники массово пришли на участки.':'Часть штабов сорвала мобилизацию.');
      finishElection(campaign);
    }},
    {text:'Убедить сомневающихся',onClick:()=>{
      const success=Math.random()<Math.min(.86,.42+state.popularity/260+state.reputation/400);
      campaign.bonus+=success?11:-7;
      campaign.history.push(success?'Последняя речь привлекла неопределившихся.':'Последняя речь не убедила сомневающихся.');
      finishElection(campaign);
    }}
  ]);
}
function finishElection(campaign){
  const base=state.popularity*.30+state.reputation*.20+state.influence*.25+state.connections*.15+state.education*.10;
  const voteShare=clamp(Math.round(35+(base-50)*.45+campaign.bonus*.7+random(-8,8)),15,78);
  if(voteShare>=50){
    state.president=true;state.careerIndex=9;state.reputation=clamp(state.reputation+10);state.influence=100;
    normalize();saveState();renderAll();
    openModal('⭐',`Победа — ${voteShare}% голосов`,`Вы прошли путь от бомжа до президента. ${campaign.history.join(' ')}`,[]);
  }else{
    applyElectionSanction(voteShare,campaign);
  }
}
function applyElectionSanction(voteShare,campaign){
  state.electionLosses++;
  const sanctions=[
    ()=>{const fine=Math.min(state.rubles,Math.max(50000,Math.round(state.rubles*.25)));state.rubles-=fine;state.electionBanUntil=state.day+7;return `Штаб обвинён в нарушениях: штраф ${fmt(fine)} ₽ и запрет на повторную кампанию на 7 дней.`;},
    ()=>{state.popularity=clamp(state.popularity-18);state.reputation=clamp(state.reputation-14);state.electionBanUntil=state.day+5;return 'После поражения началась медийная травля: популярность −18, репутация −14, повторные выборы через 5 дней.';},
    ()=>{const frozen=Math.floor(state.dollars*.30);state.dollars-=frozen;state.influence=clamp(state.influence-12);state.electionBanUntil=state.day+6;return `Иностранные счета попали под санкции: заморожено $${frozen}, влияние −12, повторные выборы через 6 дней.`;},
    ()=>{state.electionBanUntil=state.day+4;const owned=assets.filter(x=>(state.assets[x.id]||0)>0);if(owned.length){const item=owned[random(0,owned.length-1)];state.assets[item.id]--;return `Началась проверка бизнеса: один актив «${item.name}» конфискован. Новая кампания доступна через 4 дня.`;}const fine=Math.min(state.rubles,100000);state.rubles-=fine;return `Активов не нашли, но выписали штраф ${fmt(fine)} ₽. Новая кампания доступна через 4 дня.`;}
  ];
  const sanction=sanctions[random(0,sanctions.length-1)]();
  state.happiness=clamp(state.happiness-18);
  normalize();saveState();renderAll();
  openModal('🚫',`Поражение — ${voteShare}% голосов`,`Выборы проиграны. ${campaign.history.join(' ')} ${sanction}`,[]);
}

function advanceTime(hours){
  if(state.gameOver) return;
  let remaining=Math.max(0,Number(hours)||0);
  let crossedDay=false;
  let newCritical=syncCriticalStates();
  while(remaining>0&&!state.gameOver){
    const untilMidnight=24-state.hour;
    const step=Math.min(remaining,untilMidnight);
    advanceCriticalTimers(step);
    if(state.gameOver) return;
    state.hour+=step;
    remaining-=step;
    if(state.hour>=24){
      state.hour=0;
      nextDay();
      crossedDay=true;
      newCritical=[...new Set([...newCritical,...syncCriticalStates()])];
    }
  }
  newCritical=[...new Set([...newCritical,...syncCriticalStates()])];
  if(state.gameOver) return;
  if(newCritical.length){
    newCritical.forEach(key=>state.criticalHours[key]=0);
    showCriticalWarning(newCritical);
  }else if(crossedDay&&!suppressRandomEvent&&Math.random()<.42){
    setTimeout(()=>{if(!state.gameOver)triggerRandomEvent();},250);
  }
}
function nextDay(){
  state.day++; state.daysSurvived=state.day;
  state.hunger=clamp(state.hunger-18);
  state.happiness=clamp(state.happiness-3);
  const home=homes.find(x=>x.id===state.homeId)||homes[0];
  state.health=clamp(state.health+home.health);
  if(home.daily){
    if(state.rubles>=home.daily) spend(home.daily);
    else {state.homeId='street';showToast('Не хватило денег на жильё — вы снова живёте под мостом');}
  }
  updateExchangeRate();
  let passive=0;
  for(const item of assets){
    const count=state.assets[item.id]||0;
    if(count){
      let factor=item.id==='stocks'?(Math.random()*.9+.55):1;
      passive+=Math.round(item.income*count*factor);
    }
  }
  if(passive) earn(passive);
  if(state.hunger<=0){state.health=clamp(state.health-18);state.happiness=clamp(state.happiness-10);}
}
function recalcCareer(){
  let index=0;
  careers.forEach((c,i)=>{if(c.req(state)) index=i;});
  if(index>state.careerIndex){state.careerIndex=index;showToast(`Новая ступень: ${careers[index].name}`);}
}

function buyHome(id){
  if(state.gameOver){showDeathScreen();return;}
  const home=homes.find(x=>x.id===id); if(!home||id==='street') return;
  if(state.rubles<home.price){showToast('Недостаточно рублей');return;}
  spend(home.price);state.homeId=id;state.reputation=clamp(state.reputation+Math.max(1,homes.indexOf(home)));
  saveState();renderAll();haptic('medium');showToast(`Новое жильё: ${home.name}`);
}
function buyAsset(id){
  if(state.gameOver){showDeathScreen();return;}
  const item=assets.find(x=>x.id===id);if(!item)return;
  if(item.req&&!requirementMet(item.req)){showToast(`Нужно: ${requirementText(item.req)}`);return;}
  if(state.rubles<item.price){showToast('Недостаточно рублей');return;}
  spend(item.price);state.assets[id]=(state.assets[id]||0)+1;
  if(id==='company'){state.influence=clamp(state.influence+8);state.connections=clamp(state.connections+5);}
  saveState();renderAll();haptic('medium');showToast(`${item.name} приобретён`);
}

function triggerRandomEvent(){
  let pool=events.filter(ev=>(!ev.when||ev.when(state))&&ev.id!==state.lastEventId);
  if(!pool.length) pool=events.filter(ev=>!ev.when||ev.when(state));
  const ev=pool[random(0,pool.length-1)];
  state.lastEventId=ev.id;
  openModal(ev.icon,ev.title,ev.text,ev.choices.map(c=>({
    text:c.text,disabled:c.can&&!c.can(state),onClick:()=>{
      const result=c.effect(state);normalize();const newlyCritical=syncCriticalStates();saveState();renderAll();openModal('🎲','Итог события',newlyCritical.length?`${result}

⚠️ ${criticalWarningText(newlyCritical)}`:result,[]);
    }
  })));
}
function normalize(){
  ['health','hunger','happiness','education','reputation','connections','popularity','influence'].forEach(k=>state[k]=clamp(state[k]));
  state.rubles=Math.max(0,state.rubles);state.dollars=Math.max(0,state.dollars);
  state.criticalHours={...defaultState.criticalHours,...(state.criticalHours||{})};
  state.criticalActive={...defaultState.criticalActive,...(state.criticalActive||{})};
  Object.keys(fatalStats).forEach(k=>state.criticalHours[k]=Math.max(0,Math.min(CRITICAL_LIMIT_HOURS,Number(state.criticalHours[k])||0)));
  state.exchangeRate=clampRate(Number(state.exchangeRate)||92);state.previousExchangeRate=clampRate(Number(state.previousExchangeRate)||state.exchangeRate);state.exchangeRateBias=Math.max(-2,Math.min(2,Number(state.exchangeRateBias)||0));recalcCareer();
}

function openModal(icon,title,text,choices=[],options={}){
  document.getElementById('modalIcon').textContent=icon;
  document.getElementById('modalTitle').textContent=title;
  document.getElementById('modalText').textContent=text;
  const box=document.getElementById('modalChoices');box.innerHTML='';
  choices.forEach(c=>{
    const b=document.createElement('button');b.className='modal-choice';b.textContent=c.text;b.disabled=!!c.disabled;b.onclick=c.onClick;box.appendChild(b);
  });
  document.getElementById('modalClose').hidden=!!options.locked;
  document.getElementById('modalBackdrop').classList.remove('hidden');
}
function closeModal(force=false){
  if(state.gameOver&&!force) return;
  document.getElementById('modalBackdrop').classList.add('hidden');
  document.getElementById('modalClose').hidden=false;
}

function renderAll(){normalize();renderHeader();renderHome();renderActions();renderCareer();renderAssets();renderProfile();saveState();}
function compactHudNumber(value){
  const n=Math.max(0,Number(value)||0);
  const compact=(amount,suffix)=>{
    const decimals=amount>=100?0:amount>=10?1:2;
    let text=amount.toFixed(decimals);
    if(decimals)text=text.replace(/0+$/,'').replace(/\.$/,'');
    return `${text.replace('.',',')} ${suffix}`;
  };
  if(n>=1_000_000_000)return compact(n/1_000_000_000,'млрд');
  if(n>=1_000_000)return compact(n/1_000_000,'млн');
  if(n>=10_000)return compact(n/1_000,'тыс.');
  return fmt(Math.round(n));
}
function renderHeader(){
  document.getElementById('dayLabel').textContent=state.day;
  document.getElementById('timeLabel').textContent=`${String(state.hour).padStart(2,'0')}:00`;
  const rubles=document.getElementById('hudRublesValue');
  const dollars=document.getElementById('hudDollarsValue');
  if(rubles)rubles.textContent=compactHudNumber(state.rubles);
  if(dollars)dollars.textContent=compactHudNumber(state.dollars);
  const rublesChip=document.getElementById('hudRublesChip');
  const dollarsChip=document.getElementById('hudDollarsChip');
  if(rublesChip)rublesChip.title=`Рубли: ${fmt(state.rubles)} ₽`;
  if(dollarsChip)dollarsChip.title=`Доллары: $${fmt(state.dollars)}`;
  const hudStats={health:['hudHealthValue','hudHealthBar'],hunger:['hudHungerValue','hudHungerBar'],happiness:['hudHappinessValue','hudHappinessBar']};
  Object.entries(hudStats).forEach(([key,[valueId,barId]])=>{
    const value=Math.round(state[key]);
    const valueEl=document.getElementById(valueId);
    const barEl=document.getElementById(barId);
    const chip=document.querySelector(`[data-hud-stat="${key}"]`);
    if(valueEl)valueEl.textContent=value;
    if(barEl)barEl.style.width=`${value}%`;
    if(chip){
      chip.classList.remove('critical','warning');
      chip.classList.toggle('bad',value<25);
      chip.classList.toggle('good',value>75);
      chip.setAttribute('aria-label',`${key==='health'?'Здоровье':key==='hunger'?'Сытость':'Счастье'}: ${value}`);
    }
  });
}
function rankData(){
  const c=careers[state.careerIndex];
  if(state.president)return {avatar:'🤵',badge:'Президент',title:'Глава государства',text:'Бывший бомж теперь управляет всей страной.'};
  const data=[
    ['🧔','Бомж','Бомж','Ищите еду, просите помощи и постарайтесь выбраться с улицы.'],
    ['🧹','Подработки','Бомж с подработками','Вы всё ещё живёте очень скромно, но уже умеете зарабатывать.'],
    ['🧑','Работа','Рабочий','Крыша есть. Теперь пора строить стабильную жизнь.'],
    ['🧑‍💻','Офис','Специалист','Знания начинают приносить заметно больше дохода.'],
    ['🧑‍💼','Бизнес','Предприниматель','Покупайте активы и заставляйте капитал работать.'],
    ['👔','Бизнес','Влиятельный бизнесмен','У вас появились капитал, связи и влияние в городе.'],
    ['🏙️','Депутат','Муниципальный депутат','Набирайте популярность и двигайтесь выше во власть.'],
    ['🏛️','Губернатор','Губернатор региона','Укрепляйте позиции перед президентской кампанией.'],
    ['🗳️','Кандидат','Кандидат в президенты','Соберите сильную кампанию и выиграйте выборы.']
  ][Math.min(state.careerIndex,8)];
  return {avatar:data[0],badge:data[1],title:data[2],text:data[3]};
}
function renderHome(){
  const r=rankData();
  ['avatar','profileAvatar'].forEach(id=>document.getElementById(id).textContent=r.avatar);
  document.getElementById('rankBadge').textContent=r.badge;
  document.getElementById('statusTitle').textContent=r.title;
  document.getElementById('statusText').textContent=r.text;
  document.getElementById('rublesValue').textContent=`${fmt(state.rubles)} ₽`;
  document.getElementById('dollarsValue').innerHTML=`${fmt(state.dollars)} <i class="dollar-symbol">$</i>`;
  const trend=exchangeTrend();
  const rateEl=document.getElementById('exchangeRateValue');
  if(rateEl){rateEl.textContent=`${state.exchangeRate.toFixed(2)} ₽ ${trend==='up'?'▲':trend==='down'?'▼':'•'}`;rateEl.className=`rate-line ${trend}`;}
  const homeRate=document.getElementById('homeExchangeRate');
  if(homeRate){homeRate.textContent=`Купить ${buyUsdRate().toFixed(2)} ₽ · продать ${sellUsdRate().toFixed(2)} ₽ ${trend==='up'?'▲':trend==='down'?'▼':'•'}`;homeRate.className=`exchange-home-rate ${trend}`;}
  const stats=[['❤️','Здоровье','health'],['🍗','Сытость','hunger'],['😊','Счастье','happiness']];
  document.getElementById('statsList').innerHTML=stats.map(([i,n,k])=>`<div class="stat-row"><div class="stat-icon">${i}</div><div><div class="stat-name">${n}</div><div class="progress"><div class="progress-fill ${state[k]<25?'bad':state[k]>75?'good':''}" style="width:${state[k]}%"></div></div></div><div class="stat-value">${Math.round(state[k])}</div></div>`).join('');
  const hubHome=homes.find(h=>h.id===state.homeId)||homes[0];
  const hubItemCount=Object.values(state.inventory||{}).reduce((sum,count)=>sum+(Number(count)||0),0);
  const hubAssetCount=Object.values(state.assets||{}).reduce((sum,count)=>sum+(Number(count)||0),0);
  const hubHomeEl=document.getElementById('homeHubValue');if(hubHomeEl)hubHomeEl.textContent=hubHome.name;
  const hubItemsEl=document.getElementById('inventoryHubValue');if(hubItemsEl)hubItemsEl.textContent=hubItemCount?`Куплено: ${hubItemCount}`:'Нет предметов';
  const hubAssetsEl=document.getElementById('assetsHubValue');if(hubAssetsEl)hubAssetsEl.textContent=hubAssetCount?`Куплено: ${hubAssetCount}`:'Нет активов';
  const next=careers[Math.min(state.careerIndex+1,careers.length-1)];
  document.getElementById('goalTitle').textContent=next.name;
  document.getElementById('goalText').textContent=next.need;
  const percent=Math.min(100,Math.round((state.careerIndex/9)*100));
  document.getElementById('goalPercent').textContent=`${percent}%`;
  document.getElementById('goalBar').style.width=`${percent}%`;
}
function actionAvailability(a){
  if(!requirementMet(a.req)) return {disabled:true,reason:`Нужно: ${requirementText(a.req)}`};
  if(a.id==='election'&&state.president) return {disabled:true,reason:'Вы уже президент'};
  if(a.id==='election'&&state.day<state.electionBanUntil) return {disabled:true,reason:`Санкции действуют до ${state.electionBanUntil}-го дня`};
  if(a.cost&&state.rubles<a.cost) return {disabled:true,reason:'Не хватает рублей'};
  return {disabled:false,reason:''};
}
function actionMoney(a){
  if(a.max) return `+${a.currency==='USD'?'$':''}${fmt(a.min)}–${a.currency==='USD'?'$':''}${fmt(a.max)}${a.currency==='USD'?'':' ₽'}`;
  if(a.cost) return `−${fmt(a.cost)} ₽`;
  return 'Бесплатно';
}
function renderActions(){
  document.getElementById('categoryRow').innerHTML=categories.map(([id,icon,name])=>`<button class="category-chip ${selectedCategory===id?'active':''}" data-category="${id}">${icon} ${name}</button>`).join('');
  const list=actions.filter(a=>a.cat===selectedCategory);
  document.getElementById('actionsList').innerHTML=list.map(a=>{
    const availability=actionAvailability(a);const locked=!requirementMet(a.req);
    const effects=[];
    if(a.hours)effects.push(`🕒 ${a.hours} ч.`);
    const labels={hunger:'🍗',health:'❤️',happiness:'😊',education:'🎓',reputation:'⭐',connections:'🤝',popularity:'📣',influence:'🏛️'};
    Object.keys(labels).forEach(k=>{if(a[k])effects.push(`${labels[k]} ${a[k]>0?'+':''}${a[k]}`)});
    const subtitle=availability.disabled?availability.reason:a.desc;
    const cardClass=`action-card action-card-clickable ${availability.disabled?'unavailable':''}`;
    return `<article class="${cardClass}" data-action="${a.id}" role="button" tabindex="0" aria-disabled="${availability.disabled?'true':'false'}"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${a.icon}</div><div><div class="card-title">${a.name}</div><div class="card-subtitle">${subtitle}</div></div></div><div class="reward ${a.max?'positive':a.cost?'negative':''}">${actionMoney(a)}</div></div><div class="effects">${effects.map(x=>`<span class="effect">${x}</span>`).join('')}</div></article>`;
  }).join('');
}
function renderCareer(){
  const c=careers[state.careerIndex];
  document.getElementById('careerTitle').textContent=c.name;document.getElementById('careerText').textContent=c.desc;document.getElementById('careerIcon').textContent=c.icon;
  document.getElementById('careerTimeline').innerHTML=careers.map((x,i)=>`<article class="career-step ${i<state.careerIndex?'done':i===state.careerIndex?'current':''}"><div class="step-head"><div class="step-index">${i+1}</div><div class="step-name">${x.icon} ${x.name}</div><div class="step-state">${i<state.careerIndex?'ПРОЙДЕНО':i===state.careerIndex?'СЕЙЧАС':'ЗАКРЫТО'}</div></div><p class="step-requirements">${x.need}</p></article>`).join('');
}
function renderAssets(){
  const current=homes.find(x=>x.id===state.homeId)||homes[0];document.getElementById('homeLabel').textContent=current.name;
  document.getElementById('housingList').innerHTML=homes.map(h=>`<article class="buy-card"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${h.icon}</div><div><div class="card-title">${h.name}</div><div class="card-subtitle">${h.desc}<br>Расход в день: ${fmt(h.daily)} ₽</div></div></div><div class="price">${h.price?fmt(h.price)+' ₽':'Бесплатно'}</div></div>${h.id==='street'?'':`<button class="buy-button" data-home="${h.id}" ${state.homeId===h.id?'disabled':''}>${state.homeId===h.id?'Вы живёте здесь':'Купить'}</button>`}</article>`).join('');
  document.getElementById('assetList').innerHTML=assets.map(a=>{const count=state.assets[a.id]||0;const locked=a.req&&!requirementMet(a.req);return `<article class="buy-card"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${a.icon}</div><div><div class="card-title">${a.name} ${count?`×${count}`:''}</div><div class="card-subtitle">${locked?'Нужно: '+requirementText(a.req):a.desc}<br>Доход: около ${fmt(a.income)} ₽/день</div></div></div><div class="price">${fmt(a.price)} ₽</div></div><button class="buy-button" data-asset="${a.id}" ${locked||state.rubles<a.price?'disabled':''}>Купить</button></article>`}).join('');
}
function renderProfile(){
  document.getElementById('profileName').textContent=state.playerName;document.getElementById('profileRank').textContent=careers[state.careerIndex].name;
  const dev=[['🎓 Образование',state.education],['⭐ Репутация',state.reputation],['🤝 Связи',state.connections],['📣 Популярность',state.popularity],['🏛️ Влияние',state.influence],['📈 Ступень',`${state.careerIndex+1}/10`]];
  document.getElementById('developmentStats').innerHTML=dev.map(([n,v])=>`<div class="dev-card"><span>${n}</span><strong>${v}</strong></div>`).join('');
  const passive=assets.reduce((sum,a)=>sum+(state.assets[a.id]||0)*a.income,0);
  const rows=[['Дней прожито',state.daysSurvived],['Действий выполнено',state.actionsDone],['Всего заработано',`${fmt(state.totalEarned)} ₽`],['Заработано в долларах',`$${fmt(state.totalDollarEarned)}`],['Курс доллара',`база ${state.exchangeRate.toFixed(2)} ₽ · покупка ${buyUsdRate().toFixed(2)} ₽ · продажа ${sellUsdRate().toFixed(2)} ₽`],['Всего потрачено',`${fmt(state.totalSpent)} ₽`],['Поражений на выборах',state.electionLosses],['Санкции',state.day<state.electionBanUntil?`до ${state.electionBanUntil}-го дня`:'нет'],['Пассивный доход',`≈ ${fmt(passive)} ₽/день`],['Текущее жильё',(homes.find(h=>h.id===state.homeId)||homes[0]).name]];
  document.getElementById('gameStats').innerHTML=rows.map(([a,b])=>`<div class="info-row"><span>${a}</span><strong>${b}</strong></div>`).join('');
}

function syncFixedTopbar(){
  const topbar=document.querySelector('.topbar');
  if(!topbar)return;
  const height=Math.ceil(topbar.getBoundingClientRect().height);
  if(height>0)document.documentElement.style.setProperty('--fixed-topbar-height',`${height}px`);
  const categories=document.querySelector('[data-screen="actions"].active .category-row');
  if(categories){
    const categoryHeight=Math.ceil(categories.getBoundingClientRect().height);
    if(categoryHeight>0)document.documentElement.style.setProperty('--fixed-action-categories-height',`${categoryHeight}px`);
  }
}
window.addEventListener('resize',()=>requestAnimationFrame(syncFixedTopbar));

function switchScreen(target){
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.dataset.screen===target));
  const navTarget=['housing','inventory','investments'].includes(target)?'home':target;
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.target===navTarget));
  const titles={home:'Главная',actions:'Действия',career:'Карьера',housing:'Жильё',inventory:'Предметы',investments:'Активы',business:'Бизнес',profile:'Профиль'};
  document.getElementById('screenTitle').textContent=titles[target]||'Игра';requestAnimationFrame(syncFixedTopbar);window.scrollTo({top:0,behavior:'smooth'});haptic();
}

function initCategoryScroller(){
  const row=document.getElementById('categoryRow');
  if(!row||row.dataset.scrollReady==='1')return;
  row.dataset.scrollReady='1';

  let mouseDown=false;
  let dragging=false;
  let startX=0;
  let startScrollLeft=0;
  let suppressClickUntil=0;
  const DRAG_THRESHOLD=7;

  row.addEventListener('wheel',e=>{
    if(row.scrollWidth<=row.clientWidth)return;

    // A normal vertical mouse-wheel gesture must keep scrolling the page.
    // Horizontal category scrolling is used only for a real horizontal wheel
    // gesture (trackpad) or while Shift is held. The old handler converted
    // every vertical wheel movement into horizontal movement and blocked page
    // scrolling whenever the pointer was over the sticky category bar.
    const horizontalGesture=Math.abs(e.deltaX)>Math.abs(e.deltaY);
    if(!horizontalGesture&&!e.shiftKey)return;

    const delta=e.shiftKey&&!horizontalGesture?e.deltaY:e.deltaX;
    if(!delta)return;
    row.scrollLeft+=delta;
    e.preventDefault();
  },{passive:false});

  // Touch scrolling is handled natively by overflow-x:auto.
  // Mouse dragging starts only after the pointer moves far enough,
  // so an ordinary click on a category remains a normal click.
  row.addEventListener('mousedown',e=>{
    if(e.button!==0)return;
    mouseDown=true;
    dragging=false;
    startX=e.clientX;
    startScrollLeft=row.scrollLeft;
  });

  window.addEventListener('mousemove',e=>{
    if(!mouseDown)return;
    const distance=e.clientX-startX;
    if(!dragging&&Math.abs(distance)>=DRAG_THRESHOLD){
      dragging=true;
      row.classList.add('dragging');
    }
    if(!dragging)return;
    row.scrollLeft=startScrollLeft-distance;
    e.preventDefault();
  });

  const finishMouseDrag=()=>{
    if(!mouseDown)return;
    if(dragging)suppressClickUntil=Date.now()+180;
    mouseDown=false;
    dragging=false;
    row.classList.remove('dragging');
  };

  window.addEventListener('mouseup',finishMouseDrag);
  window.addEventListener('blur',finishMouseDrag);

  row.addEventListener('click',e=>{
    if(Date.now()<suppressClickUntil){
      e.preventDefault();
      e.stopPropagation();
    }
  },true);
}

document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-target]');if(nav){switchScreen(nav.dataset.target);return;}
  const go=e.target.closest('[data-go]');if(go){switchScreen(go.dataset.go);return;}
  const cat=e.target.closest('[data-category]');if(cat){selectedCategory=cat.dataset.category;renderActions();return;}
  const openExchange=e.target.closest('[data-open-exchange]');if(openExchange){openExchangeMenu();return;}
  const exchangeButton=e.target.closest('[data-exchange]');if(exchangeButton){exchangeCurrency(exchangeButton.dataset.exchange);return;}
  const act=e.target.closest('[data-action]');if(act){performAction(act.dataset.action);return;}
  const home=e.target.closest('[data-home]');if(home){buyHome(home.dataset.home);return;}
  const asset=e.target.closest('[data-asset]');if(asset){buyAsset(asset.dataset.asset);return;}
});

document.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target.matches('.action-card-clickable[data-action]')){
    e.preventDefault();
    performAction(e.target.dataset.action);
  }
});

document.getElementById('modalClose').onclick=closeModal;
document.getElementById('helpButton').onclick=()=>openModal('💡','Как играть','Начните бомжом, выживите и поднимитесь по карьерной лестнице. Энергии в игре нет: действия ограничены игровым временем. Если здоровье, сытость или счастье непрерывно останутся на нуле 24 игровых часа, персонаж умрёт. Курс доллара меняется каждый день: доллары можно заработать на зарубежных заказах, купить или продать через кнопку «Обмен валют» на главной странице. Случайные события всегда дают два рискованных решения. На уровне кандидата откроется президентская кампания из трёх этапов.',[]);
document.getElementById('resetButton').onclick=()=>openModal('⚠️','Начать заново?','Весь прогресс будет удалён.',[
  {text:'Удалить прогресс',onClick:restartGame}
]);

initCategoryScroller();
const initialCritical=syncCriticalStates();
renderAll();
if(state.gameOver) showDeathScreen();
else if(initialCritical.length) showCriticalWarning(initialCritical);


// ========================= v2.0 systems =========================
function difficultyCfg(){return difficultyModes[state.difficulty]||difficultyModes.normal;}
function v2DeathLimit(){return difficultyCfg().deathHours;}
function scaledCost(value){return Math.max(0,Math.round((Number(value)||0)*difficultyCfg().cost));}
function v2ClampSkill(v){return Math.max(0,Math.min(100,Number(v)||0));}

function freshState(){
  const s=JSON.parse(JSON.stringify(defaultState));
  s.playerName=tg?.initDataUnsafe?.user?.first_name||defaultState.playerName;
  charactersV2.forEach(c=>s.relations[c.id]=0);
  return s;
}
function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    const base=freshState();
    const merged={...base,...saved};
    merged.assets={...base.assets,...(saved.assets||{})};
    merged.inventory={...base.inventory,...(saved.inventory||{})};
    merged.businesses={...base.businesses,...(saved.businesses||{})};
    merged.relations={...base.relations,...(saved.relations||{})};
    merged.characterVisits={...base.characterVisits,...(saved.characterVisits||{})};
    merged.jobLevels={...base.jobLevels,...(saved.jobLevels||{})};
    merged.stories={...base.stories,...(saved.stories||{})};
    merged.pendingStories=Array.isArray(saved.pendingStories)?saved.pendingStories:[];
    merged.endings=Array.isArray(saved.endings)?saved.endings:[];
    merged.dayReports=Array.isArray(saved.dayReports)?saved.dayReports:[];
    merged.dayStartSnapshot=saved.dayStartSnapshot?{...base.dayStartSnapshot,...saved.dayStartSnapshot}:{rubles:Number(merged.rubles)||0,dollars:Number(merged.dollars)||0,health:Number(merged.health)||0,hunger:Number(merged.hunger)||0,happiness:Number(merged.happiness)||0};
    merged.criticalHours={...base.criticalHours,...(saved.criticalHours||{})};
    merged.criticalActive={...base.criticalActive,...(saved.criticalActive||{})};
    return merged;
  }catch{return freshState();}
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}

function chooseDifficulty(){
  openModal('🎮','Новая игра v2.6','Выберите сложность. Изменить её во время прохождения нельзя.',[
    {text:'Лёгкая — больше доходов и 36 часов до смерти',onClick:()=>setDifficulty('easy')},
    {text:'Нормальная — рекомендуемый баланс',onClick:()=>setDifficulty('normal')},
    {text:'Сложная — меньше доходы и опаснее события',onClick:()=>setDifficulty('hard')},
    {text:'Выживание — максимально жёсткая экономика',onClick:()=>setDifficulty('survival')}
  ],{locked:true});
}
function setDifficulty(id){
  state.difficulty=id;state.difficultyChosen=true;saveState();closeModal(true);renderAll();
  const legacy=localStorage.getItem(LEGACY_STORAGE_KEY);
  if(legacy){
    openModal('📦','Найдено сохранение v1.22','Можно перенести деньги, показатели, жильё и активы. Карьеры v2.0 начнутся заново.',[
      {text:'Перенести основу',onClick:importLegacyProgress},
      {text:'Начать полностью заново',onClick:()=>{closeModal(true);showToast('Начата новая игра v2.0')}}
    ]);
  }else showToast(`Сложность: ${difficultyCfg().name}`);
}
function importLegacyProgress(){
  try{
    const old=JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY)||'{}');
    ['rubles','dollars','exchangeRate','previousExchangeRate','health','hunger','happiness','education','reputation','connections','popularity','influence','day','hour','homeId','totalEarned','totalDollarEarned','totalSpent','actionsDone','daysSurvived'].forEach(k=>{if(old[k]!==undefined)state[k]=old[k]});
    state.assets={...(old.assets||{})};
    saveState();closeModal(true);renderAll();showToast('Основной прогресс v1.22 перенесён');
  }catch{showToast('Не удалось перенести сохранение');}
}
function restartGame(){localStorage.removeItem(STORAGE_KEY);state=freshState();closeModal(true);renderAll();setTimeout(chooseDifficulty,30);}

function requirementMet(req={}){
  if(req.health&&state.health<req.health)return false;
  if(req.education&&state.education<req.education)return false;
  if(req.reputation&&state.reputation<req.reputation)return false;
  if(req.connections&&state.connections<req.connections)return false;
  if(req.popularity&&state.popularity<req.popularity)return false;
  if(req.influence&&state.influence<req.influence)return false;
  if(req.strength&&state.strength<req.strength)return false;
  if(req.intelligence&&state.intelligence<req.intelligence)return false;
  if(req.charisma&&state.charisma<req.charisma)return false;
  if(req.entrepreneurship&&state.entrepreneurship<req.entrepreneurship)return false;
  if(req.politicsSkill&&state.politicsSkill<req.politicsSkill)return false;
  if(req.luck&&state.luck<req.luck)return false;
  if(req.chapter!==undefined&&state.chapterIndex<req.chapter)return false;
  if(req.item&&!state.inventory?.[req.item])return false;
  if(req.rubles&&state.rubles<req.rubles)return false;
  if(req.dollars&&state.dollars<req.dollars)return false;
  // Старые требования career теперь привязаны к главам v2, а не к удалённой карьерной лестнице v1.
  if(req.career!==undefined&&state.chapterIndex<legacyCareerChapterV22(req.career))return false;
  return true;
}
function requirementText(req={}){
  const out=[];
  const labels={health:'здоровье',education:'образование',reputation:'репутация',connections:'связи',popularity:'популярность',influence:'влияние',strength:'сила',intelligence:'интеллект',charisma:'харизма',entrepreneurship:'предпринимательство',politicsSkill:'политика',luck:'удача'};
  Object.keys(labels).forEach(k=>{if(req[k])out.push(`${labels[k]} ${req[k]}`)});
  if(req.chapter!==undefined)out.push(`глава: ${chaptersV2[req.chapter]?.name||req.chapter}`);
  if(req.item)out.push(`предмет: ${itemCatalog.find(x=>x.id===req.item)?.name||req.item}`);
  if(req.rubles)out.push(`${fmt(req.rubles)} ₽`);
  if(req.dollars)out.push(`$${fmt(req.dollars)}`);
  if(req.career!==undefined){
    const chapter=legacyCareerChapterV22(req.career);
    out.push(`глава: ${chaptersV2[chapter]?.name||chapter}`);
  }
  return [...new Set(out)].join(', ');
}

function recalcChapter(){
  let next=state.chapterIndex;
  while(next+1<chaptersV2.length&&chaptersV2[next+1].check(state)) next++;
  if(next>state.chapterIndex){state.chapterIndex=next;showToast(`Новая глава: ${chaptersV2[next].name}`);}
}
function skillGainForAction(a){
  const gain={};const base=Math.max(.5,Math.min(3,(a.hours||1)/3));
  const physical=['bottles','flyers','car_wash','loader','cleaner','courier','taxi'];
  const smart=['office','tutor','online_contract','foreign_contract'];
  if(a.cat==='work')gain[physical.includes(a.id)?'strength':smart.includes(a.id)?'intelligence':'charisma']=base;
  if(a.cat==='education')gain.intelligence=base*1.35;
  if(a.cat==='media')gain.charisma=base*1.2;
  if(a.cat==='politics'){gain.politicsSkill=base*1.25;gain.charisma=(gain.charisma||0)+base*.35;}
  if(a.id==='beg')gain.charisma=base;
  return gain;
}
function applySkillGains(gains={}){Object.entries(gains).forEach(([k,v])=>state[k]=v2ClampSkill((state[k]||0)+v));}
function relevantSkillForAction(a){
  if(a.cat==='education')return state.intelligence;
  if(a.cat==='media')return state.charisma;
  if(a.cat==='politics')return state.politicsSkill;
  if(a.cat==='work')return skillGainForAction(a).intelligence?state.intelligence:skillGainForAction(a).charisma?state.charisma:state.strength;
  return 0;
}
function effectiveActionHours(a){return Math.max(1,(a.hours||1)-(state.inventory?.car&&a.hours>=4&&a.cat!=='education'?1:0));}
function actionAvailability(a){
  if(!requirementMet(a.req))return{disabled:true,reason:`Нужно: ${requirementText(a.req)}`};
  if(a.id==='job_shift'&&!state.currentJob)return{disabled:true,reason:'Сначала устройтесь на работу во вкладке «Карьера»'};
  if(a.id==='election'&&state.president)return{disabled:true,reason:'Вы уже президент'};
  if(a.id==='election'&&state.chapterIndex<6)return{disabled:true,reason:'Сначала откройте главу «Кандидат в президенты»'};
  if(a.id==='election'&&state.day<state.electionBanUntil)return{disabled:true,reason:`Санкции действуют до ${state.electionBanUntil}-го дня`};
  const cost=scaledCost(a.cost||0);if(cost&&state.rubles<cost)return{disabled:true,reason:'Не хватает рублей'};
  return{disabled:false,reason:''};
}
function actionMoney(a){
  if(a.id==='job_shift'&&state.currentJob)return`+${fmt(jobSalaryV22(state.currentJob,state.currentJob.branch))} ₽`;
  if(a.max){const mult=difficultyCfg().income;return`+${a.currency==='USD'?'$':''}${fmt(Math.round(a.min*mult))}–${a.currency==='USD'?'$':''}${fmt(Math.round(a.max*mult))}${a.currency==='USD'?'':' ₽'}`;}
  if(a.cost)return`−${fmt(scaledCost(a.cost))} ₽`;
  return'Бесплатно';
}

function calculateReward(a){
  let reward=random(a.min||0,a.max||0)*difficultyCfg().income;
  reward*=1+Math.min(.45,relevantSkillForAction(a)*.0045);
  if(state.inventory?.backpack&&['bottles','flyers'].includes(a.id))reward*=1.15;
  if(state.inventory?.bike&&a.id==='courier')reward*=1.30;
  if(state.inventory?.laptop&&a.currency==='USD')reward*=1.25;
  return Math.max(0,Math.round(reward));
}
function adjustedDelta(a,key){
  let delta=Number(a[key])||0;
  if(delta<0)delta*=difficultyCfg().decay;
  if(a.cat==='work'&&key==='health'&&delta<0)delta*=Math.max(.68,1-state.strength*.0035);
  if(a.cat==='media'&&key==='popularity'&&delta>0&&state.inventory?.phone)delta*=1.20;
  return delta<0?Math.ceil(delta):Math.round(delta);
}
function performAction(id){
  if(state.gameOver){showDeathScreen();return;}
  const a=actions.find(x=>x.id===id);if(!a)return;
  const availability=actionAvailability(a);if(availability.disabled){showToast(availability.reason);return;}
  if(a.custom){performCustom(a);return;}
  const cost=scaledCost(a.cost||0);if(cost)spend(cost);
  const reward=a.max?calculateReward(a):0;
  if(reward){if(a.currency==='USD')earnDollars(reward);else earn(reward);}
  ['hunger','health','happiness','education','reputation','connections','popularity','influence'].forEach(k=>addValue(k,adjustedDelta(a,k)));
  const gains=skillGainForAction(a);applySkillGains(gains);
  advanceTime(effectiveActionHours(a));if(state.gameOver)return;
  state.actionsDone++;recalcCareer();recalcChapter();checkEndingsV2();saveState();renderAll();haptic();
  if(a.cat==='work'&&Math.random()<.22*difficultyCfg().eventRisk)setTimeout(()=>{if(document.getElementById('modalBackdrop').classList.contains('hidden'))triggerWorkEventV2();},220);
  // Успешные обычные действия не создают всплывающее уведомление.
}
function performCustom(a){
  if(a.id==='job_shift'){performJobShift();return;}
  const cost=scaledCost(a.cost||0);if(cost&&state.rubles<cost){showToast('Недостаточно рублей');return;}
  if(a.id==='debate'){
    spend(cost);['hunger','health','happiness'].forEach(k=>addValue(k,adjustedDelta(a,k)));
    const score=state.education+state.reputation+state.charisma*.45+state.politicsSkill*.55+random(-25,25);
    if(score>120){state.popularity=clamp(state.popularity+16);state.influence=clamp(state.influence+9);state.politicsSkill=v2ClampSkill(state.politicsSkill+2);showToast('Вы блестяще выиграли дебаты');}
    else{state.popularity=clamp(state.popularity-5);state.happiness=clamp(state.happiness-9);showToast('Дебаты прошли неудачно');}
    advanceTime(effectiveActionHours(a));
  }
  if(a.id==='election'){
    if(state.chapterIndex<6){showToast('Сначала откройте главу кандидата');return;}
    if(state.day<state.electionBanUntil){showToast(`Повторные выборы доступны с ${state.electionBanUntil}-го дня`);return;}
    spend(cost);['hunger','health','happiness'].forEach(k=>addValue(k,adjustedDelta(a,k)));
    suppressRandomEvent=true;advanceTime(effectiveActionHours(a));suppressRandomEvent=false;if(state.gameOver)return;startElectionCampaign();
  }
  if(state.gameOver)return;state.actionsDone++;recalcCareer();recalcChapter();saveState();renderAll();haptic('medium');
}

function performJobShift(){
  const job=state.currentJob;if(!job){showToast('Сначала устройтесь на работу');return;}
  const branch=careerBranchesV2[job.branch];
  const pay=jobSalaryV22(job,job.branch);earn(pay);
  const level=job.level;addValue('health',Math.ceil((-2-level*1.3)*difficultyCfg().decay));addValue('hunger',Math.ceil((-9-level*2)*difficultyCfg().decay));addValue('happiness',Math.ceil((-4-level)*difficultyCfg().decay));
  state.jobExperience+=2+level;state[branch.skill]=v2ClampSkill(state[branch.skill]+1+level*.25);
  advanceTime(state.inventory?.car?7:8);if(state.gameOver)return;
  state.actionsDone++;recalcChapter();saveState();renderAll();
  if(Math.random()<.28*difficultyCfg().eventRisk)setTimeout(triggerWorkEventV2,180);
  if(state.jobWarnings>=3){const lost=state.currentJob.name;state.currentJob=null;state.jobWarnings=0;state.jobExperience=0;openModal('📉','Увольнение',`После трёх предупреждений вы потеряли работу «${lost}».`,[]);}
}
function triggerWorkEventV2(){
  if(!state.currentJob||state.gameOver)return;const ev=workEventsV2[random(0,workEventsV2.length-1)];
  openModal('💼',ev.title,ev.text,ev.choices.map(c=>({text:c.text,onClick:()=>{const result=c.run();state.luck=v2ClampSkill(state.luck+.2);saveState();renderAll();openModal('📋','Итог рабочей ситуации',result,[]);}})));
}

function interviewJob(branchId,level){
  if(state.gameOver)return;const branch=careerBranchesV2[branchId],job=branch?.jobs[level-1];if(!job)return;
  if(!requirementMet(job.req)){showToast(`Нужно: ${requirementText(job.req)}`);return;}
  const relation=(state.relations.sergey||0)*.12+(state.relations.irina||0)*.08;
  const skill=state[branch.skill]||0;let probability=48+difficultyCfg().interview+skill*.45+state.charisma*.22+state.reputation*.18+relation;
  if(state.inventory?.suit)probability+=15;if((state.jobLevels[branchId]||0)>=level-1)probability+=7;
  probability=Math.max(12,Math.min(92,probability));
  advanceTime(state.inventory?.car?2:3);if(state.gameOver)return;
  if(Math.random()*100<probability){state.currentJob={branch:branchId,level,name:job.name,salary:job.salary};state.jobLevels[branchId]=Math.max(state.jobLevels[branchId]||0,level);state.jobExperience=0;state.jobWarnings=0;state.connections=clamp(state.connections+1);showToast(`Вы приняты: ${job.name}`);}
  else{state.happiness=clamp(state.happiness-5);showToast(`Отказ на собеседовании (${Math.round(probability)}% шанс)`);}
  recalcChapter();saveState();renderAll();
}

function buyItemV2(id){
  const item=itemCatalog.find(x=>x.id===id);if(!item)return;
  if(item.consumable&&state.inventory[id]){state.health=clamp(state.health+25);state.inventory[id]--;saveState();renderAll();showToast('Аптечка использована: здоровье +25');return;}
  const price=scaledCost(item.price);if(state.rubles<price){showToast('Недостаточно рублей');return;}
  spend(price);state.inventory[id]=(state.inventory[id]||0)+1;state.reputation=clamp(state.reputation+1);saveState();renderAll();showToast(`${item.name} приобретён`);
}

function buyBusinessV2(id){
  const b=businessCatalogV2.find(x=>x.id===id);if(!b)return;if(state.businesses[id])return;
  if(!requirementMet(b.req)){showToast(`Нужно: ${requirementText(b.req)}`);return;}
  const price=scaledCost(b.price);if(state.rubles<price){showToast('Недостаточно рублей');return;}
  spend(price);state.businesses[id]={level:1,lastProfit:0};state.entrepreneurship=v2ClampSkill(state.entrepreneurship+4);state.connections=clamp(state.connections+2);recalcChapter();saveState();renderAll();showToast(`Куплен бизнес: ${b.name}`);
}
function upgradeBusinessV2(id){
  const b=businessCatalogV2.find(x=>x.id===id),owned=state.businesses[id];if(!b||!owned)return;normalizeBusinessV2(owned);
  if(owned.level>=5){showToast('Максимальный уровень бизнеса');return;}
  const cost=businessUpgradeCostV2(b,owned);
  if(state.rubles<cost){showToast(`Нужно ${fmt(cost)} ₽`);return;}
  spend(cost);owned.level++;state.entrepreneurship=v2ClampSkill(state.entrepreneurship+1.5);saveState();renderAll();showToast(`${b.name} улучшен до уровня ${owned.level}`);
}
function processBusinessesV2(){
  let total=0;
  Object.entries(state.businesses||{}).forEach(([id,raw])=>{
    const b=businessCatalogV2.find(x=>x.id===id);if(!b)return;
    const income=businessIncomeV2(b,raw);raw.lastProfit=income;total+=income;
  });
  if(total>0)earn(total);
  return total;
}

function interactCharacterV2(id){
  const c=charactersV2.find(x=>x.id===id);if(!c||state.chapterIndex<c.chapter)return;
  if(state.characterVisits[id]===state.day){showToast('Вы уже общались сегодня');return;}
  openModal(c.icon,c.name,c.desc,[
    {text:'Поговорить спокойно',onClick:()=>resolveCharacterV2(c,'talk')},
    {text:'Попросить о помощи',onClick:()=>resolveCharacterV2(c,'help')}
  ]);
}
function resolveCharacterV2(c,type){
  state.characterVisits[c.id]=state.day;advanceTime(state.inventory?.car?1:2);if(state.gameOver)return;
  let result='';const rel=state.relations[c.id]||0;const success=Math.random()<Math.min(.88,.48+state.charisma/250+state.luck/500+Math.max(0,rel)/300);
  if(type==='talk'){
    state.relations[c.id]=clamp(rel+(success?6:2),-100,100);state.charisma=v2ClampSkill(state.charisma+.8);result=success?'Разговор прошёл отлично. Отношения улучшились.':'Разговор был коротким, но без конфликта.';
  }else if(success){
    state.relations[c.id]=clamp(rel+3,-100,100);const effects={misha:()=>earn(2500),anna:()=>addValue('health',12),sergey:()=>state.jobExperience+=5,irina:()=>{state.education=clamp(state.education+5);state.intelligence=v2ClampSkill(state.intelligence+2)},oleg:()=>earn(25000),marina:()=>state.popularity=clamp(state.popularity+6),viktor:()=>state.influence=clamp(state.influence+5),roman:()=>state.reputation=clamp(state.reputation+3)};effects[c.id]?.();result='Персонаж согласился помочь.';
  }else{state.relations[c.id]=clamp(rel-5,-100,100);state.happiness=clamp(state.happiness-3);result='Просьба показалась неуместной. Отношения ухудшились.';}
  saveState();renderAll();openModal(c.icon,'Результат встречи',result,[]);
}

function scheduleStoryV2(id,days,data={}){state.pendingStories.push({id,due:state.day+days,data});}
function triggerDueStoryV2(){
  const i=state.pendingStories.findIndex(x=>x.due<=state.day);if(i<0)return false;const story=state.pendingStories.splice(i,1)[0];
  const handlers={
    misha_return:()=>openModal('🧔‍♂️','Миша вернулся','Знакомый с улицы нашёл подработку и хочет вернуть долг.',[
      {text:'Принять 8 000 ₽',onClick:()=>{earn(8000);state.relations.misha=clamp((state.relations.misha||0)+8,-100,100);closeModal();renderAll();}},
      {text:'Пусть оставит себе',onClick:()=>{state.reputation=clamp(state.reputation+6);state.relations.misha=clamp((state.relations.misha||0)+15,-100,100);closeModal();renderAll();}}
    ]),
    journalist_article:()=>openModal('📰','Статья о вашем пути','Марина опубликовала материал. Заголовок может поднять вас или вызвать скандал.',[
      {text:'Поддержать публикацию',onClick:()=>{if(Math.random()<.65){state.popularity=clamp(state.popularity+12);state.reputation=clamp(state.reputation+5);}else{state.reputation=clamp(state.reputation-8);}closeModal();renderAll();}},
      {text:'Дистанцироваться',onClick:()=>{state.popularity=clamp(state.popularity-2);state.reputation=clamp(state.reputation+2);closeModal();renderAll();}}
    ]),
    investor_result:()=>openModal('💼','Результат партнёрства','Олег вернулся с результатами совместного проекта.',[
      {text:'Забрать прибыль',onClick:()=>{if(Math.random()<.58+state.entrepreneurship/300)earn(120000);else state.rubles=Math.max(0,state.rubles-60000);closeModal();renderAll();}},
      {text:'Оставить деньги в проекте',onClick:()=>{state.connections=clamp(state.connections+7);state.relations.oleg=clamp((state.relations.oleg||0)+10,-100,100);closeModal();renderAll();}}
    ]),
    mentor_exam:()=>openModal('🎓','Экзамен наставника','Ирина предлагает сложный экзамен, который может ускорить карьеру.',[
      {text:'Сдать экзамен',onClick:()=>{if(Math.random()<.45+state.intelligence/180){state.education=clamp(state.education+12);state.intelligence=v2ClampSkill(state.intelligence+4);}else{state.happiness=clamp(state.happiness-8);}closeModal();renderAll();}},
      {text:'Отказаться',onClick:()=>{state.happiness=clamp(state.happiness+2);closeModal();renderAll();}}
    ])
  };handlers[story.id]?.();saveState();return true;
}

// Add four story starters to the original random event pool.
events.push(
  {id:'story_misha',icon:'🧔‍♂️',title:'Старый знакомый',text:'Миша просит 3 000 ₽, чтобы начать новую жизнь.',when:s=>!s.stories.misha,choices:[
    {text:'Помочь',can:s=>s.rubles>=3000,effect:s=>{s.rubles-=3000;s.stories.misha='helped';scheduleStoryV2('misha_return',5);return 'Вы помогли Мише. Он обещал вернуться.'}},
    {text:'Отказать',effect:s=>{s.stories.misha='refused';s.reputation-=2;s.relations.misha-=8;return 'Миша ушёл разочарованным.'}}
  ]},
  {id:'story_journalist',icon:'📰',title:'Предложение журналиста',text:'Марина хочет подготовить большую статью о вашем пути.',when:s=>s.chapterIndex>=3&&!s.stories.journalist,choices:[
    {text:'Согласиться',effect:s=>{s.stories.journalist='yes';scheduleStoryV2('journalist_article',4);s.relations.marina+=5;return 'Интервью состоялось. Статья выйдет позже.'}},
    {text:'Отказаться',effect:s=>{s.stories.journalist='no';s.reputation+=2;return 'Вы решили пока не раскрывать личную историю.'}}
  ]},
  {id:'story_investor_v2',icon:'🤝',title:'Партнёрство с Олегом',text:'Олег предлагает вложить 60 000 ₽ в совместный проект.',when:s=>s.chapterIndex>=3&&!s.stories.oleg&&s.rubles>=60000,choices:[
    {text:'Вложиться',effect:s=>{s.rubles-=60000;s.stories.oleg='invested';scheduleStoryV2('investor_result',6);s.relations.oleg+=5;return 'Проект запущен. Результаты будут через несколько дней.'}},
    {text:'Отказаться',effect:s=>{s.stories.oleg='no';return 'Вы сохранили деньги и избежали риска.'}}
  ]},
  {id:'story_teacher',icon:'👩‍🏫',title:'Наставник',text:'Ирина предлагает бесплатно готовить вас к сложному экзамену.',when:s=>s.chapterIndex>=1&&!s.stories.teacher,choices:[
    {text:'Согласиться',effect:s=>{s.stories.teacher='yes';scheduleStoryV2('mentor_exam',5);s.relations.irina+=6;return 'Подготовка началась.'}},
    {text:'Учиться самостоятельно',effect:s=>{s.stories.teacher='no';s.intelligence+=2;return 'Вы выбрали самостоятельный путь.'}}
  ]}
);

function advanceCriticalTimers(hours){
  if(state.gameOver||hours<=0)return;const limit=v2DeathLimit();
  for(const key of Object.keys(fatalStats)){if(state.criticalActive[key]&&state[key]<=0){state.criticalHours[key]=Math.min(limit,(Number(state.criticalHours[key])||0)+hours);if(state.criticalHours[key]>=limit){endGame(key);return;}}}
}
function criticalWarningText(keys){const names=keys.map(k=>fatalStats[k].name).join(', ');return`Показатель «${names}» достиг нуля. Если он останется на нуле ${v2DeathLimit()} игровых часа, персонаж умрёт.`;}
function endGame(key){if(state.gameOver)return;state.gameOver=true;state.deathReason=fatalStats[key]?.reason||'тяжёлого состояния';state.deathDay=state.day;if(!state.endings.includes('death'))state.endings.push('death');saveState();renderAll();showDeathScreen();}

function advanceTime(hours){
  if(state.gameOver)return;let remaining=Math.max(0,Number(hours)||0),crossedDay=false,newCritical=syncCriticalStates();
  while(remaining>0&&!state.gameOver){const untilMidnight=24-state.hour,step=Math.min(remaining,untilMidnight);advanceCriticalTimers(step);if(state.gameOver)return;state.hour+=step;remaining-=step;if(state.hour>=24){state.hour=0;nextDay();crossedDay=true;newCritical=[...new Set([...newCritical,...syncCriticalStates()])];}}
  newCritical=[...new Set([...newCritical,...syncCriticalStates()])];if(state.gameOver)return;
  if(newCritical.length){newCritical.forEach(k=>state.criticalHours[k]=0);showCriticalWarning(newCritical);}
  else if(crossedDay&&!suppressRandomEvent){if(!triggerDueStoryV2()&&Math.random()<.43)setTimeout(()=>{if(!state.gameOver)triggerRandomEvent();},250);}
}
function daySnapshotV24(){
  return {
    rubles:Number(state.rubles)||0,
    dollars:Number(state.dollars)||0,
    health:Number(state.health)||0,
    hunger:Number(state.hunger)||0,
    happiness:Number(state.happiness)||0
  };
}
function signedValueV24(value,suffix=''){
  const number=Math.round(Number(value)||0);
  if(number===0)return `0${suffix}`;
  return `${number>0?'+':'−'}${fmt(Math.abs(number))}${suffix}`;
}
function saveDayReportV24(completedDay,startSnapshot,details={}){
  const start={...daySnapshotV24(),...(startSnapshot||{})};
  const report={
    day:completedDay,
    rublesDelta:Math.round(state.rubles-(Number(start.rubles)||0)),
    dollarsDelta:Math.round(state.dollars-(Number(start.dollars)||0)),
    healthDelta:Math.round(state.health-(Number(start.health)||0)),
    hungerDelta:Math.round(state.hunger-(Number(start.hunger)||0)),
    happinessDelta:Math.round(state.happiness-(Number(start.happiness)||0)),
    assetsIncome:Math.round(Number(details.assetsIncome)||0),
    businessesIncome:Math.round(Number(details.businessesIncome)||0),
    housingCost:Math.round(Number(details.housingCost)||0),
    balance:Math.round(state.rubles)
  };
  const known=report.assetsIncome+report.businessesIncome-report.housingCost;
  report.otherOperations=report.rublesDelta-known;
  state.dayReports=[report,...(Array.isArray(state.dayReports)?state.dayReports:[])].slice(0,60);
  state.dayStartSnapshot=daySnapshotV24();
  showToast(`День ${completedDay} завершён: ${signedValueV24(report.rublesDelta,' ₽')}`);
  return report;
}

function nextDay(){
  const completedDay=state.day;
  const startSnapshot={...daySnapshotV24(),...(state.dayStartSnapshot||{})};
  state.day++;
  state.daysSurvived=state.day;
  state.hunger=clamp(state.hunger-Math.round(18*difficultyCfg().decay));
  state.happiness=clamp(state.happiness-Math.round(3*difficultyCfg().decay));
  const home=homes.find(x=>x.id===state.homeId)||homes[0];
  state.health=clamp(state.health+home.health);
  let housingCost=0;
  if(home.daily){
    const daily=scaledCost(home.daily);
    if(state.rubles>=daily){spend(daily);housingCost=daily;}
    else{state.homeId='street';showToast('Не хватило денег на жильё — вы снова живёте под мостом');}
  }
  updateExchangeRate();
  let assetsIncome=0;
  for(const item of assets){
    const count=Number(state.assets?.[item.id])||0;
    if(count){
      const factor=item.id==='stocks'?(Math.random()*.9+.55):1;
      assetsIncome+=Math.round(item.income*count*factor*difficultyCfg().income);
    }
  }
  let businessesIncome=0;
  Object.entries(state.businesses||{}).forEach(([id,raw])=>{
    const business=businessCatalogV2.find(x=>x.id===id);
    if(!business)return;
    const income=businessIncomeV2(business,raw);
    raw.lastProfit=income;
    businessesIncome+=income;
  });
  const totalDailyIncome=assetsIncome+businessesIncome;
  state.lastDailyIncome={assets:assetsIncome,businesses:businessesIncome,total:totalDailyIncome};
  if(totalDailyIncome>0)earn(totalDailyIncome);
  if(state.hunger<=0){
    state.health=clamp(state.health-Math.round(18*difficultyCfg().decay));
    state.happiness=clamp(state.happiness-10);
  }
  if(Math.random()<.08)state.luck=v2ClampSkill(state.luck+.5);
  recalcCareer();
  recalcChapter();
  checkEndingsV2();
  saveDayReportV24(completedDay,startSnapshot,{assetsIncome,businessesIncome,housingCost});
}

function startElectionCampaign(){
  const rivals=[{name:'богатый предприниматель',power:63},{name:'опытный губернатор',power:67},{name:'популярный блогер',power:59},{name:'независимый кандидат',power:55}];
  const campaign={score:0,history:[],rival:rivals[random(0,rivals.length-1)]};
  electionStagePlatformV2(campaign);
}
function electionStagePlatformV2(c){openModal('📜','1/6 — Программа',`Ваш главный соперник — ${c.rival.name}. Выберите основу программы.`,[
  {text:'Социальные реформы',onClick:()=>{c.score+=state.reputation*.08+state.charisma*.05;c.history.push('социальная программа');electionStageTeamV2(c)}},
  {text:'Экономический рост',onClick:()=>{c.score+=state.entrepreneurship*.10+state.education*.06;c.history.push('экономическая программа');electionStageTeamV2(c)}}
]);}
function electionStageTeamV2(c){openModal('👥','2/6 — Штаб','Кого поставить во главе кампании?',[
  {text:'Опытный политтехнолог — 350 000 ₽',disabled:state.rubles<scaledCost(350000),onClick:()=>{spend(scaledCost(350000));c.score+=13+state.connections*.06;c.history.push('опытный штаб');electionStageSponsorsV2(c)}},
  {text:'Команда волонтёров',onClick:()=>{c.score+=6+state.reputation*.05;c.history.push('волонтёрский штаб');electionStageSponsorsV2(c)}}
]);}
function electionStageSponsorsV2(c){openModal('💰','3/6 — Спонсоры','Большие деньги помогут рекламе, но могут ударить по репутации.',[
  {text:'Взять деньги крупного бизнеса',onClick:()=>{if(Math.random()<.58+state.connections/300){c.score+=15;state.reputation=clamp(state.reputation-5);}else{c.score-=8;state.reputation=clamp(state.reputation-10);}c.history.push('спонсоры бизнеса');electionStageMediaV2(c)}},
  {text:'Собирать небольшие пожертвования',onClick:()=>{c.score+=8+state.popularity*.07;state.reputation=clamp(state.reputation+3);c.history.push('народное финансирование');electionStageMediaV2(c)}}
]);}
function electionStageMediaV2(c){openModal('📺','4/6 — Медиа','Как провести основную рекламную волну?',[
  {text:'Позитивная кампания',onClick:()=>{c.score+=state.charisma*.10+state.reputation*.08+(state.inventory?.phone?5:0);c.history.push('позитивная реклама');electionStageDebateV2(c)}},
  {text:'Атаковать соперника',onClick:()=>{if(Math.random()<.42+state.politicsSkill/220+state.luck/500)c.score+=18;else{c.score-=13;state.reputation=clamp(state.reputation-10);}c.history.push('жёсткая реклама');electionStageDebateV2(c)}}
]);}
function electionStageDebateV2(c){openModal('🎤','5/6 — Дебаты','Финальные теледебаты смотрит вся страна.',[
  {text:'Говорить фактами',onClick:()=>{c.score+=state.education*.07+state.intelligence*.11+state.politicsSkill*.07;c.history.push('дебаты на фактах');electionStageVoteV2(c)}},
  {text:'Давить харизмой',onClick:()=>{c.score+=state.charisma*.13+state.popularity*.07+(state.inventory?.suit?6:0);c.history.push('харизматичные дебаты');electionStageVoteV2(c)}}
]);}
function electionStageVoteV2(c){openModal('🗳️','6/6 — Голосование','Последний выбор штаба.',[
  {text:'Мобилизовать сторонников',onClick:()=>{c.score+=state.connections*.08+state.influence*.10+Math.max(0,state.relations.viktor||0)*.05;finishElectionV2(c)}},
  {text:'Убедить сомневающихся',onClick:()=>{c.score+=state.popularity*.10+state.reputation*.08+state.charisma*.06;finishElectionV2(c)}}
]);}
function finishElectionV2(c){
  const core=state.popularity*.22+state.reputation*.16+state.influence*.20+state.connections*.12+state.politicsSkill*.15+state.charisma*.08+state.luck*.04;
  const rival=c.rival.power+random(-8,8)*difficultyCfg().eventRisk;const total=core+c.score+(state.inventory?.suit?4:0)+Math.max(0,state.relations.marina||0)*.03;
  const voteShare=clamp(Math.round(50+(total-rival)*.42),18,78);
  if(voteShare>=50){state.president=true;state.careerIndex=9;state.chapterIndex=7;state.influence=100;state.reputation=clamp(state.reputation+10);if(!state.endings.includes('president'))state.endings.push('president');saveState();renderAll();openModal('⭐',`Победа — ${voteShare}%`,`Вы победили соперника и стали президентом. Стратегия: ${c.history.join(', ')}.`,[]);}
  else{applyElectionSanction(voteShare,c);}
}
function finishElection(c){finishElectionV2(c);}

function checkEndingsV2(){
  const unlock=id=>{if(!state.endings.includes(id)){state.endings.push(id);return true}return false};
  if(state.homeId!=='street'&&state.currentJob&&state.rubles>=250000)unlock('stable');
  if(state.education>=80&&state.intelligence>=60&&state.currentJob?.branch==='it')unlock('specialist');
  if(Object.keys(state.businesses||{}).length>=4&&state.entrepreneurship>=60)unlock('tycoon');
  if(state.currentJob?.branch==='media'&&state.currentJob.level>=4&&state.popularity>=75)unlock('media');
  if(state.currentJob?.branch==='politics'&&state.currentJob.level>=4)unlock('governor');
  if(state.day>=100)unlock('survivor');if(state.president)unlock('president');
}

function normalize(){
  ['health','hunger','happiness','education','reputation','connections','popularity','influence'].forEach(k=>state[k]=clamp(state[k]));
  ['strength','intelligence','charisma','entrepreneurship','politicsSkill','luck'].forEach(k=>state[k]=v2ClampSkill(state[k]));
  state.rubles=Math.max(0,Number(state.rubles)||0);state.dollars=Math.max(0,Number(state.dollars)||0);state.chapterIndex=Math.max(0,Math.min(7,Number(state.chapterIndex)||0));
  state.inventory=state.inventory||{};state.businesses=state.businesses||{};Object.values(state.businesses).forEach(normalizeBusinessV2);state.relations=state.relations||{};charactersV2.forEach(c=>{if(state.relations[c.id]===undefined)state.relations[c.id]=0});
  state.characterVisits=state.characterVisits||{};state.jobLevels=state.jobLevels||{};state.lastDailyIncome={assets:0,businesses:0,total:0,...(state.lastDailyIncome||{})};state.pendingStories=Array.isArray(state.pendingStories)?state.pendingStories:[];state.endings=Array.isArray(state.endings)?state.endings:[];
  state.dayReports=Array.isArray(state.dayReports)?state.dayReports.slice(0,60):[];
  const fallbackDaySnapshot={rubles:state.rubles,dollars:state.dollars,health:state.health,hunger:state.hunger,happiness:state.happiness};
  state.dayStartSnapshot={...fallbackDaySnapshot,...(state.dayStartSnapshot||{})};
  ['rubles','dollars','health','hunger','happiness'].forEach(key=>state.dayStartSnapshot[key]=Number(state.dayStartSnapshot[key])||0);
  state.criticalHours={...defaultState.criticalHours,...(state.criticalHours||{})};state.criticalActive={...defaultState.criticalActive,...(state.criticalActive||{})};
  Object.keys(fatalStats).forEach(k=>state.criticalHours[k]=Math.max(0,Math.min(v2DeathLimit(),Number(state.criticalHours[k])||0)));
  state.exchangeRate=clampRate(Number(state.exchangeRate)||92);state.previousExchangeRate=clampRate(Number(state.previousExchangeRate)||state.exchangeRate);state.exchangeRateBias=Math.max(-2,Math.min(2,Number(state.exchangeRateBias)||0));
  recalcCareer();recalcChapter();checkEndingsV2();
}


function chapterProgressDetailsV211(){
  const businessCount=Object.keys(state.businesses||{}).length;
  const bestCoreSkill=Math.max(state.strength||0,state.intelligence||0,state.charisma||0);
  const bestCoreSkillName=bestCoreSkill===(state.strength||0)?'Сила':bestCoreSkill===(state.intelligence||0)?'Интеллект':'Харизма';
  const jobName=state.currentJob?.name||'Без постоянной работы';
  const row=(icon,title,current,target,done,screen,valueText)=>({icon,title,current,target,done,screen,valueText,pct:done?100:target?Math.max(0,Math.min(100,current/target*100)):0});
  switch(state.chapterIndex){
    case 0:return [
      row('🏠','Купить любое жильё',state.homeId!=='street'?1:0,1,state.homeId!=='street','housing',(homes.find(h=>h.id===state.homeId)||homes[0]).name),
      row('💼','Найти постоянную работу',state.currentJob?1:0,1,!!state.currentJob,'career',jobName)
    ];
    case 1:return [
      row('🎓','Получить образование 20',state.education,20,state.education>=20,'actions',`${Math.round(state.education)} / 20`),
      row('💪','Развить силу, интеллект или харизму до 25',bestCoreSkill,25,bestCoreSkill>=25,'actions',`${bestCoreSkillName}: ${Math.round(bestCoreSkill)} / 25`),
      row('₽','Накопить 150 000 ₽',state.rubles,150000,state.rubles>=150000,'actions',`${fmt(state.rubles)} / 150 000 ₽`)
    ];
    case 2:return [row('🏢','Купить первый бизнес',businessCount,1,businessCount>=1,'business',businessCount?`Куплено бизнесов: ${businessCount}`:'Бизнесов пока нет')];
    case 3:return [
      row('⭐','Репутация 35',state.reputation,35,state.reputation>=35,'actions',`${Math.round(state.reputation)} / 35`),
      row('🤝','Связи 25',state.connections,25,state.connections>=25,'actions',`${Math.round(state.connections)} / 25`),
      row('📣','Популярность 25',state.popularity,25,state.popularity>=25,'actions',`${Math.round(state.popularity)} / 25`)
    ];
    case 4:return [
      row('🏛️','Стать депутатом или занять более высокую должность',state.currentJob?.branch==='politics'?(state.currentJob.level||0):0,3,state.currentJob?.branch==='politics'&&(state.currentJob.level||0)>=3,'career',jobName),
      row('🏛','Получить влияние 40',state.influence,40,state.influence>=40,'actions',`${Math.round(state.influence)} / 40`)
    ];
    case 5:return [
      row('📣','Популярность 70',state.popularity,70,state.popularity>=70,'actions',`${Math.round(state.popularity)} / 70`),
      row('🏛','Влияние 60',state.influence,60,state.influence>=60,'actions',`${Math.round(state.influence)} / 60`),
      row('🗳','Навык политики 45',state.politicsSkill,45,state.politicsSkill>=45,'actions',`${Math.round(state.politicsSkill)} / 45`)
    ];
    case 6:return [row('⭐','Победить на президентских выборах',state.president?1:0,1,!!state.president,'actions',state.president?'Победа одержана':'Проведите президентскую кампанию')];
    default:return [row('🏆','Основной путь игры завершён',1,1,true,'profile','Вы стали президентом')];
  }
}
function chapterProgressPercentV211(items){return items.length?Math.round(items.reduce((sum,item)=>sum+(Number(item.pct)||0),0)/items.length):100;}

function renderAll(){normalize();renderHeader();renderHome();renderActions();renderCareer();renderAssets();renderProfile();saveState();}
function rankData(){const c=chaptersV2[state.chapterIndex];if(state.president)return{avatar:'🤵',badge:'Президент',title:'Глава государства',text:'Бывший бомж теперь управляет всей страной.'};return{avatar:c.icon,badge:c.name,title:c.name,text:c.goal};}
function renderHome(){
  const r=rankData();['avatar','profileAvatar'].forEach(id=>document.getElementById(id).textContent=r.avatar);document.getElementById('rankBadge').textContent=r.badge;document.getElementById('statusTitle').textContent=r.title;document.getElementById('statusText').textContent=r.text;
  document.getElementById('rublesValue').textContent=`${fmt(state.rubles)} ₽`;document.getElementById('dollarsValue').innerHTML=`${fmt(state.dollars)} <i class="dollar-symbol">$</i>`;
  const trend=exchangeTrend(),rateEl=document.getElementById('exchangeRateValue');if(rateEl){rateEl.textContent=`${state.exchangeRate.toFixed(2)} ₽ ${trend==='up'?'▲':trend==='down'?'▼':'•'}`;rateEl.className=`rate-line ${trend}`;}
  const homeRate=document.getElementById('homeExchangeRate');if(homeRate){homeRate.textContent=`Купить ${buyUsdRate().toFixed(2)} ₽ · продать ${sellUsdRate().toFixed(2)} ₽ ${trend==='up'?'▲':trend==='down'?'▼':'•'}`;homeRate.className=`exchange-home-rate ${trend}`;}
  const stats=[['❤️','Здоровье','health'],['🍗','Сытость','hunger'],['😊','Счастье','happiness']];document.getElementById('statsList').innerHTML=stats.map(([i,n,k])=>`<div class="stat-row"><div class="stat-icon">${i}</div><div><div class="stat-name">${n}</div><div class="progress"><div class="progress-fill ${state[k]<25?'bad':state[k]>75?'good':''}" style="width:${state[k]}%"></div></div></div><div class="stat-value">${Math.round(state[k])}</div></div>`).join('');
  const hubHome=homes.find(h=>h.id===state.homeId)||homes[0],hubItemCount=Object.values(state.inventory||{}).reduce((sum,count)=>sum+(Number(count)||0),0),hubAssetCount=Object.values(state.assets||{}).reduce((sum,count)=>sum+(Number(count)||0),0);
  const hubHomeEl=document.getElementById('homeHubValue');if(hubHomeEl)hubHomeEl.textContent=hubHome.name;
  const hubItemsEl=document.getElementById('inventoryHubValue');if(hubItemsEl)hubItemsEl.textContent=hubItemCount?`Куплено: ${hubItemCount}`:'Нет предметов';
  const hubAssetsEl=document.getElementById('assetsHubValue');if(hubAssetsEl)hubAssetsEl.textContent=hubAssetCount?`Куплено: ${hubAssetCount}`:'Нет активов';
  const current=chaptersV2[state.chapterIndex],next=chaptersV2[Math.min(state.chapterIndex+1,7)],requirements=chapterProgressDetailsV211(),percent=chapterProgressPercentV211(requirements);document.getElementById('goalTitle').textContent=state.chapterIndex===7?'Основной путь завершён':`Переход в главу «${next.name}»`;document.getElementById('goalText').textContent=state.chapterIndex===7?'Вы стали президентом. Открывайте другие достижения.':current.goal;document.getElementById('goalPercent').textContent=`${percent}%`;document.getElementById('goalBar').style.width=`${percent}%`;const requirementsEl=document.getElementById('chapterRequirements');if(requirementsEl)requirementsEl.innerHTML=requirements.map(item=>`<button class="chapter-requirement ${item.done?'done':''}" data-go="${item.screen}"><span class="chapter-requirement-icon">${item.done?'✓':item.icon}</span><span class="chapter-requirement-copy"><span class="chapter-requirement-title">${item.title}</span><span class="chapter-requirement-value">${item.valueText}</span><span class="requirement-mini-progress"><span style="width:${Math.round(item.pct)}%"></span></span></span><span class="chapter-requirement-state">${item.done?'Готово':'Перейти ›'}</span></button>`).join('');
  let banner=document.getElementById('chapterBannerV2');if(!banner){banner=document.createElement('div');banner.id='chapterBannerV2';banner.className='chapter-banner';document.querySelector('[data-screen="home"] .hero-card').after(banner);}banner.innerHTML=`<div class="chapter-banner-head"><h3>${current.icon} Глава: ${current.name}</h3><span class="chapter-number">${state.chapterIndex+1}/8</span></div><p>${current.goal} · Сложность: ${difficultyCfg().name}</p>`;
}
function renderActions(){
  document.getElementById('categoryRow').innerHTML=categories.map(([id,icon,name])=>`<button class="category-chip ${selectedCategory===id?'active':''}" data-category="${id}">${icon} ${name}</button>`).join('');
  const skillLabels={strength:'💪 Сила',intelligence:'🧠 Интеллект',charisma:'🗣 Харизма',politicsSkill:'🏛 Политика'};
  document.getElementById('actionsList').innerHTML=actions.filter(a=>a.cat===selectedCategory).map(a=>{const av=actionAvailability(a),effects=[];effects.push(`🕒 ${effectiveActionHours(a)} ч.`);const labels={hunger:'🍗',health:'❤️',happiness:'😊',education:'🎓',reputation:'⭐',connections:'🤝',popularity:'📣',influence:'🏛️'};Object.keys(labels).forEach(k=>{const d=adjustedDelta(a,k);if(d)effects.push(`${labels[k]} ${d>0?'+':''}${d}`)});const gains=skillGainForAction(a);Object.entries(gains).forEach(([k,v])=>effects.push(`${skillLabels[k]||k} +${Math.round(v*10)/10}`));return`<article class="action-card action-card-clickable ${av.disabled?'unavailable':''}" data-action="${a.id}" role="button" tabindex="0"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${a.icon}</div><div><div class="card-title">${a.name}</div><div class="card-subtitle">${av.disabled?av.reason:a.desc}</div></div></div><div class="reward ${a.max||a.id==='job_shift'?'positive':a.cost?'negative':''}">${actionMoney(a)}</div></div><div class="effects">${effects.map(x=>`<span class="effect">${x}</span>`).join('')}</div></article>`;}).join('');
  requestAnimationFrame(syncFixedTopbar);
}

function renderCareer(){
  const chapter=chaptersV2[state.chapterIndex];
  document.getElementById('careerTitle').textContent=chapter.name;
  document.getElementById('careerText').textContent=chapter.goal;
  document.getElementById('careerIcon').textContent=chapter.icon;
  document.getElementById('careerTimeline').innerHTML=chaptersV2.map((x,i)=>`<article class="career-step ${i<state.chapterIndex?'done':i===state.chapterIndex?'current':''}"><div class="step-head"><div class="step-index">${i+1}</div><div class="step-name">${x.icon} ${x.name}</div><div class="step-state">${i<state.chapterIndex?'ПРОЙДЕНО':i===state.chapterIndex?'СЕЙЧАС':'ЗАКРЫТО'}</div></div><p class="step-requirements">${x.goal}</p></article>`).join('');
  const job=state.currentJob;
  document.getElementById('currentJobLabel').textContent=job?.name||'Без работы';
  document.getElementById('currentJobCard').innerHTML=job?`<article class="buy-card"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${careerBranchesV2[job.branch].icon}</div><div><div class="card-title">${job.name}</div><div class="card-subtitle">Опыт ${state.jobExperience} · предупреждения ${state.jobWarnings}/3</div></div></div><div class="reward positive">${fmt(jobSalaryV22(job,job.branch))} ₽</div></div><div class="job-meta"><span>Зарплата за смену</span><span>${careerBranchesV2[job.branch].name}</span></div></article>`:`<p class="muted small">Выберите направление и пройдите собеседование.</p>`;
  document.getElementById('branchTabs').innerHTML=Object.entries(careerBranchesV2).map(([id,b])=>`<button class="category-chip ${state.selectedBranch===id?'active':''}" data-branch="${id}">${b.icon} ${b.name}</button>`).join('');
  const branchId=state.selectedBranch;
  const branch=careerBranchesV2[branchId]||careerBranchesV2.labor;
  document.getElementById('jobList').innerHTML=branch.jobs.map((j,i)=>{
    const level=i+1;
    const available=requirementMet(j.req);
    const current=job?.branch===branchId&&job.level===level;
    const salary=jobSalaryV22(j,branchId);
    return `<article class="buy-card ${!available?'unavailable':''}"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${branch.icon}</div><div><div class="card-title">${j.name}</div><div class="card-subtitle">${available?'Шанс зависит от навыков, репутации и одежды.':'Нужно: '+requirementText(j.req)}</div></div></div><div class="price">${fmt(salary)} ₽</div></div><button class="buy-button" data-interview="${branchId}:${level}" ${!available||current?'disabled':''}>${current?'Текущая работа':'Пройти собеседование'}</button></article>`;
  }).join('');
}

function renderAssets(){
  const current=homes.find(x=>x.id===state.homeId)||homes[0];document.getElementById('homeLabel').textContent=current.name;document.getElementById('housingList').innerHTML=homes.map(h=>`<article class="buy-card"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${h.icon}</div><div><div class="card-title">${h.name}</div><div class="card-subtitle">${h.desc}<br>Расход в день: ${fmt(scaledCost(h.daily))} ₽</div></div></div><div class="price">${h.price?fmt(scaledCost(h.price))+' ₽':'Бесплатно'}</div></div>${h.id==='street'?'':`<button class="buy-button" data-home="${h.id}" ${state.homeId===h.id?'disabled':''}>${state.homeId===h.id?'Вы живёте здесь':'Купить'}</button>`}</article>`).join('');
  document.getElementById('assetList').innerHTML=assets.map(a=>{const count=state.assets[a.id]||0,locked=a.req&&!requirementMet(a.req);return`<article class="buy-card"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${a.icon}</div><div><div class="card-title">${a.name} ${count?`×${count}`:''}</div><div class="card-subtitle">${locked?'Нужно: '+requirementText(a.req):a.desc}<br>Доход: около ${fmt(Math.round(a.income*difficultyCfg().income))} ₽/день</div></div></div><div class="price">${fmt(scaledCost(a.price))} ₽</div></div><button class="buy-button" data-asset="${a.id}" ${locked||state.rubles<scaledCost(a.price)?'disabled':''}>Купить</button></article>`}).join('');
  document.getElementById('inventoryList').innerHTML=itemCatalog.map(i=>{const count=state.inventory[i.id]||0;const owned=count>0;return`<article class="buy-card"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${i.icon}</div><div><div class="card-title">${i.name}${i.consumable&&count?` ×${count}`:''}</div><div class="card-subtitle">${i.desc}</div></div></div><div class="price">${owned&&!i.consumable?'Куплено':fmt(scaledCost(i.price))+' ₽'}</div></div><button class="buy-button" data-item-v2="${i.id}" ${owned&&!i.consumable?'disabled':''}>${i.consumable&&owned?'Использовать':owned?'Куплено':'Купить'}</button></article>`}).join('');
  const businessTotal=estimatedBusinessIncomeV22(),assetTotal=estimatedAssetIncomeV22(),combinedTotal=businessTotal+assetTotal;const bi=document.getElementById('businessIncomeLabel');bi.textContent=`+${fmt(combinedTotal)} ₽/день всего`;
  document.getElementById('businessList').innerHTML=businessCatalogV2.map(b=>{const raw=state.businesses[b.id],locked=!requirementMet(b.req);if(!raw)return`<article class="buy-card ${locked?'unavailable':''}"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${b.icon}</div><div><div class="card-title">${b.name}</div><div class="card-subtitle">${locked?'Нужно: '+requirementText(b.req):`Приносит ${fmt(Math.round(b.income*difficultyCfg().income))} ₽ каждый игровой день.`}</div></div></div><div class="price">${fmt(scaledCost(b.price))} ₽</div></div><button class="buy-button" data-buy-business-v2="${b.id}" ${locked||state.rubles<scaledCost(b.price)?'disabled':''}>Купить</button></article>`;const o=normalizeBusinessV2(raw),income=businessIncomeV2(b,o),upgradeCost=businessUpgradeCostV2(b,o),nextIncome=o.level<5?Math.round(b.income*(o.level+1)*difficultyCfg().income):income;return`<article class="buy-card business-card-simple"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${b.icon}</div><div><div class="card-title">${b.name} · уровень ${o.level}</div><div class="card-subtitle">Доход начисляется автоматически каждый игровой день.</div></div></div><div class="reward business-profit positive">+${fmt(income)} ₽/день</div></div>${o.level<5?`<div class="business-upgrade-note">После улучшения: +${fmt(nextIncome)} ₽/день</div>`:''}<button class="buy-button" data-upgrade-business-v2="${b.id}" ${o.level>=5?'disabled':''}>${o.level>=5?'Максимальный уровень':`Улучшить за ${fmt(upgradeCost)} ₽`}</button></article>`}).join('');
}
function renderProfile(){
  document.getElementById('profileName').textContent=state.playerName;document.getElementById('profileRank').innerHTML=`${chaptersV2[state.chapterIndex].name} · <span class="difficulty-badge">${difficultyCfg().name}</span>`;
  const dev=[['🎓 Образование',state.education],['⭐ Репутация',state.reputation],['🤝 Связи',state.connections],['📣 Популярность',state.popularity],['🏛️ Влияние',state.influence],['💪 Сила',state.strength],['🧠 Интеллект',state.intelligence],['🗣 Харизма',state.charisma],['💼 Предпринимательство',state.entrepreneurship],['🗳 Политика',state.politicsSkill],['🍀 Удача',state.luck],['📖 Глава',`${state.chapterIndex+1}/8`]];document.getElementById('developmentStats').innerHTML=dev.map(([n,v])=>`<div class="dev-card"><span>${n}</span><strong>${typeof v==='number'?Math.round(v):v}</strong></div>`).join('');
  document.getElementById('charactersList').innerHTML=charactersV2.map(c=>{const locked=state.chapterIndex<c.chapter,rel=state.relations[c.id]||0,pct=(rel+100)/2;return`<article class="buy-card ${locked?'unavailable':''}"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${c.icon}</div><div><div class="card-title">${c.name}</div><div class="card-subtitle">${locked?`Откроется в главе «${chaptersV2[c.chapter].name}»`:c.desc}</div></div></div><div class="price">${rel>0?'+':''}${rel}</div></div><div class="relation-bar"><div class="relation-fill" style="width:${pct}%"></div></div><button class="buy-button" data-character-v2="${c.id}" ${locked?'disabled':''}>Встретиться</button></article>`}).join('');
  document.getElementById('endingsList').innerHTML=endingCatalogV2.map(e=>`<div class="ending-card ${state.endings.includes(e.id)?'unlocked':''}">${state.endings.includes(e.id)?`${e.icon} ${e.name}`:'🔒 Не открыто'}</div>`).join('');
  const reportsEl=document.getElementById('dayReportsList');
  if(reportsEl){
    const reports=Array.isArray(state.dayReports)?state.dayReports:[];
    reportsEl.innerHTML=reports.length?reports.map(report=>{
      const totalClass=report.rublesDelta>0?'positive':report.rublesDelta<0?'negative':'';
      const stats=[['$',report.dollarsDelta],['❤️',report.healthDelta],['🍗',report.hungerDelta],['😊',report.happinessDelta]].filter(([,value])=>Number(value)!==0);
      return `<article class="day-report-card"><div class="day-report-head"><div><div class="day-report-title">День ${report.day} завершён</div><div class="muted small">Баланс: ${fmt(report.balance||0)} ₽</div></div><div class="day-report-total ${totalClass}">${signedValueV24(report.rublesDelta,' ₽')}</div></div><div class="day-report-breakdown"><div class="day-report-line"><span>Активы</span><strong>${signedValueV24(report.assetsIncome,' ₽')}</strong></div><div class="day-report-line"><span>Бизнес</span><strong>${signedValueV24(report.businessesIncome,' ₽')}</strong></div><div class="day-report-line"><span>Жильё</span><strong>${report.housingCost?signedValueV24(-report.housingCost,' ₽'):'0 ₽'}</strong></div><div class="day-report-line"><span>Действия и покупки</span><strong>${signedValueV24(report.otherOperations,' ₽')}</strong></div></div>${stats.length?`<div class="day-report-stats">${stats.map(([icon,value])=>`<span class="day-report-stat">${icon} ${signedValueV24(value)}</span>`).join('')}</div>`:''}</article>`;
    }).join(''):'<div class="day-report-empty">Первый отчёт появится после завершения игрового дня.</div>';
  }
  const assetDaily=estimatedAssetIncomeV22(),businessDaily=estimatedBusinessIncomeV22(),combinedDaily=assetDaily+businessDaily,rows=[['Дней прожито',state.daysSurvived],['Действий выполнено',state.actionsDone],['Текущая работа',state.currentJob?.name||'нет'],['Опыт работы',state.jobExperience],['Предупреждения',`${state.jobWarnings}/3`],['Всего заработано',`${fmt(state.totalEarned)} ₽`],['Заработано в долларах',`${fmt(state.totalDollarEarned)} $`],['Всего потрачено',`${fmt(state.totalSpent)} ₽`],['Поражений на выборах',state.electionLosses],['Доход активов',`≈ ${fmt(assetDaily)} ₽/день`],['Доход бизнесов',`${fmt(businessDaily)} ₽/день`],['Общий ежедневный доход',`≈ ${fmt(combinedDaily)} ₽/день`],['Доход за прошлый день',`${fmt(state.lastDailyIncome?.total||0)} ₽`],['Текущее жильё',(homes.find(h=>h.id===state.homeId)||homes[0]).name]];document.getElementById('gameStats').innerHTML=rows.map(([a,b])=>`<div class="info-row"><span>${a}</span><strong>${b}</strong></div>`).join('');
}

function buyHome(id){const home=homes.find(x=>x.id===id);if(!home||id==='street')return;const price=scaledCost(home.price);if(state.rubles<price){showToast('Недостаточно рублей');return;}spend(price);state.homeId=id;state.reputation=clamp(state.reputation+Math.max(1,homes.indexOf(home)));recalcChapter();saveState();renderAll();haptic('medium');showToast(`Новое жильё: ${home.name}`);}
function buyAsset(id){const item=assets.find(x=>x.id===id);if(!item)return;if(item.req&&!requirementMet(item.req)){showToast(`Нужно: ${requirementText(item.req)}`);return;}const price=scaledCost(item.price);if(state.rubles<price){showToast('Недостаточно рублей');return;}spend(price);state.assets[id]=(state.assets[id]||0)+1;state.entrepreneurship=v2ClampSkill(state.entrepreneurship+1.5);if(id==='company'){state.influence=clamp(state.influence+8);state.connections=clamp(state.connections+5);}saveState();renderAll();showToast(`${item.name} приобретён`);}

function triggerRandomEvent(){
  let pool=events.filter(ev=>(!ev.when||ev.when(state))&&ev.id!==state.lastEventId);if(!pool.length)pool=events.filter(ev=>!ev.when||ev.when(state));const ev=pool[random(0,pool.length-1)];state.lastEventId=ev.id;
  openModal(ev.icon,ev.title,ev.text,ev.choices.map(c=>({text:c.text,disabled:c.can&&!c.can(state),onClick:()=>{const result=c.effect(state);state.luck=v2ClampSkill(state.luck+.25);normalize();const newlyCritical=syncCriticalStates();saveState();renderAll();openModal('🎲','Итог события',newlyCritical.length?`${result}\n\n⚠️ ${criticalWarningText(newlyCritical)}`:result,[]);}})));
}

function switchScreen(target){document.body.classList.toggle('home-screen',target==='home');document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.dataset.screen===target));const navTarget=['housing','inventory','investments'].includes(target)?'home':target;document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.target===navTarget));const titles={home:'Главная',actions:'Действия',career:'Карьера',housing:'Жильё',inventory:'Предметы',investments:'Активы',business:'Бизнес',profile:'Профиль'};document.getElementById('screenTitle').textContent=titles[target]||'Игра';requestAnimationFrame(syncFixedTopbar);window.scrollTo({top:0,behavior:'smooth'});haptic();}

document.addEventListener('click',e=>{
  const branch=e.target.closest('[data-branch]');if(branch){state.selectedBranch=branch.dataset.branch;saveState();renderCareer();return;}
  const interview=e.target.closest('[data-interview]');if(interview){const [b,l]=interview.dataset.interview.split(':');interviewJob(b,Number(l));return;}
  const item=e.target.closest('[data-item-v2]');if(item){buyItemV2(item.dataset.itemV2);return;}
  const buyBiz=e.target.closest('[data-buy-business-v2]');if(buyBiz){buyBusinessV2(buyBiz.dataset.buyBusinessV2);return;}
  const upgradeBiz=e.target.closest('[data-upgrade-business-v2]');if(upgradeBiz){upgradeBusinessV2(upgradeBiz.dataset.upgradeBusinessV2);return;}
  const char=e.target.closest('[data-character-v2]');if(char){interactCharacterV2(char.dataset.characterV2);return;}
});

document.getElementById('helpButton').onclick=()=>openModal('💡','Как играть в v2.6','Все механики v1.22 сохранены. Теперь есть 8 глав, 6 новых навыков, предметы, пять карьерных направлений, собеседования, рабочие ситуации, постоянные персонажи, сюжетные цепочки и бизнесы. Бизнес можно купить и улучшать до пятого уровня. Чем выше уровень, тем больше автоматический доход за игровой день. Дерева навыков нет: навыки растут непосредственно от действий.',[]);

if(!state.difficultyChosen)setTimeout(chooseDifficulty,50);

requestAnimationFrame(syncFixedTopbar);


// ========================= v2.4 compatibility and fixes =========================
function roundedRequirementValueV23(key, source=state){
  const value=Number(source?.[key])||0;
  return ['rubles','dollars'].includes(key)?value:Math.round(value);
}
function adjustedChanceV23(probability){
  const base=Number(probability)||0;
  const luck=((typeof state!=='undefined'&&Number(state.luck))||0)*.0015;
  const risk=(typeof difficultyCfg==='function'?(difficultyCfg().eventRisk||1):1);
  const difficultyAdjust=risk>1?-(risk-1)*.12:(1-risk)*.08;
  return Math.max(.08,Math.min(.95,base+luck+difficultyAdjust));
}
function requirementMet(req={}){
  const numericKeys=['health','education','reputation','connections','popularity','influence','strength','intelligence','charisma','entrepreneurship','politicsSkill','luck'];
  for(const key of numericKeys){
    if(req[key]!==undefined&&roundedRequirementValueV23(key)<Number(req[key]))return false;
  }
  if(req.chapter!==undefined&&state.chapterIndex<Number(req.chapter))return false;
  if(req.item&&!state.inventory?.[req.item])return false;
  if(req.rubles!==undefined&&roundedRequirementValueV23('rubles')<Number(req.rubles))return false;
  if(req.dollars!==undefined&&roundedRequirementValueV23('dollars')<Number(req.dollars))return false;
  if(req.career!==undefined&&state.chapterIndex<legacyCareerChapterV22(req.career))return false;
  return true;
}

const chapterGoalTextsV23=[
  'Купите любое жильё и устройтесь на постоянную работу.',
  'Получите образование 20, развейте силу, интеллект или харизму до 25 и накопите 150 000 ₽.',
  'Купите первый бизнес.',
  'Достигните репутации 35, связей 25 и популярности 25.',
  'Станьте депутатом или выше и получите влияние 40.',
  'Достигните популярности 70, влияния 60 и навыка политики 45.',
  'Победите на президентских выборах.',
  'Основной путь завершён.'
];
chaptersV2.forEach((chapter,index)=>{chapter.goal=chapterGoalTextsV23[index]||chapter.goal;});

function chapterProgressDetailsV211(index=state.chapterIndex, source=state){
  const businessCount=Object.keys(source.businesses||{}).length;
  const strength=roundedRequirementValueV23('strength',source);
  const intelligence=roundedRequirementValueV23('intelligence',source);
  const charisma=roundedRequirementValueV23('charisma',source);
  const bestCoreSkill=Math.max(strength,intelligence,charisma);
  const bestCoreSkillName=bestCoreSkill===strength?'Сила':bestCoreSkill===intelligence?'Интеллект':'Харизма';
  const jobName=source.currentJob?.name||'Без постоянной работы';
  const row=(icon,title,current,target,done,screen,valueText)=>({icon,title,current,target,done,screen,valueText,pct:done?100:target?Math.max(0,Math.min(100,current/target*100)):0});
  switch(index){
    case 0:return [
      row('🏠','Купить любое жильё',source.homeId!=='street'?1:0,1,source.homeId!=='street','housing',(homes.find(h=>h.id===source.homeId)||homes[0]).name),
      row('💼','Найти постоянную работу',source.currentJob?1:0,1,!!source.currentJob,'career',jobName)
    ];
    case 1:return [
      row('🎓','Получить образование 20',roundedRequirementValueV23('education',source),20,roundedRequirementValueV23('education',source)>=20,'actions',`${roundedRequirementValueV23('education',source)} / 20`),
      row('💪','Развить силу, интеллект или харизму до 25',bestCoreSkill,25,bestCoreSkill>=25,'actions',`${bestCoreSkillName}: ${bestCoreSkill} / 25`),
      row('₽','Накопить 150 000 ₽',Number(source.rubles)||0,150000,(Number(source.rubles)||0)>=150000,'actions',`${fmt(source.rubles)} / 150 000 ₽`)
    ];
    case 2:return [row('🏢','Купить первый бизнес',businessCount,1,businessCount>=1,'business',businessCount?`Куплено бизнесов: ${businessCount}`:'Бизнесов пока нет')];
    case 3:return [
      row('⭐','Репутация 35',roundedRequirementValueV23('reputation',source),35,roundedRequirementValueV23('reputation',source)>=35,'actions',`${roundedRequirementValueV23('reputation',source)} / 35`),
      row('🤝','Связи 25',roundedRequirementValueV23('connections',source),25,roundedRequirementValueV23('connections',source)>=25,'actions',`${roundedRequirementValueV23('connections',source)} / 25`),
      row('📣','Популярность 25',roundedRequirementValueV23('popularity',source),25,roundedRequirementValueV23('popularity',source)>=25,'actions',`${roundedRequirementValueV23('popularity',source)} / 25`)
    ];
    case 4:return [
      row('🏛️','Стать депутатом или занять более высокую должность',source.currentJob?.branch==='politics'?(source.currentJob.level||0):0,3,source.currentJob?.branch==='politics'&&(source.currentJob.level||0)>=3,'career',jobName),
      row('🏛','Получить влияние 40',roundedRequirementValueV23('influence',source),40,roundedRequirementValueV23('influence',source)>=40,'actions',`${roundedRequirementValueV23('influence',source)} / 40`)
    ];
    case 5:return [
      row('📣','Популярность 70',roundedRequirementValueV23('popularity',source),70,roundedRequirementValueV23('popularity',source)>=70,'actions',`${roundedRequirementValueV23('popularity',source)} / 70`),
      row('🏛','Влияние 60',roundedRequirementValueV23('influence',source),60,roundedRequirementValueV23('influence',source)>=60,'actions',`${roundedRequirementValueV23('influence',source)} / 60`),
      row('🗳','Навык политики 45',roundedRequirementValueV23('politicsSkill',source),45,roundedRequirementValueV23('politicsSkill',source)>=45,'actions',`${roundedRequirementValueV23('politicsSkill',source)} / 45`)
    ];
    case 6:return [row('⭐','Победить на президентских выборах',source.president?1:0,1,!!source.president,'actions',source.president?'Победа одержана':'Проведите президентскую кампанию')];
    default:return [row('🏆','Основной путь игры завершён',1,1,true,'profile','Вы стали президентом')];
  }
}
function chapterCompleteV23(index,source=state){return chapterProgressDetailsV211(index,source).every(item=>item.done);}
function chapterSummaryV23(index){return chapterProgressDetailsV211(index,state).map(item=>item.title).join(' · ');}
function recalcChapter(){
  let next=state.chapterIndex;
  while(next<chaptersV2.length-1&&chapterCompleteV23(next,state))next++;
  if(next>state.chapterIndex){state.chapterIndex=next;showToast(`Новая глава: ${chaptersV2[next].name}`);}
}

// Business income is intentionally simple but now pays back noticeably faster.
const profitableBusinessIncomeV23={stall:18000,carwash:48000,cafeBiz:110000,deliveryBiz:260000,itBiz:700000};
businessCatalogV2.forEach(b=>{if(profitableBusinessIncomeV23[b.id])b.income=profitableBusinessIncomeV23[b.id];});
function businessUpgradeCostV2(b,owned){
  const level=normalizeBusinessV2(owned).level;
  return level>=5?0:scaledCost(Math.round(b.price*(.22+level*.14)));
}

function skillGainForAction(a){
  const gain={};
  const base=Math.max(.5,Math.min(3,(a.hours||1)/3));
  const physical=['bottles','flyers','car_wash','loader','cleaner','courier','taxi'];
  const smart=['tutor','office','director','usd_freelance','usd_contract','foreign_contract','online_contract'];
  if(a.cat==='work'){
    if(physical.includes(a.id))gain.strength=base;
    else if(smart.includes(a.id))gain.intelligence=base;
    else gain.entrepreneurship=base;
  }
  if(a.cat==='education')gain.intelligence=base*1.35;
  if(a.cat==='media')gain.charisma=base*1.2;
  if(a.cat==='politics'){gain.politicsSkill=base*1.25;gain.charisma=(gain.charisma||0)+base*.35;}
  return gain;
}
function jobGrowthSkillV23(branchId){
  return {labor:'strength',office:'entrepreneurship',it:'intelligence',media:'intelligence',politics:'politicsSkill'}[branchId]||'entrepreneurship';
}
function performJobShift(){
  const job=state.currentJob;if(!job){showToast('Сначала устройтесь на работу');return;}
  const pay=jobSalaryV22(job,job.branch);earn(pay);
  const level=job.level;addValue('health',Math.ceil((-2-level*1.3)*difficultyCfg().decay));addValue('hunger',Math.ceil((-9-level*2)*difficultyCfg().decay));addValue('happiness',Math.ceil((-4-level)*difficultyCfg().decay));
  state.jobExperience+=2+level;
  const growthKey=jobGrowthSkillV23(job.branch);
  state[growthKey]=v2ClampSkill((state[growthKey]||0)+1+level*.25);
  if(job.branch==='media')state.popularity=clamp(state.popularity+Math.max(1,Math.round(level*.7)));
  advanceTime(state.inventory?.car?7:8);if(state.gameOver)return;
  state.actionsDone++;recalcChapter();saveState();renderAll();
  if(Math.random()<.28*difficultyCfg().eventRisk)setTimeout(triggerWorkEventV2,180);
  if(state.jobWarnings>=3){const lost=state.currentJob.name;state.currentJob=null;state.jobWarnings=0;state.jobExperience=0;openModal('📉','Увольнение',`После трёх предупреждений вы потеряли работу «${lost}».`,[]);}
}

function renderActions(){
  document.getElementById('categoryRow').innerHTML=categories.map(([id,icon,name])=>`<button class="category-chip ${selectedCategory===id?'active':''}" data-category="${id}">${icon} ${name}</button>`).join('');
  const skillLabels={strength:'💪 Сила',intelligence:'🧠 Интеллект',charisma:'🗣 Харизма',entrepreneurship:'💼 Предпринимательство',politicsSkill:'🏛 Политика'};
  let list=actions.filter(a=>a.cat===selectedCategory&&!(a.id==='job_shift'&&!state.currentJob));
  if(selectedCategory==='work'&&state.currentJob){
    const shift=list.find(a=>a.id==='job_shift');
    list=list.filter(a=>a.id!=='job_shift');
    if(shift)list.unshift(shift);
  }
  document.getElementById('actionsList').innerHTML=list.map(a=>{
    const av=actionAvailability(a),effects=[];effects.push(`🕒 ${effectiveActionHours(a)} ч.`);
    const labels={hunger:'🍗',health:'❤️',happiness:'😊',education:'🎓',reputation:'⭐',connections:'🤝',popularity:'📣',influence:'🏛️'};
    Object.keys(labels).forEach(k=>{const d=adjustedDelta(a,k);if(d)effects.push(`${labels[k]} ${d>0?'+':''}${d}`)});
    const gains=skillGainForAction(a);Object.entries(gains).forEach(([k,v])=>effects.push(`${skillLabels[k]||k} +${Math.round(v*10)/10}`));
    const title=a.id==='job_shift'&&state.currentJob?`Текущая работа: ${state.currentJob.name}`:a.name;
    const subtitle=a.id==='job_shift'&&state.currentJob?'Отработать смену на текущей должности.':(av.disabled?av.reason:a.desc);
    return`<article class="action-card action-card-clickable ${av.disabled?'unavailable':''}" data-action="${a.id}" role="button" tabindex="0"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${a.icon}</div><div><div class="card-title">${title}</div><div class="card-subtitle">${subtitle}</div></div></div><div class="reward ${a.max||a.id==='job_shift'?'positive':a.cost?'negative':''}">${actionMoney(a)}</div></div><div class="effects">${effects.map(x=>`<span class="effect">${x}</span>`).join('')}</div></article>`;
  }).join('');
  requestAnimationFrame(syncFixedTopbar);
}

function renderCareer(){
  const chapter=chaptersV2[state.chapterIndex];
  document.getElementById('careerTitle').textContent=chapter.name;
  document.getElementById('careerText').textContent=chapterSummaryV23(state.chapterIndex);
  document.getElementById('careerIcon').textContent=chapter.icon;
  document.getElementById('careerTimeline').innerHTML=chaptersV2.map((x,i)=>`<article class="career-step ${i<state.chapterIndex?'done':i===state.chapterIndex?'current':''}"><div class="step-head"><div class="step-index">${i+1}</div><div class="step-name">${x.icon} ${x.name}</div><div class="step-state">${i<state.chapterIndex?'ПРОЙДЕНО':i===state.chapterIndex?'СЕЙЧАС':'ЗАКРЫТО'}</div></div><p class="step-requirements">${chapterSummaryV23(i)}</p></article>`).join('');
  const job=state.currentJob;
  document.getElementById('currentJobLabel').textContent=job?.name||'Без работы';
  document.getElementById('currentJobCard').innerHTML=job?`<article class="buy-card"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${careerBranchesV2[job.branch].icon}</div><div><div class="card-title">${job.name}</div><div class="card-subtitle">Опыт ${state.jobExperience} · предупреждения ${state.jobWarnings}/3</div></div></div><div class="reward positive">${fmt(jobSalaryV22(job,job.branch))} ₽</div></div><div class="job-meta"><span>Зарплата за смену</span><span>${careerBranchesV2[job.branch].name}</span></div></article>`:`<p class="muted small">Выберите направление и пройдите собеседование.</p>`;
  document.getElementById('branchTabs').innerHTML=Object.entries(careerBranchesV2).map(([id,b])=>`<button class="category-chip ${state.selectedBranch===id?'active':''}" data-branch="${id}">${b.icon} ${b.name}</button>`).join('');
  const branchId=state.selectedBranch,branch=careerBranchesV2[branchId]||careerBranchesV2.labor;
  document.getElementById('jobList').innerHTML=branch.jobs.map((j,i)=>{const level=i+1,available=requirementMet(j.req),current=job?.branch===branchId&&job.level===level,salary=jobSalaryV22(j,branchId);return`<article class="buy-card ${!available?'unavailable':''}"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${branch.icon}</div><div><div class="card-title">${j.name}</div><div class="card-subtitle">${available?'Шанс зависит от навыков, репутации и одежды.':'Нужно: '+requirementText(j.req)}</div></div></div><div class="price">${fmt(salary)} ₽</div></div><button class="buy-button" data-interview="${branchId}:${level}" ${!available||current?'disabled':''}>${current?'Текущая работа':'Пройти собеседование'}</button></article>`;}).join('');
}

const eventOddsV23={
  wallet:[.72,.68],illness:[.82,.28],viral_video:[.70,.62],police:[.80,.32],dog:[.78,.45],laptop:[.58,.75],dollar_rumor:[.52,.52],foreign_client:[.65,.65],investor:[.44,.70],journalist:[.67,.48],tax_audit:[.74,.42],street_fight:[.46,.72],protest:[.62,.60],sanctions_rumor:[.57,.55],story_misha:[.64,.72],story_journalist:[.66,.74],story_investor_v2:[.56,.76],story_teacher:[.72,.68]
};
function eventChoiceChanceV23(ev,index){
  let base=eventOddsV23[ev.id]?.[index]??(index===0?.58:.66);
  if(ev.id==='foreign_client'&&index===0)base=Math.min(.85,.45+roundedRequirementValueV23('education')/200);
  if(ev.id==='protest'&&index===0)base=Math.min(.82,.4+roundedRequirementValueV23('popularity')/200+roundedRequirementValueV23('education')/300);
  return adjustedChanceV23(base);
}
function applyMeaningfulEventSwingV23(ev,success){
  const tier=1+state.chapterIndex*.35;
  const finance=['dollar_rumor','foreign_client','investor','tax_audit','sanctions_rumor','story_investor_v2'];
  const media=['viral_video','journalist','story_journalist'];
  const politics=['protest'];
  if(finance.includes(ev.id)){
    const amount=Math.round((success?7000:6000)*tier*(success?difficultyCfg().income:difficultyCfg().cost));
    if(success){earn(amount);state.entrepreneurship=v2ClampSkill(state.entrepreneurship+1);return`Удачный поворот: дополнительно получено ${fmt(amount)} ₽ и +1 к предпринимательству.`;}
    state.rubles=Math.max(0,state.rubles-amount);state.happiness=clamp(state.happiness-7);return`Неудачный поворот: дополнительно потеряно ${fmt(amount)} ₽ и 7 счастья.`;
  }
  if(media.includes(ev.id)){
    const popularity=Math.round(6+tier*2);
    if(success){state.popularity=clamp(state.popularity+popularity);state.reputation=clamp(state.reputation+4);return`Удачный поворот: популярность +${popularity}, репутация +4.`;}
    state.popularity=clamp(state.popularity-popularity);state.reputation=clamp(state.reputation-6);return`Неудачный поворот: популярность −${popularity}, репутация −6.`;
  }
  if(politics.includes(ev.id)){
    if(success){state.popularity=clamp(state.popularity+9);state.influence=clamp(state.influence+5);state.politicsSkill=v2ClampSkill(state.politicsSkill+1);return'Удачный поворот: популярность +9, влияние +5, политика +1.';}
    state.popularity=clamp(state.popularity-9);state.influence=clamp(state.influence-5);state.reputation=clamp(state.reputation-5);return'Неудачный поворот: популярность −9, влияние −5, репутация −5.';
  }
  if(success){state.health=clamp(state.health+6);state.happiness=clamp(state.happiness+7);state.reputation=clamp(state.reputation+3);return'Удачный поворот: здоровье +6, счастье +7, репутация +3.';}
  state.health=clamp(state.health-8);state.happiness=clamp(state.happiness-8);state.reputation=clamp(state.reputation-3);return'Неудачный поворот: здоровье −8, счастье −8, репутация −3.';
}
function triggerRandomEvent(){
  let pool=events.filter(ev=>(!ev.when||ev.when(state))&&ev.id!==state.lastEventId);if(!pool.length)pool=events.filter(ev=>!ev.when||ev.when(state));const ev=pool[random(0,pool.length-1)];state.lastEventId=ev.id;
  openModal(ev.icon,ev.title,`${ev.text}\n\nКаждый вариант может привести к удачному или неудачному исходу.`,ev.choices.map((c,index)=>{const probability=eventChoiceChanceV23(ev,index);return{text:`${c.text} · ${Math.round(probability*100)}%`,disabled:c.can&&!c.can(state),onClick:()=>{const result=c.effect(state);const success=Math.random()<probability;const swing=applyMeaningfulEventSwingV23(ev,success);state.luck=v2ClampSkill(state.luck+.25);normalize();recalcChapter();const newlyCritical=syncCriticalStates();saveState();renderAll();const text=`${result}\n\n${success?'🎲':'⚠️'} ${swing}`;openModal('🎲','Итог события',newlyCritical.length?`${text}\n\n⚠️ ${criticalWarningText(newlyCritical)}`:text,[]);}};}));
}

// Event availability follows v2 chapters instead of the obsolete v1 career ladder.
const journalistEventV23=events.find(ev=>ev.id==='journalist');if(journalistEventV23)journalistEventV23.when=s=>s.chapterIndex>=3;
const protestEventV23=events.find(ev=>ev.id==='protest');if(protestEventV23)protestEventV23.when=s=>s.chapterIndex>=5;
const sanctionsEventV23=events.find(ev=>ev.id==='sanctions_rumor');if(sanctionsEventV23)sanctionsEventV23.when=s=>s.chapterIndex>=5;

// Reset vertical position whenever an action category is changed.
document.addEventListener('click',event=>{if(event.target.closest('[data-category]'))window.scrollTo({top:0,behavior:'auto'});});


// ========================= v2.5 journal and character bonuses =========================
function relationTierV25(id){
  const rel=Number(state.relations?.[id]||0);
  if(rel>=60)return .10;
  if(rel>=25)return .05;
  if(rel<=-60)return -.07;
  if(rel<=-25)return -.03;
  return 0;
}
function relationChanceBonusV25(id){
  const rel=Number(state.relations?.[id]||0);
  if(rel>=60)return .06;
  if(rel>=25)return .03;
  if(rel<=-60)return -.05;
  if(rel<=-25)return -.02;
  return 0;
}
function characterBonusMetaV25(id){
  const rate=relationTierV25(id);
  const pct=Math.round(Math.abs(rate)*100);
  const map={
    misha:{label:'Доход от обычной работы',value:`${rate>0?'+':rate<0?'−':''}${pct}%`},
    anna:{label:'Лечение и восстановление здоровья',value:`${rate>0?'+':rate<0?'−':''}${pct}%`},
    sergey:{label:'Зарплата на постоянной работе',value:`${rate>0?'+':rate<0?'−':''}${pct}%`},
    irina:{label:'Образование от учёбы',value:`${rate>0?'+':rate<0?'−':''}${pct}%`},
    oleg:{label:'Доход всех бизнесов',value:`${rate>0?'+':rate<0?'−':''}${pct}%`},
    marina:{label:'Популярность от медиа',value:`${rate>0?'+':rate<0?'−':''}${pct}%`},
    viktor:{label:'Влияние от политических действий',value:`${rate>0?'+':rate<0?'−':''}${pct}%`},
    roman:{label:'Шанс удачного случайного события',value:`${relationChanceBonusV25(id)>0?'+':relationChanceBonusV25(id)<0?'−':''}${Math.round(Math.abs(relationChanceBonusV25(id))*100)} п.п.`}
  };
  const meta=map[id]||{label:'Бонус отношений',value:'0%'};
  return {...meta,rate};
}
function activeCharacterBonusCountV25(){return charactersV2.filter(c=>state.chapterIndex>=c.chapter&&relationTierV25(c.id)!==0).length;}
function reportCardHtmlV25(report){
  if(!report)return '<div class="day-report-empty">Первый отчёт появится после завершения игрового дня.</div>';
  const totalClass=report.rublesDelta>0?'positive':report.rublesDelta<0?'negative':'';
  const stats=[['$',report.dollarsDelta],['❤️',report.healthDelta],['🍗',report.hungerDelta],['😊',report.happinessDelta]].filter(([,value])=>Number(value)!==0);
  return `<article class="day-report-card"><div class="day-report-head"><div><div class="day-report-title">День ${report.day} завершён</div><div class="muted small">Баланс: ${fmt(report.balance||0)} ₽</div></div><div class="day-report-total ${totalClass}">${signedValueV24(report.rublesDelta,' ₽')}</div></div><div class="day-report-breakdown"><div class="day-report-line"><span>Активы</span><strong>${signedValueV24(report.assetsIncome,' ₽')}</strong></div><div class="day-report-line"><span>Бизнес</span><strong>${signedValueV24(report.businessesIncome,' ₽')}</strong></div><div class="day-report-line"><span>Жильё</span><strong>${report.housingCost?signedValueV24(-report.housingCost,' ₽'):'0 ₽'}</strong></div><div class="day-report-line"><span>Действия и покупки</span><strong>${signedValueV24(report.otherOperations,' ₽')}</strong></div></div>${stats.length?`<div class="day-report-stats">${stats.map(([icon,value])=>`<span class="day-report-stat">${icon} ${signedValueV24(value)}</span>`).join('')}</div>`:''}</article>`;
}

function jobSalaryV22(job,branchId){
  if(!job)return 0;
  const branch=careerBranchesV2[branchId];
  let pay=Number(job.salary||0)*difficultyCfg().income;
  if(branch){const skill=Number(state[branch.skill]||0);pay*=1+Math.min(.45,skill*.005);}
  if(branchId==='office'&&state.inventory?.suit)pay*=1.08;
  if(branchId==='it'&&state.inventory?.laptop)pay*=1.12;
  pay*=1+relationTierV25('sergey');
  return Math.max(0,Math.round(pay));
}
function businessIncomeV2(b,owned){
  const base=b.income*normalizeBusinessV2(owned).level*difficultyCfg().income;
  return Math.max(0,Math.round(base*(1+relationTierV25('oleg'))));
}
function calculateReward(a){
  let reward=random(a.min||0,a.max||0)*difficultyCfg().income;
  reward*=1+Math.min(.45,relevantSkillForAction(a)*.0045);
  if(state.inventory?.backpack&&['bottles','flyers'].includes(a.id))reward*=1.15;
  if(state.inventory?.bike&&a.id==='courier')reward*=1.30;
  if(state.inventory?.laptop&&a.currency==='USD')reward*=1.25;
  if(a.cat==='work')reward*=1+relationTierV25('misha');
  return Math.max(0,Math.round(reward));
}
function adjustedDelta(a,key){
  let delta=Number(a[key])||0;
  if(delta<0)delta*=difficultyCfg().decay;
  if(a.cat==='work'&&key==='health'&&delta<0)delta*=Math.max(.68,1-state.strength*.0035);
  if(a.cat==='media'&&key==='popularity'&&delta>0&&state.inventory?.phone)delta*=1.20;
  if(a.cat==='health'&&key==='health'&&delta>0)delta*=1+relationTierV25('anna');
  if(a.cat==='education'&&key==='education'&&delta>0)delta*=1+relationTierV25('irina');
  if(a.cat==='media'&&key==='popularity'&&delta>0)delta*=1+relationTierV25('marina');
  if(a.cat==='politics'&&key==='influence'&&delta>0)delta*=1+relationTierV25('viktor');
  return delta<0?Math.ceil(delta):Math.round(delta);
}
function eventChoiceChanceV23(ev,index){
  let base=eventOddsV23[ev.id]?.[index]??(index===0?.58:.66);
  if(ev.id==='foreign_client'&&index===0)base=Math.min(.85,.45+roundedRequirementValueV23('education')/200);
  if(ev.id==='protest'&&index===0)base=Math.min(.82,.4+roundedRequirementValueV23('popularity')/200+roundedRequirementValueV23('education')/300);
  return Math.max(.05,Math.min(.95,adjustedChanceV23(base)+relationChanceBonusV25('roman')));
}

function renderCharactersV25(){
  const el=document.getElementById('charactersList');if(!el)return;
  el.innerHTML=charactersV2.map(c=>{
    const locked=state.chapterIndex<c.chapter,rel=Number(state.relations[c.id]||0),pct=(rel+100)/2,meta=characterBonusMetaV25(c.id);
    const badgeClass=meta.rate>0?'positive':meta.rate<0?'negative':'';
    const next=rel<25?'Бонус откроется при отношении +25':rel<60?'Усиленный бонус откроется при +60':'Достигнут максимальный бонус';
    return `<article class="buy-card ${locked?'unavailable':''}"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${c.icon}</div><div><div class="card-title">${c.name}</div><div class="card-subtitle">${locked?`Откроется в главе «${chaptersV2[c.chapter].name}»`:c.desc}</div></div></div><div class="character-bonus-badge ${badgeClass}">${meta.rate===0?'Нет бонуса':meta.value}</div></div><div class="relation-bar"><div class="relation-fill" style="width:${pct}%"></div></div><div class="character-bonus-note">${meta.label}. ${next}.</div><button class="buy-button" data-character-v2="${c.id}" ${locked?'disabled':''}>Встретиться · отношение ${rel>0?'+':''}${rel}</button></article>`;
  }).join('');
}
function renderJournalV25(){
  const reports=Array.isArray(state.dayReports)?state.dayReports:[];
  const journal=document.getElementById('dayReportsList');if(journal)journal.innerHTML=reports.length?reports.map(reportCardHtmlV25).join(''):'<div class="day-report-empty">Первый отчёт появится после завершения игрового дня.</div>';
}
function renderProfile(){
  document.getElementById('profileName').textContent=state.playerName;
  document.getElementById('profileRank').innerHTML=`${chaptersV2[state.chapterIndex].name} · <span class="difficulty-badge">${difficultyCfg().name}</span>`;
  const dev=[['🎓 Образование',state.education],['⭐ Репутация',state.reputation],['🤝 Связи',state.connections],['📣 Популярность',state.popularity],['🏛️ Влияние',state.influence],['💪 Сила',state.strength],['🧠 Интеллект',state.intelligence],['🗣 Харизма',state.charisma],['💼 Предпринимательство',state.entrepreneurship],['🗳 Политика',state.politicsSkill],['🍀 Удача',state.luck],['📖 Глава',`${state.chapterIndex+1}/8`]];
  document.getElementById('developmentStats').innerHTML=dev.map(([n,v])=>`<div class="dev-card"><span>${n}</span><strong>${typeof v==='number'?Math.round(v):v}</strong></div>`).join('');
  const last=document.getElementById('lastDayReport');if(last)last.innerHTML=reportCardHtmlV25(Array.isArray(state.dayReports)?state.dayReports[0]:null);
  const unlocked=charactersV2.filter(c=>state.chapterIndex>=c.chapter);
  const active=activeCharacterBonusCountV25();
  const strongest=[...unlocked].sort((a,b)=>Math.abs(state.relations?.[b.id]||0)-Math.abs(state.relations?.[a.id]||0))[0];
  const summary=document.getElementById('charactersSummary');if(summary)summary.innerHTML=`<div class="characters-summary-row"><span>Открыто персонажей</span><strong>${unlocked.length}/${charactersV2.length}</strong></div><div class="characters-summary-row"><span>Активных бонусов или штрафов</span><strong>${active}</strong></div><div class="characters-summary-row"><span>Самая сильная связь</span><strong>${strongest?`${strongest.icon} ${strongest.name}: ${(state.relations[strongest.id]||0)>0?'+':''}${state.relations[strongest.id]||0}`:'Пока нет'}</strong></div>`;
  const count=document.getElementById('charactersBonusCount');if(count)count.textContent=`${active} ${active===1?'эффект':active>=2&&active<=4?'эффекта':'эффектов'}`;
  document.getElementById('endingsList').innerHTML=endingCatalogV2.map(e=>`<div class="ending-card ${state.endings.includes(e.id)?'unlocked':''}">${state.endings.includes(e.id)?`${e.icon} ${e.name}`:'🔒 Не открыто'}</div>`).join('');
  const assetDaily=estimatedAssetIncomeV22(),businessDaily=estimatedBusinessIncomeV22(),combinedDaily=assetDaily+businessDaily;
  const rows=[['Дней прожито',state.daysSurvived],['Действий выполнено',state.actionsDone],['Текущая работа',state.currentJob?.name||'нет'],['Опыт работы',state.jobExperience],['Предупреждения',`${state.jobWarnings}/3`],['Всего заработано',`${fmt(state.totalEarned)} ₽`],['Заработано в долларах',`${fmt(state.totalDollarEarned)} $`],['Всего потрачено',`${fmt(state.totalSpent)} ₽`],['Поражений на выборах',state.electionLosses],['Доход активов',`≈ ${fmt(assetDaily)} ₽/день`],['Доход бизнесов',`${fmt(businessDaily)} ₽/день`],['Общий ежедневный доход',`≈ ${fmt(combinedDaily)} ₽/день`],['Доход за прошлый день',`${fmt(state.lastDailyIncome?.total||0)} ₽`],['Текущее жильё',(homes.find(h=>h.id===state.homeId)||homes[0]).name]];
  document.getElementById('gameStats').innerHTML=rows.map(([a,b])=>`<div class="info-row"><span>${a}</span><strong>${b}</strong></div>`).join('');
}
function renderAll(){normalize();renderHeader();renderHome();renderActions();renderCareer();renderAssets();renderProfile();renderJournalV25();renderCharactersV25();saveState();}
function switchScreen(target){
  document.body.classList.toggle('home-screen',target==='home');
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.dataset.screen===target));
  const navTarget=['housing','inventory','investments'].includes(target)?'home':['characters','journal'].includes(target)?'profile':target;
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.target===navTarget));
  const titles={home:'Главная',actions:'Действия',career:'Карьера',housing:'Жильё',inventory:'Предметы',investments:'Активы',business:'Бизнес',journal:'Журнал дней',characters:'Персонажи',profile:'Профиль'};
  document.getElementById('screenTitle').textContent=titles[target]||'Игра';
  requestAnimationFrame(syncFixedTopbar);window.scrollTo({top:0,behavior:'smooth'});haptic();
}

document.getElementById('helpButton').onclick=()=>openModal('💡','Как играть в v2.6','Краткий итог показывается в начале нового дня. Последний отчёт виден в профиле, а полный журнал открывается оттуда по кнопке «Весь журнал». Персонажи находятся на отдельном экране и теперь дают постоянные бонусы или штрафы в зависимости от отношений.',[]);

recalcChapter();
renderAll();


// ========================= v2.6 — slower, difficulty-aware progression =========================
const balanceV26 = {
  easy:     {income:1.12,cost:.90,decay:.85,eventRisk:.86,interview:10,deathHours:36,chapterTarget:.90,chapterTime:.80,progressGain:.88,skillGain:.92},
  normal:   {income:1.00,cost:1.00,decay:1.00,eventRisk:1.00,interview:0, deathHours:24,chapterTarget:1.00,chapterTime:1.00,progressGain:.78,skillGain:.84},
  hard:     {income:.88,cost:1.15,decay:1.15,eventRisk:1.12,interview:-8,deathHours:24,chapterTarget:1.08,chapterTime:1.20,progressGain:.70,skillGain:.76},
  survival: {income:.78,cost:1.32,decay:1.28,eventRisk:1.22,interview:-14,deathHours:24,chapterTarget:1.15,chapterTime:1.40,progressGain:.62,skillGain:.68}
};
Object.entries(balanceV26).forEach(([id,values])=>Object.assign(difficultyModes[id],values));

const chapterBaseDaysV26=[5,10,12,14,16,18,22];
function minChapterDaysV26(index=state.chapterIndex){
  if(index>=7)return 0;
  return Math.max(1,Math.ceil((chapterBaseDaysV26[index]||1)*(difficultyCfg().chapterTime||1)));
}
function ensureChapterEntryV26(){
  const currentDay=Math.max(1,Number(state.day)||1);
  if(!Number.isFinite(Number(state.chapterEnteredDay))){
    const credit=currentDay>1?Math.floor(minChapterDaysV26(state.chapterIndex)/2):0;
    state.chapterEnteredDay=Math.max(1,currentDay-credit);
  }
  state.chapterEnteredDay=Math.max(1,Math.min(currentDay,Math.round(Number(state.chapterEnteredDay)||currentDay)));
}
function daysInChapterV26(source=state){
  const entered=Math.max(1,Number(source.chapterEnteredDay)||Number(source.day)||1);
  return Math.max(1,(Number(source.day)||1)-entered+1);
}
function scaledChapterTargetV26(base,type='stat'){
  const multiplier=difficultyCfg().chapterTarget||1;
  if(type==='money')return Math.max(10000,Math.ceil(base*multiplier/10000)*10000);
  const raw=base*multiplier;
  const rounded=multiplier<1?Math.floor(raw/5)*5:Math.ceil(raw/5)*5;
  return Math.max(1,Math.min(95,rounded));
}
function totalBusinessLevelV26(source=state){
  return Object.values(source.businesses||{}).reduce((sum,owned)=>sum+Math.max(1,Number(owned?.level)||1),0);
}
function currentJobLevelV26(source=state){return source.currentJob?Math.max(1,Number(source.currentJob.level)||1):0;}

const chapterGoalTextsV26=[
  'Закрепитесь на первом этапе: найдите жильё, постоянную работу и заработайте стартовый капитал.',
  'Развивайте образование, основной навык и карьеру, чтобы накопить капитал для собственного дела.',
  'Купите первый бизнес, улучшите его и подтвердите предпринимательские навыки.',
  'Развивайте бизнес, репутацию, связи и популярность.',
  'Постройте политическую карьеру и накопите влияние.',
  'Подготовьте показатели к президентской кампании.',
  'Подготовьте кампанию и победите на президентских выборах.',
  'Основной путь завершён.'
];
chaptersV2.forEach((chapter,index)=>{chapter.goal=chapterGoalTextsV26[index]||chapter.goal;});

chapterProgressDetailsV211=function(index=state.chapterIndex,source=state){
  const businessCount=Object.keys(source.businesses||{}).length;
  const businessLevels=totalBusinessLevelV26(source);
  const strength=roundedRequirementValueV23('strength',source);
  const intelligence=roundedRequirementValueV23('intelligence',source);
  const charisma=roundedRequirementValueV23('charisma',source);
  const bestCoreSkill=Math.max(strength,intelligence,charisma);
  const bestCoreSkillName=bestCoreSkill===strength?'Сила':bestCoreSkill===intelligence?'Интеллект':'Харизма';
  const jobName=source.currentJob?.name||'Без постоянной работы';
  const elapsed=daysInChapterV26(source),minimum=minChapterDaysV26(index);
  const row=(icon,title,current,target,done,screen,valueText)=>({icon,title,current,target,done,screen,valueText,pct:done?100:target?Math.max(0,Math.min(100,current/target*100)):0});
  const timeRow=()=>row('🗓️',`Провести в главе не менее ${minimum} дней`,elapsed,minimum,elapsed>=minimum,'profile',`${Math.min(elapsed,minimum)} / ${minimum} дней`);
  switch(index){
    case 0:{
      const earnedTarget=scaledChapterTargetV26(25000,'money');
      return [
        row('🏠','Купить любое жильё',source.homeId!=='street'?1:0,1,source.homeId!=='street','housing',(homes.find(h=>h.id===source.homeId)||homes[0]).name),
        row('💼','Найти постоянную работу',source.currentJob?1:0,1,!!source.currentJob,'career',jobName),
        row('₽',`Заработать всего ${fmt(earnedTarget)} ₽`,Number(source.totalEarned)||0,earnedTarget,(Number(source.totalEarned)||0)>=earnedTarget,'actions',`${fmt(source.totalEarned)} / ${fmt(earnedTarget)} ₽`),
        timeRow()
      ];
    }
    case 1:{
      const educationTarget=scaledChapterTargetV26(30),skillTarget=scaledChapterTargetV26(32),cashTarget=scaledChapterTargetV26(250000,'money');
      return [
        row('🎓',`Получить образование ${educationTarget}`,roundedRequirementValueV23('education',source),educationTarget,roundedRequirementValueV23('education',source)>=educationTarget,'actions',`${roundedRequirementValueV23('education',source)} / ${educationTarget}`),
        row('💪',`Развить силу, интеллект или харизму до ${skillTarget}`,bestCoreSkill,skillTarget,bestCoreSkill>=skillTarget,'actions',`${bestCoreSkillName}: ${bestCoreSkill} / ${skillTarget}`),
        row('📈','Получить должность второго уровня или выше',currentJobLevelV26(source),2,currentJobLevelV26(source)>=2,'career',source.currentJob?`${jobName} · уровень ${currentJobLevelV26(source)}`:'Нет постоянной работы'),
        row('₽',`Накопить ${fmt(cashTarget)} ₽`,Number(source.rubles)||0,cashTarget,(Number(source.rubles)||0)>=cashTarget,'actions',`${fmt(source.rubles)} / ${fmt(cashTarget)} ₽`),
        timeRow()
      ];
    }
    case 2:{
      const entrepreneurshipTarget=scaledChapterTargetV26(15);
      return [
        row('🏢','Купить первый бизнес',businessCount,1,businessCount>=1,'business',businessCount?`Куплено бизнесов: ${businessCount}`:'Бизнесов пока нет'),
        row('⬆️','Довести суммарный уровень бизнесов до 2',businessLevels,2,businessLevels>=2,'business',`${businessLevels} / 2`),
        row('💼',`Предпринимательство ${entrepreneurshipTarget}`,roundedRequirementValueV23('entrepreneurship',source),entrepreneurshipTarget,roundedRequirementValueV23('entrepreneurship',source)>=entrepreneurshipTarget,'actions',`${roundedRequirementValueV23('entrepreneurship',source)} / ${entrepreneurshipTarget}`),
        timeRow()
      ];
    }
    case 3:{
      const reputationTarget=scaledChapterTargetV26(45),connectionsTarget=scaledChapterTargetV26(35),popularityTarget=scaledChapterTargetV26(35);
      return [
        row('⭐',`Репутация ${reputationTarget}`,roundedRequirementValueV23('reputation',source),reputationTarget,roundedRequirementValueV23('reputation',source)>=reputationTarget,'actions',`${roundedRequirementValueV23('reputation',source)} / ${reputationTarget}`),
        row('🤝',`Связи ${connectionsTarget}`,roundedRequirementValueV23('connections',source),connectionsTarget,roundedRequirementValueV23('connections',source)>=connectionsTarget,'actions',`${roundedRequirementValueV23('connections',source)} / ${connectionsTarget}`),
        row('📣',`Популярность ${popularityTarget}`,roundedRequirementValueV23('popularity',source),popularityTarget,roundedRequirementValueV23('popularity',source)>=popularityTarget,'actions',`${roundedRequirementValueV23('popularity',source)} / ${popularityTarget}`),
        row('🏢','Суммарный уровень бизнесов 4',businessLevels,4,businessLevels>=4,'business',`${businessLevels} / 4`),
        timeRow()
      ];
    }
    case 4:{
      const influenceTarget=scaledChapterTargetV26(50),politicsTarget=scaledChapterTargetV26(35);
      return [
        row('🏛️','Стать депутатом или занять более высокую должность',source.currentJob?.branch==='politics'?currentJobLevelV26(source):0,3,source.currentJob?.branch==='politics'&&currentJobLevelV26(source)>=3,'career',jobName),
        row('🏛',`Получить влияние ${influenceTarget}`,roundedRequirementValueV23('influence',source),influenceTarget,roundedRequirementValueV23('influence',source)>=influenceTarget,'actions',`${roundedRequirementValueV23('influence',source)} / ${influenceTarget}`),
        row('🗳',`Навык политики ${politicsTarget}`,roundedRequirementValueV23('politicsSkill',source),politicsTarget,roundedRequirementValueV23('politicsSkill',source)>=politicsTarget,'actions',`${roundedRequirementValueV23('politicsSkill',source)} / ${politicsTarget}`),
        timeRow()
      ];
    }
    case 5:{
      const popularityTarget=scaledChapterTargetV26(80),influenceTarget=scaledChapterTargetV26(70),politicsTarget=scaledChapterTargetV26(55),reputationTarget=scaledChapterTargetV26(60);
      return [
        row('📣',`Популярность ${popularityTarget}`,roundedRequirementValueV23('popularity',source),popularityTarget,roundedRequirementValueV23('popularity',source)>=popularityTarget,'actions',`${roundedRequirementValueV23('popularity',source)} / ${popularityTarget}`),
        row('🏛',`Влияние ${influenceTarget}`,roundedRequirementValueV23('influence',source),influenceTarget,roundedRequirementValueV23('influence',source)>=influenceTarget,'actions',`${roundedRequirementValueV23('influence',source)} / ${influenceTarget}`),
        row('🗳',`Навык политики ${politicsTarget}`,roundedRequirementValueV23('politicsSkill',source),politicsTarget,roundedRequirementValueV23('politicsSkill',source)>=politicsTarget,'actions',`${roundedRequirementValueV23('politicsSkill',source)} / ${politicsTarget}`),
        row('⭐',`Репутация ${reputationTarget}`,roundedRequirementValueV23('reputation',source),reputationTarget,roundedRequirementValueV23('reputation',source)>=reputationTarget,'actions',`${roundedRequirementValueV23('reputation',source)} / ${reputationTarget}`),
        timeRow()
      ];
    }
    case 6:{
      const popularityTarget=scaledChapterTargetV26(80),reputationTarget=scaledChapterTargetV26(65),influenceTarget=scaledChapterTargetV26(70),connectionsTarget=scaledChapterTargetV26(60),politicsTarget=scaledChapterTargetV26(55);
      return [
        row('📣',`Популярность ${popularityTarget}`,roundedRequirementValueV23('popularity',source),popularityTarget,roundedRequirementValueV23('popularity',source)>=popularityTarget,'actions',`${roundedRequirementValueV23('popularity',source)} / ${popularityTarget}`),
        row('⭐',`Репутация ${reputationTarget}`,roundedRequirementValueV23('reputation',source),reputationTarget,roundedRequirementValueV23('reputation',source)>=reputationTarget,'actions',`${roundedRequirementValueV23('reputation',source)} / ${reputationTarget}`),
        row('🏛',`Влияние ${influenceTarget}`,roundedRequirementValueV23('influence',source),influenceTarget,roundedRequirementValueV23('influence',source)>=influenceTarget,'actions',`${roundedRequirementValueV23('influence',source)} / ${influenceTarget}`),
        row('🤝',`Связи ${connectionsTarget}`,roundedRequirementValueV23('connections',source),connectionsTarget,roundedRequirementValueV23('connections',source)>=connectionsTarget,'actions',`${roundedRequirementValueV23('connections',source)} / ${connectionsTarget}`),
        row('🗳',`Навык политики ${politicsTarget}`,roundedRequirementValueV23('politicsSkill',source),politicsTarget,roundedRequirementValueV23('politicsSkill',source)>=politicsTarget,'actions',`${roundedRequirementValueV23('politicsSkill',source)} / ${politicsTarget}`),
        timeRow(),
        row('⭐','Победить на президентских выборах',source.president?1:0,1,!!source.president,'actions',source.president?'Победа одержана':'Проведите президентскую кампанию')
      ];
    }
    default:return [row('🏆','Основной путь игры завершён',1,1,true,'profile','Вы стали президентом')];
  }
};
chapterCompleteV23=function(index,source=state){return chapterProgressDetailsV211(index,source).every(item=>item.done);};
chapterSummaryV23=function(index){return chapterProgressDetailsV211(index,state).map(item=>item.title).join(' · ');};
recalcChapter=function(){
  ensureChapterEntryV26();
  if(state.chapterIndex>=chaptersV2.length-1)return;
  if(chapterCompleteV23(state.chapterIndex,state)){
    state.chapterIndex++;
    state.chapterEnteredDay=Math.max(1,Number(state.day)||1);
    showToast(`Новая глава: ${chaptersV2[state.chapterIndex].name}`);
  }
};

const normalizeV25ForV26=normalize;
normalize=function(){
  normalizeV25ForV26();
  ensureChapterEntryV26();
};

const adjustedDeltaV25ForV26=adjustedDelta;
adjustedDelta=function(a,key){
  const delta=adjustedDeltaV25ForV26(a,key);
  if(delta>0&&['education','reputation','connections','popularity','influence'].includes(key)){
    return Math.max(1,Math.round(delta*(difficultyCfg().progressGain||1)));
  }
  return delta;
};
const skillGainForActionV25ForV26=skillGainForAction;
skillGainForAction=function(a){
  const gains=skillGainForActionV25ForV26(a);
  const multiplier=difficultyCfg().skillGain||1;
  Object.keys(gains).forEach(key=>gains[key]=Math.max(.1,gains[key]*multiplier));
  return gains;
};
performJobShift=function(){
  const job=state.currentJob;if(!job){showToast('Сначала устройтесь на работу');return;}
  const pay=jobSalaryV22(job,job.branch);earn(pay);
  const level=job.level;
  addValue('health',Math.ceil((-2-level*1.3)*difficultyCfg().decay));
  addValue('hunger',Math.ceil((-9-level*2)*difficultyCfg().decay));
  addValue('happiness',Math.ceil((-4-level)*difficultyCfg().decay));
  state.jobExperience+=2+level;
  const growthKey=jobGrowthSkillV23(job.branch);
  state[growthKey]=v2ClampSkill((state[growthKey]||0)+(1+level*.25)*(difficultyCfg().skillGain||1));
  if(job.branch==='media')state.popularity=clamp(state.popularity+Math.max(1,Math.round(level*.7*(difficultyCfg().progressGain||1))));
  advanceTime(state.inventory?.car?7:8);if(state.gameOver)return;
  state.actionsDone++;recalcChapter();saveState();renderAll();
  if(Math.random()<.28*difficultyCfg().eventRisk)setTimeout(triggerWorkEventV2,180);
  if(state.jobWarnings>=3){const lost=state.currentJob.name;state.currentJob=null;state.jobWarnings=0;state.jobExperience=0;openModal('📉','Увольнение',`После трёх предупреждений вы потеряли работу «${lost}».`,[]);}
};

const actionAvailabilityV25ForV26=actionAvailability;
function electionReadinessV26(){return chapterProgressDetailsV211(6,state).filter(item=>!item.title.includes('Победить'));}
const electionActionV26=actions.find(a=>a.id==='election');
if(electionActionV26){
  electionActionV26.req={career:8};
  electionActionV26.desc='Президентская кампания доступна после выполнения всех требований главы.';
}
actionAvailability=function(a){
  const base=actionAvailabilityV25ForV26(a);
  if(base.disabled)return base;
  if(a?.id==='election'){
    const missing=electionReadinessV26().find(item=>!item.done);
    if(missing)return{disabled:true,reason:`Сначала выполните: ${missing.title}`};
  }
  return base;
};

const helpV26=document.getElementById('helpButton');
if(helpV26)helpV26.onclick=()=>openModal('💡','Как играть в v2.6','Каждая глава теперь требует не только показатели, но и минимальное количество игровых дней. На лёгкой сложности развитие быстрее и дешевле, на сложной и «Выживании» требования выше, доходы ниже, а показатели растут медленнее. Прогресс каждой цели виден внизу главного экрана и во вкладке «Карьера».',[]);

ensureChapterEntryV26();
normalize();
renderAll();

// ========================= v2.7 — logical chapter events, sequential careers, fixed election cost =========================
const ELECTION_ENTRY_COST_V27 = 100000000;
const electionActionV27 = actions.find(action => action.id === 'election');
if (electionActionV27) {
  electionActionV27.cost = ELECTION_ENTRY_COST_V27;
  electionActionV27.desc = 'Президентская кампания стоимостью 100 000 000 ₽. Доступна после выполнения всех требований главы.';
}

// Entrepreneurship is earned only by purchasing assets and buying/upgrading businesses.
const skillGainForActionV26BeforeV27 = skillGainForAction;
skillGainForAction = function(action) {
  const gain = skillGainForActionV26BeforeV27(action) || {};
  delete gain.entrepreneurship;
  if (action?.cat === 'work') {
    const physical = ['beg','bottles','flyers','car_wash','loader','cleaner','courier','taxi'];
    const intellectual = ['tutor','office','director','usd_freelance','usd_contract','foreign_contract','online_contract'];
    delete gain.charisma;
    if (physical.includes(action.id)) gain.strength = Math.max(Number(gain.strength)||0, Math.max(.5, Math.min(3,(action.hours||1)/3)));
    else if (intellectual.includes(action.id)) gain.intelligence = Math.max(Number(gain.intelligence)||0, Math.max(.5, Math.min(3,(action.hours||1)/3)));
    else gain.strength = Math.max(Number(gain.strength)||0, Math.max(.35, Math.min(2,(action.hours||1)/4)));
  }
  return gain;
};
jobGrowthSkillV23 = function(branchId) {
  return {labor:'strength',office:'intelligence',it:'intelligence',media:'charisma',politics:'politicsSkill'}[branchId] || 'intelligence';
};

// Remove entrepreneurship rewards from old pending story outcomes for migrated saves.
const triggerDueStoryV26BeforeV27 = triggerDueStoryV2;
triggerDueStoryV2 = function() {
  const before = Number(state.entrepreneurship)||0;
  const triggered = triggerDueStoryV26BeforeV27();
  if (triggered && Number(state.entrepreneurship) > before) {
    state.entrepreneurship = before;
    saveState();
  }
  return triggered;
};

function actionCostV27(action) {
  return action?.id === 'election' ? ELECTION_ENTRY_COST_V27 : scaledCost(action?.cost || 0);
}
const actionAvailabilityV26BeforeV27 = actionAvailability;
actionAvailability = function(action) {
  const base = actionAvailabilityV26BeforeV27(action);
  if (action?.id !== 'election') return base;
  if (base.disabled && base.reason !== 'Не хватает рублей') return base;
  if (state.rubles < ELECTION_ENTRY_COST_V27) return {disabled:true, reason:'Для участия нужно 100 000 000 ₽'};
  return {disabled:false, reason:''};
};
const actionMoneyV26BeforeV27 = actionMoney;
actionMoney = function(action) {
  if (action?.id === 'election') return `−${fmt(ELECTION_ENTRY_COST_V27)} ₽`;
  return actionMoneyV26BeforeV27(action);
};
performCustom = function(action) {
  if (action.id === 'job_shift') { performJobShift(); return; }
  const cost = actionCostV27(action);
  if (cost && state.rubles < cost) { showToast(action.id === 'election' ? 'Для участия нужно 100 000 000 ₽' : 'Недостаточно рублей'); return; }
  if (action.id === 'debate') {
    spend(cost);
    ['hunger','health','happiness'].forEach(key => addValue(key, adjustedDelta(action,key)));
    const score = state.education + state.reputation + state.charisma*.45 + state.politicsSkill*.55 + random(-25,25);
    if (score > 120) {
      state.popularity = clamp(state.popularity+16);
      state.influence = clamp(state.influence+9);
      state.politicsSkill = v2ClampSkill(state.politicsSkill+2);
      showToast('Вы блестяще выиграли дебаты');
    } else {
      state.popularity = clamp(state.popularity-5);
      state.happiness = clamp(state.happiness-9);
      showToast('Дебаты прошли неудачно');
    }
    advanceTime(effectiveActionHours(action));
  }
  if (action.id === 'election') {
    if (state.chapterIndex < 6) { showToast('Сначала откройте главу «Кандидат в президенты»'); return; }
    if (state.day < state.electionBanUntil) { showToast(`Повторные выборы доступны с ${state.electionBanUntil}-го дня`); return; }
    spend(ELECTION_ENTRY_COST_V27);
    ['hunger','health','happiness'].forEach(key => addValue(key, adjustedDelta(action,key)));
    suppressRandomEvent = true;
    advanceTime(effectiveActionHours(action));
    suppressRandomEvent = false;
    if (state.gameOver) return;
    startElectionCampaign();
  }
  if (state.gameOver) return;
  state.actionsDone++;
  recalcCareer();
  recalcChapter();
  saveState();
  renderAll();
  haptic('medium');
};

// Career positions must be completed in order inside every branch.
function previousCareerStepDoneV27(branchId, level) {
  if (level <= 1) return true;
  const completed = Math.max(Number(state.jobLevels?.[branchId])||0, state.currentJob?.branch===branchId ? Number(state.currentJob.level)||0 : 0);
  return completed >= level-1;
}
const normalizeV26BeforeV27 = normalize;
normalize = function() {
  normalizeV26BeforeV27();
  state.jobLevels = state.jobLevels || {};
  if (state.currentJob?.branch) {
    state.jobLevels[state.currentJob.branch] = Math.max(Number(state.jobLevels[state.currentJob.branch])||0, Number(state.currentJob.level)||1);
  }
};
interviewJob = function(branchId, level) {
  if (state.gameOver) return;
  const branch = careerBranchesV2[branchId];
  const job = branch?.jobs[level-1];
  if (!job) return;
  if (!previousCareerStepDoneV27(branchId,level)) {
    const previous = branch.jobs[level-2]?.name || 'предыдущую должность';
    showToast(`Сначала получите должность «${previous}»`);
    return;
  }
  if (!requirementMet(job.req)) { showToast(`Нужно: ${requirementText(job.req)}`); return; }
  const relation = (state.relations.sergey||0)*.12 + (state.relations.irina||0)*.08;
  const skill = state[branch.skill]||0;
  let probability = 48 + difficultyCfg().interview + skill*.45 + state.charisma*.22 + state.reputation*.18 + relation;
  if (state.inventory?.suit) probability += 15;
  if ((state.jobLevels[branchId]||0) >= level-1) probability += 7;
  probability = Math.max(12,Math.min(92,probability));
  advanceTime(state.inventory?.car?2:3);
  if (state.gameOver) return;
  if (Math.random()*100 < probability) {
    state.currentJob = {branch:branchId,level,name:job.name,salary:job.salary};
    state.jobLevels[branchId] = Math.max(state.jobLevels[branchId]||0,level);
    state.jobExperience = 0;
    state.jobWarnings = 0;
    state.connections = clamp(state.connections+1);
    showToast(`Вы приняты: ${job.name}`);
  } else {
    state.happiness = clamp(state.happiness-5);
    showToast('На собеседовании отказали');
  }
  recalcChapter();
  saveState();
  renderAll();
};

const renderCareerV26BeforeV27 = renderCareer;
renderCareer = function() {
  renderCareerV26BeforeV27();
  const branchId = state.selectedBranch;
  const branch = careerBranchesV2[branchId] || careerBranchesV2.labor;
  const job = state.currentJob;
  const list = document.getElementById('jobList');
  if (!list) return;
  list.innerHTML = branch.jobs.map((position,index) => {
    const level = index+1;
    const current = job?.branch===branchId && Number(job.level)===level;
    const previousDone = previousCareerStepDoneV27(branchId,level);
    const requirementsDone = requirementMet(position.req);
    const available = previousDone && requirementsDone;
    const salary = jobSalaryV22(position,branchId);
    let subtitle = 'Шанс зависит от навыков, репутации и одежды.';
    if (!previousDone) subtitle = `Сначала получите должность «${branch.jobs[index-1].name}»`;
    else if (!requirementsDone) subtitle = `Нужно: ${requirementText(position.req)}`;
    return `<article class="buy-card ${!available?'unavailable':''}"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${branch.icon}</div><div><div class="card-title">${position.name}</div><div class="card-subtitle">${subtitle}</div></div></div><div class="price">${fmt(salary)} ₽</div></div><button class="buy-button" data-interview="${branchId}:${level}" ${!available||current?'disabled':''}>${current?'Текущая работа':'Пройти собеседование'}</button></article>`;
  }).join('');
};

// Detailed progress buttons open the correct action category.
const chapterProgressDetailsV26BeforeV27 = chapterProgressDetailsV211;
chapterProgressDetailsV211 = function(index=state.chapterIndex, source=state) {
  const rows = chapterProgressDetailsV26BeforeV27(index,source);
  rows.forEach(row => {
    const title = String(row.title||'').toLowerCase();
    if (row.screen !== 'actions') return;
    if (title.includes('образован') || title.includes('интеллект')) row.category='education';
    else if (title.includes('популярност') || title.includes('харизм')) row.category='media';
    else if (title.includes('политик') || title.includes('влияни') || title.includes('репутац') || title.includes('связ') || title.includes('победит') || title.includes('выбор')) row.category='politics';
    else if (title.includes('сил')) row.category='work';
    else if (title.includes('руб') || title.includes('заработ') || title.includes('накоп')) row.category='work';
    else row.category='work';
  });
  return rows;
};
const renderHomeV26BeforeV27 = renderHome;
renderHome = function() {
  renderHomeV26BeforeV27();
  const rows = chapterProgressDetailsV211();
  document.querySelectorAll('#chapterRequirements .chapter-requirement').forEach((button,index) => {
    if (rows[index]?.category) button.dataset.progressCategory = rows[index].category;
  });
};
document.addEventListener('click', event => {
  const button = event.target.closest('[data-progress-category]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  selectedCategory = button.dataset.progressCategory;
  switchScreen('actions');
  renderActions();
  window.scrollTo({top:0,behavior:'auto'});
}, true);

// Chapter-specific random events. One hidden roll determines the whole result.
const eventMoneyScaleV27 = [2500,12000,50000,200000,800000,3000000,12000000,30000000];
function eventAmountV27(factor, positive=true) {
  const base = eventMoneyScaleV27[Math.max(0,Math.min(7,Number(state.chapterIndex)||0))] || 2500;
  const difficulty = positive ? difficultyCfg().income : difficultyCfg().cost;
  return Math.max(100,Math.round(base*Math.abs(factor)*difficulty*(.9+Math.random()*.2)));
}
function eventChanceV27(base) {
  return Math.max(.08,Math.min(.92,adjustedChanceV23(base)+relationChanceBonusV25('roman')));
}
function applyEventEffectsV27(effects={}) {
  const changes=[];
  if (effects.rublesFactor) {
    const positive=effects.rublesFactor>0;
    const amount=eventAmountV27(effects.rublesFactor,positive);
    if (positive) { earn(amount); changes.push(`+${fmt(amount)} ₽`); }
    else { const loss=Math.min(state.rubles,amount); if(loss)spend(loss); changes.push(`−${fmt(loss)} ₽`); }
  }
  if (effects.dollars) {
    const before=state.dollars;
    if (effects.dollars>0) earnDollars(effects.dollars); else state.dollars=Math.max(0,state.dollars+effects.dollars);
    const actual=Math.round(state.dollars-before);
    if(actual)changes.push(`${actual>0?'+':''}${actual} $`);
  }
  const labels={health:'здоровье',hunger:'сытость',happiness:'счастье',education:'образование',reputation:'репутация',connections:'связи',popularity:'популярность',influence:'влияние',strength:'сила',intelligence:'интеллект',charisma:'харизма',politicsSkill:'политика',luck:'удача'};
  Object.entries(labels).forEach(([key,label])=>{
    if (!effects[key]) return;
    const before=Number(state[key])||0;
    if (['strength','intelligence','charisma','politicsSkill','luck'].includes(key)) state[key]=v2ClampSkill(before+effects[key]);
    else state[key]=clamp(before+effects[key]);
    const actual=Math.round((state[key]-before)*10)/10;
    if(actual)changes.push(`${label} ${actual>0?'+':''}${actual}`);
  });
  if (effects.exchangeRateBias) state.exchangeRateBias=Math.max(-2,Math.min(2,(state.exchangeRateBias||0)+effects.exchangeRateBias));
  return changes.join(' · ');
}
function eventOutcomeV27(message,effects) {
  const summary=applyEventEffectsV27(effects);
  return summary?`${message} ${summary}.`:message;
}
const chapterEventsV27 = [
  [
    {id:'v27_cold',icon:'🤒',title:'Сильная простуда',text:'Температура растёт, а ночевать всё равно приходится в плохих условиях.',choices:[
      {text:'Купить лекарства',chance:.80,good:{message:'Лечение помогло, состояние стабилизировалось.',effects:{rublesFactor:-.18,health:14,happiness:2}},bad:{message:'Лекарство не подошло, болезнь усилилась.',effects:{rublesFactor:-.18,health:-12,happiness:-6}}},
      {text:'Перетерпеть',chance:.32,good:{message:'Организм справился без лекарств.',effects:{health:5,hunger:-4}},bad:{message:'Болезнь сильно вас подкосила.',effects:{health:-18,happiness:-8,hunger:-6}}}
    ]},
    {id:'v27_social_center',icon:'🏢',title:'Очередь в социальный центр',text:'Можно потратить день на оформление документов или поискать подработку рядом.',choices:[
      {text:'Дождаться приёма',chance:.72,good:{message:'Документы приняли, а сотрудник подсказал полезный контакт.',effects:{reputation:6,connections:3,rublesFactor:.25}},bad:{message:'Приём отменили после долгого ожидания.',effects:{happiness:-7,hunger:-6}}},
      {text:'Искать подработку',chance:.58,good:{message:'Удалось найти срочную разгрузку.',effects:{rublesFactor:.65,strength:1,health:-3,hunger:-5}},bad:{message:'Работы не нашлось, день потрачен впустую.',effects:{happiness:-6,hunger:-5}}}
    ]},
    {id:'v27_scrap',icon:'♻️',title:'Склад выброшенной техники',text:'Во дворе лежит куча старой техники, но место выглядит небезопасно.',choices:[
      {text:'Разобрать технику',chance:.64,good:{message:'Внутри нашлись цветные металлы.',effects:{rublesFactor:.75,strength:1,health:-2}},bad:{message:'Вы порезались и ничего ценного не нашли.',effects:{health:-11,hunger:-7}}},
      {text:'Не рисковать',chance:.76,good:{message:'Позже выяснилось, что склад охранялся. Вы избежали проблем.',effects:{reputation:2,happiness:2}},bad:{message:'Другой человек забрал всё ценное прямо у вас на глазах.',effects:{happiness:-5}}}
    ]}
  ],
  [
    {id:'v27_overtime',icon:'🕒',title:'Неожиданная сверхурочная смена',text:'Начальник просит остаться до ночи за повышенную оплату.',choices:[
      {text:'Согласиться',chance:.70,good:{message:'Смена прошла успешно и хорошо оплатилась.',effects:{rublesFactor:1.0,strength:1,health:-5,hunger:-8}},bad:{message:'Из-за ошибки смену не оплатили полностью.',effects:{rublesFactor:.25,health:-12,happiness:-8,hunger:-9}}},
      {text:'Отказаться',chance:.65,good:{message:'Начальник отнёсся с пониманием.',effects:{happiness:5,reputation:2}},bad:{message:'Отказ испортил отношения на работе.',effects:{reputation:-5,connections:-2}}}
    ]},
    {id:'v27_landlord',icon:'🔑',title:'Разговор с хозяином жилья',text:'Хозяин хочет повысить плату и требует решение сегодня.',choices:[
      {text:'Договориться',chance:.62,good:{message:'Удалось сохранить старую цену и получить отсрочку.',effects:{rublesFactor:.45,connections:3,charisma:1}},bad:{message:'Переговоры провалились, пришлось доплатить.',effects:{rublesFactor:-.75,happiness:-7}}},
      {text:'Заплатить без спора',chance:.85,good:{message:'Хозяин оценил надёжность и сделал скидку.',effects:{rublesFactor:-.30,reputation:3}},bad:{message:'После оплаты появились новые требования.',effects:{rublesFactor:-.55,happiness:-4}}}
    ]},
    {id:'v27_course_offer',icon:'📚',title:'Вечерние курсы',text:'Коллега предлагает место на недорогом вечернем курсе.',choices:[
      {text:'Записаться',chance:.74,good:{message:'Курс оказался полезным и практичным.',effects:{rublesFactor:-.25,education:8,intelligence:2,happiness:3}},bad:{message:'Программа оказалась устаревшей.',effects:{rublesFactor:-.25,education:2,happiness:-6}}},
      {text:'Взять дополнительную смену',chance:.63,good:{message:'Смена принесла хороший заработок.',effects:{rublesFactor:.70,health:-5,hunger:-7}},bad:{message:'Заказ отменили в последний момент.',effects:{happiness:-6,hunger:-4}}}
    ]}
  ],
  [
    {id:'v27_freelance',icon:'💻',title:'Срочный заказ специалисту',text:'Клиент готов хорошо заплатить, но сроки почти нереальные.',choices:[
      {text:'Взять заказ',chance:.68,good:{message:'Вы сдали проект вовремя и получили рекомендацию.',effects:{rublesFactor:1.15,reputation:5,intelligence:2,happiness:-3}},bad:{message:'Срок сорван, клиент потребовал компенсацию.',effects:{rublesFactor:-.70,reputation:-8,happiness:-7}}},
      {text:'Передать знакомому',chance:.72,good:{message:'Знакомый справился и поделился оплатой.',effects:{rublesFactor:.45,connections:6,reputation:2}},bad:{message:'Знакомый провалил проект и обвинил вас.',effects:{connections:-5,reputation:-5}}}
    ]},
    {id:'v27_certificate',icon:'📜',title:'Профессиональная сертификация',text:'Можно оплатить экзамен и подтвердить квалификацию.',choices:[
      {text:'Сдать экзамен',chance:.70,good:{message:'Экзамен сдан с высоким результатом.',effects:{rublesFactor:-.30,education:10,intelligence:3,reputation:5}},bad:{message:'Экзамен провален, взнос не возвращается.',effects:{rublesFactor:-.30,happiness:-8}}},
      {text:'Подготовиться позже',chance:.58,good:{message:'Самостоятельная подготовка дала новые знания.',effects:{education:4,intelligence:2}},bad:{message:'Вы отложили подготовку и потеряли мотивацию.',effects:{happiness:-5}}}
    ]},
    {id:'v27_data_leak',icon:'🔐',title:'Утечка рабочих данных',text:'Вы заметили ошибку в системе раньше остальных.',choices:[
      {text:'Сразу сообщить',chance:.78,good:{message:'Проблему устранили, руководство вас отметило.',effects:{reputation:8,connections:4,intelligence:2}},bad:{message:'Руководство попыталось сделать вас виноватым.',effects:{reputation:-6,happiness:-7}}},
      {text:'Исправить самостоятельно',chance:.55,good:{message:'Вы незаметно закрыли уязвимость.',effects:{rublesFactor:.35,intelligence:4,reputation:3}},bad:{message:'Исправление сломало часть системы.',effects:{rublesFactor:-.45,reputation:-8}}}
    ]}
  ],
  [
    {id:'v27_supplier',icon:'🚚',title:'Новый поставщик',text:'Поставщик обещает снизить расходы, но отзывов о нём почти нет.',choices:[
      {text:'Заключить договор',chance:.66,good:{message:'Поставки пришли вовремя и бизнес сэкономил.',effects:{rublesFactor:1.0,connections:5,reputation:3}},bad:{message:'Поставщик сорвал сроки и исчез с предоплатой.',effects:{rublesFactor:-.90,reputation:-6}}},
      {text:'Проверить документы',chance:.76,good:{message:'Проверка выявила скрытые риски.',effects:{reputation:5,intelligence:2,connections:2}},bad:{message:'Пока вы проверяли, выгодное предложение ушло конкуренту.',effects:{happiness:-6}}}
    ]},
    {id:'v27_big_order',icon:'📦',title:'Крупный заказ',text:'Новый клиент предлагает заказ, который заметно больше обычного.',choices:[
      {text:'Принять заказ',chance:.64,good:{message:'Команда справилась, прибыль оказалась рекордной.',effects:{rublesFactor:1.35,reputation:7,connections:4}},bad:{message:'Сроки сорваны, пришлось вернуть аванс.',effects:{rublesFactor:-1.0,reputation:-9,happiness:-6}}},
      {text:'Взять только часть',chance:.82,good:{message:'Умеренный заказ выполнен без проблем.',effects:{rublesFactor:.65,reputation:4}},bad:{message:'Клиент остался недоволен ограничениями.',effects:{reputation:-4,connections:-2}}}
    ]},
    {id:'v27_inspection',icon:'🧾',title:'Внеплановая проверка бизнеса',text:'Инспектор просит документы и внимательно изучает расходы.',choices:[
      {text:'Показать документы',chance:.77,good:{message:'Нарушений не нашли.',effects:{reputation:6,influence:2}},bad:{message:'Нашлась ошибка в отчётности.',effects:{rublesFactor:-.75,reputation:-5}}},
      {text:'Нанять консультанта',chance:.86,good:{message:'Консультант быстро урегулировал вопросы.',effects:{rublesFactor:-.30,connections:4,reputation:3}},bad:{message:'Консультант оказался непрофессионалом.',effects:{rublesFactor:-.55,happiness:-5}}}
    ]}
  ],
  [
    {id:'v27_charity',icon:'🤲',title:'Крупная благотворительная акция',text:'Организаторы предлагают стать главным спонсором городского проекта.',choices:[
      {text:'Стать спонсором',chance:.73,good:{message:'Акция получила широкий отклик.',effects:{rublesFactor:-.55,reputation:10,popularity:8,influence:4}},bad:{message:'Организаторов обвинили в непрозрачных расходах.',effects:{rublesFactor:-.55,reputation:-8}}},
      {text:'Помочь организацией',chance:.68,good:{message:'Ваши связи помогли провести акцию без крупных затрат.',effects:{connections:7,reputation:6,popularity:4}},bad:{message:'Организация сорвалась, вас публично раскритиковали.',effects:{reputation:-7,popularity:-5}}}
    ]},
    {id:'v27_investment',icon:'📈',title:'Закрытый инвестиционный раунд',text:'Вам предлагают войти в перспективный проект до публичного запуска.',choices:[
      {text:'Инвестировать',chance:.58,good:{message:'Проект резко вырос в цене.',effects:{rublesFactor:1.4,connections:5,influence:3}},bad:{message:'Проект закрылся после первых проверок.',effects:{rublesFactor:-1.1,reputation:-4}}},
      {text:'Провести аудит',chance:.74,good:{message:'Аудит обнаружил завышенные прогнозы.',effects:{rublesFactor:.25,reputation:5,intelligence:2}},bad:{message:'Аудит затянулся, возможность была упущена.',effects:{happiness:-6}}}
    ]},
    {id:'v27_scandal',icon:'📰',title:'Медийный скандал',text:'В сети распространяют обвинения против одного из ваших проектов.',choices:[
      {text:'Ответить публично',chance:.65,good:{message:'Факты убедили аудиторию.',effects:{popularity:10,reputation:8,influence:3}},bad:{message:'Ответ только усилил скандал.',effects:{popularity:-12,reputation:-10,rublesFactor:-.35}}},
      {text:'Урегулировать тихо',chance:.72,good:{message:'История быстро исчезла из новостей.',effects:{rublesFactor:-.25,reputation:4}},bad:{message:'Молчание сочли признанием вины.',effects:{popularity:-8,reputation:-7}}}
    ]}
  ],
  [
    {id:'v27_city_project',icon:'🏙️',title:'Городской проект',text:'Нужно выбрать подрядчика для важного общественного объекта.',choices:[
      {text:'Провести открытый конкурс',chance:.76,good:{message:'Конкурс прошёл честно, проект поддержали жители.',effects:{reputation:9,popularity:8,influence:5}},bad:{message:'Конкурс затянулся и вызвал недовольство.',effects:{popularity:-6,influence:-3,rublesFactor:-.30}}},
      {text:'Выбрать знакомую компанию',chance:.55,good:{message:'Знакомая команда быстро выполнила работу.',effects:{connections:8,influence:5,rublesFactor:.35}},bad:{message:'Связь с подрядчиком стала поводом для расследования.',effects:{reputation:-12,popularity:-8,rublesFactor:-.65}}}
    ]},
    {id:'v27_lobby',icon:'🤝',title:'Предложение лоббиста',text:'Бизнес-группа обещает поддержку в обмен на выгодное решение.',choices:[
      {text:'Принять поддержку',chance:.57,good:{message:'Сделка укрепила ваши позиции.',effects:{rublesFactor:1.0,connections:9,influence:6,reputation:-3}},bad:{message:'Переговоры попали в прессу.',effects:{reputation:-13,popularity:-9,rublesFactor:-.45}}},
      {text:'Отказаться публично',chance:.70,good:{message:'Принципиальность повысила доверие.',effects:{reputation:10,popularity:7,politicsSkill:2}},bad:{message:'Группа начала кампанию против вас.',effects:{connections:-7,influence:-5,popularity:-4}}}
    ]},
    {id:'v27_hearing',icon:'🎙️',title:'Публичные слушания',text:'Жители требуют немедленного ответа на неудобные вопросы.',choices:[
      {text:'Выйти к людям',chance:.68,good:{message:'Вы убедительно ответили на вопросы.',effects:{popularity:11,reputation:7,politicsSkill:3,charisma:2}},bad:{message:'Ответы показались неубедительными.',effects:{popularity:-10,reputation:-7,happiness:-6}}},
      {text:'Отправить представителя',chance:.62,good:{message:'Представитель спокойно снял напряжение.',effects:{connections:5,influence:3}},bad:{message:'Люди решили, что вы избегаете ответственности.',effects:{popularity:-8,reputation:-5}}}
    ]}
  ],
  [
    {id:'v27_sponsor',icon:'💰',title:'Предвыборный спонсор',text:'Крупный предприниматель предлагает профинансировать часть кампании.',choices:[
      {text:'Принять деньги',chance:.60,good:{message:'Финансирование прошло законно и усилило кампанию.',effects:{rublesFactor:1.15,connections:8,influence:5}},bad:{message:'У спонсора нашли сомнительные связи.',effects:{reputation:-14,popularity:-10,rublesFactor:-.55}}},
      {text:'Отказаться и объявить сбор',chance:.67,good:{message:'Сторонники собрали значительную сумму.',effects:{rublesFactor:.65,popularity:10,reputation:8}},bad:{message:'Сбор оказался слабее ожиданий.',effects:{rublesFactor:-.20,happiness:-7}}}
    ]},
    {id:'v27_leak',icon:'📂',title:'Утечка из штаба',text:'В сеть попал внутренний документ с черновиками стратегии.',choices:[
      {text:'Признать ошибку',chance:.72,good:{message:'Открытость помогла быстро закрыть тему.',effects:{reputation:9,popularity:5,politicsSkill:2}},bad:{message:'Оппоненты использовали признание против вас.',effects:{reputation:-10,popularity:-8}}},
      {text:'Обвинить соперника',chance:.54,good:{message:'Следы действительно привели к штабу соперника.',effects:{influence:7,popularity:8}},bad:{message:'Обвинение оказалось бездоказательным.',effects:{reputation:-13,popularity:-9,rublesFactor:-.30}}}
    ]},
    {id:'v27_rally',icon:'📣',title:'Главный митинг кампании',text:'Площадка переполнена, но техника работает нестабильно.',choices:[
      {text:'Выступать без подготовки',chance:.61,good:{message:'Импровизация стала главным моментом кампании.',effects:{popularity:14,influence:7,charisma:3}},bad:{message:'Сбой сорвал выступление.',effects:{popularity:-12,happiness:-8,rublesFactor:-.35}}},
      {text:'Перенести мероприятие',chance:.74,good:{message:'Новая площадка оказалась ещё лучше.',effects:{popularity:8,reputation:5,rublesFactor:-.20}},bad:{message:'Часть сторонников не пришла повторно.',effects:{popularity:-7,rublesFactor:-.25}}}
    ]}
  ],
  [
    {id:'v27_infrastructure',icon:'🏗️',title:'Национальный инфраструктурный проект',text:'Проект может ускорить экономику, но требует огромных расходов.',choices:[
      {text:'Запустить проект',chance:.66,good:{message:'Стройка началась вовремя и получила поддержку.',effects:{rublesFactor:1.0,popularity:12,influence:8,reputation:6}},bad:{message:'Смета выросла, сроки сорваны.',effects:{rublesFactor:-1.35,popularity:-11,reputation:-9}}},
      {text:'Сначала провести аудит',chance:.78,good:{message:'Аудит сократил будущие расходы.',effects:{rublesFactor:.45,reputation:7,intelligence:2}},bad:{message:'Из-за задержки регионы потеряли доверие.',effects:{popularity:-7,influence:-4}}}
    ]},
    {id:'v27_diplomacy',icon:'🌍',title:'Дипломатический кризис',text:'Партнёрская страна требует срочной реакции.',choices:[
      {text:'Провести переговоры лично',chance:.69,good:{message:'Переговоры завершились выгодным соглашением.',effects:{rublesFactor:1.15,influence:10,reputation:8,connections:6}},bad:{message:'Переговоры зашли в тупик.',effects:{rublesFactor:-.75,influence:-8,reputation:-7}}},
      {text:'Ввести ответные меры',chance:.56,good:{message:'Жёсткая позиция заставила партнёров уступить.',effects:{influence:9,popularity:8,rublesFactor:.55}},bad:{message:'Ответные меры ударили по экономике.',effects:{rublesFactor:-1.1,popularity:-9,happiness:-6}}}
    ]},
    {id:'v27_address',icon:'📺',title:'Обращение к стране',text:'Нужно объяснить населению непопулярные решения правительства.',choices:[
      {text:'Говорить прямо',chance:.71,good:{message:'Честный разговор укрепил доверие.',effects:{popularity:13,reputation:10,charisma:3}},bad:{message:'Объяснение прозвучало слишком жёстко.',effects:{popularity:-11,happiness:-7}}},
      {text:'Сделать оптимистичную речь',chance:.62,good:{message:'Речь вернула людям уверенность.',effects:{popularity:10,happiness:8,influence:5}},bad:{message:'Обещания показались пустыми.',effects:{reputation:-12,popularity:-8}}}
    ]}
  ]
];
function showEventToastV27(text) {
  const el=document.getElementById('toast');
  if(!el)return;
  el.textContent=text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),4200);
}
triggerRandomEvent = function() {
  const chapter=Math.max(0,Math.min(7,Number(state.chapterIndex)||0));
  let pool=(chapterEventsV27[chapter]||[]).filter(event=>event.id!==state.lastEventId);
  if(!pool.length)pool=chapterEventsV27[chapter]||[];
  if(!pool.length)return;
  const event=pool[random(0,pool.length-1)];
  state.lastEventId=event.id;
  openModal(event.icon,event.title,event.text,event.choices.map(choice=>({
    text:choice.text,
    onClick:()=>{
      closeModal(true);
      const success=Math.random()<eventChanceV27(choice.chance);
      const outcome=success?choice.good:choice.bad;
      const result=eventOutcomeV27(outcome.message,outcome.effects);
      state.luck=v2ClampSkill(state.luck+.2);
      normalize();
      recalcChapter();
      const critical=syncCriticalStates();
      saveState();
      renderAll();
      showEventToastV27(result);
      if(critical.length)setTimeout(()=>showCriticalWarning(critical),250);
    }
  })),{locked:true});
};

// Re-render with v2.7 rules and update help copy.
const helpV27=document.getElementById('helpButton');
if(helpV27)helpV27.onclick=()=>openModal('💡','Как играть в v2.7','Случайные события теперь зависят от текущей главы. Каждый из двух вариантов может дать хороший или плохой результат, но вероятность скрыта. Должности внутри каждой карьерной ветки открываются только по порядку. Предпринимательство растёт только при покупке активов, покупке бизнеса и его улучшении. Участие в президентских выборах стоит 100 000 000 ₽.',[]);
normalize();
renderAll();


// ========================= v2.8.1 — onboarding, action categories and full in-game guide =========================
const savedBeforeV28 = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
  catch { return null; }
})();
if (savedBeforeV28 && !Object.prototype.hasOwnProperty.call(savedBeforeV28,'tutorialCompleted')) {
  // Existing players are not forced through onboarding after updating.
  state.tutorialCompleted = true;
  state.tutorialStep = 0;
}
if (typeof state.tutorialCompleted !== 'boolean') state.tutorialCompleted = !!state.difficultyChosen;
if (!Number.isFinite(Number(state.tutorialStep))) state.tutorialStep = 0;
saveState();

const tutorialStepsV28 = [
  {
    screen:'home', selector:null, icon:'👋', title:'Добро пожаловать',
    text:'Ваша цель — пройти путь от жизни на улице до президентства. Обучение покажет основные экраны и ничего не потратит.'
  },
  {
    screen:'home', selector:'.hero-card', icon:'🧔', title:'Текущая глава',
    text:'Глава показывает ваш этап жизни. Новые работы, события и возможности открываются постепенно.'
  },
  {
    screen:'home', selector:'.money-grid', icon:'💰', title:'Деньги и валюта',
    text:'Рубли нужны почти для всех покупок. Доллары можно заработать на зарубежных заказах или купить через обмен валют.'
  },
  {
    screen:'home', selector:'#statsList', icon:'❤️', title:'Главные показатели',
    text:'Следите за здоровьем, сытостью и счастьем. Если любой показатель непрерывно останется на нуле слишком долго, персонаж погибнет.'
  },
  {
    screen:'actions', category:'food', selector:'#categoryRow', icon:'⚡', title:'Меню действий',
    text:'Здесь находятся семь разделов действий. Сейчас обучение по очереди покажет, для чего нужен каждый из них.'
  },
  {
    screen:'actions', category:'food', selector:'#categoryRow [data-category="food"]', icon:'🍔', title:'Раздел «Еда»',
    text:'Еда восстанавливает сытость. Дешёвые варианты слабее и иногда вредят здоровью, а дорогие дают больше сытости и дополнительных бонусов.'
  },
  {
    screen:'actions', category:'work', selector:'#categoryRow [data-category="work"]', icon:'💼', title:'Раздел «Работа»',
    text:'Здесь находятся разовые подработки и смена на постоянной работе. Работа приносит деньги, расходует состояние и развивает подходящий навык.'
  },
  {
    screen:'actions', category:'health', selector:'#categoryRow [data-category="health"]', icon:'❤️', title:'Раздел «Здоровье»',
    text:'Лечение восстанавливает здоровье. Более эффективные способы стоят дороже, а некоторые также требуют времени или подходящей главы.'
  },
  {
    screen:'actions', category:'fun', selector:'#categoryRow [data-category="fun"]', icon:'🎮', title:'Раздел «Развлечения»',
    text:'Развлечения повышают счастье, но обычно тратят деньги, время, сытость и иногда здоровье. Используйте их, когда настроение падает.'
  },
  {
    screen:'actions', category:'education', selector:'#categoryRow [data-category="education"]', icon:'🎓', title:'Раздел «Учёба»',
    text:'Учёба повышает образование и интеллект. Эти показатели нужны для новых глав, квалифицированных должностей и более выгодной работы.'
  },
  {
    screen:'actions', category:'media', selector:'#categoryRow [data-category="media"]', icon:'📣', title:'Раздел «Популярность»',
    text:'Медийные действия повышают популярность, а часть из них развивает харизму и репутацию. Они особенно важны в поздних главах.'
  },
  {
    screen:'actions', category:'politics', selector:'#categoryRow [data-category="politics"]', icon:'🏛️', title:'Раздел «Политика»',
    text:'Политические действия дают влияние, связи и навык политики. Новые действия этого раздела открываются по мере продвижения по главам.'
  },
  {
    screen:'actions', category:'food', selector:'#actionsList .action-card', icon:'🍞', title:'Карточки действий',
    text:'Нажмите на карточку, чтобы выполнить действие. На ней указаны время, стоимость или доход, требования и изменения показателей.'
  },
  {
    screen:'home', selector:'.property-hub-panel', icon:'🏠', title:'Жильё, предметы и активы',
    text:'Жильё помогает пройти главы, предметы дают постоянные бонусы, а активы приносят ежедневный доход.'
  },
  {
    screen:'career', selector:'.career-summary', icon:'📈', title:'Карьера',
    text:'Во вкладке «Карьера» видны текущая ступень, работа и доступные должности. Должности внутри ветки открываются по порядку.'
  },
  {
    screen:'business', selector:'#businessList', icon:'🏢', title:'Бизнес',
    text:'Бизнесы можно покупать и улучшать. Они автоматически приносят доход каждый новый игровой день.'
  },
  {
    screen:'profile', selector:'#developmentStats', icon:'🧠', title:'Развитие персонажа',
    text:'В профиле собраны образование, репутация, связи, популярность, влияние и шесть навыков. Они открывают новые возможности.'
  },
  {
    screen:'home', selector:'.detailed-goal-panel', icon:'🎯', title:'Прогресс главы',
    text:'Внизу главной страницы показаны все условия перехода. Нажатие на невыполненную цель ведёт к подходящему разделу.'
  },
  {
    screen:'home', selector:'#helpButton', icon:'?', title:'Справка всегда рядом',
    text:'Кнопка «?» открывает полную справку: где получать каждый показатель, как работают главы, карьера, бизнес, события и выборы.'
  }
];

function ensureV28Ui(){
  if(!document.getElementById('tutorialOverlayV28')){
    const tutorial=document.createElement('div');
    tutorial.id='tutorialOverlayV28';
    tutorial.className='tutorial-overlay-v28 hidden';
    tutorial.innerHTML=`
      <div class="tutorial-spotlight-v28" id="tutorialSpotlightV28"></div>
      <section class="tutorial-card-v28" role="dialog" aria-modal="true" aria-labelledby="tutorialTitleV28">
        <div class="tutorial-top-v28">
          <span class="tutorial-counter-v28" id="tutorialCounterV28">1/${tutorialStepsV28.length}</span>
          <button class="tutorial-skip-v28" id="tutorialSkipV28">Пропустить</button>
        </div>
        <div class="tutorial-icon-v28" id="tutorialIconV28">👋</div>
        <h2 id="tutorialTitleV28">Добро пожаловать</h2>
        <p id="tutorialTextV28"></p>
        <div class="tutorial-actions-v28">
          <button class="tutorial-back-v28" id="tutorialBackV28">Назад</button>
          <button class="tutorial-next-v28" id="tutorialNextV28">Далее</button>
        </div>
      </section>`;
    document.body.appendChild(tutorial);
    document.getElementById('tutorialSkipV28').onclick=()=>finishTutorialV28(true);
    document.getElementById('tutorialBackV28').onclick=()=>showTutorialStepV28(Math.max(0,(Number(state.tutorialStep)||0)-1));
    document.getElementById('tutorialNextV28').onclick=()=>{
      const next=(Number(state.tutorialStep)||0)+1;
      if(next>=tutorialStepsV28.length) finishTutorialV28(false);
      else showTutorialStepV28(next);
    };
  }
  if(!document.getElementById('helpCenterV28')){
    const help=document.createElement('div');
    help.id='helpCenterV28';
    help.className='help-center-backdrop-v28 hidden';
    help.innerHTML=`
      <section class="help-center-v28" role="dialog" aria-modal="true" aria-labelledby="helpTitleV28">
        <header class="help-header-v28">
          <div><small>Справочник v2.8.1</small><h2 id="helpTitleV28">Как устроена игра</h2></div>
          <button class="help-close-v28" id="helpCloseV28" aria-label="Закрыть">×</button>
        </header>
        <nav class="help-nav-v28" aria-label="Разделы справки">
          <button data-help-jump="help-start">Начало</button>
          <button data-help-jump="help-stats">Показатели</button>
          <button data-help-jump="help-skills">Навыки</button>
          <button data-help-jump="help-career">Карьера</button>
          <button data-help-jump="help-money">Доход</button>
          <button data-help-jump="help-election">Выборы</button>
        </nav>
        <div class="help-content-v28">
          <section class="help-section-v28" id="help-start">
            <h3>🎯 Цель и главы</h3>
            <p>Главная цель — пройти 8 глав: <strong>Бомж → Работяга → Специалист → Предприниматель → Влиятельный человек → Политик → Кандидат в президенты → Президент</strong>.</p>
            <p>Для перехода нужно выполнить все условия подробного прогресса и провести в главе минимальное количество дней. Требования зависят от сложности.</p>
          </section>
          <section class="help-section-v28">
            <h3>🕒 Время и выживание</h3>
            <p>Каждое действие занимает игровые часы. После завершения суток начисляются доходы активов и бизнесов, списываются расходы жилья и создаётся дневной отчёт.</p>
            <p>Энергии нет. Ограничители — время, деньги и три показателя состояния. На лёгкой сложности смерть наступает после 36 часов непрерывного нуля, на остальных — после 24 часов.</p>
          </section>
          <section class="help-section-v28" id="help-stats">
            <h3>❤️ Состояние</h3>
            <div class="help-grid-v28">
              <div><b>Здоровье</b><span>Повышают лечение, качественная еда, хорошее жильё и удачные события. Снижают тяжёлая работа, болезни и рискованные действия.</span></div>
              <div><b>Сытость</b><span>Повышается едой. Почти любая работа и долгое действие расходуют сытость.</span></div>
              <div><b>Счастье</b><span>Повышают развлечения, комфорт, хорошие события и успехи. Снижают неудачи, тяжёлая работа и плохие условия.</span></div>
            </div>
          </section>
          <section class="help-section-v28">
            <h3>📊 Основные очки развития</h3>
            <div class="help-grid-v28">
              <div><b>Образование</b><span>Получается во вкладке «Учёба», на курсах и в некоторых событиях. Нужно для квалифицированных должностей.</span></div>
              <div><b>Репутация</b><span>Растёт от честных решений, общественно полезных действий и удачных событий. Важна для карьеры и политики.</span></div>
              <div><b>Связи</b><span>Даются знакомствами, персонажами, карьерными и политическими событиями. Открывают возможности и усиливают выборы.</span></div>
              <div><b>Популярность</b><span>Основной источник — категория «Популярность», медийная работа и публичные события.</span></div>
              <div><b>Влияние</b><span>Получается политическими действиями, должностями и событиями поздних глав.</span></div>
            </div>
          </section>
          <section class="help-section-v28" id="help-skills">
            <h3>🧠 Шесть навыков</h3>
            <div class="help-grid-v28">
              <div><b>Сила</b><span>Растёт от физической работы и тяжёлых действий. Нужна для ветки физического труда.</span></div>
              <div><b>Интеллект</b><span>Растёт от учёбы, интеллектуальной и офисной работы. Нужен для квалифицированных профессий и IT.</span></div>
              <div><b>Харизма</b><span>Растёт от медийной работы, выступлений и отдельных событий. Помогает на собеседованиях и в общении.</span></div>
              <div><b>Предпринимательство</b><span>Растёт только при покупке активов, покупке бизнеса и улучшении бизнеса.</span></div>
              <div><b>Политика</b><span>Растёт от политической работы, политических действий и событий. Нужна для поздних глав и выборов.</span></div>
              <div><b>Удача</b><span>Медленно растёт после случайных событий и редких удачных возможностей. Незаметно улучшает отдельные исходы.</span></div>
            </div>
          </section>
          <section class="help-section-v28" id="help-career">
            <h3>💼 Работа и карьера</h3>
            <p>Работу получают через собеседование. Учитываются требования должности, навык ветки, харизма, репутация, персонажи и сложность.</p>
            <p>Должности внутри каждой ветки открываются строго по порядку. Текущая работа показывается первой в категории «Работа». Смена приносит зарплату и развивает профильный навык, но не предпринимательство.</p>
            <p>Три предупреждения приводят к увольнению. Зарплата одной должности одинакова во всех местах интерфейса, но отличается между уровнями сложности.</p>
          </section>
          <section class="help-section-v28" id="help-money">
            <h3>💰 Деньги, имущество и доход</h3>
            <div class="help-grid-v28">
              <div><b>Рубли</b><span>Работа, подработки, активы, бизнесы и события. Тратятся на еду, жильё, предметы, развитие и выборы.</span></div>
              <div><b>Доллары</b><span>Зарубежные заказы и обмен валют. Курс меняется каждый день; купить и продать валюту можно на главной.</span></div>
              <div><b>Жильё</b><span>Даёт комфорт и ежедневные расходы. Первое жильё необходимо для выхода из начальной главы.</span></div>
              <div><b>Предметы</b><span>Дают постоянные бонусы и открывают отдельные профессии или действия.</span></div>
              <div><b>Активы</b><span>Покупаются за рубли, ежедневно приносят пассивный доход и повышают предпринимательство.</span></div>
              <div><b>Бизнесы</b><span>Их можно купить и улучшать до 5 уровня. Доход растёт вместе с уровнем и начисляется ежедневно.</span></div>
            </div>
          </section>
          <section class="help-section-v28">
            <h3>🎲 Случайные события и персонажи</h3>
            <p>У каждой главы собственные события. В каждом событии два решения, и любое может привести к хорошему или плохому результату. Вероятности скрыты.</p>
            <p>Отношения с персонажами дают бонусы при +25 и усиленные бонусы при +60. Отрицательные отношения дают штрафы. Персонажи открываются постепенно.</p>
          </section>
          <section class="help-section-v28">
            <h3>📒 Дневные отчёты</h3>
            <p>В начале нового дня появляется краткий итог предыдущего дня. Последний отчёт виден в профиле, полный журнал открывается кнопкой «Весь журнал».</p>
          </section>
          <section class="help-section-v28" id="help-election">
            <h3>🗳️ Президентские выборы</h3>
            <p>Выборы открываются в главе кандидата после выполнения требований. Участие стоит <strong>100 000 000 ₽</strong>.</p>
            <p>Кампания состоит из нескольких решений. На итог влияют популярность, репутация, влияние, связи, политика, бюджет, предметы, персонажи и выбранные стратегии.</p>
          </section>
          <section class="help-section-v28">
            <h3>🎮 Сложность и сохранение</h3>
            <p><strong>Лёгкая:</strong> выше доходы, ниже цены и медленнее ухудшение состояния. <strong>Нормальная:</strong> рекомендуемый баланс. <strong>Сложная:</strong> ниже доходы и выше требования. <strong>Выживание:</strong> самая жёсткая экономика и наиболее долгое прохождение.</p>
            <p>Прогресс сохраняется автоматически в браузере. Сохранения GitHub Pages и локальной версии раздельные, потому что они открываются с разных адресов.</p>
          </section>
        </div>
        <footer class="help-footer-v28">
          <button class="help-tutorial-v28" id="helpTutorialV28">Пройти обучение заново</button>
          <button class="help-done-v28" id="helpDoneV28">Понятно</button>
        </footer>
      </section>`;
    document.body.appendChild(help);
    document.getElementById('helpCloseV28').onclick=closeHelpCenterV28;
    document.getElementById('helpDoneV28').onclick=closeHelpCenterV28;
    document.getElementById('helpTutorialV28').onclick=()=>{closeHelpCenterV28();startTutorialV28(true);};
    help.addEventListener('click',event=>{
      const jump=event.target.closest('[data-help-jump]');
      if(jump){document.getElementById(jump.dataset.helpJump)?.scrollIntoView({behavior:'smooth',block:'start'});}
      else if(event.target===help)closeHelpCenterV28();
    });
  }
}

function openHelpCenterV28(){
  ensureV28Ui();
  const help=document.getElementById('helpCenterV28');
  help.classList.remove('hidden');
  document.body.classList.add('overlay-open-v28');
  help.querySelector('.help-content-v28').scrollTop=0;
}
function closeHelpCenterV28(){
  document.getElementById('helpCenterV28')?.classList.add('hidden');
  document.body.classList.remove('overlay-open-v28');
}
function startTutorialV28(force=false){
  if(state.gameOver || (!force && state.tutorialCompleted) || !state.difficultyChosen)return;
  ensureV28Ui();
  state.tutorialStep=0;
  saveState();
  document.getElementById('tutorialOverlayV28').classList.remove('hidden');
  document.body.classList.add('overlay-open-v28');
  showTutorialStepV28(0);
}
function finishTutorialV28(skipped=false){
  state.tutorialCompleted=true;
  state.tutorialStep=0;
  saveState();
  document.getElementById('tutorialOverlayV28')?.classList.add('hidden');
  document.body.classList.remove('overlay-open-v28');
  switchScreen('home');
  if(!skipped)showToast('Обучение завершено');
}
function scheduleTutorialV28(){
  let attempts=0;
  const wait=()=>{
    if(state.tutorialCompleted || !state.difficultyChosen)return;
    const modalOpen=!document.getElementById('modalBackdrop')?.classList.contains('hidden');
    if(!modalOpen){startTutorialV28();return;}
    if(attempts++<240)setTimeout(wait,250);
  };
  setTimeout(wait,250);
}
function tutorialTargetV28(step){
  if(!step?.selector)return null;
  return document.querySelector(step.selector);
}
function positionTutorialV28(){
  const overlay=document.getElementById('tutorialOverlayV28');
  if(!overlay || overlay.classList.contains('hidden'))return;
  const step=tutorialStepsV28[Number(state.tutorialStep)||0];
  const target=tutorialTargetV28(step);
  const spot=document.getElementById('tutorialSpotlightV28');
  if(!target){
    spot.classList.add('no-target');
    spot.style.cssText='';
    return;
  }
  const rect=target.getBoundingClientRect();
  const pad=7;
  spot.classList.remove('no-target');
  spot.style.left=`${Math.max(7,rect.left-pad)}px`;
  spot.style.top=`${Math.max(7,rect.top-pad)}px`;
  spot.style.width=`${Math.max(24,Math.min(window.innerWidth-14,rect.width+pad*2))}px`;
  spot.style.height=`${Math.max(24,Math.min(window.innerHeight-14,rect.height+pad*2))}px`;
  spot.style.borderRadius=getComputedStyle(target).borderRadius||'18px';
}
function showTutorialStepV28(index){
  ensureV28Ui();
  const safe=Math.max(0,Math.min(tutorialStepsV28.length-1,index));
  state.tutorialStep=safe;
  saveState();
  const step=tutorialStepsV28[safe];
  if(step.category){selectedCategory=step.category;renderActions();}
  if(step.screen)switchScreen(step.screen);
  document.getElementById('tutorialCounterV28').textContent=`${safe+1}/${tutorialStepsV28.length}`;
  document.getElementById('tutorialIconV28').textContent=step.icon;
  document.getElementById('tutorialTitleV28').textContent=step.title;
  document.getElementById('tutorialTextV28').textContent=step.text;
  document.getElementById('tutorialBackV28').disabled=safe===0;
  document.getElementById('tutorialNextV28').textContent=safe===tutorialStepsV28.length-1?'Завершить':'Далее';
  setTimeout(()=>{
    const target=tutorialTargetV28(step);
    if(target){
      if(target.closest('#categoryRow')){
        target.scrollIntoView({behavior:'auto',block:'nearest',inline:'center'});
      }else if(!target.closest('.topbar') && !target.closest('.bottom-nav')){
        target.scrollIntoView({behavior:'auto',block:'center',inline:'nearest'});
      }
    }
    requestAnimationFrame(positionTutorialV28);
  },80);
}

const setDifficultyV28Base=setDifficulty;
setDifficulty=function(id){
  setDifficultyV28Base(id);
  scheduleTutorialV28();
};
const restartGameV28Base=restartGame;
restartGame=function(){
  restartGameV28Base();
  state.tutorialCompleted=false;
  state.tutorialStep=0;
  saveState();
};

ensureV28Ui();
const helpButtonV28=document.getElementById('helpButton');
if(helpButtonV28)helpButtonV28.onclick=openHelpCenterV28;
window.addEventListener('resize',()=>requestAnimationFrame(positionTutorialV28));
window.addEventListener('scroll',()=>requestAnimationFrame(positionTutorialV28),{passive:true});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!document.getElementById('helpCenterV28')?.classList.contains('hidden'))closeHelpCenterV28();
});
if(state.difficultyChosen && !state.tutorialCompleted)scheduleTutorialV28();
normalize();
renderAll();


// ========================= v2.8.2 — stable rapid taps on mobile =========================
(function setupStableMobileInteractionV282(){
  const isTouchDevice = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  if(!isTouchDevice) return;

  let lastTouchY = 0;
  const innerScrollerSelector = '.modal,.help-content-v28,.tutorial-card-v28';

  document.addEventListener('touchstart', event => {
    if(event.touches.length === 1) lastTouchY = event.touches[0].clientY;
  }, {passive:true});

  document.addEventListener('touchmove', event => {
    if(event.touches.length !== 1) return;
    const currentY = event.touches[0].clientY;
    const deltaY = currentY - lastTouchY;
    lastTouchY = currentY;

    // Horizontal action categories keep their native horizontal swipe.
    if(event.target.closest('.category-row')) return;

    const inner = event.target.closest(innerScrollerSelector);
    if(inner){
      const atTop = inner.scrollTop <= 0;
      const atBottom = inner.scrollTop + inner.clientHeight >= inner.scrollHeight - 1;
      if((atTop && deltaY > 0) || (atBottom && deltaY < 0)) event.preventDefault();
      return;
    }

    const page = document.scrollingElement || document.documentElement;
    const atTop = page.scrollTop <= 0;
    const atBottom = page.scrollTop + page.clientHeight >= page.scrollHeight - 1;
    if((atTop && deltaY > 0) || (atBottom && deltaY < 0)) event.preventDefault();
  }, {passive:false});

  // Safari gesture events may still try to zoom the WebView despite the viewport meta tag.
  document.addEventListener('gesturestart', event => event.preventDefault(), {passive:false});
})();

// Full UI redraws happen after nearly every action. Preserve the scroll position so
// replacing the tapped card does not make the page jump under the user's finger.
const renderAllBeforeV282 = renderAll;
renderAll = function(...args){
  const page = document.scrollingElement || document.documentElement;
  const previousY = page.scrollTop;
  const previousScreen = document.querySelector('.screen.active')?.dataset.screen || '';
  const result = renderAllBeforeV282.apply(this,args);
  const currentScreen = document.querySelector('.screen.active')?.dataset.screen || '';
  if(previousScreen && previousScreen === currentScreen){
    page.scrollTop = previousY;
    requestAnimationFrame(()=>{
      const maxY = Math.max(0,page.scrollHeight-page.clientHeight);
      page.scrollTop = Math.min(previousY,maxY);
    });
  }
  return result;
};

// ========================= v2.8.3 — interview cooldowns and harder elections =========================
const INTERVIEW_COOLDOWN_DAYS_V283 = { easy:1, normal:2, hard:3, survival:4 };
const ELECTION_BALANCE_V283 = {
  easy:     {stageBonus:.07, finalBonus:7,  maxWinChance:78, banDays:10},
  normal:   {stageBonus:0,   finalBonus:0,  maxWinChance:68, banDays:14},
  hard:     {stageBonus:-.06,finalBonus:-8, maxWinChance:58, banDays:18},
  survival: {stageBonus:-.12,finalBonus:-14,maxWinChance:50, banDays:22}
};

function interviewCooldownKeyV283(branchId,level){return `${branchId}:${level}`;}
function interviewCooldownDaysV283(){return INTERVIEW_COOLDOWN_DAYS_V283[state.difficulty]||2;}
function interviewCooldownRemainingV283(branchId,level){
  const until=Number(state.interviewCooldowns?.[interviewCooldownKeyV283(branchId,level)])||0;
  return Math.max(0,Math.ceil(until-(Number(state.day)||1)));
}

const normalizeBeforeV283=normalize;
normalize=function(){
  normalizeBeforeV283();
  state.interviewCooldowns=state.interviewCooldowns&&typeof state.interviewCooldowns==='object'?state.interviewCooldowns:{};
  Object.keys(state.interviewCooldowns).forEach(key=>{
    const until=Math.max(0,Math.round(Number(state.interviewCooldowns[key])||0));
    if(!until || until<=state.day)delete state.interviewCooldowns[key];
    else state.interviewCooldowns[key]=until;
  });
};

interviewJob=function(branchId,level){
  if(state.gameOver)return;
  const branch=careerBranchesV2[branchId];
  const job=branch?.jobs[level-1];
  if(!job)return;
  const cooldown=interviewCooldownRemainingV283(branchId,level);
  if(cooldown>0){showToast(`Повторное собеседование через ${cooldown} дн.`);return;}
  if(!previousCareerStepDoneV27(branchId,level)){
    const previous=branch.jobs[level-2]?.name||'предыдущую должность';
    showToast(`Сначала получите должность «${previous}»`);return;
  }
  if(!requirementMet(job.req)){showToast(`Нужно: ${requirementText(job.req)}`);return;}
  const relation=(state.relations.sergey||0)*.12+(state.relations.irina||0)*.08;
  const skill=state[branch.skill]||0;
  let probability=48+difficultyCfg().interview+skill*.45+state.charisma*.22+state.reputation*.18+relation;
  if(state.inventory?.suit)probability+=15;
  if((state.jobLevels[branchId]||0)>=level-1)probability+=7;
  probability=Math.max(12,Math.min(92,probability));
  advanceTime(state.inventory?.car?2:3);
  if(state.gameOver)return;
  const key=interviewCooldownKeyV283(branchId,level);
  if(Math.random()*100<probability){
    state.currentJob={branch:branchId,level,name:job.name,salary:job.salary};
    state.jobLevels[branchId]=Math.max(state.jobLevels[branchId]||0,level);
    state.jobExperience=0;state.jobWarnings=0;
    state.connections=clamp(state.connections+1);
    delete state.interviewCooldowns[key];
    showToast(`Вы приняты: ${job.name}`);
  }else{
    const wait=interviewCooldownDaysV283();
    state.interviewCooldowns[key]=state.day+wait;
    state.happiness=clamp(state.happiness-5);
    showToast(`Отказ. Повторная попытка через ${wait} дн.`);
  }
  recalcChapter();saveState();renderAll();
};

const renderCareerBeforeV283=renderCareer;
renderCareer=function(){
  renderCareerBeforeV283();
  const branchId=state.selectedBranch;
  const branch=careerBranchesV2[branchId]||careerBranchesV2.labor;
  const currentJob=state.currentJob;
  const list=document.getElementById('jobList');
  if(!list)return;
  list.innerHTML=branch.jobs.map((position,index)=>{
    const level=index+1;
    const current=currentJob?.branch===branchId&&Number(currentJob.level)===level;
    const previousDone=previousCareerStepDoneV27(branchId,level);
    const requirementsDone=requirementMet(position.req);
    const cooldown=interviewCooldownRemainingV283(branchId,level);
    const available=previousDone&&requirementsDone&&cooldown===0;
    const salary=jobSalaryV22(position,branchId);
    let subtitle='Шанс зависит от навыков, репутации, одежды и сложности.';
    if(!previousDone)subtitle=`Сначала получите должность «${branch.jobs[index-1].name}»`;
    else if(!requirementsDone)subtitle=`Нужно: ${requirementText(position.req)}`;
    else if(cooldown>0)subtitle=`После отказа нужно подождать. Доступно через ${cooldown} дн.`;
    const buttonText=current?'Текущая работа':cooldown>0?`Повторно через ${cooldown} дн.`:'Пройти собеседование';
    return `<article class="buy-card ${!available&&!current?'unavailable':''}"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${branch.icon}</div><div><div class="card-title">${position.name}</div><div class="card-subtitle">${subtitle}</div></div></div><div class="price">${fmt(salary)} ₽</div></div><button class="buy-button" data-interview="${branchId}:${level}" ${!available||current?'disabled':''}>${buttonText}</button></article>`;
  }).join('');
};

function electionConfigV283(){return ELECTION_BALANCE_V283[state.difficulty]||ELECTION_BALANCE_V283.normal;}
function electionCampaignStateTextV283(c){
  if(c.score>=22)return 'Кампания набрала сильный темп.';
  if(c.score>=8)return 'Кампания проходит уверенно, но исход не решён.';
  if(c.score>-8)return 'Кампания идёт нестабильно.';
  return 'Кампания серьёзно отстаёт от соперника.';
}
function electionResolveChoiceV283(c,baseChance,successPoints,failPoints,successText,failText){
  const probability=Math.max(.18,Math.min(.84,baseChance+electionConfigV283().stageBonus));
  const success=Math.random()<probability;
  if(success){c.score+=successPoints;c.history.push(`✅ ${successText}`);}
  else{c.score+=failPoints;c.mistakes++;c.history.push(`❌ ${failText}`);}
  return success;
}
function electionModalV283(icon,title,text,choices){
  openModal(icon,title,text,choices,{locked:true});
}
function electionStageIntroV283(c){
  electionModalV283('📜','1/8 — Предвыборная программа',`Ваш главный соперник — ${c.rival.name}. Выберите программу, которой сможете соответствовать.`,[
    {text:'Социальные реформы',onClick:()=>{electionResolveChoiceV283(c,.40+state.reputation/320+state.charisma/450,7,-5,'программа вызвала доверие','обещания сочли нереалистичными');electionStageTeamV283(c);}},
    {text:'Экономический рост',onClick:()=>{electionResolveChoiceV283(c,.38+state.entrepreneurship/330+state.intelligence/350,8,-6,'экономическая программа убедила избирателей','план раскритиковали эксперты');electionStageTeamV283(c);}}
  ]);
}
function electionStageTeamV283(c){
  const professionalCost=15000000;
  electionModalV283('👥','2/8 — Избирательный штаб',`${electionCampaignStateTextV283(c)}\n\nСильный штаб уменьшает количество ошибок, но требует дополнительных денег.`,[
    {text:`Нанять политтехнологов — ${fmt(professionalCost)} ₽`,disabled:state.rubles<professionalCost,onClick:()=>{spend(professionalCost);electionResolveChoiceV283(c,.67+state.connections/600,8,-4,'штаб выстроил дисциплинированную кампанию','между консультантами начался конфликт');electionStageRegionsV283(c);}},
    {text:'Собрать волонтёров',onClick:()=>{electionResolveChoiceV283(c,.43+state.popularity/360+state.reputation/600,6,-7,'волонтёры создали движение снизу','волонтёры не справились с масштабом');electionStageRegionsV283(c);}}
  ]);
}
function electionStageRegionsV283(c){
  electionModalV283('🗺️','3/8 — Поездки по регионам',`${electionCampaignStateTextV283(c)}\n\nКуда направить основные силы?`,[
    {text:'Бороться за колеблющиеся регионы',onClick:()=>{electionResolveChoiceV283(c,.36+state.politicsSkill/310+state.connections/520,10,-9,'удалось привлечь новых сторонников','поездка закончилась серией провальных встреч');electionStageFundingV283(c);}},
    {text:'Укрепить свои регионы',onClick:()=>{electionResolveChoiceV283(c,.58+state.popularity/650,5,-4,'сторонники стали активнее','явка сторонников осталась низкой');electionStageFundingV283(c);}}
  ]);
}
function electionStageFundingV283(c){
  electionModalV283('💰','4/8 — Финансирование',`${electionCampaignStateTextV283(c)}\n\nИсточник денег повлияет на доверие к кандидату.`,[
    {text:'Принять помощь крупного бизнеса',onClick:()=>{const ok=electionResolveChoiceV283(c,.40+state.connections/350+state.entrepreneurship/500,10,-11,'спонсоры обеспечили сильную рекламу','связь со спонсорами вызвала скандал');if(!ok)c.reputationPenalty+=6;electionStageMediaV283(c);}},
    {text:'Собирать небольшие пожертвования',onClick:()=>{electionResolveChoiceV283(c,.48+state.popularity/470+state.reputation/650,7,-6,'народное финансирование стало символом кампании','сбор средств оказался слишком слабым');electionStageMediaV283(c);}}
  ]);
}
function electionStageMediaV283(c){
  electionModalV283('📺','5/8 — Медийная кампания',`${electionCampaignStateTextV283(c)}\n\nВыберите тон основной рекламной волны.`,[
    {text:'Позитивная кампания',onClick:()=>{electionResolveChoiceV283(c,.47+state.charisma/340+state.reputation/600+(state.inventory?.phone ? .04 : 0),7,-6,'позитивные ролики усилили доверие','кампания оказалась незаметной');electionStageCrisisV283(c);}},
    {text:'Атаковать соперника',onClick:()=>{const ok=electionResolveChoiceV283(c,.30+state.politicsSkill/330+state.luck/600,12,-13,'расследование серьёзно ударило по сопернику','атака обернулась против кандидата');if(!ok)c.reputationPenalty+=8;electionStageCrisisV283(c);}}
  ]);
}
function electionStageCrisisV283(c){
  electionModalV283('⚠️','6/8 — Предвыборный скандал',`${electionCampaignStateTextV283(c)}\n\nЖурналисты нашли спорные расходы вашего штаба.`,[
    {text:'Опубликовать все документы',onClick:()=>{electionResolveChoiceV283(c,.43+state.reputation/300+state.education/600,8,-7,'открытость остановила скандал','в документах нашли новые нарушения');electionStageDebateV283(c);}},
    {text:'Перевести внимание на соперника',onClick:()=>{const ok=electionResolveChoiceV283(c,.32+state.charisma/360+state.politicsSkill/500,10,-12,'информационную повестку удалось перехватить','уклонение от ответа усилило подозрения');if(!ok)c.reputationPenalty+=7;electionStageDebateV283(c);}}
  ]);
}
function electionStageDebateV283(c){
  electionModalV283('🎤','7/8 — Финальные дебаты',`${electionCampaignStateTextV283(c)}\n\nФинальные дебаты смотрит вся страна.`,[
    {text:'Говорить фактами',onClick:()=>{electionResolveChoiceV283(c,.37+state.intelligence/330+state.education/420+state.politicsSkill/600,10,-9,'вы уверенно выиграли спор по существу','ответы показались сухими и неубедительными');electionStageTurnoutV283(c);}},
    {text:'Давить харизмой',onClick:()=>{electionResolveChoiceV283(c,.39+state.charisma/300+state.popularity/650+(state.inventory?.suit ? .05 : 0),10,-10,'яркое выступление запомнилось зрителям','эмоциональность сочли пустыми обещаниями');electionStageTurnoutV283(c);}}
  ]);
}
function electionStageTurnoutV283(c){
  electionModalV283('🗳️','8/8 — День голосования',`${electionCampaignStateTextV283(c)}\n\nПоследнее решение штаба определит явку.`,[
    {text:'Мобилизовать ядро сторонников',onClick:()=>{electionResolveChoiceV283(c,.38+state.connections/310+state.influence/420,9,-8,'сеть сторонников обеспечила высокую явку','региональные штабы сорвали мобилизацию');finishElectionV283(c);}},
    {text:'Убеждать сомневающихся',onClick:()=>{electionResolveChoiceV283(c,.35+state.popularity/420+state.reputation/560+state.charisma/650,11,-10,'последняя агитация привлекла сомневающихся','поздняя агитация вызвала раздражение');finishElectionV283(c);}}
  ]);
}

startElectionCampaign=function(){
  const rivals=[
    {name:'богатый предприниматель',power:28},
    {name:'опытный губернатор',power:31},
    {name:'популярный телеведущий',power:26},
    {name:'кандидат правящей коалиции',power:34}
  ];
  const campaign={score:0,mistakes:0,reputationPenalty:0,history:[],rival:rivals[random(0,rivals.length-1)]};
  electionStageIntroV283(campaign);
};

function finishElectionV283(c){
  const cfg=electionConfigV283();
  const statPower=
    state.popularity*.13+state.reputation*.11+state.influence*.13+
    state.connections*.07+state.politicsSkill*.14+state.charisma*.07+state.luck*.03;
  const itemBonus=(state.inventory?.suit?3:0)+(state.inventory?.phone?2:0);
  const relationBonus=Math.max(0,state.relations.viktor||0)*.035+Math.max(0,state.relations.marina||0)*.02;
  const rawChance=18+statPower+c.score*.75+itemBonus+relationBonus-c.rival.power+cfg.finalBonus-c.reputationPenalty*.5;
  const winChance=Math.max(10,Math.min(cfg.maxWinChance,rawChance));
  const won=Math.random()*100<winChance;
  const expectedShare=Math.max(37,Math.min(57,36+winChance*.23+c.score*.08));
  const voteShare=won
    ?Math.max(50,Math.min(61,Math.round(expectedShare+random(-1,5))))
    :Math.max(29,Math.min(49,Math.round(expectedShare+random(-8,2))));

  if(won){
    state.president=true;state.careerIndex=9;state.chapterIndex=7;state.chapterEnteredDay=state.day;
    state.influence=100;state.reputation=clamp(state.reputation+8);state.popularity=clamp(state.popularity+6);
    if(!state.endings.includes('president'))state.endings.push('president');
    saveState();renderAll();
    openModal('⭐',`Победа — ${voteShare}% голосов`,`Вы выиграли тяжёлую кампанию и стали президентом.\n\nКлючевые этапы:\n${c.history.join('\n')}`,[]);
    return;
  }

  state.electionLosses++;
  const closeLoss=voteShare>=45;
  const popularityLoss=(closeLoss?7:13)+Math.min(6,c.mistakes);
  const reputationLoss=(closeLoss?5:9)+Math.round(c.reputationPenalty/2);
  const influenceLoss=closeLoss?4:8;
  state.popularity=clamp(state.popularity-popularityLoss);
  state.reputation=clamp(state.reputation-reputationLoss);
  state.influence=clamp(state.influence-influenceLoss);
  state.happiness=clamp(state.happiness-18);
  state.electionBanUntil=state.day+cfg.banDays;
  saveState();renderAll();
  openModal('🚫',`Поражение — ${voteShare}% голосов`,`Выборы проиграны. Даже сильная подготовка не гарантирует победу.\n\nПотери: популярность −${popularityLoss}, репутация −${reputationLoss}, влияние −${influenceLoss}. Новую кампанию можно начать через ${cfg.banDays} дней.\n\nКлючевые этапы:\n${c.history.join('\n')}`,[]);
}

// Refresh the reference text created by v2.8.
const electionHelpV283=document.querySelector('#help-election');
if(electionHelpV283)electionHelpV283.innerHTML=`<h3>🗳️ Президентские выборы</h3><p>Выборы открываются в главе кандидата после выполнения всех требований. Участие стоит <strong>100 000 000 ₽</strong>.</p><p>Кампания состоит из 8 этапов: программа, штаб, регионы, финансирование, медиа, скандал, дебаты и голосование. Решения проходят скрытые проверки, а даже максимально развитый кандидат может проиграть. На высоких сложностях риск поражения значительно выше.</p>`;
const careerHelpV283=document.querySelector('#help-career');
if(careerHelpV283){const paragraphs=careerHelpV283.querySelectorAll('p');if(paragraphs[0])paragraphs[0].textContent='Работу получают через собеседование. Учитываются требования должности, навык ветки, харизма, репутация, персонажи и сложность. После отказа повторная попытка на ту же должность становится доступна через 1–4 игровых дня в зависимости от сложности.';}

normalize();
renderAll();

// ========================= v2.8.6 — native desktop wheel scrolling =========================
// Vertical mouse-wheel scrolling is intentionally left to the browser.
// Only the category strip handles a real horizontal gesture or Shift + wheel.


// ========================= v2.8.7 — tutorial must not move the page before user input =========================
const tutorialSessionV287={screen:'home',scrollY:0,active:false};
function tutorialVisibleV287(){
  const overlay=document.getElementById('tutorialOverlayV28');
  return !!overlay && !overlay.classList.contains('hidden');
}
function switchScreenForTutorialV287(target){
  document.body.classList.toggle('home-screen',target==='home');
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.dataset.screen===target));
  const navTarget=['housing','inventory','investments'].includes(target)?'home':target;
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.target===navTarget));
  const titles={home:'Главная',actions:'Действия',career:'Карьера',housing:'Жильё',inventory:'Предметы',investments:'Активы',business:'Бизнес',profile:'Профиль'};
  const title=document.getElementById('screenTitle');
  if(title)title.textContent=titles[target]||'Игра';
  requestAnimationFrame(syncFixedTopbar);
}
startTutorialV28=function(force=false){
  if(state.gameOver || (!force && state.tutorialCompleted) || !state.difficultyChosen)return;
  ensureV28Ui();
  tutorialSessionV287.screen=document.querySelector('.screen.active')?.dataset.screen||'home';
  tutorialSessionV287.scrollY=window.scrollY||document.documentElement.scrollTop||0;
  tutorialSessionV287.active=true;
  state.tutorialStep=0;
  saveState();
  document.getElementById('tutorialOverlayV28').classList.remove('hidden');
  document.body.classList.add('overlay-open-v28','tutorial-open-v287');
  // The first welcome step is rendered in place. No screen switch and no scroll
  // happens until the player explicitly presses “Далее”.
  showTutorialStepV28(0,false);
};
showTutorialStepV28=function(index,userInitiated=true){
  ensureV28Ui();
  const safe=Math.max(0,Math.min(tutorialStepsV28.length-1,index));
  state.tutorialStep=safe;
  saveState();
  const step=tutorialStepsV28[safe];

  if(userInitiated){
    if(step.category){selectedCategory=step.category;renderActions();}
    if(step.screen)switchScreenForTutorialV287(step.screen);
  }

  document.getElementById('tutorialCounterV28').textContent=`${safe+1}/${tutorialStepsV28.length}`;
  document.getElementById('tutorialIconV28').textContent=step.icon;
  document.getElementById('tutorialTitleV28').textContent=step.title;
  document.getElementById('tutorialTextV28').textContent=step.text;
  document.getElementById('tutorialBackV28').disabled=safe===0;
  document.getElementById('tutorialNextV28').textContent=safe===tutorialStepsV28.length-1?'Завершить':'Далее';

  setTimeout(()=>{
    const target=tutorialTargetV28(step);
    if(userInitiated && target){
      if(target.closest('#categoryRow')){
        target.scrollIntoView({behavior:'auto',block:'nearest',inline:'center'});
      }else if(!target.closest('.topbar') && !target.closest('.bottom-nav')){
        target.scrollIntoView({behavior:'auto',block:'center',inline:'nearest'});
      }
    }
    requestAnimationFrame(positionTutorialV28);
  },80);
};
finishTutorialV28=function(skipped=false){
  state.tutorialCompleted=true;
  state.tutorialStep=0;
  saveState();
  document.getElementById('tutorialOverlayV28')?.classList.add('hidden');
  document.body.classList.remove('overlay-open-v28','tutorial-open-v287');

  if(skipped && tutorialSessionV287.active){
    switchScreenForTutorialV287(tutorialSessionV287.screen||'home');
    const restoreY=tutorialSessionV287.scrollY||0;
    requestAnimationFrame(()=>window.scrollTo({top:restoreY,behavior:'auto'}));
  }else{
    switchScreenForTutorialV287('home');
    requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}));
    showToast('Обучение завершено');
  }
  tutorialSessionV287.active=false;
};

// Keep the mobile page fixed during onboarding, but never block a real mouse
// wheel. Desktop and hybrid devices must retain native browser scrolling.
document.addEventListener('touchmove',event=>{
  if(tutorialVisibleV287())event.preventDefault();
},{capture:true,passive:false});

// ========================= v2.8.8 — native mouse-wheel scrolling =========================
// No document-level wheel handler is used. Chromium must receive the wheel
// event directly so it can scroll the page smoothly and natively.


// ========================= v2.8.9 — fixed permanent-job salary =========================
// A permanent job receives one salary offer at the moment of hiring. Later
// growth of skills, relationships or equipment no longer changes that salary.
function jobOfferSalaryV289(job, branchId){
  if(!job)return 0;
  const branch=careerBranchesV2[branchId];
  let pay=Number(job.salary||0)*difficultyCfg().income;
  if(branch){
    const skill=Number(state[branch.skill]||0);
    pay*=1+Math.min(.45,skill*.005);
  }
  if(branchId==='office'&&state.inventory?.suit)pay*=1.08;
  if(branchId==='it'&&state.inventory?.laptop)pay*=1.12;
  pay*=1+relationTierV25('sergey');
  return Math.max(0,Math.round(pay));
}

const jobSalaryBeforeV289=jobSalaryV22;
jobSalaryV22=function(job,branchId){
  if(!job)return 0;
  const frozen=Number(job.fixedSalary);
  if(Number.isFinite(frozen)&&frozen>=0)return Math.round(frozen);
  return jobOfferSalaryV289(job,branchId);
};

const normalizeBeforeV289=normalize;
normalize=function(){
  normalizeBeforeV289();
  if(state.currentJob){
    const fixed=Number(state.currentJob.fixedSalary);
    if(!Number.isFinite(fixed)||fixed<0){
      state.currentJob.fixedSalary=jobOfferSalaryV289(state.currentJob,state.currentJob.branch);
    }else{
      state.currentJob.fixedSalary=Math.round(fixed);
    }
  }
};

const interviewJobBeforeV289=interviewJob;
interviewJob=function(branchId,level){
  const previousJob=state.currentJob;
  interviewJobBeforeV289(branchId,level);
  const hired=state.currentJob;
  if(hired && hired!==previousJob && hired.branch===branchId && Number(hired.level)===Number(level)){
    const position=careerBranchesV2[branchId]?.jobs?.[Number(level)-1]||hired;
    hired.fixedSalary=jobOfferSalaryV289(position,branchId);
    saveState();
    renderAll();
  }
};

// Migrate an existing permanent job once, then keep the value unchanged.
normalize();
saveState();
renderAll();

// ========================= v2.8.10 — election progress navigation fix =========================
// The chapter goal "Победить на президентских выборах" now opens the Politics action category.
