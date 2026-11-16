export const PRAYERS = {
  cross: ['Sign of the Cross', 'In the name of the Father, and of the Son, and of the Holy Ghost. Amen.'],
  creed: ["The Apostles' Creed", 'I believe in God, the Father Almighty, Creator of heaven and earth; and in Jesus Christ, His only Son, our Lord; who was conceived by the Holy Ghost, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died, and was buried. He descended into hell; the third day He rose again from the dead; He ascended into heaven, and sitteth at the right hand of God the Father Almighty; from thence He shall come to judge the living and the dead.\n\nI believe in the Holy Ghost, the holy Catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.'],
  father: ['Our Father', 'Our Father, who art in heaven, hallowed be Thy name; Thy kingdom come; Thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.'],
  mary: ['Hail Mary', 'Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus.\n\nHoly Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.'],
  glory: ['Glory Be', 'Glory be to the Father, and to the Son, and to the Holy Ghost. As it was in the beginning, is now, and ever shall be, world without end. Amen.'],
  fatima: ['The Fatima Prayer', 'O my Jesus, forgive us our sins, save us from the fires of hell, lead all souls to heaven, especially those in most need of Thy mercy.'],
  queen: ['Hail, Holy Queen', 'Hail, holy Queen, Mother of mercy, our life, our sweetness, and our hope. To thee do we cry, poor banished children of Eve. To thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious advocate, thine eyes of mercy toward us; and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary.\n\nPray for us, O holy Mother of God.\nThat we may be made worthy of the promises of Christ.'],
  closing: ['Let us pray', 'O God, whose only-begotten Son, by His life, death, and resurrection, has purchased for us the rewards of eternal life; grant, we beseech Thee, that meditating upon these mysteries of the most holy Rosary of the Blessed Virgin Mary, we may imitate what they contain and obtain what they promise, through the same Christ our Lord. Amen.'],
};

