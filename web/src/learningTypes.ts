import type { Edge, Loc } from "./types";
export type Selection = {
  symbol_id: string;
  name: string;
  location: Loc;
  edge?: Edge;
};
export type Checkpoint = {
  id: string;
  title: string;
  notice: string;
  ignore: string;
  question: string;
  available: boolean;
  reason?: string;
  reason_code?: string;
  dataset_id?: string;
  selection?: Selection;
};
export type Reference = { title: string; url: string };
export type ConceptMap = {
  title: string;
  scope?: string;
  nodes: { id: string; label: string; detail?: string }[];
  edges: { source: string; target: string; label?: string }[];
};
export type Containment = {
  kind: string;
  subject: string;
  resource: string;
  origin: string;
  operation: string;
  enforcement: string;
  remaining: string;
  establishes: string;
};
export type Concept = {
  title: string;
  scenario: string;
  explanation: string;
  assumptions: string;
  counterexample: string;
  apis: string[];
  code?: string;
  references?: Reference[];
  table?: { columns: string[]; rows: string[][] };
};
export type Segment = {
  id: string;
  title: string;
  explanation: string[];
  question: string;
  situation: string;
  prerequisite: string;
  steps: string[];
  change: string;
  tables?: { title: string; columns: string[]; rows: string[][] }[];
  start: number;
  end: number;
};
export type Experiment = {
  file: string;
  intro: string;
  commands: string;
  expected: string;
  observe: string;
  source: string;
  sha256: string;
  assumptions: string;
  variation: string;
  variability: string;
  troubleshooting: string[];
};
export type Topic = {
  id: string;
  title: string;
  chapter: string;
  reference: string;
  reading: string;
  summary: string;
  prompt: string;
  explanation: string[];
  follow_up: string;
  boundary: string;
  terms: string[];
  number?: number;
  group?: string;
  related?: string[];
  flow?: ConceptMap;
  experiment?: Experiment;
  walkthrough?: Segment[];
  checkpoints: Checkpoint[];
  concepts?: Concept[];
  apis?: string[];
  synonyms?: string[];
  references?: Reference[];
  review?: { date: string; scope: string; baseline: string };
  availability?: {
    reading: boolean;
    walkthrough: boolean;
    experiment: boolean;
    checkpoint: boolean;
  };
  containment?: Containment;
};
export type TrackStage = {
  title: string;
  topics?: string[];
  chapters?: string[];
  status: string;
};
export type ModernReading = {
  title: string;
  url: string;
  requirements: string;
  scope: string;
  availability: string;
};
export type Curriculum = {
  version: number;
  annotation_origin: string;
  index_error?: string;
  book: { title: string; author: string; baseline: string; usage: string };
  glossary: Record<string, string>;
  chapters: Topic[];
  lessons: Topic[];
  track: TrackStage[];
  modern: ModernReading[];
};
export type ReaderProfile = {
  reading_lesson: string;
  reading_reference: string;
  interests: string[];
  study_environment?: string;
  discussion_context?: string;
  active_lab?: { lesson: string; segment: string };
};
export type TopicNotes = {
  thinking: string;
  observation: string;
  experiment: "not-run" | "traced" | "ran";
  visited: Record<string, string>;
};
export type ReaderState = {
  version: 2;
  lastExploration?: { hash: string; label: string };
  activeLab?: { lesson: string; segment: string };
  readingLesson: string;
  readingReference: string;
  interests: string[];
  lastLesson: string;
  studyEnvironment: string;
  discussionContext: string;
  notes: Record<string, TopicNotes>;
};
export type GuidedContext = {
  returnTo?: string;
  lesson: Pick<Topic, "id" | "title" | "reference">;
  checkpoint: Checkpoint;
};
export const emptyNotes = (): TopicNotes => ({
  thinking: "",
  observation: "",
  experiment: "not-run",
  visited: {},
});
