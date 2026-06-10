const { createClient } = supabase;
const sb = createClient(
  'https://tcsofrgmtpsmjrekujyu.supabase.co',
  'sb_publishable_S1GeZ_PbIfPMQCYmYU35tg_rJ4Kusv6'
);

const MONTHS = ['Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu', 'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu'];
let currentYear, currentMonth;
let bookings = [];

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

sb.auth.getSession().then(({ data: { session } }) => {
    if (session) showApp();
});

document.getElementById('lock-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') unlock();
});

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

function toStr(y,m,d) {
    return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}

function changeMonth(dir) {
    currentMonth += dir;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
}

function getBookingForDate(dateStr) {
    return bookings.find(b => dateStr >= b.start && dateStr <= b.end);
}

// ─── Reusable Picker ──────────────────────────────────────────────────────────

function createPicker(config) {
    // config: { wrapId, dropdownId, startInputId, endInputId, allowPast }

    const state = {
        pickerYear: new Date().getFullYear(),
        pickerMonth: new Date().getMonth(),
        startVal: null,
        endVal: null,
        pickingStep: 0,
    };

    const wrap = document.getElementById(config.wrapId);
    const startInput = document.getElementById(config.startInputId);
    const endInput = document.getElementById(config.endInputId);

    // Build dropdown HTML
    const dropdown = document.createElement('div');
    dropdown.className = 'picker-dropdown';
    dropdown.id = config.dropdownId;
    dropdown.innerHTML = `
        <div class="picker-head">
            <button class="picker-nav picker-prev">&#8592;</button>
            <span class="picker-month-label"></span>
            <button class="picker-nav picker-next">&#8594;</button>
        </div>
        <div class="picker-grid">
            <div class="picker-day-label">Ma</div>
            <div class="picker-day-label">Ti</div>
            <div class="picker-day-label">Ke</div>
            <div class="picker-day-label">To</div>
            <div class="picker-day-label">Pe</div>
            <div class="picker-day-label">La</div>
            <div class="picker-day-label">Su</div>
        </div>
        <div class="picker-hint"></div>
        <div class="picker-btn-container">
            <button class="picker-btn picker-clear-btn">Poista valinta</button>
            <button class="picker-btn picker-confirm-btn">Valmis</button>
        </div>
    `;
    wrap.appendChild(dropdown);

    const monthLabel = dropdown.querySelector('.picker-month-label');
    const hint = dropdown.querySelector('.picker-hint');
    const grid = dropdown.querySelector('.picker-grid');

    // Nav buttons
    dropdown.querySelector('.picker-prev').addEventListener('click', e => {
        e.stopPropagation();
        state.pickerMonth--;
        if (state.pickerMonth < 0) { state.pickerMonth = 11; state.pickerYear--; }
        render();
    });
    dropdown.querySelector('.picker-next').addEventListener('click', e => {
        e.stopPropagation();
        state.pickerMonth++;
        if (state.pickerMonth > 11) { state.pickerMonth = 0; state.pickerYear++; }
        render();
    });

    // Clear / confirm buttons
    dropdown.querySelector('.picker-clear-btn').addEventListener('click', e => {
        e.stopPropagation(); clear();
    });
    dropdown.querySelector('.picker-confirm-btn').addEventListener('click', e => {
        e.stopPropagation(); close();
    });

    // Open on input click
    startInput.addEventListener('click', () => open(false));
    endInput.addEventListener('click', () => open(true));

    // Close on outside click
    document.addEventListener('click', e => {
        if (!wrap.contains(e.target)) close();
    });

    function open(fromEnd = false) {
        state.pickerYear = new Date().getFullYear();
        state.pickerMonth = new Date().getMonth();
        if (fromEnd && state.endVal) {
            const [y,m] = state.endVal.split('-').map(Number);
            state.pickerYear = y; state.pickerMonth = m-1;
        } else if (state.startVal) {
            const [y,m] = state.startVal.split('-').map(Number);
            state.pickerYear = y; state.pickerMonth = m-1;
        }
        state.pickingStep = state.startVal ? 1 : 0;
        dropdown.classList.add('open');
        render();
    }

    function close() { dropdown.classList.remove('open'); }

    function clear() {
        state.startVal = null; state.endVal = null; state.pickingStep = 0;
        startInput.value = '';
        endInput.value = '';
        endInput.style.opacity = '0.6';
        render();
    }

    function render() {
        monthLabel.textContent = MONTHS[state.pickerMonth] + ' ' + state.pickerYear;
        hint.textContent = state.pickingStep === 0 ? 'Paina aloitus päivää' : 'Paina lopetus päivää';

        const labels = grid.querySelectorAll('.picker-day-label');
        grid.innerHTML = '';
        labels.forEach(l => grid.appendChild(l.cloneNode(true)));

        const todayStr = toStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
        let offset = new Date(state.pickerYear, state.pickerMonth, 1).getDay() - 1;
        if (offset < 0) offset = 6;
        const days = new Date(state.pickerYear, state.pickerMonth+1, 0).getDate();

        for (let i = 0; i < offset; i++) {
            const el = document.createElement('div');
            el.className = 'picker-day empty';
            grid.appendChild(el);
        }

        for (let d = 1; d <= days; d++) {
            const ds = toStr(state.pickerYear, state.pickerMonth, d);
            const el = document.createElement('button');
            let cls = 'picker-day';
            if (ds === todayStr) cls += ' today';
            if (!config.allowPast && ds < toDateStr(new Date())) cls += ' past';
            if (state.startVal && state.endVal) {
                if (ds === state.startVal && state.startVal === state.endVal) cls += ' selected';
                else if (ds === state.startVal) cls += ' range-start';
                else if (ds === state.endVal) cls += ' range-end';
                else if (ds > state.startVal && ds < state.endVal) cls += ' in-range';
            } else if (state.startVal && ds === state.startVal) cls += ' selected';
            el.className = cls;
            el.textContent = d;
            el.addEventListener('click', e => { e.stopPropagation(); dayClick(ds); });
            grid.appendChild(el);
        }
    }

    function dayClick(ds) {
        if (!config.allowPast && ds < toDateStr(new Date())) return;
        if (state.pickingStep === 0) {
            state.startVal = ds; state.endVal = null;
            startInput.value = toDisplay(ds);
            endInput.value = ''; endInput.style.opacity = '0.6';
            state.pickingStep = 1;
            render();
        } else {
            if (ds < state.startVal) {
                state.startVal = ds; state.pickingStep = 1;
                startInput.value = toDisplay(ds);
                state.endVal = null; endInput.value = '';
                render(); return;
            }
            state.endVal = ds;
            endInput.value = toDisplay(ds);
            endInput.style.opacity = '1';
            render();
        }
    }

    return {
        get startVal() { return state.startVal; },
        get endVal() { return state.endVal; },
        set startVal(v) { state.startVal = v; },
        set endVal(v) { state.endVal = v; },
        set pickingStep(v) { state.pickingStep = v; },
        open, close, clear,
    };
}

