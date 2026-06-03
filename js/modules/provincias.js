// js/modules/provincias.js

let itensTransferencia = [];

async function renderProvincias() {
    const main = document.getElementById('main-content');
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const isAdmin = usuario.tipo_acesso === 'admin';

    main.innerHTML = `
        <div class="module-header">
            <div>
                <h2>unidades provinciais e transferências</h2>
                <p style="font-size:11px; color:var(--text-secondary);">gestão de armazéns remotos e guias de transporte (trf)</p>
            </div>
            <div class="actions">
                <button class="btn-primary" onclick="prepararEnvioTransferencia()">nova transferência</button>
            </div>
        </div>

        <div class="filter-bar" style="background:#eee; padding:0; gap:0;">
            <button class="btn-tab active" id="tab-gestao" onclick="mudarAbaProvincia('gestao')">unidades e armazéns</button>
            <button class="btn-tab" id="tab-trf" onclick="mudarAbaProvincia('trf')">guias de transferência (trf)</button>
        </div>

        <div id="conteudo-provincia" style="flex:1; display:flex; flex-direction:column; overflow:hidden;"></div>

        <footer class="erp-footer">
            <div class="stat-box"><label>unidades activas:</label><span id="total-prov-count">0</span></div>
            <div class="summary-line"><label>controlo de logística:</label><strong>african tech stocks</strong></div>
        </footer>
    `;

    mudarAbaProvincia('gestao');
}

/**
 * ABA 1: LISTAGEM DE UNIDADES
 */
async function carregarGestaoUnidades() {
    const container = document.getElementById('conteudo-provincia');
    container.innerHTML = `
        <div class="table-container">
            <table class="erp-table">
                <thead>
                    <tr>
                        <th width="80">iso</th>
                        <th>nome da província</th>
                        <th>armazéns</th>
                        <th>técnicos</th>
                        <th align="right">valor em stock</th>
                        <th width="100" align="center">acções</th>
                    </tr>
                </thead>
                <tbody id="body-gestao-prov">
                    <tr><td colspan="6" align="center">a carregar unidades...</td></tr>
                </tbody>
            </table>
        </div>`;

    const res = await api.request('/provincias/gestao');
    
    if (res.sucesso) {
        // CORREÇÃO: Garante que tratamos como lista mesmo se vier como objeto do Railway
        const lista = Array.isArray(res.dados) ? res.dados : Object.values(res.dados);
        
        document.getElementById('total-prov-count').innerText = lista.length;
        
        const tbody = document.getElementById('body-gestao-prov');
        tbody.innerHTML = lista.map(p => `
            <tr>
                <td><span class="badge">${p.codigo_iso || '---'}</span></td>
                <td><strong>${(p.nome || 'sem nome').toLowerCase()}</strong></td>
                <td>${p.total_armazens || 0} unidades</td>
                <td>${p.total_tecnicos || 0} pessoas</td>
                <td align="right">${parseFloat(p.valor_total_stock || 0).toLocaleString('pt-PT', {minimumFractionDigits: 2})} mt</td>
                <td align="center">
                    <button class="btn-primavera" onclick="verDetalhesUnidade(${p.id}, '${p.nome}')">ver</button>
                </td>
            </tr>
        `).join('');
    }
}

/**
 * NOVA FUNÇÃO: Ver detalhes de uma província (Armazéns e Pessoal)
 */
