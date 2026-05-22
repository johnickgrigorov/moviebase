# Moviebase Personal

Личный PWA-трекер фильмов и сериалов на основе [TMDB](https://themoviedb.org). Хранит данные в IndexedDB локально, опционально бэкапит в Google Drive.

**Стек:** React 18 + TypeScript + Vite + Tailwind + Dexie (IndexedDB) + TanStack Query + Workbox.

---

## 🚀 Деплой на GitHub Pages (готовый dist)

Самый быстрый путь — папка `dist/` уже собрана с твоим TMDB-токеном и path `/moviebase/`.

### Вариант А — через ветку `gh-pages`

```bash
# в локальной копии репозитория johnickgrigorov/moviebase
git checkout --orphan gh-pages
git rm -rf .
# скопируй содержимое архива dist-only.zip в текущую папку
git add .
git commit -m "Deploy"
git push origin gh-pages --force
```

Затем в **Settings → Pages**: Source = `Deploy from a branch`, Branch = `gh-pages` / `(root)`.

### Вариант Б — через GitHub Actions из main

Если хочешь, чтобы dist собирался автоматически при пуше — положи `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
        env:
          VITE_TMDB_TOKEN: ${{ secrets.VITE_TMDB_TOKEN }}
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}
          VITE_BASE_PATH: /moviebase/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

В **Settings → Secrets and variables → Actions** добавь `VITE_TMDB_TOKEN` (и опционально `VITE_GOOGLE_CLIENT_ID`). В **Settings → Pages**: Source = `GitHub Actions`.

После деплоя приложение будет доступно по `https://johnickgrigorov.github.io/moviebase/`.

---

## 📱 Установка на телефон

1. Открой `https://johnickgrigorov.github.io/moviebase/` в Chrome на Android.
2. Меню → **Установить приложение** (или плашка внизу автоматически появится).
3. Иконка с буквой *M* появится на главном экране.
4. Приложение работает офлайн, постеры кэшируются на месяц.

На iOS: Safari → Поделиться → **На экран «Домой»**.

---

## ☁️ Включение синхронизации с Google Drive (опционально)

Без этого работает локально на одном устройстве. Чтобы данные ездили между телефоном и десктопом — настрой Google OAuth:

### 1. Создай OAuth-клиент

1. Зайди в [Google Cloud Console](https://console.cloud.google.com), создай проект.
2. **APIs & Services → Library** → включи **Google Drive API**.
3. **APIs & Services → OAuth consent screen**:
   - User Type: **External**
   - App name: `Moviebase Personal`
   - User support email: твой email
   - Scopes: добавь `.../auth/drive.file`, `openid`, `email`, `profile`
   - Test users: добавь свой gmail
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:5173` (для разработки)
     - `https://johnickgrigorov.github.io`
   - Сохрани, скопируй **Client ID** (он не секретный, просто привязан к origin).

### 2. Пересобери приложение

Если используешь готовый `dist`: Client ID нужно встроить при сборке. Добавь в `.env.local` и пересобери (см. ниже).

Если используешь GitHub Actions: добавь `VITE_GOOGLE_CLIENT_ID` в Secrets.

### 3. Используй

В приложении → **Профиль** → **Войти через Google**. Автобэкап включён по умолчанию: через 30 сек после изменения данные летят в Google Drive, в папку «Moviebase Personal». Хранится 7 последних снимков + `backup-latest.json`.

> ⚠️ В режиме **Testing** в Google Console OAuth-токен живёт 7 дней. Раз в неделю придётся перелогиниваться. Чтобы избавиться от этого — отправь приложение в **Production** (без верификации — просто сменишь статус, сам себе пользователь).

---

## 🔧 Локальная разработка / пересборка

```bash
# Требуется Node 18+
npm install

# Скопируй .env.example в .env.local и впиши свой TMDB токен:
cp .env.example .env.local

npm run dev      # запуск с hot-reload на localhost:5173
npm run build    # production-сборка в dist/
npm run preview  # локальный просмотр готовой сборки
```

### Получение TMDB-токена

1. [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) → создай аккаунт.
2. Скопируй **API Read Access Token** (длинный JWT, не v3-ключ!).
3. Вставь в `.env.local`: `VITE_TMDB_TOKEN=eyJhbG...`.

---

## 🗂 Структура проекта

```
src/
├── lib/
│   ├── tmdb.ts          # API-клиент TMDB
│   ├── db.ts            # Dexie/IndexedDB схема + снапшоты
│   ├── mutations.ts     # все write-операции с tombstones
│   ├── sync.ts          # Drive-синхронизация с дебаунсингом
│   ├── google-auth.ts   # OAuth через Google Identity Services
│   └── format.ts        # форматирование дат/чисел на русском
├── components/
│   ├── nav-bar.tsx
│   ├── media-card.tsx   # карточка фильма/сериала с бейджами
│   ├── action-bar.tsx   # Watchlist / Watched / Rate
│   ├── rating-modal.tsx # 10-звёздная шкала
│   ├── poster.tsx
│   └── ...
├── routes/
│   ├── home.tsx           # тренды, популярное, скоро в кино
│   ├── search.tsx
│   ├── lists.tsx          # watchlist, watched, custom-списки
│   ├── profile.tsx        # Google, бэкапы, статистика
│   ├── movie-details.tsx
│   ├── tv-details.tsx
│   └── season-details.tsx # покадровое отслеживание серий
└── hooks/
    └── use-tracking.ts    # реактивные хуки IndexedDB
```

---

## 🎨 Что внутри

- **Главная**: 7 рядов с TMDB — тренды недели, в кино, эфир сегодня, популярные фильмы/сериалы, скоро, топ-рейтинг.
- **Поиск**: multi-search по TMDB с debounce 350ms.
- **Карточка фильма**: бэкдроп, постер, кнопки «В список / Просмотрен / Оценить», где посмотреть (RU-провайдеры), актёры, похожие.
- **Карточка сериала**: то же + прогресс-бар, следующий эпизод, список сезонов с прогрессом.
- **Сезон**: список серий со скриншотами, чекбоксы для каждой, «Отметить все».
- **Списки**: 3 вкладки — Хочу посмотреть / Просмотрено / Свои подборки.
- **Профиль**: статистика (фильмы / эпизоды / в списке / средняя оценка / часов), Google sign-in, ручной экспорт/импорт JSON.

---

## 🔐 Безопасность

- **TMDB-токен** встраивается в публичный JS-бандл — это нормально для read-only TMDB API. Любой может его извлечь из DevTools и использовать, но лимиты у TMDB большие (~50 req/s), и для read-only ключа риск минимален.
- **Google Client ID** не секрет по дизайну OAuth — безопасность обеспечивается через **Authorized JavaScript origins**.
- Локальные данные (IndexedDB + бэкапы в Drive) принадлежат только тебе, scope `drive.file` означает что приложение видит только свои файлы в Drive.

---

## 🐛 Известные ограничения MVP

- Добавление фильма/сериала в custom-список пока через прямые мутации (UI кнопки в карточке появится во второй итерации).
- Только русский интерфейс.
- Watch-providers показываются только для региона RU.
- Прогресс по сериалу не учитывает спецэпизоды (season 0).

---

Сделано с любовью к кино 🎬
