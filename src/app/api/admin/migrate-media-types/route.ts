// src/app/api/admin/migrate-media-types/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to detect media type
function detectMediaType(genres: number[], language: string, currentMediaType: string): string {
  const animeGenreIds = [16]; // Animation genre
  const isAnimated = genres.includes(animeGenreIds[0]);
  
  // Detect anime by language and genre
  if (isAnimated && (language === 'ja' || language === 'zh')) {
    return 'anime';
  }
  
  // Detect cartoon by animation + english/other
  if (isAnimated && (language === 'en' || language === '')) {
    return 'cartoon';
  }

  return currentMediaType;
}

export async function POST(request: NextRequest) {
  try {
    // Security: Check admin token or environment variable
    const adminToken = request.headers.get('x-admin-token');
    const validToken = process.env.ADMIN_MIGRATION_TOKEN;
    
    if (validToken && adminToken !== validToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🚀 Starting media type migration...');

    // Get all watch list items with userId
    const allRecords = await prisma.watchList.findMany({
      select: {
        id: true,
        userId: true,
        tmdbId: true,
        mediaType: true,
      },
    });

    console.log(`Found ${allRecords.length} records to process`);

    let updated = 0;
    let skipped = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Process each record
    for (let i = 0; i < allRecords.length; i++) {
      const record = allRecords[i];
      
      try {
        // Fetch media details from TMDB
        const tmdbApiKey = process.env.TMDB_API_KEY;
        if (!tmdbApiKey) {
          console.warn('⚠️  TMDB_API_KEY not set, skipping media type detection');
          break;
        }

        const mediaTypeParam = record.mediaType === 'tv' ? 'tv' : 'movie';
        const response = await fetch(
          `https://api.themoviedb.org/3/${mediaTypeParam}/${record.tmdbId}?api_key=${tmdbApiKey}`
        );

        if (!response.ok) {
          skipped++;
          continue;
        }

        const details = await response.json();
        const genres = details.genre_ids || (details.genres?.map((g: any) => g.id) ?? []);
        const language = details.original_language || '';

        const newMediaType = detectMediaType(genres, language, record.mediaType);

        // Only update if media type changed
        if (newMediaType !== record.mediaType) {
          try {
            // Use transaction to ensure atomicity
            // Order matters: delete dependent records first, then update parent
            await prisma.$transaction(async (tx) => {
              // 1. Delete RatingHistory entries (they reference watchList)
              const deletedRatings = await tx.ratingHistory.deleteMany({
                where: {
                  userId: record.userId,
                  tmdbId: record.tmdbId,
                  mediaType: record.mediaType,
                },
              });

              // 2. Delete RewatchLog entries (they reference watchList)
              const deletedRewatches = await tx.rewatchLog.deleteMany({
                where: {
                  userId: record.userId,
                  tmdbId: record.tmdbId,
                  mediaType: record.mediaType,
                },
              });

              // 3. Now update watchList (no FK constraint violations)
              await tx.watchList.update({
                where: { id: record.id },
                data: { mediaType: newMediaType },
              });

              console.log(
                `    └─ Deleted: ${deletedRatings.count} ratings, ${deletedRewatches.count} rewatches`
              );
            });
            
            updated++;
            console.log(
              `[${i + 1}/${allRecords.length}] ✓ Updated TMDB ${record.tmdbId}: ${record.mediaType} → ${newMediaType}`
            );
          } catch (updateError) {
            throw new Error(`Failed to update TMDB ${record.tmdbId}: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
          }
        }

        // Rate limiting: 1 request per 100ms to avoid TMDB API limits
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ id: record.id, error: errorMsg });
        console.error(`Error processing record ${record.id}: ${errorMsg}`);
      }
    }

    console.log(`\n✅ Migration completed:
      - Total records: ${allRecords.length}
      - Updated: ${updated}
      - Skipped: ${skipped}
      - Errors: ${errors.length}`);

    return NextResponse.json({
      success: true,
      message: 'Migration completed',
      stats: {
        total: allRecords.length,
        updated,
        skipped,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    return NextResponse.json(
      {
        error: 'Migration failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Security check
  const adminToken = request.headers.get('x-admin-token');
  const validToken = process.env.ADMIN_MIGRATION_TOKEN;
  
  if (validToken && adminToken !== validToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    info: 'Media type migration endpoint',
    usage: 'Send POST request to /api/admin/migrate-media-types',
    headers: {
      'x-admin-token': 'optional-if-ADMIN_MIGRATION_TOKEN-set',
    },
  });
}
