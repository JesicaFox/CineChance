---
description: "Find and fix a UI bug via TDD. Usage: /gsd-tdd-bugfix \"описание проблемы\""
agent: gsd-tdd-orchestrator
---

Баг найден в браузере: **$ARGUMENTS**

Выполни полный цикл исправления в строгом порядке. Не пропускай шаги.

## Шаг 1 — Анализ → вызови gsd-tdd-bugfixer
Передай описание бага: "$ARGUMENTS"
Жди завершения — bugfixer должен создать `.planning/bugs/<slug>.md`
Если bugfixer задаёт вопросы пользователю — жди ответов перед продолжением.

## Шаг 2 — RED → вызови gsd-tdd-red
Прочитай `.planning/bugs/<slug>.md` раздел "Spec для RED теста"
Напиши тест который воспроизводит баг. Подтверди что тест RED.

## Шаг 3 — GREEN → вызови gsd-tdd-green
Минимальное исправление. Подтверди что тест GREEN.

## Шаг 4 — REFACTOR → вызови gsd-tdd-refactor
Чистка кода. Тесты остаются GREEN.

## Шаг 5 — Документация → вызови gsd-tdd-docs
Обнови JSDoc для изменённых файлов.

## Шаг 6 — Верификация → вызови gsd-tdd-verifier
```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
npx tsc --noEmit 2>&1 | head -20
```

## Финальный отчёт
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Bug Fixed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Bug: $ARGUMENTS
Report: .planning/bugs/<slug>.md
Тесты: N passed / 0 failed
Регрессии: не обнаружены
Документация: обновлена
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
