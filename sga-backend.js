/* =============================================================
   SGA HIDROITUANGO — Backend JavaScript completo
   Base de datos: MODELO_BASES_DATOS.mwb (9 tablas)
   Módulos: Auth · Usuarios · Registros · Alertas ·
            Reportes · Dashboard · Dispositivos IoT · PDF
   ============================================================= */
'use strict';

/* ══════════════════════════════════════════
   MOTOR DE PERSISTENCIA — localStorage
   Replica exacta del modelo .mwb
══════════════════════════════════════════ */
const DB = {
  leer(t)       { try { return JSON.parse(localStorage.getItem('sga_'+t))||[]; } catch { return []; } },
  guardar(t,d)  { localStorage.setItem('sga_'+t, JSON.stringify(d)); },
  nextId(t)     { const r=this.leer(t); return r.length ? Math.max(...r.map(x=>x.id||0))+1 : 1; },
  insertar(t,f) {
    const r=this.leer(t);
    const n={id:this.nextId(t),...f,_ts:new Date().toISOString()};
    r.push(n); this.guardar(t,r); return n;
  },
  actualizar(t,cond,c) {
    this.guardar(t, this.leer(t).map(f=>cond(f)?{...f,...c,_upd:new Date().toISOString()}:f));
  },
  eliminar(t,cond) { this.guardar(t, this.leer(t).filter(f=>!cond(f))); },
  select(t,{donde=null,orden=null,limite=null}={}) {
    let r=this.leer(t);
    if(donde)  r=r.filter(donde);
    if(orden)  r=r.sort(orden);
    if(limite) r=r.slice(0,limite);
    return r;
  }
};

