---
description: "Execute GSD phase with full TDD cycle per task. Usage: /gsd-tdd-execute 19"
agent: gsd-tdd-orchestrator
---

Выполни фазу **$ARGUMENTS** через полный TDD-цикл.

Прочитай планы фазы:
```bash
ls .planning/phases/ | grep "^$ARGUMENTS-"
cat .planning/phases/$ARGUMENTS-*/[0-9]*-PLAN.md
```

Для каждой задачи с кодом выполни в строгом порядке:

## 1. Acceptance Spec (gsd-tdd-acceptance-spec)
Сценарии поведения от идеи пользователя

## 2. Acceptance Code (gsd-tdd-acceptance-code)
E2E тест-код по сценариям

## 3. Unit Spec (gsd-tdd-spec)
Спецификация функций и модулей

## 4. RED (gsd-tdd-red — MiniMax M2.5)
Failing тесты. Подтверди RED перед переходом.

## 5. GREEN (gsd-tdd-green — MiniMax M2.5)
Минимальная реализация. Все тесты GREEN.

## 6. REFACTOR (gsd-tdd-refactor — Step 3.5 Flash)
Чистка кода. Тесты остаются GREEN.

## 7. Документация (gsd-tdd-docs — Big Pickle)
JSDoc + README для всех изменённых файлов.

## 8. Intent Verify (gsd-intent-verifier)
Соответствие исходной идее из плана фазы.

## 9. Technical Verify (gsd-tdd-verifier)
Тесты, покрытие, TypeScript.

Для задач без кода (docs, config, assets) — выполняй стандартно.
