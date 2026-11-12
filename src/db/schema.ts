import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table linked to Firebase Authentication UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoURL: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Journal entries table storing personal reflections and cognitive emotion analysis
export const journals = pgTable('journals', {
  id: text('id').primaryKey(), // unique journal identifier
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  text: text('text').notNull(),
  primaryEmotion: text('primary_emotion').notNull(),
  secondaryEmotions: text('secondary_emotions').notNull(), // JSON string array
  distribution: text('distribution').notNull(), // JSON string of percentage map
  emotionalTriggers: text('emotional_triggers'),
  mindfulInsight: text('mindful_insight'),
  rawScores: text('raw_scores'), // JSON string of GoEmotions probabilities
  analysisStatus: text('analysis_status').default('complete').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Meditation sessions table logging mindful minutes
export const meditationSessions = pgTable('meditation_sessions', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  patternName: text('pattern_name').notNull(),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  journals: many(journals),
  meditationSessions: many(meditationSessions),
}));

export const journalsRelations = relations(journals, ({ one }) => ({
  user: one(users, {
    fields: [journals.userId],
    references: [users.uid],
  }),
}));

export const meditationSessionsRelations = relations(meditationSessions, ({ one }) => ({
  user: one(users, {
    fields: [meditationSessions.userId],
    references: [users.uid],
  }),
}));
