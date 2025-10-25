// app.js  
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, setDoc, doc, updateDoc,
  query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBbCiFz3Y1_63_yxafQ_9Xqd_Hq5okWaE8",
  authDomain: "asistencia-98121.firebaseapp.com",
  projectId: "asistencia-98121",
  storageBucket: "asistencia-98121.firebasestorage.app",
  messagingSenderId: "527485719013",
  appId: "1:527485719013:web:a40969d72040568a075f0c",
  measurementId: "G-D6BQZ3SSBX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const colEstudiantes = collection(db, "students");
const colAsistencias = collection(db, "attendance");

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Toaster
function toast(msg) {
  const box = $("#toaster"); if (!box) return alert(msg);
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateY(8px)"; }, 2200);
  setTimeout(() => box.removeChild(t), 2600);
}

// Variables
let selectedId = null;
let estudiantesCache = [];

// Cargar estudiantes desde Firestore
async function cargarEstudiantes() {
  try {
    const q = query(colEstudiantes, orderBy("nombre", "asc"));
    const snap = await getDocs(q);
    estudiantesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("Firestore no disponible:", e?.message || e);
    estudiantesCache = [];
  }
  renderTablaEstudiantes(estudiantesCache);
  renderTablaAsistencia(estudiantesCache);
  renderSelectAlumno(estudiantesCache);
}

// Renderizar tabla de estudiantes
function renderTablaEstudiantes(list) {
  const tb = $("#tablaEstudiantes tbody"); if (!tb) return;
  tb.innerHTML = "";
  list.forEach(e => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${e.nombre || ""}</td><td>${e.carnet || ""}</td>`;
    tr.addEventListener("click", () => {
      selectedId = e.id;
      $("#nombre").value = e.nombre || "";
      $("#carnet").value = e.carnet || "";
      toast("Estudiante seleccionado para edición");
    });
    tb.appendChild(tr);
  });
}

// Buscar estudiantes por nombre o carnet
$("#buscar")?.addEventListener("input", (ev) => {
  const t = ev.target.value.toLowerCase();
  const f = estudiantesCache.filter(e => (e.nombre || "").toLowerCase().includes(t) || (e.carnet || "").toLowerCase().includes(t));
  renderTablaEstudiantes(f);
});

// Llenar campos con datos aleatorios
$("#btnRellenarNombre")?.addEventListener("click", () => $("#nombre").value = "Estudiante " + Math.floor(Math.random() * 1000));
$("#btnRellenarCarnet")?.addEventListener("click", () => $("#carnet").value = "2024" + Math.floor(1000 + Math.random() * 8999));

// Limpiar campos
$("#btnLimpiar")?.addEventListener("click", () => { selectedId = null; ["nombre", "carnet"].forEach(id => { const el = $("#" + id); if (el) el.value = ""; }); });

// Guardar estudiante
$("#btnGuardar")?.addEventListener("click", async () => {
  const n = $("#nombre").value.trim();
  const c = $("#carnet").value.trim();
  if (!n || !c) return toast("Nombre y Carnet son obligatorios.");
  await addDoc(colEstudiantes, { nombre: n, carnet: c });
  await cargarEstudiantes();
  $("#btnLimpiar").click();
  toast("Estudiante guardado.");
});

// Actualizar estudiante
$("#btnActualizar")?.addEventListener("click", async () => {
  if (!selectedId) return toast("Selecciona un estudiante.");
  const refd = doc(db, "students", selectedId);
  await updateDoc(refd, { nombre: $("#nombre").value.trim(), carnet: $("#carnet").value.trim() });
  await cargarEstudiantes();
  toast("Datos actualizados.");
});

// Renderizar tabla de asistencia

function renderTablaAsistencia(list) {
  const tb = $("#tablaAsistencia tbody"); if (!tb) return;
  tb.innerHTML = "";
  list.forEach(e => {
    const tr = document.createElement("tr");
    // cells
    const tdChk = document.createElement("td");
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "chk-presente";
    chk.setAttribute("data-id", e.id);
    tdChk.appendChild(chk);

    const tdNombre = document.createElement("td"); tdNombre.textContent = e.nombre || "";
    const tdCarnet = document.createElement("td"); tdCarnet.textContent = e.carnet || "";
    const tdAsis = document.createElement("td"); tdAsis.className = "col-asistencia";

    // listener: cuando marquen presente, poner 'asistencio'
    chk.addEventListener("change", () => {
      tdAsis.textContent = chk.checked ? "asistencio" : "";
    });

    tr.appendChild(tdChk);
    tr.appendChild(tdNombre);
    tr.appendChild(tdCarnet);
    tr.appendChild(tdAsis);
    tb.appendChild(tr);
  });
}

// Guardar asistencia
$("#btnGuardarAsistencia")?.addEventListener("click", async () => {
  const fecha = $("#fechaAsistencia").value || new Date().toISOString().slice(0, 10);
  const checks = $$(".chk-presente"); if (checks.length === 0) return toast("No hay estudiantes.");
  const ops = [];
  checks.forEach(chk => {
    const id = chk.getAttribute("data-id");
    const est = estudiantesCache.find(e => e.id === id);
    const present = chk.checked;
    const refd = doc(db, "attendance", `${fecha}_${id}`);
    ops.push(setDoc(refd, { studentId: id, date: fecha, present, name: est?.nombre || "", carnet: est?.carnet || "" }));
  });
  await Promise.all(ops);
  toast("Asistencia guardada.");
});

// Renderizar select de alumnos
function renderSelectAlumno(list) {
  const sel = $("#selectAlumno"); if (!sel) return;
  sel.innerHTML = `<option value=''>-- Selecciona --</option>`;
  list.forEach(e => { const o = document.createElement("option"); o.value = e.id; o.textContent = `${e.nombre} (${e.carnet})`; sel.appendChild(o); });
}

// Cálculo de reportes
$("#btnCalcular")?.addEventListener("click", async () => {
  const alumno = $("#selectAlumno").value;
  const desde = $("#desde").value || "1900-01-01";
  const hasta = $("#hasta").value || "2999-12-31";
  if (!alumno) return toast("Selecciona un alumno.");
  let rows = [];
  try {
    const q = query(colAsistencias, where("studentId", "==", alumno), orderBy("date", "asc"));
    const snap = await getDocs(q);
    snap.forEach(d => { const a = d.data(); if (a.date >= desde && a.date <= hasta) rows.push(a); });
  } catch (e) { console.warn("Consulta falló:", e?.message || e); }

  const tb = $("#tablaReporte tbody"); if (tb) {
    tb.innerHTML = "";
    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${r.date}</td><td>${r.present ? "Presente" : "Falta"}</td>`;
      tb.appendChild(tr);
    });
  }
  const presentes = rows.filter(r => r.present).length; const total = rows.length; const faltas = total - presentes;
  const setText = (id, val) => { const el = $("#" + id); if (el) el.textContent = val; };
  setText("statPresentes", presentes); setText("statFaltas", faltas); setText("statTotal", total); setText("statPenaliza", faltas > 2 ? "Sí" : "No");
});

