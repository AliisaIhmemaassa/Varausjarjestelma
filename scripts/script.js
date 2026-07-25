const { createClient } = supabase;
const sb = createClient(
  'https://tcsofrgmtpsmjrekujyu.supabase.co',
  'sb_publishable_S1GeZ_PbIfPMQCYmYU35tg_rJ4Kusv6'
);

let realtimeChannel = null;


const MONTHS = ['Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu', 'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu'];
let currentYear, currentMonth;
let bookings = [];

const borderYear = 10;


// ─── Auth ─────────────────────────────────────────────────────────────────────

async function unlock() {
    const email = 'daniel.brown23103@gmail.com';
    const password = document.getElementById('lock-input').value;
    const errEl = document.getElementById('lock-error');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
        errEl.textContent = 'Väärä salasana.';
        errEl.style.display = 'block';
        document.getElementById('lock-input').value = '';
        document.getElementById('lock-input').focus();
    } else {
        showApp();
        subscribeRealtime();
    }
}

async function logout() {
    await sb.auth.signOut();
    document.getElementById('app').style.display = 'none';
    document.getElementById('lock-screen').style.display = 'flex';
    document.getElementById('start-display').value = '';
    document.getElementById('end-display').value = '';
    document.getElementById('booked-for').value = '';
    unsubscribeRealtime();
}

function showApp() {
    document.getElementById('lock-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    loadBookings();
}

sb.auth.getSession().then(({ data: { session } }) => {
    if (session) showApp();
    subscribeRealtime();
});

document.getElementById('lock-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') unlock();
});

function subscribeRealtime() {
    if (realtimeChannel) sb.removeChannel(realtimeChannel);
    realtimeChannel = sb.channel('bookings')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'bookings' },
            () => { loadBookings(); }
        )
        .subscribe();
}

function unsubscribeRealtime() {
    if (realtimeChannel) {
        sb.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}

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

/*async function debug() {
    const name = document.getElementById('booked-for').value.trim();
    const errEl = document.getElementById('form-error');
    const start = '2026-02-22';
    const end = '2026-02-23';

    errEl.style.display = 'none';
    console.log(start, end);
    const saved = await saveBooking(start, end, name);
    if (!saved) { errEl.textContent = 'Tallennus epäonnistui, yritä uudelleen.'; errEl.style.display='block'; return; }

    mainPicker.clear();
    document.getElementById('booked-for').value = '';
}*/

async function deleteBooking(id) {
    const { error } = await sb.from('bookings').delete().eq('id', id);
    if (error) { console.error(error); return; }
    //await loadBookings();
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

function toStr(y,m,d) {
    return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}

function changeMonth(dir) {
    const newMonth = currentMonth + dir;
    const maxYear = new Date().getFullYear() + borderYear;
    const minYear = new Date().getFullYear() - borderYear;
    const borderMonth = new Date().getMonth();
    if (newMonth > borderMonth && currentYear === maxYear) { return; }
    else if (newMonth < borderMonth && currentYear === minYear) { return; }

    if (newMonth > 11 && currentYear <= maxYear) { currentMonth = 0; currentYear++; }
    else if (newMonth < 0 && currentYear >= minYear) { currentMonth = 11; currentYear--; }
    else if (currentYear >= minYear && currentYear <= maxYear) { currentMonth += dir; }
    renderCalendar();
}

function changeYear(dir) {
    const newYear = currentYear + dir;
    const maxYear = new Date().getFullYear() + borderYear;
    const minYear = new Date().getFullYear() - borderYear;
    const borderMonth = new Date().getMonth();
    if (newYear >= minYear && newYear <= maxYear) {
        currentYear = newYear;
    }
    else if (newYear < minYear) { currentMonth = borderMonth; }
    else if (newYear > maxYear) { currentMonth = borderMonth; }
    renderCalendar();
}

function getBookingForDate(dateStr) {
    return bookings.find(b => dateStr >= b.start && dateStr <= b.end);
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function renderCalendar() {
    document.getElementById('month-label').textContent = MONTHS[currentMonth] + ' ' + currentYear;
    document.getElementById('cal-y-sub').innerHTML = '&#8592; ' + (currentYear - 1);
    document.getElementById('cal-y-add').innerHTML = (currentYear + 1) + ' &#8594;';
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
            const c = getBookingColorIndex(booking) === 1 ? '-alt' : '';
            if (booking.start === booking.end) cls += ` booked-single${c}`;
            else if (dateStr === booking.start) cls += ` booked-start${c}`;
            else if (dateStr === booking.end) cls += ` booked-end${c}`;
            else cls += ` booked-mid${c}`;
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
            if (booking) {
                const today = toDateStr(new Date());
                const isPast = booking.end < today;
                listYear = parseInt(booking.start.substring(0, 4));
                switchTab(isPast ? 'past' : 'upcoming');
                renderBookingsList();
                document.getElementById('bookings-card').scrollIntoView({ behavior: 'smooth' });
            }
        });

        /*el.addEventListener('click', () => {
            if (!booking && dateStr >= toDateStr(new Date())) {
                document.getElementById('start-display').value = toDisplay(dateStr);
                document.getElementById('end-display').value = toDisplay(dateStr);
                document.getElementById('booked-for').focus();
                mainPicker.startVal = dateStr;
                mainPicker.endVal = dateStr;
                mainPicker.pickingStep = 1;
            }
        });*/

        grid.appendChild(el);
    }
}