/* ══════════════════════════════════════════
   TABLAS MWB y DATOS INICIALES
══════════════════════════════════════════ */
function inicializarDatos() {

  /* ROL: idROL, nombre */
  if(!DB.leer('ROL').length) {
    ['Administrador','Operativo','Auditor'].forEach(n=>DB.insertar('ROL',{nombre:n}));
  }

  /* AREA: idAREA, nombre, codigo */
  if(!DB.leer('AREA').length) {
    [
      {nombre:'Planta HIDROITUANGO',  codigo:'HIDROITUANGO'},
      {nombre:'Planta Hidrosogamoso', codigo:'Hidrosogamoso'},
      {nombre:'Planta Guatapé',       codigo:'Guatape'},
      {nombre:'Planta Termo-Norte',   codigo:'Termo-Norte'},
      {nombre:'Planta Enel',          codigo:'Enel'}
    ].forEach(a=>DB.insertar('AREA',a));
  }

  /* USUARIO: demo accounts */
  if(!DB.leer('USUARIO').length) {
    [
      {nombre:'Administrador SGA', email:'admin@sga.co',    pwd:btoa('admin123'), rol:'Administrador', planta:'Planta HIDROITUANGO'},
      {nombre:'Silvia Rangel',     email:'silvia@sga.co',   pwd:btoa('op2026'),   rol:'Operativo',     planta:'Planta HIDROITUANGO'},
      {nombre:'Auditor SGA',       email:'auditor@sga.co',  pwd:btoa('aud456'),   rol:'Auditor',       planta:'Planta HIDROITUANGO'}
    ].forEach(u=>DB.insertar('USUARIO',{
      nombres:u.nombre, email:u.email, password_hash:u.pwd,
      estado:'activo', rol:u.rol, planta:u.planta,
      fecha_creacion:new Date().toISOString().slice(0,10)
    }));
  }

  /* INDICADOR_AMBIENTAL */
  if(!DB.leer('INDICADOR_AMBIENTAL').length) {
    [
      {nombre:'Emisiones de CO₂',          unidad:'kg',     codigo:'co2',         tipo:'Emisiones Atmosféricas'},
      {nombre:'Metano CH₄',                unidad:'kg',     codigo:'metano',      tipo:'Emisiones Atmosféricas'},
      {nombre:'Óxidos de Nitrógeno NOx',   unidad:'kg',     codigo:'nox',         tipo:'Emisiones Atmosféricas'},
      {nombre:'Consumo de Agua',           unidad:'m³',     codigo:'agua',        tipo:'Consumo de Recursos'},
      {nombre:'Consumo de Energía',        unidad:'kWh',    codigo:'energia',     tipo:'Consumo de Recursos'},
      {nombre:'Consumo de Combustible',    unidad:'litros', codigo:'combustible', tipo:'Consumo de Recursos'},
      {nombre:'Residuos Sólidos',          unidad:'kg',     codigo:'solidos',     tipo:'Residuos'},
      {nombre:'Residuos Líquidos',         unidad:'litros', codigo:'liquidos',    tipo:'Residuos'},
      {nombre:'Residuos Peligrosos',       unidad:'kg',     codigo:'peligrosos',  tipo:'Residuos'}
    ].forEach(i=>DB.insertar('INDICADOR_AMBIENTAL',{...i,activo:1}));
  }

  /* UMBRAL_ALERTA */
  if(!DB.leer('UMBRAL_ALERTA').length) {
    [
      {ind_id:1, adv:1950,  crit:2500},
      {ind_id:2, adv:400,   crit:500},
      {ind_id:3, adv:240,   crit:300},
      {ind_id:4, adv:95,    crit:120},
      {ind_id:5, adv:4800,  crit:6000},
      {ind_id:6, adv:1600,  crit:2000},
      {ind_id:7, adv:4000,  crit:5000},
      {ind_id:8, adv:800,   crit:1000},
      {ind_id:9, adv:160,   crit:200}
    ].forEach(u=>DB.insertar('UMBRAL_ALERTA',{
      INDICADOR_AMBIENTAL_id:u.ind_id,
      valor_advertencia:u.adv, valor_critico:u.crit,
      direccion:'MAYOR_QUE', activo:1
    }));
  }

  /* DISPOSITIVOS IoT */
  if(!DB.leer('DISPOSITIVO').length) {
    [
      {codigo:'IOT-CO2-001',  nombre:'Sensor CO₂ Turbina A', tipo:'co2',    planta:'Planta HIDROITUANGO',  estado:'online',  ultima_lectura:1950},
      {codigo:'IOT-H2O-001',  nombre:'Sensor Agua Planta',   tipo:'agua',   planta:'Planta HIDROITUANGO',  estado:'online',  ultima_lectura:132},
      {codigo:'IOT-EN-001',   nombre:'Medidor Energía',      tipo:'energia',planta:'Planta HIDROITUANGO',  estado:'online',  ultima_lectura:4820},
      {codigo:'IOT-CO2-002',  nombre:'Sensor CO₂ Turbina B', tipo:'co2',    planta:'Planta Hidrosogamoso', estado:'online',  ultima_lectura:1200},
      {codigo:'IOT-EN-002',   nombre:'Medidor Energía Sur',  tipo:'energia',planta:'Planta Guatapé',       estado:'offline', ultima_lectura:null},
      {codigo:'IOT-RES-001',  nombre:'Sensor Residuos',      tipo:'solidos',planta:'Planta Termo-Norte',   estado:'warning', ultima_lectura:4100}
    ].forEach(d=>DB.insertar('DISPOSITIVO',{
      ...d, ultimo_ping:new Date().toISOString()
    }));
  }

  /* REGISTRO_INDICADOR de ejemplo */
  if(!DB.leer('REGISTRO_INDICADOR').length) {
    const ejemplos=[
      {cod:'co2',     val:1950, planta:'Planta HIDROITUANGO',  turno:'Mañana', resp:'Silvia Rangel'},
      {cod:'energia', val:1200, planta:'Planta Hidrosogamoso', turno:'Tarde',  resp:'María García'},
      {cod:'agua',    val:120,  planta:'Planta Guatapé',       turno:'Mañana', resp:'Carlos López'},
      {cod:'solidos', val:5000, planta:'Planta Termo-Norte',   turno:'Noche',  resp:'Ana Martínez'}
    ];
    ejemplos.forEach(e=>{
      const ind=DB.select('INDICADOR_AMBIENTAL',{donde:i=>i.codigo===e.cod})[0];
      if(!ind) return;
      const reg=DB.insertar('REGISTRO_INDICADOR',{
        valor:e.val, fecha_hora:new Date().toISOString(),
        datos_extra:JSON.stringify({planta:e.planta,turno:e.turno,responsable:e.resp,observaciones:''}),
        validado:0, USUARIO_idUSUARIO:2,
        INDICADOR_AMBIENTAL_id:ind.id
      });
      AlertasDB.verificarYCrear(reg,ind);
    });
  }
}

