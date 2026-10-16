import {useState} from 'react';
import type {Topic} from './learningTypes';
export function BookCatalog({chapters}: {chapters: Topic[]}) {
  const [query,setQuery]=useState('');
  const [group,setGroup]=useState('');
  const found=chapters.filter(c=>(!group || c.group===group) && `${c.chapter} ${c.title} ${c.summary}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <section className="book-catalog" aria-label="Full book chapter guides"><h2>The whole book, at your pace</h2><p>64 chapter reading guides, each with an original question, explanation and concept diagram. The six focused investigations above add reviewed kernel checkpoints and optional C experiments. Choose any chapter; there is no required sequence.</p><div className="catalog-filters"><label>Find a chapter<input type="search" placeholder="Chapter number, title or idea…" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Subject<select value={group} onChange={e=>setGroup(e.target.value)}><option value="">All subjects</option>{[...new Set(chapters.map(c=>c.group))].map(g=><option key={g}>{g}</option>)}</select></label></div><p className="catalog-count" aria-live="polite">{found.length} of {chapters.length} chapters</p><div className="chapter-grid">{found.map(c=><a key={c.id} href={'#learn/'+c.id}><span>Chapter {c.chapter} · {c.group}</span><h3>{c.title}</h3><p>{c.summary}</p></a>)}</div>{!found.length && <p>No chapters match. Try another word or choose all subjects.</p>}</section>;
}
