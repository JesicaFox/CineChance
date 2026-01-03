-- AlterTable
ALTER TABLE "WatchList" ADD COLUMN     "watchedDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blacklist" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TagToWatchList" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TagToWatchList_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Tag_userId_idx" ON "Tag"("userId");

-- CreateIndex
CREATE INDEX "Tag_usageCount_idx" ON "Tag"("usageCount");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");

-- CreateIndex
CREATE INDEX "Blacklist_userId_idx" ON "Blacklist"("userId");

-- CreateIndex
CREATE INDEX "Blacklist_tmdbId_idx" ON "Blacklist"("tmdbId");

-- CreateIndex
CREATE INDEX "Blacklist_createdAt_idx" ON "Blacklist"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Blacklist_userId_tmdbId_mediaType_key" ON "Blacklist"("userId", "tmdbId", "mediaType");

-- CreateIndex
CREATE INDEX "_TagToWatchList_B_index" ON "_TagToWatchList"("B");

-- CreateIndex
CREATE INDEX "WatchList_addedAt_idx" ON "WatchList"("addedAt");

-- CreateIndex
CREATE INDEX "WatchList_userRating_idx" ON "WatchList"("userRating");

-- CreateIndex
CREATE INDEX "WatchList_userId_statusId_idx" ON "WatchList"("userId", "statusId");

-- CreateIndex
CREATE INDEX "WatchList_userId_addedAt_idx" ON "WatchList"("userId", "addedAt");

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blacklist" ADD CONSTRAINT "Blacklist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToWatchList" ADD CONSTRAINT "_TagToWatchList_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToWatchList" ADD CONSTRAINT "_TagToWatchList_B_fkey" FOREIGN KEY ("B") REFERENCES "WatchList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
