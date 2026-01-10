/**
 * Утилиты для работы с возрастом и фильтрацией контента
 */

/**
 * Проверяет, является ли пользователь несовершеннолетним (младше 18 лет)
 */
export function isUnder18(birthDate: Date | null): boolean {
  if (!birthDate) return false;
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age < 18;
}

/**
 * Возвращает возраст пользователя в годах
 */
export function getAge(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Фильтрует список фильмов, исключая взрослый контент для несовершеннолетних
 */
export function filterAdultContent<T extends { adult?: boolean }>(
  items: T[],
  allowAdult: boolean
): T[] {
  if (allowAdult) return items;
  
  return items.filter(item => !item.adult);
}

/**
 * Фильтрует TMDB ID фильмов, исключая взрослый контент
 */
export function shouldFilterAdult(birthDate: Date | null, userPreference: boolean): boolean {
  // Если пользователь младше 18 - фильтруем всегда
  if (isUnder18(birthDate)) return true;
  
  // Если пользователь отключил показ взрослого контента - фильтруем
  if (!userPreference) return true;
  
  // Иначе - не фильтруем
  return false;
}
