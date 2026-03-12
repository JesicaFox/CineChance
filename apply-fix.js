const fs = require('fs');
const path = 'src/app/api/my-movies/route.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Replace the watchListRecords fetching strategy block
const oldSection = `    let watchListRecords;
    let totalCount: number;

    // Use FIXED buffer based on whether filters are active, NOT page number.
    // Each page request is independent, so we need consistent data.
    // This is the proven approach from 2026-02-19 fix.
    const hasFilters = hasTMDBFilters || minRating > 0 || maxRating < 10 || yearFrom || yearTo;
    const BUFFER_SIZE = hasFilters ? 1000 : 100; // Fixed buffer, not page-dependent

    logger.debug('Using fixed buffer pagination', {
      context: 'my-movies',
      hasFilters,
      page,
      limit,
      bufferSize: BUFFER_SIZE
    });

    // Always fetch from start with fixed buffer
    watchListRecords = await prisma.watchList.findMany({
      where: whereClauseWithRating,
      select: {
        id: true,
        tmdbId: true,
        mediaType: true,
        title: true,
        voteAverage: true,
        userRating: true,
        weightedRating: true,
        addedAt: true,
        statusId: true,
        tags: { select: { id: true, name: true } },
      },
      orderBy: [{ addedAt: 'desc' }, { id: 'desc' }],
      take: BUFFER_SIZE,
    });

    totalCount = await prisma.watchList.count({ where: whereClauseWithRating });`;

const newSection = `    let watchListRecords;
    let totalCount: number;
    let useBufferStrategy = false;

    // Determine strategy: if TMDB-based filters are active, we need to fetch all then filter client-side
    const useBuffer = hasTMDBFilters; // Only TMDB filters require buffer strategy
    const BUFFER_SIZE = 5000; // Sufficient buffer for filtered datasets

    if (useBuffer) {
      logger.debug('Using buffer strategy for TMDB filters', {
        context: 'my-movies',
        bufferSize: BUFFER_SIZE,
      });
      // Fetch all (up to buffer) from DB
      watchListRecords = await prisma.watchList.findMany({
        where: whereClauseWithRating,
        select: {
          id: true,
          tmdbId: true,
          mediaType: true,
          title: true,
          voteAverage: true,
          userRating: true,
          weightedRating: true,
          addedAt: true,
          statusId: true,
          tags: { select: { id: true, name: true } },
        },
        orderBy: [{ addedAt: 'desc' }, { id: 'desc' }],
        take: BUFFER_SIZE,
      });
      totalCount = await prisma.watchList.count({ where: whereClauseWithRating });
      useBufferStrategy = true;
    } else {
      logger.debug('Using DB pagination (skip/take)', {
        context: 'my-movies',
        page,
        limit,
      });
      // Proper pagination with skip/take
      const pageSkip = (page - 1) * limit;
      const pageTake = limit + 1; // +1 for hasMore detection

      totalCount = await prisma.watchList.count({ where: whereClauseWithRating });

      watchListRecords = await prisma.watchList.findMany({
        where: whereClauseWithRating,
        select: {
          id: true,
          tmdbId: true,
          mediaType: true,
          title: true,
          voteAverage: true,
          userRating: true,
          weightedRating: true,
          addedAt: true,
          statusId: true,
          tags: { select: { id: true, name: true } },
        },
        orderBy: [{ addedAt: 'desc' }, { id: 'desc' }],
        skip: pageSkip,
        take: pageTake,
      });
      useBufferStrategy = false;
    }`;

code = code.replace(oldSection, newSection);

// 2. Replace pagination after sorting
const oldPagination = `    // Paginate: use limit for slicing
    const pageStartIndex = (page - 1) * limit;
    const pageEndIndex = pageStartIndex + limit;
    const paginatedMovies = sortedMovies.slice(pageStartIndex, pageEndIndex);
    
    // hasMore: Check if there are more records after this page
    const hasMore = sortedMovies.length > pageEndIndex;`;

const newPagination = `    // Paginate results according to strategy
    let paginatedMovies: Movie[];
    let hasMore: boolean;
    let responseTotalCount: number;

    if (useBufferStrategy) {
      // Buffer case: sortedMovies is the full filtered set (up to buffer)
      const pageStartIndex = (page - 1) * limit;
      const pageEndIndex = pageStartIndex + limit;
      paginatedMovies = sortedMovies.slice(pageStartIndex, pageEndIndex);
      hasMore = sortedMovies.length > pageEndIndex;
      responseTotalCount = sortedMovies.length;
    } else {
      // DB pagination case: sortedMovies already contains the requested page (+1 extra)
      paginatedMovies = sortedMovies.slice(0, limit);
      hasMore = sortedMovies.length > limit;
      responseTotalCount = totalCount;
    }`;

code = code.replace(oldPagination, newPagination);

// 3. Change totalCount in return
code = code.replace(
  'totalCount: sortedMovies.length',
  'totalCount: responseTotalCount'
);

fs.writeFileSync(path, code);
console.log('✅ route.ts updated with pagination fix');
