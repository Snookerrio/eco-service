let counters = {};

function generateId(prefix = 'id') {
  if (!counters[prefix]) counters[prefix] = 1;
  return `${prefix}_${counters[prefix]++}`;
}

function resetCounters() {
  counters = {};
}

function uuidLike() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

module.exports = { generateId, resetCounters, uuidLike };
