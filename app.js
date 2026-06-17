const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.('#f6c945');
  tg.setBackgroundColor?.('#fffaf0');
}

const STORAGE_KEY = 'street_to_president_v1';
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));
const fmt = n => Math.round(n).toLocaleString('ru-RU');
const random = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const chance = (probability, good, bad) => (Math.random() < probability ? good() : bad());
const clampRate = rate => Math.max(30, Math.min(110, Math.round(rate * 100) / 100));

const defaultState = {
  rubles: 120, dollars: 0,
  exchangeRate: 92.00, previousExchangeRate: 92.00, exchangeRateBias: 0,
  health: 72, hunger: 52, happiness: 35, energy: 80,
  education: 0, reputation: 0, connections: 0, popularity: 0, influence: 0,
  day: 1, hour: 8, careerIndex: 0, homeId: 'street', assets: {},
  totalEarned: 0, totalDollarEarned: 0, totalSpent: 0, actionsDone: 0, daysSurvived: 1,
  president: false, electionLosses: 0, electionBanUntil: 0, lastEventId: null,
  playerName: tg?.initDataUnsafe?.user?.first_name || 'Игрок'
};

const categories = [
  ['food','🍔','Еда'],['work','💼','Работа'],['health','❤️','Здоровье'],
  ['fun','🎮','Развлечения'],['education','🎓','Учёба'],['media','📣','Популярность'],['politics','🏛️','Политика']
];

