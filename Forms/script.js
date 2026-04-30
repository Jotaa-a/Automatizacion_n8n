  // ── Helpers ──────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const setError = (id, msg) => {
    const el = $(id);
    el.textContent = msg;
    el.classList.toggle('show', !!msg);
  };
  const markField = (input, hasError) => {
    input.classList.toggle('error', hasError);
  };

  // ── Show/hide "otro motivo" textarea ──────────────────────
  $('reason').addEventListener('change', () => {
    $('otroField').style.display = $('reason').value === 'otro' ? '' : 'none';
  });

  // ── Drag & drop ───────────────────────────────────────────
  const area = $('uploadArea');
  area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('over'); });
  area.addEventListener('dragleave', () => area.classList.remove('over'));
  area.addEventListener('drop', e => { e.preventDefault(); area.classList.remove('over'); handleFile(e.dataTransfer.files[0]); });
  $('fileInput').addEventListener('change', e => handleFile(e.target.files[0]));
  $('removeFile').addEventListener('click', () => {
    $('fileInput').value = '';
    $('filePreview').classList.remove('show');
    setError('err-file', '');
  });

  function handleFile(file) {
    if (!file) return;
    const maxMB = 10;
    if (file.size > maxMB * 1024 * 1024) {
      setError('err-file', `El archivo supera ${maxMB} MB.`);
      return;
    }
    $('fileName').textContent = file.name;
    $('fileSize').textContent = (file.size / 1024).toFixed(1) + ' KB';
    $('filePreview').classList.add('show');
    setError('err-file', '');
  }

  // ── Step dots animation ───────────────────────────────────
  function updateDots(step) {
    ['dot1','dot2','dot3'].forEach((id, i) => {
      const d = $(id);
      d.classList.remove('active','done');
      if (i + 1 < step) d.classList.add('done');
      if (i + 1 === step) d.classList.add('active');
    });
  }
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('focus', () => {
      const s = el.closest('.field');
      if (!s) return;
      const all = [...document.querySelectorAll('.field')];
      const idx = all.indexOf(s);
      updateDots(idx < 5 ? 1 : idx < 10 ? 2 : 3);
    });
  });

  // ── Validation ────────────────────────────────────────────
  function validate() {
    let ok = true;

    const fullName = $('fullName').value.trim();
    if (fullName.length < 3) {
      setError('err-fullName', 'Ingresa tu nombre completo (mín. 3 caracteres).'); markField($('fullName'), true); ok = false;
    } else { setError('err-fullName', ''); markField($('fullName'), false); }

    const studentId = $('studentId').value.trim();
    if (!studentId) {
      setError('err-studentId', 'El código estudiantil es obligatorio.'); markField($('studentId'), true); ok = false;
    } else { setError('err-studentId', ''); markField($('studentId'), false); }

    const email = $('email').value.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      setError('err-email', 'Ingresa un correo electrónico válido.'); markField($('email'), true); ok = false;
    } else { setError('err-email', ''); markField($('email'), false); }

    if (!$('course').value) {
      setError('err-course', 'Selecciona tu curso.'); markField($('course'), true); ok = false;
    } else { setError('err-course', ''); markField($('course'), false); }

    const from = $('dateFrom').value, to = $('dateTo').value;
    if (!from) {
      setError('err-dateFrom', 'Selecciona la fecha de inicio.'); markField($('dateFrom'), true); ok = false;
    } else { setError('err-dateFrom', ''); markField($('dateFrom'), false); }
    if (!to) {
      setError('err-dateTo', 'Selecciona la fecha de fin.'); markField($('dateTo'), true); ok = false;
    } else if (from && to < from) {
      setError('err-dateTo', 'La fecha de fin no puede ser anterior al inicio.'); markField($('dateTo'), true); ok = false;
    } else { setError('err-dateTo', ''); markField($('dateTo'), false); }

    if (!$('reason').value) {
      setError('err-reason', 'Selecciona el motivo de inasistencia.'); markField($('reason'), true); ok = false;
    } else { setError('err-reason', ''); markField($('reason'), false); }

    if ($('reason').value === 'otro' && !$('otroDesc').value.trim()) {
      setError('err-otroDesc', 'Por favor describe el motivo.'); markField($('otroDesc'), true); ok = false;
    } else { setError('err-otroDesc', ''); markField($('otroDesc'), false); }

    if (!$('declaration').checked) {
      setError('err-declaration', 'Debes aceptar la declaración para continuar.'); ok = false;
    } else { setError('err-declaration', ''); }

    return ok;
  }

  // ── Submit ────────────────────────────────────────────────
$('absenceForm').addEventListener('submit', async e => {
  e.preventDefault();
  
  if (!validate()) return; // Valida antes de enviar

  const btn = $('submitBtn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Enviando…';

  try {
    // 1. Crear el objeto FormData con los datos del form
    const formData = new FormData($('absenceForm'));

    // 2. Enviar a tu Webhook de n8n
    const response = await fetch('https://jotaa.app.n8n.cloud/webhook-test/Inasistencias', {
      method: 'POST',
      body: formData // Esto envía automáticamente como multipart/form-data
    });

    if (!response.ok) throw new Error('Error en el servidor');

    // 3. Opcional: Obtener respuesta del servidor
    const result = await response.json(); 
    const ticket = result.ticketId || 'INS-' + Date.now().toString().slice(-7);

    // 4. Mostrar éxito
    $('ticketNum').textContent = 'Nº de radicado: ' + ticket;
    $('successOverlay').classList.add('show');

  } catch (error) {
    console.error('Error:', error);
    alert('Hubo un error al enviar el formulario. Intenta de nuevo.');
  } finally {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Enviar Reporte de Inasistencia →';
  }
});

  // ── Reset ─────────────────────────────────────────────────
  function resetForm() {
    $('absenceForm').reset();
    $('filePreview').classList.remove('show');
    $('otroField').style.display = 'none';
    $('successOverlay').classList.remove('show');
    document.querySelectorAll('.field-error').forEach(e => e.classList.remove('show'));
    document.querySelectorAll('input,select,textarea').forEach(e => e.classList.remove('error'));
    updateDots(1);
  }

  // ── Set today's date as default ───────────────────────────
  const today = new Date().toISOString().split('T')[0];
  $('dateFrom').value = today;
  $('dateTo').value = today;





//