// Exportar a CSV
$("#btnCSV")?.addEventListener("click", () => {
  const trs = $$("#tablaReporte tbody tr");
  const rows = [...trs].map(tr => [...tr.children].map(td => td.textContent));
  if (rows.length === 0) return toast("No hay datos para exportar.");
  let csv = "Fecha,Estado\n" + rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "reporte_asistencia.csv"; a.click(); URL.revokeObjectURL(url);
  toast("CSV descargado.");
});

// Exportar a PDF
$("#btnPDF")?.addEventListener("click", () => {
  const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.setFontSize(14); doc.text("Reporte de Asistencia", 14, 18);
  const trs = $$("#tablaReporte tbody tr");
  const rows = [...trs].map(tr => [...tr.children].map(td => td.textContent)); if (rows.length === 0) return toast("No hay datos para exportar.");
  let y = 28; doc.setFontSize(11); doc.text("Fecha", 14, 24); doc.text("Estado", 70, 24);
  rows.forEach(r => { doc.text(String(r[0]), 14, y); doc.text(String(r[1]), 70, y); y += 8; if (y > 280) { doc.addPage(); y = 20; } });
  doc.save("reporte_asistencia.pdf");
  toast("PDF generado.");
});

// Cargar estudiantes al inicio
window.addEventListener("DOMContentLoaded", cargarEstudiantes);