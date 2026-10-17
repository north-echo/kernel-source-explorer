import type {Topic} from './learningTypes';
export function Availability({topic}:{topic:Topic}){
  return <ul className="availability" aria-label="Available learning paths"><li>Reading guide</li><li>{topic.walkthrough?.length?'Code walkthrough':'No code walkthrough'}</li><li>{topic.experiment?'Runnable experiment':'No dedicated experiment'}</li><li>{topic.checkpoints.length?`${topic.checkpoints.filter(c=>c.available).length}/${topic.checkpoints.length} checkpoints available`:'No reviewed kernel checkpoint'}</li></ul>;
}
