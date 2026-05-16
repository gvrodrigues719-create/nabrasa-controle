// Mocking Date.UTC and toISOString behavior to match Node/JS environment
function brasiliaToUTC(dateStr, boundary = 'start') {
  if (!dateStr || dateStr.length < 10) {
    throw new Error(`Data inválida recebida: "${dateStr}"`)
  }

  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Formato de data inválido: "${dateStr}"`)
  }

  const date = new Date(parts[0], parts[1] - 1, parts[2])
  
  if (isNaN(date.getTime())) {
    throw new Error(`Data impossível: "${dateStr}"`)
  }

  if (boundary === 'start') {
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 3, 0, 0, 0)).toISOString().split('.')[0] + 'Z'
  } else {
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1, 3, 0, 0, -1)).toISOString().split('.')[0] + 'Z'
  }
}

const testCases = ["2026-05-16", "", "invalid", "2026-02-30"];

testCases.forEach(tc => {
  try {
    console.log(`Input: "${tc}"`);
    console.log(`  Start:`, brasiliaToUTC(tc, 'start'));
    console.log(`  End  :`, brasiliaToUTC(tc, 'end'));
  } catch (e) {
    console.log(`  Error:`, e.message);
  }
});