async function verDetalhesUnidade(id, nome) {
    const container = document.getElementById('conteudo-provincia');
    container.innerHTML = `<div class="loading">a carregar detalhes de ${nome}...</div>`;

    const res = await api.request(`/provincias/${id}`);

    if (res.sucesso) {
        const dados = res.dados;
        const armazens = Array.isArray(dados.armazens) ? dados.armazens : Object.values(dados.armazens || {});
        const tecnicos = Array.isArray(dados.tecnicos) ? dados.tecnicos : Object.values(dados.tecnicos || {});

        container.innerHTML = `
            <div style="padding:15px; background:white; border-bottom:1px solid #ddd; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; color:var(--primary);">detalhes: ${nome.toLowerCase()}</h3>
                <button class="btn-primavera" onclick="carregarGestaoUnidades()">← voltar à lista</button>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; padding:20px; overflow-y:auto;">
                <div class="primavera-card">
                    <h4>armazéns / locais</h4>
                    <ul style="list-style:none; padding:0;">
                        ${armazens.length > 0 ? armazens.map(a => `<li style="padding:8px 0; border-bottom:1px solid #eee;">🏢 ${a.nome.toLowerCase()}</li>`).join('') : '<li>nenhum armazém</li>'}
                    </ul>
                </div>
                <div class="primavera-card">
                    <h4>pessoal técnico</h4>
                    <ul style="list-style:none; padding:0;">
                        ${tecnicos.length > 0 ? tecnicos.map(t => `<li style="padding:8px 0; border-bottom:1px solid #eee;">👤 ${t.nome.toLowerCase()} <br> <small style="color:#999">${t.funcao.toLowerCase()}</small></li>`).join('') : '<li>nenhum técnico</li>'}
                    </ul>
                </div>
            </div>
        `;
    }
}

/**
 * ABA 2: GUIAS DE TRANSFERÊNCIA
 */
async function carregarGuiasTransferencia() {
    const container = document.getElementById('conteudo-provincia');
    container.innerHTML = `
        <div class="filter-bar" style="border:none;">
            <select id="filtro-status-trf" class="input-erp" onchange="carregarGuiasTransferencia()">
                <option value="PENDENTE">pendentes / em trânsito</option>
                <option value="CONCLUIDA">concluídas / recebidas</option>
            </select>
        </div>
        <div class="table-container">
            <table class="erp-table">
                <thead>
                    <tr>
                        <th width="120">guia trf</th>
                        <th width="100">data</th>
                        <th>origem</th>
                        <th>destino</th>
                        <th>material</th>
                        <th width="80">qtd</th>
                        <th width="140" align="center">acções</th>
                    </tr>
                </thead>
                <tbody id="body-trf"></tbody>
            </table>
        </div>`;

    const status = document.getElementById('filtro-status-trf').value;
    const res = await api.request(`/transferencias?status=${status}`);

    if (res.sucesso) {
        const lista = Array.isArray(res.dados) ? res.dados : Object.values(res.dados);
        document.getElementById('body-trf').innerHTML = lista.map(t => `
            <tr>
                <td><code class="badge">${t.codigo_trf}</code></td>
                <td style="font-size:10px">${new Date(t.data_criacao).toLocaleDateString()}</td>
                <td>${(t.origem_nome || '---').toLowerCase()}</td>
                <td><strong>${(t.destino_nome || '---').toLowerCase()}</strong></td>
                <td><small>${(t.material_nome || '---').toLowerCase()}</small></td>
                <td align="center"><b>${t.quantidade || 0}</b></td>
                <td align="center">
                    ${status === 'PENDENTE' ? 
                        `<button class="btn-primary" style="font-size:10px;" onclick="confirmarRecebimentoTRF(${t.id})">confirmar recepção</button>` : 
                        `<button class="btn-primavera" onclick="imprimirGuiaTRF('${t.codigo_trf}')">imprimir guia</button>`
                    }
                </td>
            </tr>
        `).join('');
    }
}

/**
 * FORMULÁRIO DE ENVIO
 */
async function prepararEnvioTransferencia() {
    const main = document.getElementById('main-content');
    itensTransferencia = [];
    const resP = await api.request('/provincias');

    main.innerHTML = `
        <div class="module-header">
            <h2>nova guia de transferência (trf)</h2>
            <button class="btn-primavera" onclick="renderProvincias()">cancelar</button>
        </div>
        <div class="primavera-card" style="border-top:4px solid var(--primary);">
            <div class="form-row">
                <div>
                    <label>destino:</label>
                    <select id="trf-destino-id" class="input-erp" style="width:100%" onchange="atualizarResponsaveisDestino(this.value)">
                        <option value="">-- seleccione --</option>
                        ${resP.dados ? Object.values(resP.dados).map(p => `<option value="${p.id}">${p.nome.toLowerCase()}</option>`).join('') : ''}
                    </select>
                </div>
                <div>
                    <label>responsável:</label>
                    <select id="trf-responsavel-id" class="input-erp" style="width:100%">
                        <option value="">seleccione primeiro a província</option>
                    </select>
                </div>
            </div>
            <div style="position: relative; margin-top:15px;">
                <label>adicionar material:</label>
                <input type="text" class="input-erp" style="width:100%;" placeholder="pesquise material..." onkeyup="pesquisarMaterialTRF(this.value)">
                <div id="resultados-trf" class="search-results-box"></div>
            </div>
            <div class="table-container" style="max-height:200px; margin-top:15px;">
                <table class="erp-table">
                    <thead><tr><th>material</th><th width="100">qtd</th><th width="40"></th></tr></thead>
                    <tbody id="grid-itens-trf"></tbody>
                </table>
            </div>
            <div style="margin-top:20px; text-align:right;">
                <button class="btn-primary" onclick="finalizarTRF()">gerar guia e despachar</button>
            </div>
        </div>
    `;
}

