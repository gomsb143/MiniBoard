const boardEl = document.getElementById('board');
const addColumnBtn = document.getElementById('add-column');
const exportJsonBtn = document.getElementById('export-json');
const importJsonInput = document.getElementById('import-json');
const exportCsvBtn = document.getElementById('export-csv');
const exportPdfBtn = document.getElementById('export-pdf');
const viewReportBtn = document.getElementById('view-report');

const reportModal = document.getElementById('report-modal');
const closeModal = reportModal.querySelector('.close');
const reportText = document.getElementById('report-text');
const progressRing = document.getElementById('progress-ring');
const exportReportPdfBtn = document.getElementById('export-report-pdf');
const exportReportCsvBtn = document.getElementById('export-report-csv');

let columns = JSON.parse(localStorage.getItem('columns')) || ['To Do', 'Doing', 'Done'];
let tasks = JSON.parse(localStorage.getItem('tasks')) || {};
columns.forEach(col => { if (!tasks[col]) tasks[col] = []; });

function save() { localStorage.setItem('columns', JSON.stringify(columns)); localStorage.setItem('tasks', JSON.stringify(tasks)); }

function renderBoard() {
  boardEl.innerHTML = '';
  columns.forEach(col => {
    const colEl = document.createElement('div');
    colEl.className = 'column';
    colEl.dataset.column = col;

    const title = document.createElement('h2'); title.textContent = col; colEl.appendChild(title);

    const addTaskBtn = document.createElement('button'); addTaskBtn.textContent = '+ Add Task';
    addTaskBtn.onclick = () => {
      const taskTitle = prompt('Task title'); if (taskTitle) { tasks[col].push(taskTitle); save(); renderBoard(); }
    };
    colEl.appendChild(addTaskBtn);

    tasks[col].forEach((task, index) => {
      const taskEl = document.createElement('div'); taskEl.className = 'task'; taskEl.draggable = true; taskEl.textContent = task;
      taskEl.ondragstart = e => e.dataTransfer.setData('text/plain', JSON.stringify({ col, index }));
      colEl.appendChild(taskEl);
    });

    colEl.ondragover = e => e.preventDefault();
    colEl.ondrop = e => {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const movedTask = tasks[data.col].splice(data.index,1)[0]; tasks[col].push(movedTask); save(); renderBoard();
    };

    boardEl.appendChild(colEl);
  });
}

addColumnBtn.onclick = () => {
  if(columns.length < 5){ const colName = prompt('Column name') || 'New Column'; columns.push(colName); tasks[colName]=[]; save(); renderBoard(); }
  else alert('Maximum 5 columns allowed.');
};

// Export/Import Kanban
exportJsonBtn.onclick = () => { const blob = new Blob([JSON.stringify({columns,tasks},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='board.json'; a.click(); URL.revokeObjectURL(a.href); };
importJsonInput.onchange = e => { const file=e.target.files[0]; const reader=new FileReader(); reader.onload=e=>{try{const data=JSON.parse(e.target.result); if(!data.columns||!data.tasks) throw new Error('Invalid'); columns=data.columns; tasks=data.tasks; save(); renderBoard();}catch{alert('Invalid JSON file!');}}; reader.readAsText(file); };
exportCsvBtn.onclick = () => { const rows=[]; columns.forEach(col=>tasks[col].forEach(task=>rows.push({Column:col,Task:task}))); const csv=Papa.unparse(rows); const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='board.csv'; a.click(); URL.revokeObjectURL(a.href); };
exportPdfBtn.onclick = () => { const {jsPDF}=window.jspdf; const doc=new jsPDF(); let y=10; columns.forEach(col=>doc.text(col + ":", 10, y);
  y += 8;
  tasks[col].forEach(task => {
    doc.text(" - " + task, 14, y);
    y += 6;
  });
  y += 4;
});
doc.save("board.pdf");
};

// Status Reporter
viewReportBtn.onclick = () => {
  reportModal.style.display = 'block';
  generateReport();
};
closeModal.onclick = () => reportModal.style.display = 'none';
window.onclick = e => { if (e.target == reportModal) reportModal.style.display = 'none'; };

function generateReport() {
  const totalTasks = Object.values(tasks).reduce((acc, arr) => acc + arr.length, 0);
  const doneTasks = tasks['Done'] ? tasks['Done'].length : 0;
  const percent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Draw progress ring
  const ctx = progressRing.getContext('2d');
  ctx.clearRect(0, 0, progressRing.width, progressRing.height);

  const radius = 50, center = 60;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 10; ctx.stroke();

  ctx.beginPath();
  ctx.arc(center, center, radius, -Math.PI / 2, (2 * Math.PI * percent / 100) - Math.PI / 2);
  ctx.strokeStyle = "#16a34a"; ctx.lineWidth = 10; ctx.stroke();

  ctx.font = "16px Arial"; ctx.fillStyle = "#000"; ctx.textAlign = "center"; ctx.fillText(percent + "%", center, center + 5);

  // Text summary
  let html = `
    <p><b>Total Tasks:</b> ${totalTasks}</p>
    <p><b>Done:</b> ${doneTasks}</p>
    <p><b>Remaining:</b> ${totalTasks - doneTasks}</p>
    <p><b>Completion:</b> ${percent}%</p>
  `;
  reportText.innerHTML = html;
}

// Export report as PDF
exportReportPdfBtn.onclick = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const totalTasks = Object.values(tasks).reduce((acc, arr) => acc + arr.length, 0);
  const doneTasks = tasks['Done'] ? tasks['Done'].length : 0;
  const percent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  doc.text("Taskurai Status Report", 10, 10);
  doc.text("Total Tasks: " + totalTasks, 10, 20);
  doc.text("Done: " + doneTasks, 10, 30);
  doc.text("Remaining: " + (totalTasks - doneTasks), 10, 40);
  doc.text("Completion: " + percent + "%", 10, 50);

  doc.save("status-report.pdf");
};

// Export report as CSV
exportReportCsvBtn.onclick = () => {
  const totalTasks = Object.values(tasks).reduce((acc, arr) => acc + arr.length, 0);
  const doneTasks = tasks['Done'] ? tasks['Done'].length : 0;
  const percent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const rows = [
    { Metric: "Total Tasks", Value: totalTasks },
    { Metric: "Done", Value: doneTasks },
    { Metric: "Remaining", Value: totalTasks - doneTasks },
    { Metric: "Completion %", Value: percent }
  ];
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'status-report.csv';
  a.click();
  URL.revokeObjectURL(a.href);
};

renderBoard();