const actions = [
  {id:'find_food',cat:'food',icon:'🗑️',name:'Поискать еду у магазина',desc:'Проверить контейнеры возле магазина и найти что-нибудь съедобное.',hours:2,energy:-8,hunger:18,happiness:-1,health:-2,min:0,max:0},
  {id:'bread',cat:'food',icon:'🍞',name:'Купить батон',desc:'Простой и дешёвый перекус.',hours:1,energy:-1,hunger:28,happiness:1,cost:80},
  {id:'shawarma',cat:'food',icon:'🌯',name:'Купить шаурму',desc:'Сытно, но не всегда полезно.',hours:1,energy:-1,hunger:46,happiness:6,health:-1,cost:320},
  {id:'cafe',cat:'food',icon:'🍲',name:'Поесть в кафе',desc:'Нормальная еда и хороший отдых.',hours:1,energy:4,hunger:65,happiness:10,health:3,cost:950,req:{career:2}},
  {id:'restaurant',cat:'food',icon:'🍽️',name:'Ужин в ресторане',desc:'Дорогой способ поднять настроение.',hours:2,energy:6,hunger:90,happiness:22,health:4,cost:5200,req:{career:4}},

  {id:'bottles',cat:'work',icon:'♻️',name:'Собирать бутылки',desc:'Собирать и сдавать найденную тару.',hours:3,energy:-16,hunger:-8,happiness:-3,health:-2,min:180,max:450},
  {id:'beg',cat:'work',icon:'🪙',name:'Просить милостыню',desc:'Попросить помощи у прохожих возле метро. Доход зависит от удачи.',hours:3,energy:-10,hunger:-6,happiness:-6,reputation:-1,min:120,max:600},
  {id:'loader',cat:'work',icon:'📦',name:'Подработка грузчиком',desc:'Тяжёлая работа, но платят сразу.',hours:4,energy:-28,hunger:-12,health:-5,min:1000,max:1800,req:{health:42}},
  {id:'courier',cat:'work',icon:'🚲',name:'Смена курьером',desc:'Первая стабильная подработка.',hours:6,energy:-31,hunger:-16,happiness:-2,health:-2,min:2800,max:4200,req:{career:1,health:45}},
  {id:'seller',cat:'work',icon:'🛒',name:'Смена продавцом',desc:'Постоянная работа и опыт общения.',hours:8,energy:-34,hunger:-19,happiness:-2,reputation:1,min:5000,max:7500,req:{career:2,education:10}},
  {id:'office',cat:'work',icon:'💻',name:'Работа в офисе',desc:'Хорошая зарплата для образованного человека.',hours:8,energy:-28,hunger:-17,happiness:1,reputation:2,connections:1,min:14000,max:22000,req:{career:3,education:35}},
  {id:'director',cat:'work',icon:'👔',name:'Работа директором',desc:'Большой доход и влияние.',hours:8,energy:-27,hunger:-15,happiness:3,reputation:3,connections:2,influence:1,min:50000,max:80000,req:{career:5,education:60,reputation:35}},
  {id:'usd_freelance',cat:'work',icon:'🌐',name:'Заказ для иностранца',desc:'Удалённая подработка с оплатой в долларах.',hours:6,energy:-25,hunger:-13,happiness:2,reputation:1,min:60,max:100,currency:'USD',req:{career:3,education:35}},
  {id:'usd_contract',cat:'work',icon:'💼',name:'Зарубежный контракт',desc:'Серьёзная работа на иностранную компанию.',hours:8,energy:-30,hunger:-16,happiness:4,reputation:2,connections:2,min:350,max:600,currency:'USD',req:{career:5,education:65,reputation:30}},

  {id:'rest',cat:'health',icon:'🪑',name:'Отдохнуть на лавке',desc:'Немного восстановить силы на свежем воздухе.',hours:3,energy:35,hunger:-8,happiness:4},
  {id:'sleep',cat:'health',icon:'😴',name:'Поспать',desc:'Главный способ восстановить силы и пропустить часть дня.',hours:8,energy:100,hunger:-18,health:5,happiness:3},
  {id:'medicine',cat:'health',icon:'💊',name:'Купить лекарства',desc:'Небольшое восстановление здоровья.',hours:1,energy:-1,health:18,cost:650},
  {id:'clinic',cat:'health',icon:'🏥',name:'Посетить клинику',desc:'Полноценное лечение.',hours:4,energy:-6,health:45,happiness:-2,cost:4200,req:{career:1}},
  {id:'sport',cat:'health',icon:'🏃',name:'Тренировка',desc:'Укрепляет здоровье, но требует сил.',hours:2,energy:-18,hunger:-8,health:8,happiness:6,cost:250,req:{health:35}},

  {id:'park',cat:'fun',icon:'🌳',name:'Погулять в парке',desc:'Бесплатно прогуляться и немного развеяться.',hours:2,energy:-4,hunger:-5,happiness:11},
  {id:'cinema',cat:'fun',icon:'🎬',name:'Сходить в кино',desc:'Отвлечься от проблем.',hours:3,energy:-3,hunger:-5,happiness:20,cost:650},
  {id:'club',cat:'fun',icon:'🎉',name:'Сходить в клуб',desc:'Много эмоций и новых знакомств.',hours:5,energy:-18,hunger:-10,happiness:28,connections:2,cost:4800,req:{career:3}},
  {id:'travel',cat:'fun',icon:'✈️',name:'Отправиться в путешествие',desc:'Сильный бонус к счастью и репутации.',hours:12,energy:-15,hunger:-18,happiness:45,reputation:4,cost:35000,req:{career:5}},

  {id:'library',cat:'education',icon:'📚',name:'Заниматься в библиотеке',desc:'Читать книги и постепенно повышать образование.',hours:4,energy:-14,hunger:-8,happiness:-2,education:5},
  {id:'course',cat:'education',icon:'🧑‍💻',name:'Пройти онлайн-курс',desc:'Быстрый рост квалификации.',hours:5,energy:-18,hunger:-10,education:9,cost:1500},
  {id:'college',cat:'education',icon:'🏫',name:'Учиться в колледже',desc:'Серьёзный шаг к карьере.',hours:8,energy:-24,hunger:-14,education:13,reputation:1,cost:6000,req:{education:12}},
  {id:'university',cat:'education',icon:'🎓',name:'Учиться в университете',desc:'Открывает высшие должности.',hours:8,energy:-27,hunger:-14,education:16,reputation:2,connections:1,cost:18000,req:{career:3,education:32}},

  {id:'trash_blog',cat:'media',icon:'📱',name:'Вести уличный блог',desc:'Рассказывать в сети о жизни и пути наверх.',hours:3,energy:-10,hunger:-6,happiness:3,reputation:-1,popularity:3},
  {id:'metro_show',cat:'media',icon:'🎭',name:'Уличное выступление',desc:'Выступить у метро и привлечь внимание прохожих.',hours:4,energy:-16,hunger:-8,happiness:8,reputation:-2,popularity:5},
  {id:'district_channel',cat:'media',icon:'📢',name:'Завести районный канал',desc:'Постить новости, жалобы и истории с улиц.',hours:4,energy:-14,hunger:-7,popularity:7,connections:1,cost:500,req:{education:8}},
  {id:'local_interview',cat:'media',icon:'🎙️',name:'Дать интервью паблику',desc:'Рассказать местным, как вы поднялись со дна.',hours:4,energy:-15,hunger:-7,popularity:10,reputation:2,connections:1,cost:2000,req:{career:2,reputation:8}},
  {id:'blogger_ads',cat:'media',icon:'🚀',name:'Купить рекламу у блогеров',desc:'Быстро увеличить охваты и узнаваемость.',hours:2,energy:-5,popularity:15,reputation:1,cost:12000,req:{career:4}},

  {id:'volunteer',cat:'media',icon:'🙋',name:'Стать волонтёром',desc:'Помогать людям ради репутации и новых знакомых.',hours:5,energy:-18,hunger:-9,happiness:8,reputation:5,popularity:2},
  {id:'networking',cat:'politics',icon:'🤝',name:'Деловая встреча',desc:'Создаёт полезные связи.',hours:3,energy:-10,hunger:-5,connections:5,reputation:2,cost:3000,req:{career:3}},
  {id:'charity',cat:'media',icon:'💛',name:'Благотворительность',desc:'Повышает известность и доверие.',hours:2,energy:-4,happiness:8,reputation:7,popularity:6,cost:15000,req:{career:4}},
  {id:'speech',cat:'politics',icon:'🎤',name:'Публичное выступление',desc:'Развивает популярность.',hours:4,energy:-17,hunger:-7,popularity:8,reputation:3,connections:2,cost:5000,req:{career:5,reputation:30}},

  {id:'party',cat:'politics',icon:'🏛️',name:'Вступить в партию',desc:'Первый серьёзный политический шаг.',hours:5,energy:-17,reputation:4,connections:6,influence:4,cost:12000,req:{career:5,reputation:25}},
  {id:'campaign',cat:'politics',icon:'📣',name:'Провести агитацию',desc:'Повышает популярность и влияние.',hours:6,energy:-25,hunger:-10,popularity:9,influence:4,cost:25000,req:{career:6}},
  {id:'debate',cat:'politics',icon:'🗣️',name:'Участвовать в дебатах',desc:'Результат зависит от образования и репутации.',hours:5,energy:-23,hunger:-8,custom:'debate',cost:40000,req:{career:7,education:65}},
  {id:'election',cat:'politics',icon:'🗳️',name:'Начать президентские выборы',desc:'Трёхэтапная кампания с риском проиграть и попасть под санкции.',hours:12,energy:-40,custom:'election',cost:500000,req:{career:8,popularity:70,reputation:60,influence:55,connections:50}}
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
  {id:'street',icon:'📦',name:'Место под мостом',price:0,daily:0,energy:0,health:-4,desc:'Бесплатно, но некомфортно и вредно для здоровья.'},
  {id:'shelter',icon:'🛏️',name:'Ночлежка',price:1500,daily:150,energy:7,health:1,desc:'Тесно и шумно, зато есть крыша над головой.'},
  {id:'room',icon:'🚪',name:'Комната в общежитии',price:18000,daily:750,energy:13,health:3,desc:'Своя дверь, кровать и шанс нормально выспаться.'},
  {id:'flat',icon:'🏢',name:'Квартира',price:120000,daily:2200,energy:20,health:5,desc:'Собственная квартира с базовым комфортом.'},
  {id:'house',icon:'🏡',name:'Загородный дом',price:650000,daily:6000,energy:28,health:7,desc:'Просторный дом для обеспеченного человека.'},
  {id:'residence',icon:'🏰',name:'Президентская резиденция',price:3000000,daily:18000,energy:35,health:10,desc:'Максимальный комфорт будущего президента.'}
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
      ()=>{s.energy-=8;s.happiness-=4;return 'Вы потратили полдня, но владельца так и не нашли.'})}
  ]},
  {id:'illness',icon:'🤒',title:'Сильная простуда',text:'Температура растёт, а завтра важный день.',choices:[
    {text:'Купить лекарства за 700 ₽',can:s=>s.rubles>=700,effect:s=>chance(.82,
      ()=>{s.rubles-=700;s.health+=14;return 'Лекарства быстро поставили вас на ноги.'},
      ()=>{s.rubles-=700;s.health-=5;return 'Лекарство не подошло, здоровье ухудшилось.'})},
    {text:'Перетерпеть',effect:s=>chance(.28,
      ()=>{s.health+=3;s.happiness+=4;return 'Организм справился сам. Вы даже почувствовали прилив сил.'},
      ()=>{s.health-=16;s.energy-=12;return 'Болезнь сильно вас подкосила.'})}
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
      ()=>{s.reputation+=2;s.energy-=3;return 'Проверка закончилась без проблем.'},
      ()=>{s.rubles=Math.max(0,s.rubles-1200);s.happiness-=6;return 'Нашёлся старый штраф: списано 1 200 ₽.'})},
    {text:'Спорить',effect:s=>chance(.32,
      ()=>{s.popularity+=5;s.reputation+=1;return 'Прохожие сняли спор, и публика встала на вашу сторону.'},
      ()=>{s.reputation-=6;s.rubles=Math.max(0,s.rubles-3000);return 'Спор закончился штрафом 3 000 ₽.'})}
  ]},
  {id:'dog',icon:'🐕',title:'Потерявшаяся собака',text:'На ошейнике дорогой адрес и номер телефона.',choices:[
    {text:'Отвести хозяину',effect:s=>chance(.78,
      ()=>{s.rubles+=4000;s.reputation+=6;s.connections+=2;return 'Хозяин дал 4 000 ₽ и пообещал помочь.'},
      ()=>{s.energy-=12;s.health-=3;return 'Собака укусила вас по дороге.'})},
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
      ()=>{s.reputation-=4;s.energy-=15;return 'Вы сорвали срок и получили плохой отзыв.'})},
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

