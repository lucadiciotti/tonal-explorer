import { it } from './it';
import { en } from './en';

export type Language = 'it' | 'en';

export const translations = { it, en } as const;

export type TranslationKeys = typeof it;