/* ══════════════════════════════════════════
   AUTH — Login · Registro · Sesión · Roles
══════════════════════════════════════════ */
const Auth = {
  login(email,pwd) {
    const u=DB.select('USUARIO',{donde:u=>u.email===email&&u.password_hash===btoa(pwd)&&u.estado==='activo'})[0];
    if(!u) return null;
    const sesion={id:u.id,nombre:u.nombres,email:u.email,rol:u.rol,planta:u.planta};
    localStorage.setItem('sga_sesion',JSON.stringify(sesion));
    return sesion;
  },
  registrar(nombre,email,pwd,rol,planta) {
    if(DB.select('USUARIO',{donde:u=>u.email===email}).length) return false;
    DB.insertar('USUARIO',{
      nombres:nombre,email,password_hash:btoa(pwd),
      estado:'activo',rol,planta,
      fecha_creacion:new Date().toISOString().slice(0,10)
    });
    return true;
  },
  sesion()  { try { return JSON.parse(localStorage.getItem('sga_sesion')); } catch { return null; } },
  logout()  { localStorage.removeItem('sga_sesion'); location.href='sga-login.html'; },
  requerir(){ if(!this.sesion()){ location.href='sga-login.html'; return false; } return true; },
  puede(rol){ const s=this.sesion(); return s&&(s.rol===rol||s.rol==='Administrador'); }
};

/* ══════════════════════════════════════════
   DISPOSITIVOS IoT
   Simula telemetría en tiempo real
══════════════════════════════════════════ */
const Dispositivos = {
  todos()      { return DB.leer('DISPOSITIVO'); },
  conectados() { return this.todos().filter(d=>d.estado==='online'); },

  /* Simula lectura nueva de un dispositivo — genera registro automático */
  recibirLectura(dispositivo_id, valor) {
    const disp=DB.select('DISPOSITIVO',{donde:d=>d.id===dispositivo_id})[0];
    if(!disp) return;
    DB.actualizar('DISPOSITIVO',d=>d.id===dispositivo_id,{
      ultima_lectura:valor, ultimo_ping:new Date().toISOString()
    });
    const ind=DB.select('INDICADOR_AMBIENTAL',{donde:i=>i.codigo===disp.tipo})[0];
    if(!ind) return;
    const reg=DB.insertar('REGISTRO_INDICADOR',{
      valor, fecha_hora:new Date().toISOString(),
      datos_extra:JSON.stringify({planta:disp.planta,turno:'Auto',responsable:'IoT: '+disp.codigo,observaciones:'Lectura automática del dispositivo'}),
      validado:0, USUARIO_idUSUARIO:0,
      INDICADOR_AMBIENTAL_id:ind.id, dispositivo_id
    });
    AlertasDB.verificarYCrear(reg,ind);
    renderTabla && renderTabla();
    renderAlertas && renderAlertas();
  },

  /* Simula ping periódico — actualiza estado */
  simularTelemetria() {
    const disps=this.todos().filter(d=>d.estado==='online');
    disps.forEach(d=>{
      const ind=DB.select('INDICADOR_AMBIENTAL',{donde:i=>i.codigo===d.tipo})[0];
      if(!ind) return;
      const umb=DB.select('UMBRAL_ALERTA',{donde:u=>u.INDICADOR_AMBIENTAL_id===ind.id})[0];
      if(!umb) return;
      /* Fluctuación ±5% del valor de advertencia */
      const base  = umb.valor_advertencia;
      const delta = base * 0.05;
      const valor = +(base + (Math.random()*delta*2-delta)).toFixed(2);
      DB.actualizar('DISPOSITIVO',x=>x.id===d.id,{ultima_lectura:valor,ultimo_ping:new Date().toISOString()});
    });
    renderDispositivos && renderDispositivos();
  }
};

