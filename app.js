const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.('#f6c945');
  tg.setBackgroundColor?.('#fffaf0');
}

const STORAGE_KEY = 'street_to_president_v1';
const CRITICAL_LIMIT_HOURS = 24;
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const fmt = n => Math.round(n).toLocaleString('ru-RU');
const random = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const chance = (probability, good, bad) => (Math.random() < probability ? good() : bad());
const clampRate = rate => Math.max(30, Math.min(110, Math.round(rate * 100) / 100));

const defaultState = {
  rubles: 120, dollars: 0,
  exchangeRate: 92.00, previousExchangeRate: 92.00, exchangeRateBias: 0,
  health: 72, hunger: 52, happiness: 35,
  education: 0, reputation: 0, connections: 0, popularity: 0, influence: 0,
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
  {name:'Кандидат в президенты',icon:'🇷🇺',desc:'Осталось выиграть национальные выборы.',req:s=>s.influence>=60&&s.popularity>=70&&s.connections>=50,need:'Влияние 60, популярность 70, связи 50'},
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
function exchangeCurrency(direction){
  if(state.gameOver){showDeathScreen();return;}
  const amount=getExchangeAmount();
  if(direction==='buy'){
    const cost=buyUsdCost(amount);
    if(state.rubles<cost){showToast(`Для покупки $${fmt(amount)} нужно ${fmt(cost)} ₽`);return;}
    state.rubles-=cost;
    state.dollars+=amount;
    showToast(`Куплено $${fmt(amount)} за ${fmt(cost)} ₽`);
  }else{
    if(state.dollars<amount){showToast(`Недостаточно долларов: нужно $${fmt(amount)}`);return;}
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
    <div class="exchange-simple-balance">${fmt(state.rubles)} ₽ &nbsp;·&nbsp; $${fmt(state.dollars)}</div>
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
    showToast(`${a.name}: +${a.currency==='USD'?'$':''}${fmt(reward)}${a.currency==='USD'?'':' ₽'}`);
  }else{
    showToast(a.name);
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
function renderHeader(){
  document.getElementById('dayLabel').textContent=state.day;
  document.getElementById('timeLabel').textContent=`${String(state.hour).padStart(2,'0')}:00`;
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
    ['🇷🇺','Кандидат','Кандидат в президенты','Соберите сильную кампанию и выиграйте выборы.']
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
  document.getElementById('dollarsValue').textContent=`$${fmt(state.dollars)}`;
  const trend=exchangeTrend();
  const rateEl=document.getElementById('exchangeRateValue');
  if(rateEl){rateEl.textContent=`База ${state.exchangeRate.toFixed(2)} ₽ ${trend==='up'?'▲':trend==='down'?'▼':'•'}`;rateEl.className=`rate-line ${trend}`;}
  const homeRate=document.getElementById('homeExchangeRate');
  if(homeRate){homeRate.textContent=`Купить ${buyUsdRate().toFixed(2)} ₽ · продать ${sellUsdRate().toFixed(2)} ₽ ${trend==='up'?'▲':trend==='down'?'▼':'•'}`;homeRate.className=`exchange-home-rate ${trend}`;}
  const stats=[['❤️','Здоровье','health'],['🍗','Сытость','hunger'],['😊','Счастье','happiness']];
  document.getElementById('statsList').innerHTML=stats.map(([i,n,k])=>`<div class="stat-row"><div class="stat-icon">${i}</div><div><div class="stat-name">${n}</div><div class="progress"><div class="progress-fill ${state[k]<25?'bad':state[k]>75?'good':''}" style="width:${state[k]}%"></div></div></div><div class="stat-value">${Math.round(state[k])}</div></div>`).join('');
  const quick=['bread','bottles','rest'].map(id=>actions.find(a=>a.id===id));
  document.getElementById('quickActions').innerHTML=quick.map(a=>`<button class="quick-action" data-action="${a.id}"><span>${a.icon}</span><strong>${a.name}</strong><small>${a.hours} ч.</small></button>`).join('');
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

function switchScreen(target){
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.dataset.screen===target));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.target===target));
  const titles={home:'Главная',actions:'Действия',career:'Карьера',assets:'Имущество',profile:'Профиль'};
  document.getElementById('screenTitle').textContent=titles[target];window.scrollTo({top:0,behavior:'smooth'});haptic();
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
    const delta=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;
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