async function atualizarResponsaveisDestino(provinciaId) {
    const selectResp = document.getElementById('trf-responsavel-id');
    if (!provinciaId) return;
    selectResp.innerHTML = '<option value="">a carregar...</option>';
    const res = await api.request(`/funcionarios?provincia=${provinciaId}`);
    if (res.sucesso) {
        const lista = Array.isArray(res.dados) ? res.dados : Object.values(res.dados);
        selectResp.innerHTML = '<option value="">-- quem recebe? --</option>' + 
            lista.map(f => `<option value="${f.id}">${f.nome.toLowerCase()}</option>`).join('');
    }
}

async function pesquisarMaterialTRF(t) {
    const resDiv = document.getElementById('resultados-trf');
    if(t.length < 2) { resDiv.style.display='none'; return; }
    const res = await api.request(`/stock?busca=${t}`);
    if(res.sucesso) {
        const lista = Array.isArray(res.dados) ? res.dados : Object.values(res.dados);
        resDiv.style.display='block';
        resDiv.innerHTML = lista.map(i => `<div class="search-item-row" onclick='addMaterialTRF(${JSON.stringify(i)})'><b>${i.nome.toLowerCase()}</b> (disp: ${i.quantidade_real})</div>`).join('');
    }
}

function addMaterialTRF(i) {
    document.getElementById('resultados-trf').style.display='none';
    if(itensTransferencia.some(x => x.id === i.id)) return;
    itensTransferencia.push({...i, qtd_envio: 1});
    renderGridTRF();
}

function renderGridTRF() {
    const b = document.getElementById('grid-itens-trf');
    b.innerHTML = itensTransferencia.map((i, idx) => `
        <tr>
            <td>${i.nome.toLowerCase()}</td>
            <td><input type="number" class="input-grid" style="background:#fffde7" value="${i.qtd_envio}" onchange="itensTransferencia[${idx}].qtd_envio=this.value"></td>
            <td align="center"><button class="btn-logout" style="padding:2px 8px" onclick="itensTransferencia.splice(${idx},1);renderGridTRF()">×</button></td>
        </tr>`).join('');
}

async function finalizarTRF() {
    const destino = document.getElementById('trf-destino-id').value;
    const responsavel = document.getElementById('trf-responsavel-id').value;
    if(!destino || !responsavel || itensTransferencia.length === 0) return alert("preencha tudo.");
    const res = await api.request('/transferencias', 'POST', {
        materiais: itensTransferencia.map(i => ({id: i.id, quantidade: i.qtd_envio})),
        destino_id: destino,
        autorizado_por: responsavel
    });
    if(res.sucesso) { alert("despachado!"); renderProvincias(); }
}

async function confirmarRecebimentoTRF(id) {
    if(!confirm("confirma recepção?")) return;
    const res = await api.request(`/transferencias/concluir/${id}`, 'PUT', { observacoes_destino: "recebido via web" });
    if(res.sucesso) { alert("actualizado!"); carregarGuiasTransferencia(); }
}

function mudarAbaProvincia(aba) {
    document.querySelectorAll('.btn-tab').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${aba}`).classList.add('active');
    if(aba === 'gestao') carregarGestaoUnidades();
    else carregarGuiasTransferencia();
}

async function imprimirGuiaTRF(codigo) {
    const res = await api.request(`/transferencias/pdf/${codigo}`);
    if (res.sucesso) window.open(res.url, '_blank');
}