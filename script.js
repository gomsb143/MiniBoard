document.addEventListener('DOMContentLoaded', () => {
  // elements
  const boardEl = document.getElementById('board');
  const addColumnBtn = document.getElementById('add-column');
  const exportJsonBtn = document.getElementById('export-json');
  const importJsonInput = document.getElementById('import-json');
  const exportCsvBtn = document.getElementById('export-csv');
  const exportPdfBtn = document.getElementById('export-pdf');
  const viewReportBtn = document.getElementById('view-report');

  const reportModal = document.getElementById('report-modal');
  const closeModal = reportModal?.querySelector('.close');
  const reportText = document.getElementById('report-text');
  const progressRing = document.getElementById('progress-ring');
  const exportReportPdfBtn = document.getElementById('export-report-pdf');
  const exportReportCsvBtn = document.getElementById('export-report-csv');

  // load & migrate
  let columns = [];
  let tasks = {};

  try {
    const storedCols = JSON.parse(localStorage.getItem('columns'));
    columns = Array.isArray(storedCols) && storedCols.length ? storedCols : ['To Do', 'Doing', 'Done'];
  } catch { columns = ['To Do', 'Doing', 'Done']; }

  try {
    const rawTasks = JSON.parse(localStorage.getItem('tasks')) || {};
    // Normalize: allow old format (strings) -> convert to objects
    Object.keys(rawTasks).forEach(col => {
      tasks[col] = (rawTasks[col] || []).map(item => {
        if (typeof item === 'string') return { id: String(Date.now()) + Math.random().toString(36).slice(2,6), title: item, due: null };
        // assume object: ensure id and title
        return { id: item.id || String(Date.now()) + Math.random().toString(36).slice(2,6), title: item.title || '', due: item.due || null };
      });
    });
  } catch {
    tasks = {};
  }

  // ensure columns exist in tasks
  columns.forEach(col => { if (!Array.isArray(tasks[col])) tasks[col] = []; });

  function save() {
    localStorage.setItem('columns', JSON.stringify(columns));
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }

  function createTaskElement(taskObj, col, index) {
    const taskEl = document.createElement('div');
    taskEl.className = 'task';
    taskEl.draggable = true;
    // content
    const left = document.createElement('div');
    left.style.display = 'flex'; left.style.flexDirection = 'column';
    const titleEl = document.createElement('div'); titleEl.textContent = taskObj.title;
    const meta = document.createElement('div'); meta.className = 'meta';
    meta.textContent = taskObj.due ? `Due: ${taskObj.due}` : '';
    left.appendChild(titleEl);
    left.appendChild(meta);

    // delete button
    const del = document.createElement('button');
    del.textContent = '✕';
    del.title = 'Delete task';
    del.style.background = 'transparent'; del.style.border = 'none'; del.style.cursor = 'pointer';
    del.onclick = (ev) => {
      ev.stopPropagation();
      if (confirm('Delete this task?')) {
        tasks[col].splice(index, 1);
        save(); renderBoard();
      }
    };

    taskEl.appendChild(left);
    taskEl.appendChild(del);

    taskEl.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ fromCol: col, index }));
      e.dataTransfer.effectAllowed = 'move';
    });

    // double-click to edit
    taskEl.addEventListener('dblclick', () => {
      const newTitle = prompt('Edit task title', taskObj.title);
      if (newTitle !== null) {
        taskObj.title = newTitle;
        const newDue = prompt('Due date (YYYY-MM-DD) or blank', taskObj.due || '');
        taskObj.due = newDue ? newDue.trim() : null;
        save(); renderBoard();
      }
    });

    return taskEl;
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    columns.forEach(col => {
      const colEl = document.createElement('div');
      colEl.className = 'column';
      colEl.dataset.column = col;

      const title = document.createElement('h2'); title.textContent = col; colEl.appendChild(title);

      const addTaskBtn = document.createElement('button');
      addTaskBtn.className = 'add-task-btn';
      addTaskBtn.textContent = '+ Add Task';
      addTaskBtn.onclick = () => {
        const taskTitle = prompt('Task title');
        if (!taskTitle) return;
        const due = prompt('Due date (YYYY-MM-DD) - optional, leave blank for none', '');
        const taskObj = { id: String(Date.now()) + Math.random().toString(36).slice(2,6), title: taskTitle, due: due ? due.trim() : null };
        tasks[col].push(taskObj);
        save(); renderBoard();
      };
      colEl.appendChild(addTaskBtn);

      const listEl = document.createElement('div');
      tasks[col].forEach((taskObj, idx) => {
        const taskEl = createTaskElement(taskObj, col, idx);
        listEl.appendChild(taskEl);
      });
      colEl.appendChild(listEl);

      colEl.addEventListener('dragover', (e) => { e.preventDefault(); });
      colEl.addEventListener('drop', (e) => {
        try {
          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
          const moved = tasks[data.fromCol].splice(data.index, 1)[0];
          tasks[col].push(moved);
          save(); renderBoard();
        } catch (err) {
          console.error('Drop parse error', err);
        }
      });

      boardEl.appendChild(colEl);
    });
  }

  // Column add (max 5)
  addColumnBtn.addEventListener('click', () => {
    if (columns.length >= 5) return alert('Maximum 5 columns allowed.');
    const name = prompt('New column name') || `Column ${columns.length+1}`;
    columns.push(name);
    tasks[name] = [];
    save(); renderBoard();
  });

  // Export / Import JSON
  exportJsonBtn.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ columns, tasks }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'board.json'; a.click(); URL.revokeObjectURL(a.href);
  });

  importJsonInput.addEventListener('change', (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data.columns) || typeof data.tasks !== 'object') throw new Error('Invalid file format');
        // normalize tasks
        const normalized = {};
        Object.keys(data.tasks).forEach(col => {
          normalized[col] = (data.tasks[col] || []).map(item => {
            if (typeof item === 'string') return { id:String(Date.now())+Math.random().toString(36).slice(2,6), title: item, due: null };
            return { id: item.id || String(Date.now())+Math.random().toString(36).slice(2,6), title: item.title || '', due: item.due || null };
          });
        });
        columns = data.columns;
        tasks = normalized;
        columns.forEach(col => { if (!Array.isArray(tasks[col])) tasks[col] = []; });
        save(); renderBoard();
      } catch (err) {
        alert('Invalid JSON file.');
        console.error(err);
      } finally {
        importJsonInput.value = '';
      }
    };
    reader.readAsText(file);
  });

  // CSV export (board)
  exportCsvBtn.addEventListener('click', () => {
    const rows = [];
    columns.forEach(col => (tasks[col] || []).forEach(t => rows.push({ Column: col, Title: t.title, Due: t.due || '' })));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'board.csv'; a.click(); URL.revokeObjectURL(a.href);
  });

  // PDF export (board)
  exportPdfBtn.addEventListener('click', () => {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let y = 10;
      columns.forEach(col => {
        doc.setFontSize(14); doc.text(`${col}:`, 10, y); y += 8;
        (tasks[col] || []).forEach(task => {
          doc.setFontSize(11); doc.text(`- ${task.title}${task.due ? ' (due: ' + task.due + ')' : ''}`, 12, y);
          y += 6;
          if (y > 280) { doc.addPage(); y = 10; }
        });
        y += 6;
      });
      doc.save('board.pdf');
    } catch (err) {
      console.error('PDF export error', err);
      alert('PDF export failed.');
    }
  });

  // Status Reporter modal handlers
  function openReport() { reportModal.style.display = 'block'; reportModal.setAttribute('aria-hidden','false'); generateReport(); }
  function closeReport() { reportModal.style.display = 'none'; reportModal.setAttribute('aria-hidden','true'); }

  viewReportBtn.addEventListener('click', openReport);
  if (closeModal) closeModal.addEventListener('click', closeReport);
  window.addEventListener('click', (e) => { if (e.target === reportModal) closeReport(); });

  // generate report
  function generateReport() {
    const totalTasks = Object.values(tasks).reduce((s, arr) => s + arr.length, 0);
    const doneCount = (tasks['Done'] || []).length;
    const percent = totalTasks ? Math.round((doneCount / totalTasks) * 100) : 0;

    // overdue detection
    const overdueList = [];
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    Object.keys(tasks).forEach(col => {
      (tasks[col] || []).forEach(t => {
        if (t.due) {
          const d = new Date(t.due + 'T00:00:00');
          if (!isNaN(d.valueOf()) && d < todayStart) overdueList.push({ column: col, title: t.title, due: t.due });
        }
      });
    });

    // draw progress ring
    if (progressRing && progressRing.getContext) {
      const ctx = progressRing.getContext('2d');
      const w = progressRing.width, h = progressRing.height;
      ctx.clearRect(0,0,w,h);
      const center = w / 2, radius = Math.min(w,h)/2 - 8;
      // background circle
      ctx.beginPath(); ctx.arc(center, center, radius, 0, 2*Math.PI); ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 10; ctx.stroke();
      // foreground (percent) arc
      ctx.beginPath();
      const start = -Math.PI/2;
      const end = start + (2*Math.PI*(percent/100));
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(center, center, radius, start, end); ctx.stroke();
      // text
      ctx.font = '16px Arial'; ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.fillText(percent + '%', center, center + 6);
    }

    // textual summary
    let html = `<p><strong>Total tasks:</strong> ${totalTasks}</p>`;
    columns.forEach(col => { html += `<p><strong>${col}:</strong> ${(tasks[col]||[]).length}</p>`; });
    html += `<p><strong>Percent complete:</strong> ${percent}%</p>`;
    html += `<p><strong>Overdue:</strong> ${overdueList.length}</p>`;
    if (overdueList.length) {
      html += '<ul>';
      overdueList.forEach(o => html += `<li>${o.title} — ${o.column} (due ${o.due})</li>`);
      html += '</ul>';
    }
    reportText.innerHTML = html;
  }

  // Export report PDF
  exportReportPdfBtn.addEventListener('click', () => {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const totalTasks = Object.values(tasks).reduce((s,a)=>s+a.length,0);
      const doneCount = (tasks['Done'] || []).length;
      const percent = totalTasks ? Math.round((doneCount/totalTasks)*100) : 0;
      let y = 10;
      doc.setFontSize(16); doc.text('Taskurai - Status Report', 10, y); y += 12;
      doc.setFontSize(12); doc.text(`Total tasks: ${totalTasks}`, 10, y); y += 8;
      doc.text(`Done: ${doneCount}`, 10, y); y += 8;
      doc.text(`Completion: ${percent}%`, 10, y); y += 10;
      // overdue list
      const overdueList = [];
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      Object.keys(tasks).forEach(col => (tasks[col]||[]).forEach(t => {
        if (t.due) {
          const d = new Date(t.due + 'T00:00:00');
          if (!isNaN(d.valueOf()) && d < todayStart) overdueList.push({ col, title: t.title, due: t.due });
        }
      }));
      if (overdueList.length) {
        doc.text('Overdue tasks:', 10, y); y += 8;
        overdueList.forEach(o => { doc.text(`- ${o.title} (${o.col}) due ${o.due}`, 12, y); y += 6; if (y>280) { doc.addPage(); y=10; } });
      }
      doc.save('status-report.pdf');
    } catch (err) { console.error(err); alert('Failed to export PDF'); }
  });

  // Export report CSV
  exportReportCsvBtn.addEventListener('click', () => {
    const totalTasks = Object.values(tasks).reduce((s,a)=>s+a.length,0);
    const doneCount = (tasks['Done'] || []).length;
    const percent = totalTasks ? Math.round((doneCount/totalTasks)*100) : 0;
    const rows = [
      { Metric: 'Total Tasks', Value: totalTasks },
      { Metric: 'Done', Value: doneCount },
      { Metric: 'Remaining', Value: totalTasks - doneCount },
      { Metric: 'Completion %', Value: percent }
    ];
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'status-report.csv'; a.click(); URL.revokeObjectURL(a.href);
  });

  // initial
  renderBoard();
});