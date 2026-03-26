const fs = require('fs');
const refs = JSON.parse(fs.readFileSync('references.json', 'utf8'));

// Check: for "Homans et al. (1978)", does any reference VALUE contain "HOMANS" and "1978"?
const testCases = [
  'Homans et al. (1978)',
  'Walker et al. (1990)',
  'Walker et al. (1996)',
  'Cometto-Muñiz et al. (1998a)',
  'Sunderkötter et al. (2010)',
  'Stone & Bosley (1965)',
  'McGee et al. (1995)',
  'Etzweiler et al. (1992)',
  'Ferreira et al. (1998)',
  'Weeks et al. (1960)',
  'Carpenter et al. (1948)',
  'Korneev (1965)',
  'Nauš (1982)',
];

const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

for (const cite of testCases) {
  const yearMatch = cite.match(/(\d{4}[a-z]?)/); 
  const year = yearMatch ? yearMatch[1] : '';
  const authorMatch = cite.match(/^([a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\-]+)/);
  const author = authorMatch ? normalize(authorMatch[1]) : '';
  
  // Search in VALUES (full text) not just keys
  const candidates = [];
  for (const [key, val] of Object.entries(refs)) {
    const nVal = normalize(val);
    const nKey = normalize(key);
    if ((nKey.includes(author) || nVal.includes(author)) && (nKey.includes(year) || nVal.includes(year.replace(/[a-z]$/, '')))) {
      candidates.push(key);
    }
  }
  console.log(`"${cite}" (author=${author}, year=${year}): ${candidates.length} matches in full text`);
  if (candidates.length > 0) console.log(`  -> ${candidates.slice(0, 3).join(' | ')}`);
}
