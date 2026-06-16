/**
 * js/modules/movimentos.js - VERSÃO ABSOLUTA FINAL E COMPLETA
 * Funcionalidades: Filtros Combinados + Lançamento por Modal + Registo de Obra + PDF + Paginação
 */

let itensDocumento = []; 
let paginaAtualHist = 1;
const itensPorPagina = 15;
window.fullHistorico = [];

/**
 * 1. RENDERIZAÇÃO DA TELA PRINCIPAL
 */
async function renderMovimentos() {
    const main = document.getElementById('main-content');
    if (!main) return;

    main.innerHTML = `
        <div class="mov-header-box">
            <div>
                <h2>movimentações de stock e auditoria</h2>
                <p style="font-size: 11px; color: #666;">registo de guias e histórico detalhado de operações</p>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-new-in" onclick="prepararMovimento('ENTRADA')">📥 nova entrada</button>
                <button class="btn-new-out" onclick="prepararMovimento('SAIDA')">📤 nova saída</button>
            </div>
        </div>

        <!-- Área onde a Guia (Card) aparece -->
        <div id="area-lancamento-guia"></div>

        <!-- BARRA DE FILTROS HORIZONTAL CORRIGIDA -->
        <div class="filter-bar-horizontal">
            <div class="filter-group">
                <label>período</label>
                <div style="display:flex; gap:5px; align-items:center;">
                    <input type="date" id="filt-data-inicio" class="input-erp-mini" value="${new Date(new Date().setDate(new Date().getDate()-30)).toISOString().split('T')[0]}">
                    <span style="font-size:10px; color:#999;">até</span>
                    <input type="date" id="filt-data-fim" class="input-erp-mini" value="${new Date().toISOString().split('T')[0]}">
                </div>
            </div>

            <div class="filter-group">
                <label>operação</label>
                <select id="filt-tipo-mov" class="input-erp-mini">
                    <option value="Todos">todos os tipos</option>
                    <option value="ENTRADA">entradas</option>
                    <option value="SAIDA">saídas</option>
                </select>
            </div>

            <div style="display:flex; gap:10px; align-items: flex-end;">
                <button class="btn-primary" onclick="carregarHistoricoAuditado()">filtrar histórico</button>
                <button class="btn-primavera" onclick="imprimirRelatorioHistorico()">exportar pdf</button>
            </div>
        </div>

        <!-- TABELA DE AUDITORIA -->
        <div class="table-container">
            <table class="erp-table">
                <thead>
                    <tr>
                        <th width="140">data / hora</th>
                        <th width="80">tipo</th>
                        <th width="130">guia nº</th>
                        <th>material</th>
                        <th width="60" align="center">qtd</th>
                        <th>obra / destino</th>
                        <th>província</th>
                        <th>operador</th>
                    </tr>
                </thead>
                <tbody id="hist-body">
                    <tr><td colspan="8" align="center" style="padding:40px;">a carregar auditoria...</td></tr>
                </tbody>
            </table>
        </div>

        <footer class="erp-footer">
            <div class="pagination">
                <button class="btn-primavera" onclick="mudarPaginaHist(-1)">anterior</button>
                <span id="page-info" style="margin: 0 10px; font-weight:800;">página 1</span>
                <button class="btn-primavera" onclick="mudarPaginaHist(1)">próxima</button>
            </div>
            <div id="total-registos-hist" style="font-weight:bold; color:var(--primary);">0 movimentos</div>
        </footer>

        <!-- MODAIS AUXILIARES -->
        <div id="modal-container-selecao"></div>
        <div id="modal-obra" class="modal" style="display:none; z-index:15000;">
            <div class="modal-content" style="width:400px;">
                <div class="modal-header"><h3>registar nova obra</h3><span onclick="fecharModalObra()" style="cursor:pointer; font-size:24px;">&times;</span></div>
                <div class="modal-body">
                    <label style="font-size:10px; font-weight:bold; color:#666;">NOME DA OBRA:</label>
                    <input type="text" id="nova-obra-nome" class="input-erp" style="width:100%; margin-bottom:15px;">
                    <label style="font-size:10px; font-weight:bold; color:#666;">CLIENTE:</label>
                    <input type="text" id="nova-obra-cliente" class="input-erp" style="width:100%;">
                </div>
                <div class="modal-footer">
                    <button class="btn-primavera" onclick="fecharModalObra()">cancelar</button>
                    <button class="btn-primary" onclick="salvarNovaObra()">gravar obra</button>
                </div>
            </div>
        </div>
    `;

    carregarHistoricoAuditado();
}