function goToToday() {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    listYear = now.getFullYear();
    switchTab('upcoming');
    renderCalendar();
    renderBookingsList();
}

function getBookingColorIndex(booking) {
    const monthStr = booking.start.substring(0, 7); // "2026-06"
    const bookingsInMonth = bookings
        .filter(b => b.start.substring(0, 7) === monthStr || b.end.substring(0, 7) === monthStr)
        .sort((a, b) => a.start.localeCompare(b.start));
    const idx = bookingsInMonth.findIndex(b => b.id === booking.id);
    return idx % 2;
}

// ─── Bookings List ────────────────────────────────────────────────────────────

let activeTab = 'upcoming';
let listYear = new Date().getFullYear();

function switchTab(tab) {
    activeTab = tab;
    document.getElementById('tab-upcoming').classList.toggle('active', tab === 'upcoming');
    document.getElementById('tab-past').classList.toggle('active', tab === 'past');
    renderBookingsList();
}

function changeListYear(dir) {
    const next = listYear + dir;
    const thisyear = new Date().getFullYear();
    if (next < thisyear) {
        switchTab('past');
    }
    else if (next == thisyear && listYear < thisyear) {
        switchTab('upcoming');
    }
    if (next >= (thisyear - borderYear) && next <= (thisyear + borderYear)) {
        listYear = next;
    }
    renderBookingsList();
}

function renderBookingsList() {
    const card = document.getElementById('bookings-card');
    const list = document.getElementById('bookings-list');
    document.getElementById('list-year').textContent = listYear;

    const today = toDateStr(new Date());

    const filtered = bookings
        .filter(b => {
            const inYear = b.start.startsWith(String(listYear)) || b.end.startsWith(String(listYear));
            const upcoming = b.end >= today;
            return inYear && (activeTab === 'upcoming' ? upcoming : !upcoming);
        })
        .sort((a,b) => activeTab === 'upcoming'
            ? a.start.localeCompare(b.start)
            : b.start.localeCompare(a.start)); // past sorted newest first

    if (bookings.length === 0) { card.style.display = 'none'; return; }
    card.style.display = 'block';

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state">Ei varauksia.</div>';
        return;
    }

    list.innerHTML = filtered.map(b => {
        const range = b.start === b.end ? formatDisplay(b.start) : formatDisplay(b.start) + ' – ' + formatDisplay(b.end);
        return `<div class="booking-item" data-booking="${JSON.stringify(b).replace(/"/g, '&quot;')}" onclick="if(!event.target.closest('.booking-actions')) scrollToBooking('${b.start}')" style="cursor:pointer;">
        <div>
            <div class="booking-name">${b.name}</div>
            <div class="booking-dates">${range}</div>
        </div>
        <div class="booking-actions">
            <button class="edit-btn" onclick="event.stopPropagation(); openEditModal(this.closest('.booking-item'))" aria-label="Muokkaa varausta">✎</button>
            <button class="delete-btn" data-id="${b.id}" data-name="${b.name.replace(/"/g, '&quot;')}" onclick="event.stopPropagation(); confirmDelete(this.dataset.id, this.dataset.name)" aria-label="Poista varaus">&times;</button>
        </div>
        </div>`;
    }).join('');
}