/* ══════════════════════════════════════════
   REGISTROS — CRUD completo
══════════════════════════════════════════ */
const RegistrosDB = {
  _enriquecer(r) {
    const ind  =DB.leer('INDICADOR_AMBIENTAL').find(i=>i.id===r.INDICADOR_AMBIENTAL_id)||{};
    const extra=(() => { try{return JSON.parse(r.datos_extra||'{}')}catch{return{}} })();
    return {...r, indicador:ind, extra};
  },
  todos()         { return DB.leer('REGISTRO_INDICADOR').map(r=>this._enriquecer(r)).reverse(); },
  porId(id)       { return this.todos().find(r=>r.id===id); },
  buscar(q)       {
    const t=q.toLowerCase();
    return this.todos().filter(r=>
      r.indicador?.nombre?.toLowerCase().includes(t)||
      r.extra?.planta?.toLowerCase().includes(t)||
      r.extra?.responsable?.toLowerCase().includes(t)
    );
  },
  filtrarEstado(e){
    const todos=this.todos();
    if(!e||e==='Todos') return todos;
    const idsA=new Set(DB.leer('ALERTA').filter(a=>a.leida===0).map(a=>a.REGISTRO_INDICADOR_id));
    if(e==='alerta')    return todos.filter(r=>idsA.has(r.id));
    if(e==='validado')  return todos.filter(r=>r.validado===1&&!idsA.has(r.id));
    if(e==='Pendientes')return todos.filter(r=>r.validado===0&&!idsA.has(r.id));
    return todos;
  },
  paginar(lista,pag=1,n=5) {
    const off=(pag-1)*n;
    return {datos:lista.slice(off,off+n),total:lista.length,pag,pages:Math.ceil(lista.length/n)};
  },
  crear({indicador_id,valor,fecha_hora,planta,turno,responsable,observaciones}) {
    const ind=DB.select('INDICADOR_AMBIENTAL',{donde:i=>i.id===Number(indicador_id)})[0];
    if(!ind) throw new Error('Indicador no encontrado');
    const reg=DB.insertar('REGISTRO_INDICADOR',{
      valor:parseFloat(valor),
      fecha_hora:fecha_hora||new Date().toISOString(),
      datos_extra:JSON.stringify({planta,turno,responsable,observaciones:observaciones||''}),
      validado:0, USUARIO_idUSUARIO:Auth.sesion()?.id||1,
      INDICADOR_AMBIENTAL_id:ind.id
    });
    AlertasDB.verificarYCrear(reg,ind);
    return reg;
  },
  actualizar(id,c){ DB.actualizar('REGISTRO_INDICADOR',r=>r.id===Number(id),c); },
  eliminar(id){
    DB.eliminar('REGISTRO_INDICADOR',r=>r.id===Number(id));
    DB.eliminar('ALERTA',a=>a.REGISTRO_INDICADOR_id===Number(id));
  },
  resumenMes(){
    const hoy=new Date();
    const mes=this.todos().filter(r=>{const f=new Date(r._ts);return f.getMonth()===hoy.getMonth()&&f.getFullYear()===hoy.getFullYear();});
    const idsA=new Set(DB.leer('ALERTA').filter(a=>a.leida===0).map(a=>a.REGISTRO_INDICADOR_id));
    return {
      total:mes.length,
      validados:mes.filter(r=>r.validado===1&&!idsA.has(r.id)).length,
      enAlerta:mes.filter(r=>idsA.has(r.id)).length,
      pendientes:mes.filter(r=>r.validado===0&&!idsA.has(r.id)).length
    };
  }
};

/* ══════════════════════════════════════════
   ALERTAS — automáticas desde UMBRAL_ALERTA
══════════════════════════════════════════ */
const AlertasDB = {
  todas()   { return DB.leer('ALERTA').reverse(); },
  activas() { return this.todas().filter(a=>a.leida===0); },
  verificarYCrear(reg,ind) {
    const umb=DB.select('UMBRAL_ALERTA',{donde:u=>u.INDICADOR_AMBIENTAL_id===ind.id&&u.activo===1})[0];
    if(!umb) return;
    const v=parseFloat(reg.valor), nivel=v>=umb.valor_critico?'CRITICA':v>=umb.valor_advertencia?'ADVERTENCIA':null;
    if(nivel) DB.insertar('ALERTA',{
      nivel, leida:0,
      titulo:`${ind.nombre} ${nivel==='CRITICA'?'supera el límite crítico':'en nivel de advertencia'}`,
      descripcion:`Valor: ${v} ${ind.unidad}. Límite crítico: ${umb.valor_critico} ${ind.unidad}.`,
      valor_detectado:v, limite:umb.valor_critico,
      porcentaje:Math.round(v/umb.valor_critico*100),
      REGISTRO_INDICADOR_id:reg.id, UMBRAL_ALERTA_id:umb.id,
      fecha_generacion:new Date().toISOString().slice(0,10)
    });
  },
  marcarLeida(id){ DB.actualizar('ALERTA',a=>a.id===Number(id),{leida:1,atendida_en:new Date().toISOString()}); }
};