export const MYSTERIES = {
  joyful: {
    name: 'Joyful', days: 'Monday & Saturday', description: 'Contemplate the joy of His coming.',
    mysteries: [
      { title: 'The Annunciation', reference: 'Luke 1:26–38', reading: 'The angel Gabriel comes to Mary in Nazareth and tells her that she has found favor with God. She will bear a son, Jesus, who will be called the Son of the Most High. Mary asks how this can be, and Gabriel explains that the Holy Ghost will come upon her. Trusting in God, she freely accepts His will and offers herself as His handmaid.', reflection: 'With Mary, ask for the grace to say yes to God, even when the way ahead is not yet clear.' },
      { title: 'The Visitation', reference: 'Luke 1:39–56', reading: 'Mary travels into the hill country to visit her cousin Elizabeth, who is also expecting a child. At Mary’s greeting, the child in Elizabeth’s womb leaps for joy, and Elizabeth, filled with the Holy Ghost, recognizes Mary as the mother of her Lord. Mary praises God for His mercy and for the great things He has done. She stays with Elizabeth for about three months.', reflection: 'With Mary, consider whom you can visit, encourage, or serve with a generous heart.' },
      { title: 'The Nativity', reference: 'Luke 2:1–20', reading: 'Mary and Joseph travel to Bethlehem, where Jesus is born. Mary wraps Him in swaddling clothes and lays Him in a manger because there is no room for them in the lodging place. Angels announce the good news to shepherds, who come to see the child and glorify God. Mary treasures these things and ponders them in her heart.', reflection: 'Welcome Christ in simplicity, and make room for Him in the ordinary places of your life.' },
      { title: 'The Presentation in the Temple', reference: 'Luke 2:22–38', reading: 'Mary and Joseph bring the infant Jesus to the Temple in Jerusalem to present Him to the Lord. Simeon takes Him in his arms and praises God, recognizing the promised salvation and a light for all peoples. He also tells Mary that a sword will pierce her soul. The prophetess Anna gives thanks and speaks of the child to those awaiting redemption.', reflection: 'Offer your day to God, with its joys and its sacrifices, and ask for a heart that recognizes His presence.' },
      { title: 'The Finding of Jesus in the Temple', reference: 'Luke 2:41–52', reading: 'After a pilgrimage to Jerusalem, Mary and Joseph discover that the twelve-year-old Jesus is not with their company. They return and, after three days, find Him in the Temple, listening to the teachers and asking questions. Jesus speaks of being about His Father’s business. He returns to Nazareth with them, and Mary keeps these things in her heart.', reflection: 'Bring to God the times you have felt lost or anxious, and seek Him again with patience and trust.' },
    ],
  },
  sorrowful: {
    name: 'Sorrowful', days: 'Tuesday & Friday', description: 'Walk with Christ in His suffering.',
    mysteries: [
      { title: 'The Agony in the Garden', reference: 'Matthew 26:36–46; Luke 22:39–46', reading: 'In the garden of Gethsemane, Jesus withdraws to pray while His disciples struggle to stay awake. Facing His Passion, He is deeply sorrowful and asks the Father that the cup of suffering might pass from Him. Yet He entrusts Himself completely to the Father’s will. He asks His disciples to watch and pray.', reflection: 'Keep watch with Jesus, and place your fears and difficult decisions in the Father’s hands.' },
      { title: 'The Scourging at the Pillar', reference: 'John 19:1; Mark 15:15', reading: 'Though Jesus is innocent, Pilate has Him scourged before handing Him over to be crucified. The Lord who healed the sick and welcomed the outcast now suffers violence Himself. In this mystery, contemplate His love for those who suffer and His willingness to endure the cruelty of sin.', reflection: 'Pray for people who are hurt or mistreated, and ask for the courage to protect the dignity of others.' },
      { title: 'The Crowning with Thorns', reference: 'Matthew 27:27–31', reading: 'The soldiers clothe Jesus in a scarlet robe and press a crown of thorns upon His head. They place a reed in His hand, kneel before Him in mockery, and strike Him. They ridicule His kingship, not recognizing the true King before them. His kingdom is revealed not through violence or pride, but through self-giving love.', reflection: 'Ask for humility and for the grace to honor Christ in those whom the world overlooks or mocks.' },
      { title: 'The Carrying of the Cross', reference: 'Luke 23:26–32; John 19:16–17', reading: 'Jesus is led out to the place of crucifixion, carrying His cross. Simon of Cyrene is made to help Him along the way. Women of Jerusalem mourn for Him, and He turns to speak to them. Contemplate the Lord continuing His path of love, and those who share even a small part of His burden.', reflection: 'Bring your burdens to Jesus, and consider how you might help carry someone else’s today.' },
      { title: 'The Crucifixion', reference: 'Luke 23:33–49; John 19:25–30', reading: 'Jesus is nailed to the cross between two criminals. He prays for those who crucify Him, offers mercy to the repentant thief, and entrusts His mother and the beloved disciple to one another. Having given Himself completely, He bows His head and dies. At the foot of the cross, contemplate the depth of His love for the world.', reflection: 'Remain with Mary beside the cross, and entrust to Christ those most in need of mercy and hope.' },
    ],
  },
  glorious: {
    name: 'Glorious', days: 'Wednesday & Sunday', description: 'Rest in the hope of the Resurrection.',
    mysteries: [
      { title: 'The Resurrection', reference: 'Matthew 28:1–10; John 20:1–18', reading: 'On the first day of the week, the women come to the tomb and find that Jesus has risen. Death has not held Him. The risen Lord meets His followers, calls them out of fear, and sends them to share the good news. Mary Magdalene recognizes Him when He calls her by name.', reflection: 'Ask the risen Christ to renew your hope and bring His life into the places that feel empty.' },
      { title: 'The Ascension', reference: 'Luke 24:50–53; Acts 1:6–11', reading: 'After His Resurrection, Jesus prepares His disciples to be His witnesses. He promises the power of the Holy Ghost and blesses them. As they watch, He is taken up into heaven. They return to Jerusalem with joy, called to carry His message to the ends of the earth.', reflection: 'Trust that Christ is not absent from your life, and ask how you can bear witness to His love.' },
      { title: 'The Descent of the Holy Ghost', reference: 'Acts 1:14; 2:1–13', reading: 'The disciples gather in prayer, with Mary among those awaiting the promised Spirit. At Pentecost, a sound like a mighty wind fills the house, and tongues as of fire rest upon them. Filled with the Holy Ghost, they begin to proclaim God’s mighty works in different languages. Fear gives way to a mission that reaches every nation.', reflection: 'Ask the Holy Ghost for wisdom, courage, and a heart ready to bring peace.' },
      { title: 'The Assumption of Mary', reference: 'Catholic tradition; see also Luke 1:46–49 and 1 Corinthians 15:20–23', reading: 'Catholic faith holds that, at the end of her earthly life, Mary was taken body and soul into heavenly glory. This mystery is not narrated directly in Scripture. It contemplates the fulfillment of God’s grace in the mother of Jesus and points toward the resurrection and eternal life promised in Christ.', reflection: 'With Mary, look toward the life God promises, and ask for hope in times of loss or uncertainty.' },
      { title: 'The Coronation of Mary', reference: 'Catholic tradition; see also Revelation 12:1 and Luke 1:48', reading: 'The Church contemplates Mary crowned in the glory of heaven, sharing in the victory of her Son. This mystery is a traditional meditation, not a narrated Gospel event. Honored as Queen of Heaven and Earth, Mary always leads us to Christ, the source of every grace. Her humble service becomes a sign of the joy God prepares for His people.', reflection: 'Ask Mary to pray for you, and seek the quiet greatness of a life shaped by love and service.' },
    ],
  },
  luminous: {
    name: 'Luminous', days: 'Thursday', description: 'Meditate on the light of His ministry.',
    mysteries: [
      { title: 'The Baptism of Jesus in the Jordan', reference: 'Matthew 3:13–17', reading: 'Jesus comes to John at the River Jordan to be baptized. As He comes up from the water, the heavens are opened and the Spirit of God descends like a dove. A voice from heaven declares Him the beloved Son. At the beginning of His public ministry, the Father reveals who Jesus is.', reflection: 'Remember that you are called to live as a child of God, and listen for His loving voice.' },
      { title: 'The Wedding at Cana', reference: 'John 2:1–11', reading: 'At a wedding in Cana, Mary notices that the wine has run out and brings the need to Jesus. She tells the servants to do whatever He tells them. At His direction, they fill stone jars with water, which becomes wine. Through this first sign, Jesus reveals His glory, and His disciples believe in Him.', reflection: 'Bring the needs of others to Jesus, and ask for the trust to do what He asks.' },
      { title: 'The Proclamation of the Kingdom of God', reference: 'Mark 1:14–15; Luke 4:16–21', reading: 'Jesus proclaims that the kingdom of God is at hand and calls people to repentance and faith. He teaches, heals, forgives sins, and brings good news to the poor. In His words and deeds, the Father’s mercy draws near. He invites all who hear Him to turn toward God and begin again.', reflection: 'Ask where your heart needs renewal, and welcome the mercy that makes a new beginning possible.' },
      { title: 'The Transfiguration', reference: 'Luke 9:28–36', reading: 'Jesus takes Peter, James, and John up a mountain to pray. His appearance is changed, and His clothing shines with light. Moses and Elijah appear with Him, speaking of what He will accomplish in Jerusalem. From the cloud, the Father declares Jesus His chosen Son and tells the disciples to listen to Him.', reflection: 'Pause and listen to Christ. Ask that a glimpse of His light will strengthen you for the road ahead.' },
      { title: 'The Institution of the Eucharist', reference: 'Luke 22:14–20; 1 Corinthians 11:23–26', reading: 'At the Last Supper, Jesus takes bread, gives thanks, breaks it, and gives it to His disciples as His body. He gives the cup as the new covenant in His blood, poured out for them. He asks them to do this in remembrance of Him. On the night before His Passion, He gives Himself in a lasting gift of love.', reflection: 'Give thanks for Christ’s self-giving love, and ask to become more generous in your own.' },
    ],
  },
};