function scrollToBooking(start) {
    currentYear = parseInt(start.substring(0, 4));
    currentMonth = parseInt(start.substring(5, 7)) - 1;
    renderCalendar();
    document.querySelector('.card').scrollIntoView({ behavior: 'smooth' });
}

async function removeBooking(id) {
    await deleteBooking(id);
}

// ─── Submit ───────────────────────────────────────────────────────────────────

async function submitBooking() {
    const name = document.getElementById('booked-for').value.trim();
    const errEl = document.getElementById('form-error');
    const start = mainPicker.startVal;
    const end = mainPicker.endVal;

    if (!start || !end) { errEl.textContent = 'Valitse päivät kalenterista.'; errEl.style.display='block'; return; }
    if (!name) { errEl.textContent = 'Kirjoita varaajan nimi.'; errEl.style.display='block'; return; }
    const conflict = bookings.find(b => !(end < b.start || start > b.end));
    if (conflict) { errEl.textContent = `Päivät ovat päällekkäisiä "${conflict.name}":n kanssa.`; errEl.style.display='block'; return; }

    errEl.style.display = 'none';
    const saved = await saveBooking(start, end, name);
    if (!saved) { errEl.textContent = 'Tallennus epäonnistui, yritä uudelleen.'; errEl.style.display='block'; return; }

    mainPicker.clear();
    document.getElementById('booked-for').value = '';
    currentYear = parseDate(start).getFullYear();
    currentMonth = parseDate(start).getMonth();
    //await loadBookings();
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

let pendingDeleteId = null;

function confirmDelete(id, name) {
    pendingDeleteId = id;
    document.getElementById('modal-message').textContent = `Poistetaanko varaus "${name}"?`;
    document.getElementById('confirm-modal').style.display = 'flex';
}

function confirmAction() {
    if (pendingDeleteId !== null) {
        removeBooking(pendingDeleteId);
        pendingDeleteId = null;
    }
    closeModal();
}

function closeModal() {
    document.getElementById('confirm-modal').style.display = 'none';
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

let editingId = null;

function openEditModal(el) {
    const b = JSON.parse(el.dataset.booking.replace(/&quot;/g, '"'));
    editingId = b.id;
    editPicker.startVal = b.start;
    editPicker.endVal = b.end;
    document.getElementById('edit-start').value = toDisplay(b.start);
    document.getElementById('edit-end').value = toDisplay(b.end);
    document.getElementById('edit-end').style.opacity = '1';
    document.getElementById('edit-name').value = b.name;
    document.getElementById('edit-error').style.display = 'none';
    document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    editingId = null;
    editPicker.clear();
}

async function saveEdit() {
    const name = document.getElementById('edit-name').value.trim();
    const errEl = document.getElementById('edit-error');
    const start = editPicker.startVal;
    const end = editPicker.endVal;

    if (!start || !end) { errEl.textContent = 'Valitse päivät.'; errEl.style.display='block'; return; }
    if (!name) { errEl.textContent = 'Kirjoita nimi.'; errEl.style.display='block'; return; }
    const conflict = bookings.find(b => b.id !== editingId && !(end < b.start || start > b.end));
    if (conflict) { errEl.textContent = `Päivät ovat päällekkäisiä "${conflict.name}":n kanssa.`; errEl.style.display='block'; return; }

    const { error } = await sb.from('bookings').update({ start, end, name }).eq('id', editingId);
    if (error) { errEl.textContent = 'Tallennus epäonnistui.'; errEl.style.display='block'; return; }

    closeEditModal();
    //await loadBookings();
}
