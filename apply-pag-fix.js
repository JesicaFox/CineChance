const fs = require('fs');
const path = 'src/app/api/my-movies/route.ts';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// 1. Находим блок, который нужно заменить (от "let watchListRecords;" до строки с totalCount)
const startMarker = '    let watchListRecords;';
const endMarker = '    totalCount = await prisma.watchList.count({ where: whereClauseWithRating });';

let startIdx = lines.findIndex(l => l.trim() === 'let watchListRecords;');
if (startIdx === -1) { console.error(' Не нашёл startMarker'); process.exit(1); }

// Ищем endMarker после startIdx
let endIdx = -1;
for (let i = startIdx; i < lines.length; i++) {
  if (lines[i].includes('totalCount = await prisma.watchList.count({ where: whereClauseWithRating })')) {
    endIdx = i;
    break;
  }
}
if (endIdx === -1) { console.error(' Не нашёл endMarker'); process.exit(1); }

// Новый блок кода
const newBlock = [
  '    let watchListRecords;',
  '    let totalCount: number;',
  '    let useBufferStrategy = false;',
  '',
  '    // Determine strategy: if TMDB-based filters are active, we need to fetch all then filter client-side',
  '    const useBuffer = hasTMDBFilters; // Only TMDB filters require buffer strategy',
  '    const BUFFER_SIZE = 5000; // Sufficient buffer for filtered datasets',
  '',
  '    if (useBuffer) {',
  '      logger.debug(\'Using buffer strategy for TMDB filters\', {',
  '        context: \'my-movies\',',
  '        bufferSize: BUFFER_SIZE,',
  '      });',
  '      // Fetch all (up to buffer) from DB',
  '      watchListRecords = await prisma.watchList.findMany({',
  '        where: whereClauseWithRating,',
  '        select: {',
  '          id: true,',
  '          tmdbId: true,',
  '          mediaType: true,',
  '          title: true,',
  '          voteAverage: true,',
  '          userRating: true,',
  '          weightedRating: true,',
  '          addedAt: true,',
  '          statusId: true,',
  '          tags: { select: { id: true, name: true } },',
  '        },',
  '        orderBy: [{ addedAt: \'desc\' }, { id: \'desc\' }],',
  '        take: BUFFER_SIZE,',
  '      });',
  '      totalCount = await prisma.watchList.count({ where: whereClauseWithRating });',
  '      useBufferStrategy = true;',
  '    } else {',
  '      logger.debug(\'Using DB pagination (skip/take)\', {',
  '        context: \'my-movies\',',
  '        page,',
  '        limit,',
  '      });',
  '      // Proper pagination with skip/take',
  '      const pageSkip = (page - 1) * limit;',
  '      const pageTake = limit + 1; // +1 for hasMore detection',
  '',
  '      totalCount = await prisma.watchList.count({ where: whereClauseWithRating });',
  '',
  '      watchListRecords = await prisma.watchList.findMany({',
  '        where: whereClauseWithRating,',
  '        select: {',
  '          id: true,',
  '          tmdbId: true,',
  '          mediaType: true,',
  '          title: true,',
  '          voteAverage: true,',
  '          userRating: true,',
  '          weightedRating: true,',
  '          addedAt: true,',
  '          statusId: true,',
  '          tags: { select: { id: true, name: true } },',
  '        },',
  '        orderBy: [{ addedAt: \'desc\' }, { id: \'desc\' }],',
  '        skip: pageSkip,',
  '        take: pageTake,',
  '      });',
  '      useBufferStrategy = false;',
  '    }',
];

// Заменяем[startIdx, endIdx] на newBlock
const before = lines.slice(0, startIdx);
const after = lines.slice(endIdx + 1);
let newLines = before.concat(newBlock, after);

// 2. Заменяем блок пагинации после сортировки
const pagOld = [
  '    // Paginate: use limit for slicing',
  '    const pageStartIndex = (page - 1) * limit;',
  '    const pageEndIndex = pageStartIndex + limit;',
  '    const paginatedMovies = sortedMovies.slice(pageStartIndex, pageEndIndex);',
  '    ',
  '    // hasMore: Check if there are more records after this page',
  '    const hasMore = sortedMovies.length > pageEndIndex;'
].join('\n');

// Найдём первую строку "    // Paginate: use limit for slicing"
let pagStartIdx = newLines.findIndex(l => l.includes('// Paginate: use limit for slicing'));
if (pagStartIdx === -1) { console.error(' Не нашёл pagStart'); process.exit(1); }
// Найдём последнюю строку блока: "const hasMore = sortedMovies.length > pageEndIndex;"
let pagEndIdx = -1;
for (let i = pagStartIdx; i < newLines.length; i++) {
  if (newLines[i].includes('const hasMore = sortedMovies.length > pageEndIndex;')) {
    pagEndIdx = i;
    break;
  }
}
if (pagEndIdx === -1) { console.error(' Не нашёл pagEnd'); process.exit(1); }

const newPagination = [
  '    // Paginate results according to strategy',
  '    let paginatedMovies: Movie[];',
  '    let hasMore: boolean;',
  '    let responseTotalCount: number;',
  '',
  '    if (useBufferStrategy) {',
  '      // Buffer case: sortedMovies is the full filtered set (up to buffer)',
  '      const pageStartIndex = (page - 1) * limit;',
  '      const pageEndIndex = pageStartIndex + limit;',
  '      paginatedMovies = sortedMovies.slice(pageStartIndex, pageEndIndex);',
  '      hasMore = sortedMovies.length > pageEndIndex;',
  '      responseTotalCount = sortedMovies.length;',
  '    } else {',
  '      // DB pagination case: sortedMovies already contains the requested page (+1 extra)',
  '      paginatedMovies = sortedMovies.slice(0, limit);',
  '      hasMore = sortedMovies.length > limit;',
  '      responseTotalCount = totalCount;',
  '    }',
];

newLines.splice(pagStartIdx, pagEndIdx - pagStartIdx + 1, ...newPagination);

// 3. Заменяем totalCount в return
for (let i = 0; i < newLines.length; i++) {
  if (newLines[i].includes('totalCount: sortedMovies.length')) {
    newLines[i] = newLines[i].replace('totalCount: sortedMovies.length', 'totalCount: responseTotalCount');
    break;
  }
}

// Write back
fs.writeFileSync(path, newLines.join('\n'));
console.log('✅ route.ts updated successfully');
