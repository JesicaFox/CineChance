const fs = require('fs');
const path = 'src/app/api/my-movies/route.ts';
let code = fs.readFileSync(path, 'utf8');

// Replace the pagination if/else block to define pageStartIndex and pageEndIndex in both branches
const oldPaginationBlock = `    if (useBufferStrategy) {
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

const newPaginationBlock = `    // Compute indices for logging and potential use
    const pageStartIndex = (page - 1) * limit;
    const pageEndIndex = pageStartIndex + limit;

    if (useBufferStrategy) {
      // Buffer case: sortedMovies is the full filtered set (up to buffer)
      paginatedMovies = sortedMovies.slice(pageStartIndex, pageEndIndex);
      hasMore = sortedMovies.length > pageEndIndex;
      responseTotalCount = sortedMovies.length;
    } else {
      // DB pagination case: sortedMovies already contains the requested page (+1 extra)
      paginatedMovies = sortedMovies.slice(0, limit);
      hasMore = sortedMovies.length > limit;
      responseTotalCount = totalCount;
    }`;

code = code.replace(oldPaginationBlock, newPaginationBlock);

fs.writeFileSync(path, code);
console.log('✅ Fixed pageStartIndex definition');
