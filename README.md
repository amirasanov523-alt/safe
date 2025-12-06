# 🛡️ SafeRoute AI (Карта Безопасных Дорог)

![Status](https://img.shields.io/badge/Status-In%20Development-blue)
![Python](https://img.shields.io/badge/Python-3.11+-yellow)
![PostgreSQL](https://img.shields.io/badge/PostGIS-16-blue)
![Flutter](https://img.shields.io/badge/Flutter-3.0-02569B)

Интеллектуальная навигационная система, которая строит маршруты с учетом безопасности, а не только времени.

---

## 🚀 Как запустить проект

### 1. Требования (Prerequisites)
Вам понадобятся установленные:
*   [Docker Desktop](https://www.docker.com/products/docker-desktop) (для базы данных PostGIS)
*   [Python 3.11+](https://www.python.org/downloads/)
*   [Flutter SDK](https://flutter.dev/docs/get-started/install) (для мобильного приложения)

### 2. Настройка Базы Данных (PostGIS)
Мы используем Docker для быстрого запуска PostgreSQL с расширением pgRouting.

```bash
# Запустите контейнер (пароль: postgres)
docker run --name saferoute-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgis/postgis:16-3.4-alpine

# Подключитесь к контейнеру и активируйте расширения (или используйте pgAdmin/DBeaver)
docker exec -it saferoute-db psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS pgrouting;"
```

Затем примените схему базы данных:
```bash
# Если у вас установлен psql локально:
psql -h localhost -U postgres -f schema.sql
```

### 3. Настройка Backend (Python)
```bash
# Создайте виртуальное окружение
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Установите зависимости (создайте файл requirements.txt, см. ниже)
pip install -r requirements.txt

# Тестовый запуск движка рисков
python risk_engine.py
```

---

## 🔑 Необходимые API и Данные

Для работы приложения вам понадобятся данные. Вот список того, что нужно, и где это взять.

### 1. Картографические данные (Base Maps) — **ОБЯЗАТЕЛЬНО**
Нам нужно показывать карту на клиенте (Flutter).
*   **Сервис**: **Mapbox** (рекомендуется) или Google Maps.
*   **Почему Mapbox**: Позволяет делать красивые темные карты ("Night Mode") и дешевле для старта.
*   **Как получить**:
    1.  Идите на [mapbox.com](https://www.mapbox.com/).
    2.  Создайте аккаунт (Free Tier щедрый).
    3.  Скопируйте **Public Access Token**.
    4.  Вставьте его в конфиг Flutter приложения (`lib/main.dart` позже).

### 2. Дорожный Граф (OSM Data) — **ОБЯЗАТЕЛЬНО**
Нам нужны дороги для построения маршрутов.
*   **Источник**: **OpenStreetMap (OSM)**.
*   **Как получить**:
    *   *Вариант А (Простой)*: Скачать выгрузку города с [kbb.bbbbike.org](https://extract.bbbike.org/) или [Geofabrik](https://www.geofabrik.de/). Формат `.pbf`.
    *   *Вариант Б (Продвинутый)*: Использовать утилиту `osm2pgrouting` для загрузки `.osm` файла прямо в нашу БД:
    ```bash
    osm2pgrouting -f map_data.osm -d saferoute_db -U postgres --clean
    ```

### 3. Данные о преступности (Crime Data) — **СЛОЖНО**
Самая важная часть. Глобального API "где убивают" не существует.
*   **Вариант А (США/UK)**:
    *   [Police.uk API](https://data.police.uk/docs/)
    *   [SpotCrime API](https://spotcrime.com/) (Платный)
*   **Вариант Б (РФ/СНГ)**:
    *   API нет. Нужно искать "Открытые данные МВД" (CSV файлы) или парсить новости.
    *   **Решение для MVP**: Мы создадим **Генератор Случайных Опасностей** (Mock Data), чтобы отладить алгоритм.
    *   *Позже*: Сделаем админку, куда волонтеры могут вносить "опасные зоны".

### 4. Освещение улиц (Lighting)
*   **Источник**: [NASA Black Marble](https://blackmarble.gsfc.nasa.gov/) (Спутниковые снимки ночной Земли).
*   **Сложность**: Высокая. Требует обработки изображений.
*   **Решение для MVP**: Считать, что магистрали (`highway=primary`) освещены (1.0), а переулки (`highway=residential`) — нет (0.3).

---

## 🛠 Структура Проекта (План)
```text
/saferoute-ai
├── /backend            # Python FastAPI
│   ├── main.py         # API Endpoints
│   ├── risk_engine.py  # Математика рисков
│   └── database.py     # Подключение к PostGIS
├── /database
│   └── schema.sql      # Таблицы БД
├── /mobile_app         # Flutter
│   └── lib/            # UI Code
└── README.md           # Вы здесь
```

## 📋 Следующие шаги
1.  Установите Docker и Python.
2.  Пройдите регистрацию на Mapbox.
3.  Скажите "Готово", и мы начнем писать серверную часть на FastAPI!