/**
 * 2. PREPARAÇÃO DA GUIA DE LANÇAMENTO (CARD)
 */
async function prepararMovimento(tipo) {
    const area = document.getElementById('area-lancamento-guia');
    itensDocumento = []; 
    
    let colunasHTML = '';
    if (tipo === 'ENTRADA') {
        colunasHTML = `
            <div class="field-group"><label>data da guia:</label><input type="date" id="mov-data" class="input-erp" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="field-group"><label>observações / notas:</label><input type="text" id="mov-obs" class="input-erp" placeholder="ex: fatura, remessa..."></div>
        `;
    } else {
        const resProj = await api.request('/projetos');
        colunasHTML = `
            <div class="field-group"><label>data da guia:</label><input type="date" id="mov-data" class="input-erp" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="field-group"><label>obra / destino:</label>
                <div style="display:flex; gap:5px;">
                    <select id="mov-projeto-id" class="input-erp" style="flex:1">
                        <option value="">-- seleccione a obra --</option>
                        ${resProj.dados ? resProj.dados.map(p => `<option value="${p.id}">${p.nome.toLowerCase()}</option>`).join('') : ''}
                    </select>
                    <button class="btn-primavera" onclick="abrirModalObra()" style="font-weight:bold; width:35px;" title="nova obra">+</button>
                </div>
            </div>
            <div class="field-group"><label>observações / notas:</label><input type="text" id="mov-obs" class="input-erp" placeholder="notas da saída..."></div>
        `;
    }

    area.innerHTML = `
        <div class="form-guia ${tipo.toLowerCase()}">
            <div class="guia-title-bar">
                <h3>guia de ${tipo.toLowerCase()} de material</h3>
                <span onclick="document.getElementById('area-lancamento-guia').innerHTML=''" style="cursor:pointer; font-size:24px;">&times;</span>
            </div>
            
            <div class="guia-metadata-grid">${colunasHTML}</div>

            <div class="search-section" style="background: #f0f7ff; border-bottom: 1px solid #cce3ff; display: flex; justify-content: space-between; align-items: center; padding: 10px 20px;">
                <label style="color:#005a9e; margin:0; font-weight:800;">itens adicionados à guia:</label>
                <button class="btn-primary" onclick="abrirModalSelecaoMaterial()">+ adicionar materiais do stock</button>
            </div>

            <div class="guia-items-scroll-area" style="max-height: 250px; overflow-y: auto; border-bottom: 1px solid #ddd;">
                <table class="guia-items-table">
                    <thead style="position: sticky; top: 0; background: #eee; z-index: 5;">
                        <tr><th width="120">sku</th><th>descrição do material</th><th width="100" align="center">disponível</th><th width="120" align="center">quantidade</th><th width="40"></th></tr>
                    </thead>
                    <tbody id="grid-itens-mov">
                        <tr><td colspan="5" align="center" style="padding:30px; color:#999;">a lista está vazia...</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="guia-footer-actions">
                <button class="btn-primavera" onclick="document.getElementById('area-lancamento-guia').innerHTML=''">cancelar</button>
                <button class="btn-save-guia" onclick="finalizarMovimento('${tipo}')">gravar guia no sistema</button>
            </div>
        </div>
    `;
}

/**
 * 3. SELEÇÃO DE MATERIAL (MODAL TABELA)
 */
