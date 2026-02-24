-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Party" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'lobby',
    "duration" INTEGER,
    "songLimit" INTEGER,
    "voteVisibility" TEXT NOT NULL DEFAULT 'live',
    "theme" TEXT NOT NULL DEFAULT 'default',
    "birthdayUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "currentSongId" TEXT
);
INSERT INTO "new_Party" ("code", "createdAt", "currentSongId", "duration", "endedAt", "id", "songLimit", "startedAt", "status", "voteVisibility") SELECT "code", "createdAt", "currentSongId", "duration", "endedAt", "id", "songLimit", "startedAt", "status", "voteVisibility" FROM "Party";
DROP TABLE "Party";
ALTER TABLE "new_Party" RENAME TO "Party";
CREATE UNIQUE INDEX "Party_code_key" ON "Party"("code");
CREATE INDEX "Party_code_idx" ON "Party"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