function freshState(){ return {...defaultState,assets:{}}; }
function loadState(){
  try {
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    return {...freshState(),...saved,assets:{...(saved.assets||{})}};
  } catch { return freshState(); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
function haptic(type='light'){ tg?.HapticFeedback?.impactOccurred?.(type); }
function showToast(text){
  const el=document.getElementById('toast'); el.textContent=text; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2200);
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
  state.energy=clamp(state.energy-1);
  state.actionsDone++;
  advanceTime(1);
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
  const a=actions.find(x=>x.id===id); if(!a) return;
  const availability=actionAvailability(a);
  if(availability.disabled){showToast(availability.reason);return;}
  if(state.energy<Math.abs(Math.min(0,a.energy||0))){showToast('Недостаточно энергии');return;}
  if(a.custom){ performCustom(a); return; }

  if(a.cost) spend(a.cost);
  const reward=a.max?random(a.min||0,a.max):0;
  if(reward){ if(a.currency==='USD') earnDollars(reward); else earn(reward); }
  ['energy','hunger','health','happiness','education','reputation','connections','popularity','influence'].forEach(k=>addValue(k,a[k]||0));
  advanceTime(a.hours||1);
  state.actionsDone++;
  recalcCareer();
  saveState(); renderAll(); haptic();
  showToast(reward?`${a.name}: +${a.currency==='USD'?'$':''}${fmt(reward)}${a.currency==='USD'?'':' ₽'}`:a.name);
}

function performCustom(a){
  if(a.cost && state.rubles<a.cost){showToast('Недостаточно рублей');return;}
  if(a.id==='debate'){
    spend(a.cost); addValue('energy',a.energy||0);addValue('hunger',a.hunger||0); const score=state.education+state.reputation+random(-25,25);
    if(score>105){state.popularity=clamp(state.popularity+15);state.influence=clamp(state.influence+8);showToast('Вы блестяще выиграли дебаты');}
    else{state.popularity=clamp(state.popularity-4);state.happiness=clamp(state.happiness-8);showToast('Дебаты прошли неудачно');}
    advanceTime(a.hours);
  }
  if(a.id==='election'){
    if(state.day<state.electionBanUntil){showToast(`Повторные выборы доступны с ${state.electionBanUntil}-го дня`);return;}
    spend(a.cost);state.energy=clamp(state.energy+(a.energy||0));suppressRandomEvent=true;advanceTime(a.hours);suppressRandomEvent=false;startElectionCampaign();
  }
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
  state.hour+=hours;
  while(state.hour>=24){state.hour-=24;nextDay();}
}
function nextDay(){
  state.day++; state.daysSurvived=state.day;
  state.hunger=clamp(state.hunger-18);
  state.happiness=clamp(state.happiness-3);
  const home=homes.find(x=>x.id===state.homeId)||homes[0];
  state.health=clamp(state.health+home.health);
  state.energy=clamp(state.energy+home.energy);
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
  if(state.health<=0){
    const loss=Math.min(state.rubles,5000);state.rubles-=loss;state.health=45;state.energy=35;state.hunger=25;state.hour=10;
    openModal('🏥','Экстренная помощь',`Вы потеряли сознание и попали в больницу. Потеряно ${fmt(loss)} ₽.`,[]);
  } else if(!suppressRandomEvent&&Math.random()<.42){
    setTimeout(()=>triggerRandomEvent(),250);
  }
}
function recalcCareer(){
  let index=0;
  careers.forEach((c,i)=>{if(c.req(state)) index=i;});
  if(index>state.careerIndex){state.careerIndex=index;showToast(`Новая ступень: ${careers[index].name}`);}
}

function buyHome(id){
  const home=homes.find(x=>x.id===id); if(!home||id==='street') return;
  if(state.rubles<home.price){showToast('Недостаточно рублей');return;}
  spend(home.price);state.homeId=id;state.reputation=clamp(state.reputation+Math.max(1,homes.indexOf(home)));
  saveState();renderAll();haptic('medium');showToast(`Новое жильё: ${home.name}`);
}
function buyAsset(id){
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
      const result=c.effect(state);normalize();saveState();renderAll();openModal('🎲','Итог события',result,[]);
    }
  })));
}
function normalize(){
  ['health','hunger','happiness','energy','education','reputation','connections','popularity','influence'].forEach(k=>state[k]=clamp(state[k]));
  state.rubles=Math.max(0,state.rubles);state.dollars=Math.max(0,state.dollars);
  state.exchangeRate=clampRate(Number(state.exchangeRate)||92);state.previousExchangeRate=clampRate(Number(state.previousExchangeRate)||state.exchangeRate);state.exchangeRateBias=Math.max(-2,Math.min(2,Number(state.exchangeRateBias)||0));recalcCareer();
}