async function abrirModalSelecaoMaterial() {
    const container = document.getElementById('modal-container-selecao');
    const res = await api.request('/stock'); 
    if (!res || !res.sucesso) return alert("erro ao carregar stock.");

    container.innerHTML = `
        <div class="modal" style="display:flex; z-index:11000;">
            <div class="modal-content modal-selecao" style="width:900px; max-width:95%;">
                <div class="modal-header"><h3>seleccionar materiais do inventário</h3><span onclick="fecharModalSelecao()" style="cursor:pointer; font-size:24px;">&times;</span></div>
                <div class="filter-bar" style="padding:15px; background:#f9f9f9;">
                    <input type="text" id="busca-ref-modal" class="input-erp" placeholder="pesquisar por nome, sku ou categoria..." style="width:100%; border-color:#0078d4;" oninput="filtrarSelecaoLocal(this.value)">
                </div>
                <div style="max-height: 400px; overflow-y: auto;">
                    <table class="erp-table">
                        <thead style="position:sticky; top:0; z-index:10; background:#eee;">
                            <tr><th width="100">sku</th><th width="200">categoria</th><th>descrição</th><th width="80" align="center">stock</th><th width="60">acção</th></tr>
                        </thead>
                        <tbody id="body-selecao-material">
                            ${res.dados.map(i => `<tr onclick='adicionarItemLinha(${JSON.stringify(i)})'><td><span class="badge">${i.sku}</span></td><td><small>${i.categoria.toLowerCase()}</small></td><td><strong>${i.nome.toLowerCase()}</strong></td><td align="center"><b>${i.quantidade_real}</b></td><td align="center"><button class="btn-primary" style="padding:4px 8px; font-size:10px;">add</button></td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer"><button class="btn-primary" onclick="fecharModalSelecao()">concluir selecção</button></div>
            </div>
        </div>
    `;
    window.dadosSelecaoCache = res.dados;
}

function filtrarSelecaoLocal(termo) {
    const t = termo.toLowerCase();
    const filtrados = window.dadosSelecaoCache.filter(i => i.nome.toLowerCase().includes(t) || i.sku.toLowerCase().includes(t) || i.categoria.toLowerCase().includes(t));
    document.getElementById('body-selecao-material').innerHTML = filtrados.map(i => `<tr onclick='adicionarItemLinha(${JSON.stringify(i)})'><td><span class="badge">${i.sku}</span></td><td><small>${i.categoria.toLowerCase()}</small></td><td><strong>${i.nome.toLowerCase()}</strong></td><td align="center"><b>${i.quantidade_real}</b></td><td align="center"><button class="btn-primary" style="padding:4px 8px; font-size:10px;">add</button></td></tr>`).join('');
}

function adicionarItemLinha(item) {
    if (itensDocumento.some(i => i.id === item.id)) return;
    itensDocumento.push({ ...item, qtd_mov: 1 });
    renderGridItensGuia();
}

function renderGridItensGuia() {
    const tbody = document.getElementById('grid-itens-mov');
    if (!tbody) return;
    tbody.innerHTML = itensDocumento.map((item, index) => `
        <tr>
            <td><span class="badge" style="background:#e1dfdd;">${item.sku}</span></td>
            <td><strong>${item.nome.toLowerCase()}</strong><br><small style="color:#999;">${item.categoria.toLowerCase()}</small></td>
            <td align="center"><b>${item.quantidade_real}</b></td>
            <td align="center"><input type="number" class="input-grid" value="${item.qtd_mov}" onchange="itensDocumento[${index}].qtd_mov = this.value"></td>
            <td align="center"><button class="btn-logout" style="padding:2px 8px" onclick="removerItem(${index})">×</button></td>
        </tr>`).join('');
}

/**
 * 4. LOGICA DE OBRAS, GRAVAÇÃO E PDF
 */
function abrirModalObra() { document.getElementById('modal-obra').style.display = 'flex'; }
function fecharModalObra() { document.getElementById('modal-obra').style.display = 'none'; }
async function salvarNovaObra() {
    const nome = document.getElementById('nova-obra-nome').value;
    const cliente = document.getElementById('nova-obra-cliente').value;
    const user = JSON.parse(localStorage.getItem('usuario'));
    if(!nome) return alert("nome da obra obrigatório.");
    const res = await api.request('/projetos', 'POST', { nome, cliente, provincia_id: user.provincia_id });
    if (res.sucesso) { alert("obra registada!"); fecharModalObra(); prepararMovimento('SAIDA'); }
}

async function finalizarMovimento(tipo) {
    if (itensDocumento.length === 0) return alert("lista vazia.");
    const projId = document.getElementById('mov-projeto-id')?.value;
    if (tipo === 'SAIDA' && !projId) return alert("seleccione a obra destino.");

    const payload = { 
        observacoes: document.getElementById('mov-obs').value, 
        data: document.getElementById('mov-data').value 
    };

    if (tipo === 'ENTRADA') {
        payload.itens = itensDocumento.map(i => ({ material_id: i.id, quantidade: i.qtd_mov }));
        const res = await api.request('/movimentos/entrada', 'POST', payload);
        if (res && res.sucesso) { alert("entrada gravada!"); renderMovimentos(); }
    } else {
        payload.projeto_id = projId;
        payload.codigo_guia = `WEB-${Date.now()}`;
        payload.materiais = itensDocumento.map(i => ({ id: i.id, quantidade: i.qtd_mov }));
        const res = await api.request('/movimentos/saida', 'POST', payload);
        if (res && res.sucesso) { alert("saída gravada!"); renderMovimentos(); }
    }
}

async function carregarHistoricoAuditado() {
    const tbody = document.getElementById('hist-body');
    const inicio = document.getElementById('filt-data-inicio').value;
    const fim = document.getElementById('filt-data-fim').value;
    const tipoFiltro = document.getElementById('filt-tipo-mov').value;
    if (!tbody) return;

    const res = await api.request(`/historico`); 
    if (res && res.sucesso) {
        window.fullHistorico = res.dados.filter(m => {
            const dataM = m.data_movimento.split('T')[0];
            const matchData = dataM >= inicio && dataM <= fim;
            const matchTipo = (tipoFiltro === "Todos") || (m.tipo.toUpperCase() === tipoFiltro.toUpperCase());
            return matchData && matchTipo;
        });
        paginaAtualHist = 1;
        exibirPaginaHist();
    }
}

function exibirPaginaHist() {
    const tbody = document.getElementById('hist-body');
    const start = (paginaAtualHist - 1) * itensPorPagina;
    const listaPagina = window.fullHistorico.slice(start, start + itensPorPagina);

    document.getElementById('page-info').innerText = `página ${paginaAtualHist}`;
    document.getElementById('total-registos-hist').innerText = `${window.fullHistorico.length} movimentos encontrados`;

    if (listaPagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" align="center" style="padding:20px;">nenhum registo.</td></tr>`;
        return;
    }

    tbody.innerHTML = listaPagina.map(m => `
        <tr class="${m.tipo === 'ENTRADA' ? 'status-green' : 'status-red'}">
            <td style="color:#666; font-size:11px;">${new Date(m.data_movimento).toLocaleString()}</td>
            <td><span class="badge ${m.tipo === 'ENTRADA' ? 'status-green' : 'status-red'}" style="width:70px; text-align:center;">${m.tipo.toLowerCase()}</span></td>
            <td><small><b>${m.codigo_guia || '---'}</b></small></td>
            <td><strong>${m.material_nome.toLowerCase()}</strong></td>
            <td align="center"><b>${parseFloat(m.quantidade).toFixed(2)}</b></td>
            <td>${m.projeto_nome ? m.projeto_nome.toLowerCase() : '---'}</td>
            <td>${m.provincia_nome ? m.provincia_nome.toLowerCase() : '---'}</td>
            <td>${m.funcionario_nome.toLowerCase()}</td>
        </tr>`).join('');
}

function mudarPaginaHist(dir) {
    const total = Math.ceil(window.fullHistorico.length / itensPorPagina);
    const nova = paginaAtualHist + dir;
    if (nova > 0 && nova <= total) { paginaAtualHist = nova; exibirPaginaHist(); }
}

async function imprimirRelatorioHistorico() {
    const inicio = document.getElementById('filt-data-inicio').value;
    const fim = document.getElementById('filt-data-fim').value;
    const tipo = document.getElementById('filt-tipo-mov').value;
    const token = localStorage.getItem('token');
    window.open(`https://africanstocks-backend-production.up.railway.app/api/v1/relatorios/pdf-historico?inicio=${inicio}&fim=${fim}&tipo=${tipo}&token=${token}`, '_blank');
}

function removerItem(i) { itensDocumento.splice(i, 1); renderGridItensGuia(); }
function fecharModalSelecao() { document.getElementById('modal-container-selecao').innerHTML = ''; }