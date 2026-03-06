---
description: "Update docs after fix confirmed. Usage: /gsd-tdd-docs-update"
agent: gsd-tdd-docs
---

Обнови документацию для последних изменений в коде.

```bash
# Найди файлы изменённые в последних коммитах
git diff --name-only HEAD~3 HEAD | grep -E "\.(ts|tsx)$"
```

Для каждого изменённого файла:
- Обнови JSDoc для изменённых функций и компонентов
- Если есть README в папке — обнови
- Объясняй ЗАЧЕМ, не КАК

Не меняй логику кода.