function openModal(icon,title,text,choices=[]){
  document.getElementById('modalIcon').textContent=icon;
  document.getElementById('modalTitle').textContent=title;
  document.getElementById('modalText').textContent=text;
  const box=document.getElementById('modalChoices');box.innerHTML='';
  choices.forEach(c=>{
    const b=document.createElement('button');b.className='modal-choice';b.textContent=c.text;b.disabled=!!c.disabled;b.onclick=c.onClick;box.appendChild(b);
  });
  document.getElementById('modalBackdrop').classList.remove('hidden');
}
function closeModal(){document.getElementById('modalBackdrop').classList.add('hidden');}

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
  const stats=[['❤️','Здоровье','health'],['🍗','Сытость','hunger'],['😊','Счастье','happiness'],['⚡','Энергия','energy']];
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
    const labels={energy:'⚡',hunger:'🍗',health:'❤️',happiness:'😊',education:'🎓',reputation:'⭐',connections:'🤝',popularity:'📣',influence:'🏛️'};
    Object.keys(labels).forEach(k=>{if(a[k])effects.push(`${labels[k]} ${a[k]>0?'+':''}${a[k]}`)});
    const subtitle=availability.disabled?availability.reason:a.desc;
    return `<article class="action-card ${locked?'locked':''}"><div class="card-top"><div class="card-title-wrap"><div class="card-icon">${a.icon}</div><div><div class="card-title">${a.name}</div><div class="card-subtitle">${subtitle}</div></div></div><div class="reward ${a.max?'positive':a.cost?'negative':''}">${actionMoney(a)}</div></div><div class="effects">${effects.map(x=>`<span class="effect">${x}</span>`).join('')}</div><button class="action-button" data-action="${a.id}" ${availability.disabled?'disabled':''}>${availability.disabled?'Недоступно':'Выполнить'}</button></article>`;
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

document.getElementById('modalClose').onclick=closeModal;
document.getElementById('helpButton').onclick=()=>openModal('💡','Как играть','Начните бомжом, выживите и поднимитесь по карьерной лестнице. Курс доллара меняется каждый день: доллары можно заработать на зарубежных заказах, купить или продать через кнопку «Обмен валют» на главной странице. Случайные события всегда дают два рискованных решения. На уровне кандидата откроется президентская кампания из трёх этапов.',[]);
document.getElementById('resetButton').onclick=()=>openModal('⚠️','Начать заново?','Весь прогресс будет удалён.',[
  {text:'Удалить прогресс',onClick:()=>{localStorage.removeItem(STORAGE_KEY);state=freshState();closeModal();renderAll();showToast('Игра начата заново')}}
]);

initCategoryScroller();
renderAll();
