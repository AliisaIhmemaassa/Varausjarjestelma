const { createClient } = supabase;
const sb = createClient(
  'https://tcsofrgmtpsmjrekujyu.supabase.co',
  'sb_publishable_S1GeZ_PbIfPMQCYmYU35tg_rJ4Kusv6'
);

const MONTHS = ['Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu', 'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu'];
let currentYear, currentMonth;
let bookings = [];

// ─── Auth ────────────────────────────────────────────────────────────────────

async function unlock() {
    const email = 'daniel.brown23103@gmail.com';
    const password = document.getElementById('lock-input').value;
    const errEl = document.getElementById('lock-error');

    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
        errEl.textContent = 'Väärä sähköposti tai salasana.';
        errEl.style.display = 'block';
        document.getElementById('lock-input').value = '';
        document.getElementById('lock-input').focus();
    } else {
        showApp();
    }
}

async function logout() {
    await sb.auth.signOut();
    document.getElementById('app').style.display = 'none';
    document.getElementById('lock-screen').style.display = 'flex';
    document.getElementById('start-display').value = '';
    document.getElementById('end-display').value = '';
    document.getElementById('booked-for').value = '';
}

function showApp() {
    document.getElementById('lock-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    loadBookings();
}

// Check if already logged in on page load
sb.auth.getSession().then(({ data: { session } }) => {
    if (session) showApp();
});

document.getElementById('lock-input').addEventListener('keydown', e => { if (e.key === 'Enter') unlock(); });
// ─── Supabase data ────────────────────────────────────────────────────────────

async function loadBookings() {
    const { data, error } = await sb.from('bookings').select('*').order('start');
    if (error) { console.error(error); return; }
    bookings = data;
    renderCalendar();
    renderBookingsList();
}

async function saveBooking(start, end, name) {
    const { data, error } = await sb.from('bookings').insert([{ start, end, name }]).select();
    if (error) { console.error(error); return null; }
    return data[0];
}

async function deleteBooking(id) {
    const { error } = await sb.from('bookings').delete().eq('id', id);
    if (error) { console.error(error); return; }
    await loadBookings();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function parseDate(s) {
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y, m-1, d);
}

function formatDisplay(s) {
    return parseDate(s).toLocaleDateString('fi-FI', { day:'numeric', month:'short', year:'numeric' });
}

function toDisplay(s) {
    const [y,m,d] = s.split('-').map(Number);
    return String(d).padStart(2,'0') + '.' + String(m).padStart(2,'0') + '.' + y;
}

function displayToStr(s) {
    const [d, m, y] = s.split('.').map(Number);
    return y + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0');
}

function toStr(y,m,d) { return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }

function changeMonth(dir) {
    currentMonth += dir;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
}

function getBookingForDate(dateStr) {
    return bookings.find(b => dateStr >= b.start && dateStr <= b.end);
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function renderCalendar() {
    document.getElementById('month-label').textContent = MONTHS[currentMonth] + ' ' + currentYear;
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';
    const today = toDateStr(new Date());
    let startOffset = new Date(currentYear, currentMonth, 1).getDay() - 1;
    if (startOffset < 0) startOffset = 6;
    const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();

    for (let i = 0; i < startOffset; i++) {
        const el = document.createElement('div');
        el.className = 'cal-day empty';
        grid.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = currentYear + '-' + String(currentMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
        const el = document.createElement('div');
        const booking = getBookingForDate(dateStr);
        let cls = 'cal-day';
        if (dateStr === today) cls += ' today';
        if (dateStr < today) cls += ' past';
        if (booking) {
            if (booking.start === booking.end) cls += ' booked-single';
            else if (dateStr === booking.start) cls += ' booked-start';
            else if (dateStr === booking.end) cls += ' booked-end';
            else cls += ' booked-mid';
        }
        el.className = cls;

        const num = document.createElement('span');
        num.textContent = d;
        el.appendChild(num);

        if (booking && dateStr === booking.start) {
            const lbl = document.createElement('div');
            lbl.className = 'booked-label';
            lbl.textContent = booking.name;
            el.appendChild(lbl);
        }

        el.addEventListener('click', () => {
            if (!booking && dateStr >= toDateStr(new Date())) {
                document.getElementById('start-display').value = toDisplay(dateStr);
                document.getElementById('end-display').value = toDisplay(dateStr);
                document.getElementById('booked-for').focus();
                startVal = dateStr;
                endVal = dateStr;
                pickingStep = 1;
            }
        });

        grid.appendChild(el);
    }
}

function renderBookingsList() {
    const card = document.getElementById('bookings-card');
    const list = document.getElementById('bookings-list');
    if (bookings.length === 0) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    const sorted = [...bookings].sort((a,b) => a.start.localeCompare(b.start));
    list.innerHTML = sorted.map(b => {
        const range = b.start === b.end ? formatDisplay(b.start) : formatDisplay(b.start) + ' – ' + formatDisplay(b.end);
        return `<div class="booking-item">
        <div>
            <div class="booking-name">${b.name}</div>
            <div class="booking-dates">${range}</div>
        </div>
        <button class="delete-btn" onclick="removeBooking(${b.id})" aria-label="Poista varaus">&times;</button>
        </div>`;
    }).join('');
}

async function removeBooking(id) {
    await deleteBooking(id);
}

// ─── Submit ───────────────────────────────────────────────────────────────────

async function submitBooking() {
    const name = document.getElementById('booked-for').value.trim();
    const errEl = document.getElementById('form-error');
    const start = startVal;
    const end = endVal;

    if (!start || !end) { errEl.textContent = 'Valitse päivät kalenterista.'; errEl.style.display='block'; return; }
    if (!name) { errEl.textContent = 'Kirjoita varaajan nimi.'; errEl.style.display='block'; return; }
    const conflict = bookings.find(b => !(end < b.start || start > b.end));
    if (conflict) { errEl.textContent = `Päivät ovat päällekkäisiä "${conflict.name}":n kanssa.`; errEl.style.display='block'; return; }

    errEl.style.display = 'none';

    const saved = await saveBooking(start, end, name);
    if (!saved) { errEl.textContent = 'Tallennus epäonnistui, yritä uudelleen.'; errEl.style.display='block'; return; }

    startVal=null; endVal=null; pickingStep=0;
    startDisplay.value=''; endDisplay.value=''; endDisplay.style.opacity='0.6';
    document.getElementById('booked-for').value='';

    currentYear = parseDate(start).getFullYear();
    currentMonth = parseDate(start).getMonth();
    await loadBookings();
}

// ─── Mini picker ──────────────────────────────────────────────────────────────

let pickerYear, pickerMonth;
let startVal = null, endVal = null;
let pickingStep = 0;

const dropdown = document.getElementById('picker-dropdown');
const wrap = document.getElementById('picker-wrap');
const startDisplay = document.getElementById('start-display');
const endDisplay = document.getElementById('end-display');
const hint = document.getElementById('picker-hint');

function openPicker() {
    const now = new Date();
    pickerYear = now.getFullYear();
    pickerMonth = now.getMonth();
    if (startVal) {
        const [y,m] = startVal.split('-').map(Number);
        pickerYear = y; pickerMonth = m-1;
    }
    pickingStep = startVal ? 1 : 0;
    dropdown.classList.add('open');
    renderPicker();
}
function openPickerEnd() {
    if (!endVal) {openPicker();}
    else {
        const [y,m] = endVal.split('-').map(Number);
        pickerYear = y; pickerMonth = m-1;
        pickingStep = startVal ? 1 : 0;
        dropdown.classList.add('open');
        renderPicker();
    }
}

function closePicker() { dropdown.classList.remove('open'); }

function clearSelection() {
    startVal = null; endVal = null; pickingStep = 0;
    startDisplay.value = '';
    endDisplay.value = '';
    endDisplay.style.opacity = '0.6';
    renderPicker();
}

startDisplay.addEventListener('click', openPicker);
endDisplay.addEventListener('click', openPickerEnd);

document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) closePicker();
});

