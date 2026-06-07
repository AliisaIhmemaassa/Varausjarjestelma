const { createClient } = supabase;
const sb = createClient(
  'https://tcsofrgmtpsmjrekujyu.supabase.co/rest/v1/',
  'sb_publishable_S1GeZ_PbIfPMQCYmYU35tg_rJ4Kusv6'
);



const MONTHS = ['Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu', 'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu'];
let currentYear, currentMonth;
let bookings = JSON.parse(localStorage.getItem('bookings') || '[]');



function saveBookings() {
    localStorage.setItem('bookings', JSON.stringify(bookings));
}

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

function changeMonth(dir) {
    currentMonth += dir;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
}

function getBookingForDate(dateStr) {
    return bookings.find(b => dateStr >= b.start && dateStr <= b.end);
}

function displayToStr(s) {
  const [d, m, y] = s.split('.').map(Number);
  return y + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0');
}


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
        if (!booking) {
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
        const idx = bookings.indexOf(b);
        const range = b.start === b.end ? formatDisplay(b.start) : formatDisplay(b.start) + ' – ' + formatDisplay(b.end);
        return `<div class="booking-item">
        <div>
            <div class="booking-name">${b.name}</div>
            <div class="booking-dates">${range}</div>
        </div>
        <button class="delete-btn" onclick="removeBooking(${idx})" aria-label="Remove booking">&times;</button>
        </div>`;
    }).join('');
}



function addBooking() {
    const start = displayToStr(document.getElementById('start-display').value);
    const end = displayToStr(document.getElementById('end-display').value);
    const name = document.getElementById('booked-for').value.trim();
    const errEl = document.getElementById('form-error');

    if (!start || !end || !name) { errEl.textContent = 'Please fill in all fields.'; errEl.style.display='block'; return; }
    if (end < start) { errEl.textContent = 'Lopetus päivä täytyy olla aloitus päivän jälkeen.'; errEl.style.display='block'; return; }
    const conflict = bookings.find(b => !(end < b.start || start > b.end));
    if (conflict) { errEl.textContent = `Päivät ovat päällekkäisiä "${conflict.name}":n kanssa.`; errEl.style.display='block'; return; }

    errEl.style.display = 'none';
    bookings.push({ start, end, name, id: Date.now() });
    saveBookings();
    document.getElementById('start-display').value = '';
    document.getElementById('end-display').value = '';
    document.getElementById('booked-for').value = '';
    currentYear = parseDate(start).getFullYear();
    currentMonth = parseDate(start).getMonth();
    renderCalendar();
    renderBookingsList();
}

function removeBooking(idx) {
    bookings.splice(idx, 1);
    saveBookings();
    renderCalendar();
    renderBookingsList();
}

/**/
const now = new Date();
currentYear = now.getFullYear();
currentMonth = now.getMonth();
renderCalendar();
renderBookingsList();
/**/


let pickerYear, pickerMonth;
let startVal = null, endVal = null;
let pickingStep = 0;

const dropdown = document.getElementById('picker-dropdown');
const wrap = document.getElementById('picker-wrap');
const startDisplay = document.getElementById('start-display');
const endDisplay = document.getElementById('end-display');
const hint = document.getElementById('picker-hint');
const endInput = document.getElementById('end-display');



function toStr(y,m,d) { return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }
function parseStr(s) { const [y,m,d]=s.split('-').map(Number); return {y,m:m-1,d}; }
function fmtDisplay(s) { const {y,m,d}=parseStr(s); return d+'.'+m+'.'+y; }
function toDisplay(s) {
  const [y,m,d] = s.split('-').map(Number);
  return String(d).padStart(2,'0') + '.' + String(m).padStart(2,'0') + '.' + y;
}



function openPicker() {
    const now = new Date();
    pickerYear = now.getFullYear();
    pickerMonth = now.getMonth();
    if (startVal) { const p=parseStr(startVal); pickerYear=p.y; pickerMonth=p.m; }
    pickingStep = startVal ? 1 : 0;
    dropdown.classList.add('open');
    renderPicker();
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
    if (pickingStep===0) {
        startVal=ds; endVal=null;
        startDisplay.value=toDisplay(ds);
        endDisplay.value=''; endDisplay.style.opacity='0.6';
        pickingStep=1;
        renderPicker();
    } else {
        if (ds < startVal) { startVal=ds; pickingStep=1; startDisplay.value=toDisplay(ds); endVal=null; endDisplay.value=''; renderPicker(); return; }
        endVal=ds;
        endDisplay.value=toDisplay(ds);
        endDisplay.style.opacity='1';
        renderPicker();
    }
}

function submitBooking() {
    const name = document.getElementById('booked-for').value.trim();
    const errEl = document.getElementById('form-error');
    const start = startVal;
    const end = endVal;

    if (!start || !end) { errEl.textContent='Please select both dates using the calendar.'; errEl.style.display='block'; return; }
    if (!name) { errEl.textContent='Please fill in who the booking is for.'; errEl.style.display='block'; return; }
    const conflict = bookings.find(b => !(end < b.start || start > b.end));
    if (conflict) { errEl.textContent = `Päivät ovat päällekkäisiä "${conflict.name}":n kanssa.`; errEl.style.display='block'; return; }

    errEl.style.display='none';
    const msg = document.getElementById('result-msg');
    msg.textContent='✓ Booked for '+name+': '+toDisplay(start)+' – '+toDisplay(end);
    msg.style.display='block';
    errEl.style.display = 'none';
    bookings.push({ start, end, name, id: Date.now() });
    saveBookings();
    startVal=null; endVal=null; pickingStep=0;
    startDisplay.value=''; endDisplay.value=''; endDisplay.style.opacity='0.6';
    document.getElementById('booked-for').value='';

    currentYear = parseDate(start).getFullYear();
    currentMonth = parseDate(start).getMonth();
    renderCalendar();
    renderBookingsList();
}
