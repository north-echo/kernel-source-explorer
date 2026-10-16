import {useCallback, useEffect, useState} from 'react';
import {api} from './api';
import type {ReaderProfile, ReaderState} from './learningTypes';

const KEY = 'kse-reader-v1';
function load(): {state: ReaderState; local: boolean; error: string} {
  const fallback: ReaderState = {version: 1, readingLesson: 'process-inheritance', readingReference: 'Chapter 2 · §2.7 Processes', interests: [], lastLesson: '', studyEnvironment: '', discussionContext: '', notes: {}};
  try {
    const saved = localStorage.getItem(KEY);
    if (!saved) return {state: fallback, local: false, error: ''};
    const value = JSON.parse(saved);
    if ((value.studyEnvironment !== undefined && typeof value.studyEnvironment !== 'string') || (value.discussionContext !== undefined && typeof value.discussionContext !== 'string')) throw new Error();
    if (value.version !== 1 || typeof value.readingLesson !== 'string' || typeof value.readingReference !== 'string' || !Array.isArray(value.interests) || !value.interests.every((x: unknown) => typeof x === 'string') || typeof value.lastLesson !== 'string' || !value.notes || typeof value.notes !== 'object') throw new Error();
    for (const note of Object.values(value.notes) as any[]) {
      if (!note || typeof note.thinking !== 'string' || typeof note.observation !== 'string' || !['not-run','traced','ran'].includes(note.experiment) || !note.visited || typeof note.visited !== 'object') throw new Error();
    }
    return {state: {...fallback, ...value}, local: true, error: ''};
  } catch {return {state: fallback, local: true, error: 'Local reading notes could not be read. Your stored data has been left untouched.'};}
}
export function useReaderState() {
  const [initial] = useState(load);
  const [reader, setReader] = useState(initial.state);
  const [storageError, setStorageError] = useState(initial.error);
  const [dirty, setDirty] = useState(false);
  const updateReader = useCallback((update: (old: ReaderState) => ReaderState) => {setReader(update); setDirty(true);}, []);
  useEffect(() => {
    if (initial.local) return;
    const controller = new AbortController();
    api<ReaderProfile>('reader-profile', undefined, controller.signal).then(profile => {
      // Local interaction takes precedence over a late profile response.
      setReader(old => old.lastLesson || old.readingReference !== initial.state.readingReference ? old : {...old, readingLesson: profile.reading_lesson, readingReference: profile.reading_reference, interests: profile.interests, studyEnvironment: profile.study_environment || '', discussionContext: profile.discussion_context || ''});
    }).catch(() => {});
    return () => controller.abort();
  }, [initial]);
  useEffect(() => {
    if (!dirty) return;
    try {localStorage.setItem(KEY, JSON.stringify(reader)); setStorageError('');}
    catch {setStorageError('The browser could not save your notes. Export them before closing this page.');}
  }, [reader, dirty]);
  return {reader, updateReader, storageError};
}
