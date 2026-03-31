import { prisma } from '@/lib/prisma';

async function verifyMigration() {
  console.log('🔍 Verifying media type migration...\n');

  // Check for anime and cartoon entries
  const animeCount = await prisma.watchList.count({
    where: { mediaType: 'anime' }
  });

  const cartoonCount = await prisma.watchList.count({
    where: { mediaType: 'cartoon' }
  });

  const movieCount = await prisma.watchList.count({
    where: { mediaType: 'movie' }
  });

  const tvCount = await prisma.watchList.count({
    where: { mediaType: 'tv' }
  });

  console.log('📊 Media Type Distribution:');
  console.log(`  • Anime:    ${animeCount}`);
  console.log(`  • Cartoon:  ${cartoonCount}`);
  console.log(`  • Movie:    ${movieCount}`);
  console.log(`  • TV:       ${tvCount}`);
  console.log(`  • Total:    ${animeCount + cartoonCount + movieCount + tvCount}\n`);

  // Show some anime examples
  const animeExamples = await prisma.watchList.findMany({
    where: { mediaType: 'anime' },
    select: { id: true, tmdbId: true, title: true, mediaType: true },
    take: 5,
  });

  if (animeExamples.length > 0) {
    console.log('📺 Anime Examples:');
    animeExamples.forEach(item => {
      console.log(`  • [${item.tmdbId}] ${item.title} (${item.mediaType})`);
    });
    console.log();
  }

  // Show some cartoon examples
  const cartoonExamples = await prisma.watchList.findMany({
    where: { mediaType: 'cartoon' },
    select: { id: true, tmdbId: true, title: true, mediaType: true },
    take: 5,
  });

  if (cartoonExamples.length > 0) {
    console.log('🎬 Cartoon Examples:');
    cartoonExamples.forEach(item => {
      console.log(`  • [${item.tmdbId}] ${item.title} (${item.mediaType})`);
    });
    console.log();
  }

  // Check for orphaned records in RatingHistory without watchList match
  const orphanedRatings = await prisma.$queryRaw`
    SELECT rh.id, rh."userId", rh."tmdbId", rh."mediaType"
    FROM "RatingHistory" rh
    LEFT JOIN "WatchList" wl ON wl."userId" = rh."userId" 
      AND wl."tmdbId" = rh."tmdbId" 
      AND wl."mediaType" = rh."mediaType"
    WHERE wl.id IS NULL
    LIMIT 5
  `;

  if (Array.isArray(orphanedRatings) && orphanedRatings.length > 0) {
    console.log('⚠️  Found orphaned RatingHistory records:');
    console.log(JSON.stringify(orphanedRatings, null, 2));
  } else {
    console.log('✅ No orphaned RatingHistory records found');
  }

  console.log('\n✅ Verification complete!');
  process.exit(0);
}

verifyMigration().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