export const suggestedMystery = (date = new Date()) => ['glorious', 'joyful', 'sorrowful', 'glorious', 'luminous', 'sorrowful', 'joyful'][date.getDay()];
export function localDate(date = new Date()) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function previousDate(value) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
export function sequence(set, fatima = true) {
  if (!Object.hasOwn(MYSTERIES, set)) throw new Error('Unknown mystery set.');
  const steps = [];
  const add = (prayer, decade = 0, bead = 0, intention = '') => steps.push({ prayer, decade, bead, intention });
  add('cross'); add('creed'); add('father');
  ['For faith', 'For hope', 'For charity'].forEach((intention, i) => add('mary', 0, i + 1, intention));
  add('glory');
  for (let decade = 1; decade <= 5; decade++) {
    add('father', decade);
    for (let bead = 1; bead <= 10; bead++) add('mary', decade, bead);
    add('glory', decade);
    if (fatima) add('fatima', decade);
  }
  add('queen'); add('closing'); add('cross');
  return steps;
}
export const emptyState = () => ({ version: 1, progress: null, completions: [], notes: [], fatima: true });
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const stamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const mystery = value => typeof value === 'string' && Object.hasOwn(MYSTERIES, value);

export function validateState(value) {
  const invalid = () => { throw new Error('This is not a valid Stillwater v1 backup. No data has been changed.'); };
  if (!record(value) || value.version !== 1 || typeof value.fatima !== 'boolean' || !Array.isArray(value.notes) || !Array.isArray(value.completions) || value.notes.length > 10000 || value.completions.length > 100000) invalid();
  const progress = value.progress;
  if (progress !== null && (!record(progress) || !mystery(progress.set) || typeof progress.fatima !== 'boolean' || !Number.isInteger(progress.step) || progress.step < 0 || progress.step >= sequence(progress.set, progress.fatima).length || !stamp(progress.startedAt))) invalid();
  const notes = value.notes.map(note => {
    if (!record(note) || !id(note.id) || !validDate(note.date) || typeof note.text !== 'string' || !note.text.trim() || note.text.length > 10000 || !stamp(note.updatedAt)) invalid();
    return { id: note.id, date: note.date, text: note.text, updatedAt: note.updatedAt };
  });
  const completions = value.completions.map(item => {
    if (!record(item) || !id(item.id) || !validDate(item.date) || !mystery(item.mystery) || !stamp(item.completedAt)) invalid();
    return { id: item.id, date: item.date, mystery: item.mystery, completedAt: item.completedAt };
  });
  if (new Set(notes.map(note => note.id)).size !== notes.length || new Set(completions.map(item => item.id)).size !== completions.length) invalid();
  return { version: 1, progress: progress && { set: progress.set, fatima: progress.fatima, step: progress.step, startedAt: progress.startedAt }, fatima: value.fatima, notes, completions };
}
export const STORAGE_KEY = 'stillwater-v1';
export function loadState(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  return raw === null ? emptyState() : validateState(JSON.parse(raw));
}
export function saveState(storage, state) {
  const serialized = JSON.stringify(validateState(state));
  storage.setItem(STORAGE_KEY, serialized);
  return serialized;
}
export function parseBackup(text) {
  if (typeof text !== 'string' || text.length > 2_000_000) throw new Error('Backup is too large (maximum 2 MB).');
  try { return validateState(JSON.parse(text)); }
  catch (error) {
    if (error instanceof SyntaxError) throw new Error('The backup is not readable JSON. No data has been changed.');
    throw error;
  }
}
export function mergeBackup(current, incoming, createId = () => crypto.randomUUID()) {
  const merged = validateState(current);
  const backup = validateState(incoming);
  for (const note of backup.notes) {
    const existing = merged.notes.find(item => item.id === note.id);
    if (!existing) merged.notes.push(note);
    else if (existing.text !== note.text || existing.date !== note.date) {
      if (!merged.notes.some(item => item.text === note.text && item.date === note.date && item.updatedAt === note.updatedAt)) merged.notes.push({ ...note, id: createId() });
    }
  }
  for (const item of backup.completions) {
    if (!merged.completions.some(other => other.date === item.date && other.mystery === item.mystery && other.completedAt === item.completedAt)) {
      merged.completions.push({ ...item, id: merged.completions.some(other => other.id === item.id) ? createId() : item.id });
    }
  }
  // An import never interrupts a rosary already in progress.
  merged.progress ??= backup.progress;
  return validateState(merged);
}
export function stats(completions, today = localDate()) {
  const days = new Set(completions.map(item => item.date).filter(date => date <= today));
  let cursor = days.has(today) ? today : previousDate(today);
  let streak = 0;
  while (days.has(cursor)) { streak++; cursor = previousDate(cursor); }
  return { days: days.size, streak, today: days.has(today) };
}
export function finishRosary(state, now = new Date(), createId = () => crypto.randomUUID()) {
  if (!state.progress || state.progress.step !== sequence(state.progress.set, state.progress.fatima).length - 1) throw new Error('Finish all the prayers before recording this rosary.');
  const result = validateState(state);
  result.completions.push({ id: createId(), date: localDate(now), mystery: result.progress.set, completedAt: now.toISOString() });
  result.progress = null;
  return result;
}
