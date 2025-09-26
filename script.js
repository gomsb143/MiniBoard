const board = document.getElementById("board");
const addTaskBtn = document.getElementById("add-task");
const taskModal = document.getElementById("taskModal");
const closeTaskModal = document.getElementById("closeTaskModal");
const saveTaskBtn = document.getElementById("saveTask");
const taskName = document.getElementById("taskName");
const taskDue = document.getElementById("taskDue");
const taskAssignee = document.getElementById("taskAssignee");

const reportModal = document.getElementById("reportModal");
const viewReportBtn = document.getElementById("view-report");
const closeReportModal = document.getElementById("closeReportModal");
const progressRing = document.getElementById("progressRing");
const reportText = document.getElementById("reportText");
const exportReportPdfBtn = document.getElementById("exportReportPdf");
const exportReportCsvBtn = document.getElementById("exportReportCsv");

let tasks = JSON.parse(localStorage.getItem("tasks")) || {
  "Backlog": [],
  "To Do": [],
  "In Progress": [],
  "Review": [],
  "Done": []
};
let currentColumn = "Backlog";

// Render Board
function renderBoard() {
  board.innerHTML = "";
  Object.keys(tasks).forEach(col => {
    const columnEl = document.createElement("div");
    columnEl.className = "column";
    columnEl.ondragover = e => e.preventDefault();
    columnEl.ondrop = e => drop(e, col);

    columnEl.innerHTML = `<h2>${col}</h2>`;
    tasks[col].forEach((task, i) => {
      const taskEl = document.createElement("div");
      taskEl.className = "task";
      taskEl.draggable = true;
      taskEl.ondragstart = e => drag(e, col, i);
      taskEl.innerHTML = `<b>${task.name}</b><br>
        Due: ${task.due || "-"}<br>
        Assignee: ${task.assignee || "-"}`;
      columnEl.appendChild(taskEl);
    });
    board.appendChild(columnEl);
  });
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Drag and Drop
function drag(e, col, index) {
  e.dataTransfer.setData("col", col);
  e.dataTransfer.setData("index", index);
}
function drop(e, targetCol) {
  const fromCol = e.dataTransfer.getData("col");
  const index = e.dataTransfer.getData("index");
  const [task] = tasks[fromCol].splice(index, 1);
  tasks[targetCol].push(task);
  renderBoard();
}

// Task Modal
addTaskBtn.onclick = () => { taskModal.style.display = "block"; };
closeTaskModal.onclick = () => { taskModal.style.display = "none"; };

saveTaskBtn.onclick = () => {
  if (!taskName.value) return;
  tasks["Backlog"].push({
    name: taskName.value,
    due: taskDue.value,
    assignee: taskAssignee.value
  });
  taskName.value = ""; taskDue.value = ""; taskAssignee.value = "";
  taskModal.style.display = "none";
  renderBoard();
};

// Report
viewReportBtn.onclick = () => {
  reportModal.style.display = "block";
  generateReport();
};
closeReportModal.onclick = () => { reportModal.style.display = "none"; };

function generateReport() {
  const totalTasks = Object.values(tasks).flat().length;
  const doneTasks = tasks["Done"].length;
  const percent = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Progress Ring
  const ctx = progressRing.getContext("2d");
  ctx.clearRect(0, 0, progressRing.width, progressRing.height);
  ctx.beginPath();
  ctx.arc(60, 60, 50, 0, 2 * Math.PI);
  ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 10; ctx.stroke();
  ctx.beginPath();
  ctx.arc(60, 60, 50, -Math.PI/2, (2 * Math.PI * percent / 100) - Math.PI/2);
  ctx.strokeStyle = "#16a34a"; ctx.lineWidth = 10; ctx.stroke();
  ctx.font = "16px Arial"; ctx.fillStyle = "#000"; ctx.textAlign = "center";
  ctx.fillText(percent + "%", 60, 65);

  // Text
  reportText.innerHTML = `
    <p><b>Total Tasks:</b> ${totalTasks}</p>
    <p><b>Done:</b> ${doneTasks}</p>
    <p><b>Remaining:</b> ${totalTasks - doneTasks}</p>
    <p><b>Completion:</b> ${percent}%</p>
  `;
}

// Export PDF
exportReportPdfBtn.onclick = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const totalTasks = Object.values(tasks).flat().length;
  const doneTasks = tasks["Done"].length;
  const percent = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  doc.text("Taskurai Status Report", 10, 10);
  doc.text("Total Tasks: " + totalTasks, 10, 20);
  doc.text("Done: " + doneTasks, 10, 30);
  doc.text("Remaining: " + (totalTasks - doneTasks), 10, 40);
  doc.text("Completion: " + percent + "%", 10, 50);
  doc.save("status-report.pdf");
};

// Export CSV
exportReportCsvBtn.onclick = () => {
  const totalTasks = Object.values(tasks).flat().length;
  const doneTasks = tasks["Done"].length;
  const percent = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const rows = [
    { Metric: "Total Tasks", Value: totalTasks },
    { Metric: "Done", Value: doneTasks },
    { Metric: "Remaining", Value: totalTasks - doneTasks },
    { Metric: "Completion %", Value: percent }
  ];
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "status-report.csv";
  a.click();
};

renderBoard();