// ─── Init pickers ─────────────────────────────────────────────────────────────

const mainPicker = createPicker({
    wrapId: 'picker-wrap',
    dropdownId: 'picker-dropdown',
    startInputId: 'start-display',
    endInputId: 'end-display',
    allowPast: false,
});

const editPicker = createPicker({
    wrapId: 'edit-picker-wrap',
    dropdownId: 'edit-picker-dropdown',
    startInputId: 'edit-start',
    endInputId: 'edit-end',
    allowPast: true,
});

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

function renderBookingsList() {
    const card = document.getElementById('bookings-card');
    const list = document.getElementById('bookings-list');
    if (bookings.length === 0) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    const sorted = [...bookings].sort((a,b) => a.start.localeCompare(b.start));
    list.innerHTML = sorted.map(b => {
        const range = b.start === b.end ? formatDisplay(b.start) : formatDisplay(b.start) + ' – ' + formatDisplay(b.end);
        return `<div class="booking-item" data-booking="${JSON.stringify(b).replace(/"/g, '&quot;')}" onclick="openEditModal(this)" style="cursor:pointer;">
        <div>
            <div class="booking-name">${b.name}</div>
            <div class="booking-dates">${range}</div>
        </div>
        <button class="delete-btn" data-id="${b.id}" data-name="${b.name.replace(/"/g, '&quot;')}" onclick="event.stopPropagation(); confirmDelete(this.dataset.id, this.dataset.name)" aria-label="Poista varaus">&times;</button>
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
    await loadBookings();
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
    await loadBookings();
}

// ─── Initial render ───────────────────────────────────────────────────────────

const now = new Date();
currentYear = now.getFullYear();
currentMonth = now.getMonth();
renderCalendar();