document.getElementById('prev-month').addEventListener('click', e => {
    e.stopPropagation();
    pickerMonth--; if (pickerMonth<0){pickerMonth=11;pickerYear--;}
    renderPicker();
});
document.getElementById('next-month').addEventListener('click', e => {
    e.stopPropagation();
    pickerMonth++; if (pickerMonth>11){pickerMonth=0;pickerYear++;}
    renderPicker();
});

function renderPicker() {
    document.getElementById('picker-month-label').textContent = MONTHS[pickerMonth]+' '+pickerYear;
    hint.textContent = pickingStep===0 ? 'Paina aloitus päivää' : 'Paina lopetus päivää';

    const grid = document.getElementById('picker-grid');
    const labels = grid.querySelectorAll('.picker-day-label');
    grid.innerHTML = '';
    labels.forEach(l => grid.appendChild(l.cloneNode(true)));

    const todayStr = toStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    let offset = new Date(pickerYear, pickerMonth, 1).getDay() - 1;
    if (offset < 0) offset = 6;
    const days = new Date(pickerYear, pickerMonth+1, 0).getDate();

    for (let i=0;i<offset;i++) { const el=document.createElement('div'); el.className='picker-day empty'; grid.appendChild(el); }

    for (let d=1;d<=days;d++) {
        const ds = toStr(pickerYear, pickerMonth, d);
        const el = document.createElement('button');
        let cls = 'picker-day';
        if (ds===todayStr) cls+=' today';
        if (ds < toDateStr(new Date())) cls += ' past';
        if (startVal && endVal) {
            if (ds===startVal && startVal===endVal) cls+=' selected';
            else if (ds===startVal) cls+=' range-start';
            else if (ds===endVal) cls+=' range-end';
            else if (ds>startVal && ds<endVal) cls+=' in-range';
        } else if (startVal && ds===startVal) cls+=' selected';
        el.className=cls;
        el.textContent=d;
        el.addEventListener('click', e => { e.stopPropagation(); dayClick(ds); });
        grid.appendChild(el);
    }
}

function dayClick(ds) {
    const now = new Date();
    if (ds < toDateStr(now)) return;
    if (pickingStep===0) {
        startVal=ds; endVal=null;
        startDisplay.value=toDisplay(ds);
        endDisplay.value=''; endDisplay.style.opacity='0.6';
        pickingStep=1;
        renderPicker();
    } else {
        if (ds < startVal) { startVal=ds; pickingStep=1; startDisplay.value=toDisplay(ds); /*endVal=null; endDisplay.value='';*/ renderPicker(); return; }
        endVal=ds;
        endDisplay.value=toDisplay(ds);
        endDisplay.style.opacity='1';
        renderPicker();
    }
}