/* ══════════════════════════════════════════
   REPORTES — CSV real + estructura PDF
   MWB: idREPORTE, Título, tipo, formato,
        fecha_generación, ruta_archivo
══════════════════════════════════════════ */
const ReportesDB = {
  todos() { return DB.leer('REPORTE').reverse(); },

  generar(titulo,tipo,formato,fi,ff) {
    /* Filtrar registros por rango */
    const inicio=fi?new Date(fi):null;
    const fin   =ff?new Date(ff+'T23:59:59'):null;
    const regs=RegistrosDB.todos().filter(r=>{
      const f=new Date(r.fecha_hora||r._ts);
      if(inicio&&f<inicio) return false;
      if(fin   &&f>fin)    return false;
      return true;
    });

    const rep=DB.insertar('REPORTE',{
      Titulo:titulo||`Reporte ${tipo}`,
      tipo, formato,
      fecha_generacion:new Date().toISOString().slice(0,10),
      total_registros:regs.length,
      generado_por:Auth.sesion()?.nombre||'Sistema'
    });
    /* Tabla pivot REGISTRO_INDICADOR_has_REPORTE */
    regs.forEach(r=>DB.insertar('REGISTRO_INDICADOR_has_REPORTE',{
      REGISTRO_INDICADOR_id:r.id, REPORTE_id:rep.id
    }));

    if(formato==='csv'||formato==='excel') this._csv(regs,rep);
    else if(formato==='pdf')               this._pdf(regs,rep,tipo);

    return {...rep,total:regs.length};
  },

  _csv(regs,rep) {
    const enc=['ID','Fecha','Indicador','Tipo','Valor','Unidad','Planta','Turno','Responsable','Validado','Observaciones'];
    const filas=regs.map(r=>[
      r.id,
      new Date(r.fecha_hora||r._ts).toLocaleString('es-CO'),
      r.indicador?.nombre||'',r.indicador?.tipo||'',
      r.valor,r.indicador?.unidad||'',
      r.extra?.planta||'',r.extra?.turno||'',
      r.extra?.responsable||'',r.validado?'Sí':'No',
      r.extra?.observaciones||''
    ].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','));
    const csv='\uFEFF'+[enc.join(','),...filas].join('\n');
    this._descargar(csv,'text/csv',`SGA_${rep.tipo}_${rep.id}.csv`);
  },

  _pdf(regs,rep,tipo) {
    /* PDF real usando solo APIs del navegador (window.print vía iframe) */
    const filas=regs.map(r=>`
      <tr>
        <td>${new Date(r.fecha_hora||r._ts).toLocaleDateString('es-CO')}</td>
        <td>${r.indicador?.nombre||''}</td>
        <td>${r.valor} ${r.indicador?.unidad||''}</td>
        <td>${r.extra?.planta||''}</td>
        <td>${r.extra?.responsable||''}</td>
        <td style="color:${r.validado?'#16a34a':'#dc2626'}">${r.validado?'Validado':'Pendiente'}</td>
      </tr>`).join('');

    const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Reporte SGA</title>
    <style>
      body{font-family:Arial,sans-serif;padding:2cm;font-size:11pt}
      h1{color:#0f3d22;border-bottom:3px solid #28a84f;padding-bottom:.5rem}
      .meta{color:#555;font-size:10pt;margin-bottom:1rem}
      table{width:100%;border-collapse:collapse;font-size:10pt}
      th{background:#0f3d22;color:#fff;padding:.5rem .4rem;text-align:left}
      td{padding:.4rem;border-bottom:1px solid #ddd}
      tr:nth-child(even) td{background:#f7faf8}
      .footer{margin-top:1.5rem;font-size:9pt;color:#777;border-top:1px solid #ccc;padding-top:.5rem}
      @media print{body{padding:1cm}}
    </style></head><body>
    <h1>🌿 SGA HIDROITUANGO — ${tipo.toUpperCase()}</h1>
    <div class="meta">
      Generado: ${new Date().toLocaleString('es-CO')} |
      Período: ${rep.fecha_generacion} |
      Registros: ${regs.length} |
      Por: ${rep.generado_por}
    </div>
    <table>
      <thead><tr>
        <th>Fecha</th><th>Indicador</th><th>Valor</th>
        <th>Planta</th><th>Responsable</th><th>Estado</th>
      </tr></thead>
      <tbody>${filas||'<tr><td colspan="6" style="text-align:center">Sin registros en el período</td></tr>'}</tbody>
    </table>
    <div class="footer">
      Sistema de Gestión Ambiental v2.4.1 | ISO 14001 | © 2026 HIDROITUANGO
    </div>
    <script>window.onload=()=>{ window.print(); }<\/script>
    </body></html>`;

    const w=window.open('','_blank','width=900,height=700');
    if(w){ w.document.write(html); w.document.close(); }
    else  { /* fallback: descarga HTML */ this._descargar(html,'text/html',`SGA_${tipo}_${rep.id}.html`); }
  },

  _descargar(contenido,mime,nombre) {
    const blob=new Blob([contenido],{type:mime+';charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=nombre; a.click();
    URL.revokeObjectURL(url);
  }
};

/* ══════════════════════════════════════════
   RENDER — pinta el DOM
══════════════════════════════════════════ */
let _pag={pagina:1,filtro:'Todos',busqueda:''};

function renderTabla() {
  const tbody=document.querySelector('#TabladeRegistros tbody');
  if(!tbody) return;
  const lista=_pag.busqueda ? RegistrosDB.buscar(_pag.busqueda) : RegistrosDB.filtrarEstado(_pag.filtro);
  const {datos,total,pag,pages}=RegistrosDB.paginar(lista,_pag.pagina);
  const idsA=new Set(DB.leer('ALERTA').filter(a=>a.leida===0).map(a=>a.REGISTRO_INDICADOR_id));

  tbody.innerHTML = datos.length===0
    ? '<tr><td colspan="7" class="text-center text-muted py-3">Sin registros</td></tr>'
    : datos.map(r=>{
        const en=idsA.has(r.id), val=r.validado===1&&!en;
        const estado=en?'En Alerta':val?'Validado':'Pendiente';
        const badge =en?'danger'   :val?'success' :'warning';
        return `<tr>
          <td>${new Date(r.fecha_hora||r._ts).toLocaleString('es-CO')}</td>
          <td>${r.indicador?.nombre||'—'}</td>
          <td>${r.valor} ${r.indicador?.unidad||''}</td>
          <td>${r.extra?.responsable||'—'}</td>
          <td>${r.extra?.planta||'—'}</td>
          <td><span class="badge bg-${badge}">${estado}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="verDetalle(${r.id})" title="Ver detalle">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="eliminarRegistro(${r.id})" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>`;
      }).join('');

  const c=document.querySelector('#contadorRegistros');
  if(c) c.innerHTML=`Mostrando <strong>${datos.length}</strong> de <strong>${total}</strong> registros`;
  renderPaginacion(pag,pages);
}

function renderPaginacion(pag,total) {
  const nav=document.querySelector('.pagination');
  if(!nav||total<=1){if(nav)nav.innerHTML='';return;}
  nav.innerHTML=
    `<li class="page-item ${pag===1?'disabled':''}">
       <a class="page-link" href="#" onclick="cambiarPagina(${pag-1});return false;">Anterior</a>
     </li>`+
    Array.from({length:total},(_,i)=>i+1).map(n=>
      `<li class="page-item ${n===pag?'active':''}">
         <a class="page-link" href="#" onclick="cambiarPagina(${n});return false;">${n}</a>
       </li>`).join('')+
    `<li class="page-item ${pag===total?'disabled':''}">
       <a class="page-link" href="#" onclick="cambiarPagina(${pag+1});return false;">Siguiente</a>
     </li>`;
}

function renderAlertas() {
  const n=AlertasDB.activas().length;
  document.querySelectorAll('.badge-alerta,[id*="badge-alerta"]').forEach(el=>el.textContent=n);
}

function renderResumenMes() {
  const {total,validados,enAlerta,pendientes}=RegistrosDB.resumenMes();
  const items=document.querySelectorAll('.list-group-item');
  if(items[0]) items[0].textContent=total;
  if(items[1]) items[1].textContent=`${validados} (${total?Math.round(validados/total*100):0}%)`;
  if(items[2]) items[2].textContent=`${enAlerta} (${total?Math.round(enAlerta/total*100):0}%)`;
}

function renderInfoUsuario() {
  const s=Auth.sesion();
  if(!s) return;
  document.querySelectorAll('[data-sga-nombre]').forEach(el=>el.textContent=s.nombre);
  document.querySelectorAll('[data-sga-rol]').forEach(el=>el.textContent=s.rol);
  document.querySelectorAll('[data-sga-planta]').forEach(el=>el.textContent=s.planta||'HIDROITUANGO');
  /* Ocultar acciones según rol */
  if(s.rol==='Auditor') {
    document.querySelectorAll('.sga-solo-admin,.sga-solo-op').forEach(el=>el.style.display='none');
  }
}

function renderDispositivos() {
  const cont=document.getElementById('dispositivos-panel');
  if(!cont) return;
  const disps=Dispositivos.todos();
  cont.innerHTML=disps.map(d=>{
    const color=d.estado==='online'?'#16a34a':d.estado==='warning'?'#d97706':'#6b7280';
    const icono=d.estado==='online'?'bi-wifi':d.estado==='warning'?'bi-wifi-2':'bi-wifi-off';
    return `<div class="d-flex align-items-center gap-2 py-1 border-bottom">
      <i class="bi ${icono}" style="color:${color};font-size:1.1rem"></i>
      <div class="flex-grow-1">
        <div style="font-size:.82rem;font-weight:600">${d.codigo}</div>
        <div style="font-size:.73rem;color:#666">${d.nombre} — ${d.planta}</div>
      </div>
      <div style="font-size:.8rem;font-weight:700;color:${color}">
        ${d.ultima_lectura!=null?d.ultima_lectura:'—'}
      </div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════
   FUNCIONES GLOBALES — llamadas desde HTML
══════════════════════════════════════════ */
function guardarRegistro(event) {
  event.preventDefault();
  const codigoSel=document.querySelector('[name="indicador"]')?.value;
  const ind=DB.select('INDICADOR_AMBIENTAL',{donde:i=>i.codigo===codigoSel})[0];
  if(!codigoSel||codigoSel.startsWith('-')||!ind) { mostrarFeedback('⚠ Selecciona un indicador','warning'); return; }

  const valor=parseFloat(document.getElementById('valorNumber')?.value||document.getElementById('valor')?.value||'0');
  if(isNaN(valor)||valor<0) { mostrarFeedback('⚠ Valor inválido','warning'); return; }

  const planta=document.querySelector('[aria-label="planta"]')?.value||'Planta HIDROITUANGO';
  const turno=document.querySelector('[aria-label="Planta"]')?.value||'Mañana';
  const responsable=document.getElementById('ResponsableMedición')?.value||Auth.sesion()?.nombre||'Operativo';
  const obs=document.getElementById('observaciones')?.value||'';
  const fecha=document.getElementById('fecha')?.value||new Date().toISOString();

  const reg=RegistrosDB.crear({indicador_id:ind.id,valor,fecha_hora:fecha,planta,turno,responsable,observaciones:obs});
  const alerta=DB.leer('ALERTA').find(a=>a.REGISTRO_INDICADOR_id===reg.id);
  mostrarFeedback(alerta?`⚠ Registro guardado con ALERTA ${alerta.nivel}`:'✅ Registro guardado correctamente',alerta?'warning':'success');
  limpiarFormulario(); renderTabla(); renderAlertas(); renderResumenMes();
}

function limpiarFormulario(){
  document.getElementById('formRegistro')?.reset();
  const b=document.getElementById('valorValue');
  if(b){b.value='0.00';b.textContent='0.00';}
}

function limpiarReporteForm() { document.getElementById('formReporte')?.reset(); }

function buscarEnTabla(q) { _pag.busqueda=q; _pag.pagina=1; renderTabla(); }

function filtrarTabla(e) { _pag.filtro=e; _pag.busqueda=''; _pag.pagina=1; renderTabla(); }

function cambiarPagina(n) {
  _pag.pagina=n;
  renderTabla();
  document.getElementById('Historial-Section')?.scrollIntoView({behavior:'smooth'});
}

function verDetalle(id) {
  const r=RegistrosDB.porId(id);
  if(!r) return;
  const idsA=new Set(DB.leer('ALERTA').filter(a=>a.leida===0).map(a=>a.REGISTRO_INDICADOR_id));
  const estado=idsA.has(r.id)?'⚠ En Alerta':r.validado?'✅ Validado':'🕐 Pendiente';
  alert(`📋 REGISTRO #${r.id}\n──────────────────────────\n`+
    `Indicador:    ${r.indicador?.nombre||'—'}\n`+
    `Tipo:         ${r.indicador?.tipo||'—'}\n`+
    `Valor:        ${r.valor} ${r.indicador?.unidad||''}\n`+
    `Fecha/Hora:   ${new Date(r.fecha_hora||r._ts).toLocaleString('es-CO')}\n`+
    `Planta:       ${r.extra?.planta||'—'}\n`+
    `Turno:        ${r.extra?.turno||'—'}\n`+
    `Responsable:  ${r.extra?.responsable||'—'}\n`+
    `Estado:       ${estado}\n`+
    `Obs:          ${r.extra?.observaciones||'Ninguna'}`);
}

function eliminarRegistro(id) {
  if(!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
  RegistrosDB.eliminar(id); renderTabla(); renderAlertas(); renderResumenMes();
}

function generarReporte(event) {
  event.preventDefault();
  const tipo   =document.querySelector('[name="tipo-reporte"]')?.value;
  const inicio =document.getElementById('fechaInicio')?.value;
  const fin    =document.getElementById('fechaFin')?.value;
  const formato=document.querySelector('[name="formato-reporte"]')?.value;
  if(!tipo||tipo.startsWith('-'))   { alert('⚠ Selecciona el tipo');   return; }
  if(!inicio||!fin)                 { alert('⚠ Ingresa fechas');        return; }
  if(!formato||formato.startsWith('-')){ alert('⚠ Selecciona formato'); return; }
  const r=ReportesDB.generar(`Reporte ${tipo}`,tipo,formato,inicio,fin);
  if(formato!=='pdf') alert(`✅ ${r.total} registros exportados como ${formato.toUpperCase()}`);
}

function generarReportePDF() {
  const hoy=new Date().toISOString().slice(0,10);
  const hace30=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  ReportesDB.generar('Reporte Mensual de Alertas','alerta','pdf',hace30,hoy);
}

function mostrarFeedback(msg,tipo='success') {
  let fb=document.getElementById('sga-feedback');
  if(!fb){ fb=document.createElement('div'); fb.id='sga-feedback'; document.getElementById('formRegistro')?.appendChild(fb); }
  fb.className=`alert alert-${tipo} mt-2 py-2`; fb.textContent=msg;
  clearTimeout(fb._t); fb._t=setTimeout(()=>{fb.className='d-none';fb.textContent='';},5000);
}

function activarFiltro(radio,color) {
  document.querySelectorAll('[name="filtroEstado"]').forEach(r=>{
    const l=document.querySelector(`label[for="${r.id}"]`);
    if(l){l.style.background='transparent';l.style.color=l.style.borderColor;}
  });
  const l=document.querySelector(`label[for="${radio.id}"]`);
  if(l){l.style.background=color;l.style.color='#fff';}
}

function scrollToForm()  { document.getElementById('registros')?.scrollIntoView({behavior:'smooth'}); }
function verAlertas()    { document.getElementById('alertas')?.scrollIntoView({behavior:'smooth'}); }
function exportarDatos() {
  const hoy=new Date().toISOString().slice(0,10);
  ReportesDB.generar('Exportación completa','anual','csv',null,hoy);
}
function calendario()    { alert('📅 Módulo de Calendario — próximamente disponible en v3.0'); }
function handleLogout()  { if(confirm('¿Cerrar sesión?')) Auth.logout(); }

/* ══════════════════════════════════════════
   ARRANQUE
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
  /* 1. Inicializar modelo de datos */
  inicializarDatos();

  /* 2. Verificar sesión (si estamos en el dashboard) */
  if(!window.location.pathname.includes('sga-login')) {
    if(!Auth.sesion()) { location.href='sga-login.html'; return; }
  }

  /* 3. Pintar UI */
  renderInfoUsuario();
  renderTabla();
  renderAlertas();
  renderResumenMes();
  renderDispositivos();

  /* 4. Conectar formularios */
  document.getElementById('formRegistro')?.addEventListener('submit',guardarRegistro);
  document.getElementById('formReporte')?.addEventListener('submit',generarReporte);
  const bus=document.getElementById('Registro');
  if(bus) bus.addEventListener('input',e=>buscarEnTabla(e.target.value));

  /* 5. Telemetría IoT cada 30 segundos */
  setInterval(()=>{
    Dispositivos.simularTelemetria();
    renderAlertas();
  }, 30000);

  /* 6. Log de inicio */
  const s=Auth.sesion();
  console.log(`%c✅ SGA HIDROITUANGO iniciado`, 'color:#1f7a3e;font-weight:bold;font-size:14px');
  if(s) console.log(`%c👤 ${s.nombre} | Rol: ${s.rol} | Planta: ${s.planta}`, 'color:#155229');
  console.table({
    'Usuarios':     DB.leer('USUARIO').length,
    'Indicadores':  DB.leer('INDICADOR_AMBIENTAL').length,
    'Registros':    DB.leer('REGISTRO_INDICADOR').length,
    'Alertas':      AlertasDB.activas().length,
    'Dispositivos': Dispositivos.conectados().length
  });
});
