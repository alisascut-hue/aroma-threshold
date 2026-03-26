const fs = require('fs');

const data = JSON.parse(fs.readFileSync('aroma_data_merged.json', 'utf8'));
const refs = JSON.parse(fs.readFileSync('references.json', 'utf8'));
const lookup = JSON.parse(fs.readFileSync('references_lookup.json', 'utf8'));

const extractAuthor = (str) => {
  const match = str.match(/^(.+?\(\d{4}.*?\))\s*(?:([dr])\s+)?(.*)$/);
  if (match) return match[1].trim();
  return str.trim();
};

const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const normRefsKeys = Object.keys(refs).map(k => ({
  original: k,
  normalized: normalize(k),
  fullText: refs[k]
}));

const matchReference = (shortCitation) => {
  if (!shortCitation) return null;
  
  // Strategy 1: O(1) lookup
  const normCite = normalize(shortCitation);
  if (lookup[normCite]) return lookup[normCite];
  
  // Strategy 2: Scoring
  const yearMatches = [...shortCitation.matchAll(/(18|19|20)\d{2}/g)];
  if (yearMatches.length === 0) return null;
  const years = yearMatches.map(m => m[0]);
  
  let mainAuthor = "";
  const vanDeMatch = shortCitation.match(/^(Van|De|Von|Le|La|Du|Di)\s+([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\-]+)/i);
  const hyphenMatch = shortCitation.match(/^([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]+\-[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]+)/);
  const simpleMatch = shortCitation.match(/^([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\-]+)/);
  
  if (hyphenMatch) mainAuthor = normalize(hyphenMatch[1]);
  else if (simpleMatch) mainAuthor = normalize(simpleMatch[1]);
  if (!mainAuthor) return null;
  
  let secondAuthor = "";
  const ampMatch = shortCitation.match(/[&\&]\s*([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\-]+)/);
  if (ampMatch) secondAuthor = normalize(ampMatch[1]);
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const refItem of normRefsKeys) {
    let score = 0;
    const normKey = refItem.normalized;
    const yearFound = years.some(y => normKey.includes(y));
    if (!yearFound) continue;
    if (normKey.startsWith(mainAuthor)) score += 10;
    else if (normKey.includes(mainAuthor)) score += 5;
    else continue;
    if (secondAuthor && normKey.includes(secondAuthor)) score += 3;
    const yearSuffix = shortCitation.match(/\((\d{4}[a-z]?)\)/);
    if (yearSuffix && normKey.includes(yearSuffix[1])) score += 2;
    if (vanDeMatch) {
      const prefix = normalize(vanDeMatch[1]);
      const surname = normalize(vanDeMatch[2]);
      if (normKey.includes(surname) && normKey.includes(prefix)) score += 4;
    }
    if (score > bestScore) { bestScore = score; bestMatch = refItem.fullText; }
  }
  
  return bestMatch;
};

const allCitations = new Set();
data.forEach(item => {
  if (item.threshold_data) {
    item.threshold_data.forEach(th => {
      const a = extractAuthor(th);
      if (a.match(/\(\d{4}/)) allCitations.add(a);
    });
  }
});

let matched = 0, lookupHits = 0, scoringHits = 0;
const failSamples = [];

for (const cite of allCitations) {
  const normCite = normalize(cite);
  if (lookup[normCite]) {
    matched++; lookupHits++;
  } else {
    // Try scoring
    const r = matchReference(cite);
    if (r) { matched++; scoringHits++; }
    else if (failSamples.length < 15) failSamples.push(cite);
  }
}

console.log(`Total valid citations: ${allCitations.size}`);
console.log(`Matched: ${matched} (${(matched/allCitations.size*100).toFixed(1)}%)`);
console.log(`  - via lookup: ${lookupHits}`);
console.log(`  - via scoring: ${scoringHits}`);
console.log(`Unmatched: ${allCitations.size - matched} (${((allCitations.size-matched)/allCitations.size*100).toFixed(1)}%)`);
console.log(`\nUnmatched samples:`);
failSamples.forEach(c => console.log(`  ${c}`));
