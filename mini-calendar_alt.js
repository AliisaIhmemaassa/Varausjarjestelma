// ─── Reusable Picker ──────────────────────────────────────────────────────────

function createPicker(config) {
    // config: { wrapId, dropdownId, startInputId, endInputId, allowPast }

    const state = {
        pickerYear: new Date().getFullYear(),
        pickerMonth: new Date().getMonth(),
        startVal: null,
        endVal: null,
        pickingStep: 0,
        openedFromEnd: false,
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
        state.openedFromEnd = fromEnd;
        state.pickerYear = new Date().getFullYear();
        state.pickerMonth = new Date().getMonth();
        if (fromEnd && state.endVal) {
            const [y,m] = state.endVal.split('-').map(Number);
            state.pickerYear = y; state.pickerMonth = m-1;
        } else if (state.startVal) {
            const [y,m] = state.startVal.split('-').map(Number);
            state.pickerYear = y; state.pickerMonth = m-1;
        }
        state.pickingStep = (config.startAtStep1 || fromEnd) ? 1 : (state.startVal ? 1 : 0);
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

        if (!state.openedFromEnd) {
            // Clicking start input — always set start
            state.startVal = ds;
            state.endVal = null;
            startInput.value = toDisplay(ds);
            endInput.value = '';
            endInput.style.opacity = '0.6';
            state.pickingStep = 1;
            render();
        } else {
            // Clicking end input — set end (or fix if before start)
            if (ds < state.startVal) {
                state.startVal = ds;
                startInput.value = toDisplay(ds);
                state.endVal = null;
                endInput.value = '';
                endInput.style.opacity = '0.6';
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