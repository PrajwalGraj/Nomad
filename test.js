const text = 'send 0.1 MON to Prajwal';
const contact = {name: 'Prajwal', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'};

let lastText = text;
const escapedName = contact.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regex = new RegExp('\\b' + escapedName + '\\b', 'gi');
lastText = lastText.replace(regex, contact.address);
console.log('Replaced:', lastText);

const intentRegex = /\bsend\s+([\d.]+)\s*([a-zA-Z]{2,10})?\s+to\s+(0x[a-fA-F0-9]{40})/i;
const match = lastText.match(intentRegex);
console.log('Match:', match !== null);
