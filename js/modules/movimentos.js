// js/modules/movimentos.js

let itensDocumento = []; 
let paginaAtualHist = 1;
const itensPorPagina = 15;
window.fullHistorico = [];

/**
 * FUNÇÃO PRINCIPAL: Renderiza a tela de Movimentações e Auditoria
 */
async function renderMovimentos() {
    const main = document.getElementById('main-content');
    itensDocumento = []; 
    paginaAtualHist = 1;

    main.innerHTML = `
        <div class="module-header" style="flex-shrink: 0;">
            <div>
                <h2>movimentações de stock e auditoria</h2>
                <p style="font-size:11px; color:var(--text-secondary);">registo de guias e histórico detalhado de operações</p>
            </div>
            <div class="actions">
                <button class="btn-primary" style="background:#107c10;" onclick="prepararMovimento('ENTRADA')">nova entrada</button>
                <button class="btn-primary" style="background:#a4262c;" onclick="prepararMovimento('SAIDA')">nova saída</button>
            </div>
        </div>

        <!-- ÁREA DE LANÇAMENTO (Fica vazia até clicar em nova entrada/saída) -->
        <div id="area-operacao"></div>

        <!-- BARRA DE FILTROS PARA AUDITORIA HISTÓRICA -->
        <div class="filter-bar" style="margin-top: 20px; flex-shrink: 0; background: #eee; border-top: 2px solid var(--primary);">
            <div style="display:flex; align-items:center; gap:10px; flex:1.5;">
                <label style="font-size:10px; font-weight:bold;">período:</label>
                <input type="date" id="filt-data-inicio" class="input-erp" value="${new Date(new Date().setDate(new Date().getDate()-7)).toISOString().split('T')[0]}">
                <span>até</span>
                <input type="date" id="filt-data-fim" class="input-erp" value="${new Date().toISOString().split('T')[0]}">
            </div>

            <select id="filt-tipo-mov" class="input-erp" style="flex: 0.5;">
                <option value="Todos">todos os tipos</option>
                <option value="ENTRADA">entradas</option>
                <option value="SAIDA">saídas</option>
            </select>

            <button class="btn-primary" onclick="carregarHistoricoAuditado()"> filtrar histórico</button>
            <button class="btn-primavera" onclick="imprimirRelatorioHistorico()">exportar pdf</button>
        </div>

        <!-- TABELA DE HISTÓRICO COM SCROLL INTERNO -->
        <div class="table-container" style="flex: 1; border-top:none;">
            <table class="erp-table">
                <thead style="position: sticky; top: 0; z-index: 5;">
                    <tr>
                        <th width="140">data / hora</th>
                        <th width="100">tipo</th>
                        <th width="120">guia nº</th>
                        <th>material</th>
                        <th width="80">qtd</th>
                        <th>obra / destino</th>
                        <th>província</th>
                        <th>operador</th>
                    </tr>
                </thead>
                <tbody id="hist-body">
                    <tr><td colspan="8" align="center" style="padding:20px;">a carregar histórico...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- RODAPÉ DE PAGINAÇÃO -->
        <footer class="erp-footer" style="height: 40px; background: #f8f8f8;">
            <div style="display:flex; gap:10px; align-items:center;">
                <button class="btn-primavera" onclick="mudarPaginaHist(-1)">anterior</button>
                <span id="page-info" style="font-weight:bold; font-size:12px;">página 1</span>
                <button class="btn-primavera" onclick="mudarPaginaHist(1)">próxima</button>
            </div>
            <div id="total-registos-hist" style="font-size:11px; color:#666;">0 movimentos encontrados</div>
        </footer>

        <!-- MODAL PARA NOVA OBRA -->
        <div id="modal-obra" class="modal">
            <div class="modal-content" style="width:400px;">
                <div class="modal-header"><h3>registar nova obra</h3><span onclick="fecharModalObra()" style="cursor:pointer">&times;</span></div>
                <div class="modal-body">
                    <label>nome da obra:</label>
                    <input type="text" id="nova-obra-nome" class="input-erp" style="width:100%; margin-bottom:10px;">
                    <label>cliente:</label>
                    <input type="text" id="nova-obra-cliente" class="input-erp" style="width:100%;">
                </div>
                <div class="modal-footer">
                    <button class="btn-primavera" onclick="fecharModalObra()">cancelar</button>
                    <button class="btn-primary" onclick="salvarNovaObra()">gravar obra</button>
                </div>
            </div>
        </div>
    `;
setTimeout(() => {
    carregarHistoricoAuditado();
}, 200);
}

/**
 * PREPARA O FORMULÁRIO DE ENTRADA OU SAÍDA
 */
async function prepararMovimento(tipo) {
    const area = document.getElementById('area-operacao');
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    itensDocumento = []; 

    let htmlProjetos = '';
    if (tipo === 'SAIDA') {
        const resProj = await api.request('/projetos');
        htmlProjetos = `
            <div style="flex:1">
                <label style="font-size:10px; font-weight:bold;">obra / destino:</label>
                <div style="display:flex; gap:5px;">
                    <select id="mov-projeto-id" class="input-erp" style="flex:1">
                        <option value="">-- seleccione a obra --</option>
                        ${resProj.dados.map(p => `<option value="${p.id}">${p.nome.toLowerCase()}</option>`).join('')}
                    </select>
                    <button class="btn-primavera" onclick="abrirModalObra()" title="nova obra">+</button>
                </div>
            </div>
        `;
    }

    area.innerHTML = `
        <div class="primavera-card" style="border-top: 4px solid ${tipo === 'ENTRADA' ? '#107c10' : '#a4262c'}; margin-bottom:15px; animation: slideIn 0.3s;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0;">GUIA DE ${tipo}</h3>
                <button onclick="document.getElementById('area-operacao').innerHTML=''" style="border:none; background:none; cursor:pointer;">✖</button>
            </div>

            <div class="filter-bar" style="border:none; padding:0; margin-bottom:15px; gap:10px; background:transparent;">
                <div style="flex:0.8">
                    <label style="font-size:10px; font-weight:bold;">data:</label>
                    <input type="date" id="mov-data" class="input-erp" style="width:100%" value="${new Date().toISOString().split('T')[0]}">
                </div>
                ${htmlProjetos}
                <div style="flex:2">
                    <label style="font-size:10px; font-weight:bold;">observações:</label>
                    <input type="text" id="mov-obs" class="input-erp" style="width:100%" placeholder="notas da guia...">
                </div>
            </div>

            <!-- BUSCA INTELIGENTE -->
            <div style="position: relative; background:#f0f7ff; padding:10px; border:1px solid #c7e0f4; margin-bottom:10px;">
                <label style="font-weight:bold; color:var(--primary); font-size:11px;">PESQUISAR MATERIAL PARA ADICIONAR:</label>
                <input type="text" id="busca-material-mov" class="input-erp" style="width:100%; border-color:#0078d4;" 
                       placeholder="digite nome ou marca..." onkeyup="pesquisarMaterialParaAdicionar(this.value)">
                <div id="resultados-pesquisa-mov" class="search-results-box"></div>
            </div>

            <!-- GRELHA DE LANÇAMENTO -->
            <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; background:white;">
                <table class="erp-table">
                    <thead style="position: sticky; top: 0; z-index: 5;">
                        <tr style="background:#eee;">
                            <th width="100">sku</th>
                            <th>descrição</th>
                            <th width="80">actual</th>
                            <th width="100">quantidade</th>
                            <th width="40"></th>
                        </tr>
                    </thead>
                    <tbody id="grid-itens-mov">
                        <tr><td colspan="5" align="center" style="padding:20px; color:#999;">adicione itens acima...</td></tr>
                    </tbody>
                </table>
            </div>

            <div style="margin-top:15px; text-align:right;">
                <button class="btn-primavera" onclick="document.getElementById('area-operacao').innerHTML=''">cancelar</button>
                <button class="btn-primary" style="background:${tipo === 'ENTRADA' ? '#107c10' : '#0078d4'};" onclick="finalizarMovimento('${tipo}')">Gravar</button>
            </div>
        </div>
    `;
}

// --- LÓGICA DE BUSCA E ADIÇÃO ---
async function pesquisarMaterialParaAdicionar(termo) {
    const resDiv = document.getElementById('resultados-pesquisa-mov');
    if (termo.length < 2) { resDiv.style.display = 'none'; return; }

    const res = await api.request(`/stock?busca=${termo}`);
    if (res.sucesso && res.dados.length > 0) {
        resDiv.style.display = 'block';
        resDiv.innerHTML = res.dados.map(item => `
            <div class="search-item-row" onclick='adicionarItemLinha(${JSON.stringify(item)})'>
                <div><b>${item.nome.toLowerCase()}</b></div>
                <div style="font-size:10px; color:#666;">SKU: ${item.sku} | STOCK: ${item.quantidade_real} ${item.unidade_medida}</div>
            </div>
        `).join('');
    }
}

function adicionarItemLinha(item) {
    document.getElementById('resultados-pesquisa-mov').style.display = 'none';
    document.getElementById('busca-material-mov').value = '';
    if (itensDocumento.some(i => i.id === item.id)) return;
    itensDocumento.push({ ...item, qtd_mov: 1 });
    renderizarGrelhaItens();
}

function renderizarGrelhaItens() {
    const tbody = document.getElementById('grid-itens-mov');
    if (itensDocumento.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" align="center" style="padding:20px; color:#999;">adicione itens acima...</td></tr>`;
        return;
    }
    tbody.innerHTML = itensDocumento.map((item, index) => `
        <tr>
            <td><span class="badge">${item.sku}</span></td>
            <td>${item.nome.toLowerCase()}</td>
            <td align="center">${item.quantidade_real}</td>
            <td><input type="number" class="input-grid" style="background:#fffde7; text-align:center; font-weight:bold;" value="${item.qtd_mov}" onchange="itensDocumento[${index}].qtd_mov = this.value"></td>
            <td><button class="btn-logout" style="padding:2px 5px;" onclick="removerItem(${index})">×</button></td>
        </tr>
    `).join('');
}

function removerItem(i) { itensDocumento.splice(i, 1); renderizarGrelhaItens(); }

/**
 * GRAVAÇÃO NO BACKEND
 */
async function finalizarMovimento(tipo) {
    if (itensDocumento.length === 0) return alert("lista vazia.");
    const projId = document.getElementById('mov-projeto-id')?.value;
    if (tipo === 'SAIDA' && !projId) return alert("seleccione a obra destino.");

    const payload = {
        observacoes: document.getElementById('mov-obs').value,
        data: document.getElementById('mov-data').value,
    };

    let res;
    if (tipo === 'ENTRADA') {
        payload.itens = itensDocumento.map(i => ({ material_id: i.id, quantidade: i.qtd_mov }));
        res = await api.request('/movimentos/entrada', 'POST', payload);
    } else {
        payload.projeto_id = projId;
        payload.codigo_guia = `WEB-${Date.now()}`;
        payload.materiais = itensDocumento.map(i => ({ id: i.id, quantidade: i.qtd_mov }));
        res = await api.request('/movimentos/saida', 'POST', payload);
    }

    if (res.sucesso) {
        alert("movimentação gravada com sucesso!");
        renderMovimentos(); 
    } else {
        alert("erro: " + res.mensagem);
    }
}

/**
 * AUDITORIA E HISTÓRICO
 */// DENTRO DE movimentos.js

async function carregarHistoricoAuditado() {
    // 1. SEGURANÇA: Verificar se os elementos existem antes de começar
    const inicioFld = document.getElementById('filt-data-inicio');
    const fimFld = document.getElementById('filt-data-fim');
    const tipoFld = document.getElementById('filt-tipo-mov');
    const tbody = document.getElementById('hist-body');

    // Se qualquer um for null, sai da função silenciosamente para não quebrar o sistema
    if (!inicioFld || !fimFld || !tipoFld || !tbody) {
        console.warn("Aguardando renderização do DOM para carregar histórico...");
        return; 
    }

    const inicio = inicioFld.value;
    const fim = fimFld.value;
    const tipo = tipoFld.value;

    tbody.innerHTML = `<tr><td colspan="8" align="center" style="padding:20px;">a processar auditoria...</td></tr>`;

    const res = await api.request(`/historico`); 
    if (res.sucesso) {
        window.fullHistorico = res.dados.filter(m => {
            const dataM = m.data_movimento.split('T')[0];
            const matchData = dataM >= inicio && dataM <= fim;
            const matchTipo = tipo === "Todos" || m.tipo === tipo;
            return matchData && matchTipo;
        });
        paginaAtualHist = 1;
        exibirPaginaHist();
    }
}

// E na função de exibir a página, faça o mesmo:
function exibirPaginaHist() {
    const tbody = document.getElementById('hist-body');
    const pageInfo = document.getElementById('page-info');
    const totalReg = document.getElementById('total-registos-hist');

    // PROTEÇÃO contra null
    if (!tbody || !pageInfo || !totalReg) return;

    const start = (paginaAtualHist - 1) * itensPorPagina;
    const end = start + itensPorPagina;
    const listaPagina = window.fullHistorico.slice(start, end);

    pageInfo.innerText = `página ${paginaAtualHist}`;
    totalReg.innerText = `${window.fullHistorico.length} movimentos encontrados`;

    if (listaPagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" align="center">sem registos.</td></tr>`;
        return;
    }

    tbody.innerHTML = listaPagina.map(m => `
        <tr>
            <td style="font-size:10px;">${new Date(m.data_movimento).toLocaleString()}</td>
            <td><span class="badge ${m.tipo === 'ENTRADA' ? 'status-green' : 'status-red'}">${m.tipo}</span></td>
            <td><small>${m.codigo_guia || '---'}</small></td>
            <td><strong>${m.material_nome.toLowerCase()}</strong></td>
            <td align="center"><b>${m.quantidade}</b></td>
            <td><small>${m.projeto_nome || '---'}</small></td>
            <td> ${m.provincia_nome.toLowerCase()}</td>
            <td>${m.funcionario_nome.toLowerCase()}</td>
        </tr>
    `).join('');
}

function mudarPaginaHist(dir) {
    const novaPag = paginaAtualHist + dir;
    if (novaPag > 0 && (novaPag - 1) * itensPorPagina < window.fullHistorico.length) {
        paginaAtualHist = novaPag;
        exibirPaginaHist();
    }
}

async function imprimirRelatorioHistorico() {
    const inicio = document.getElementById('filt-data-inicio').value;
    const fim = document.getElementById('filt-data-fim').value;
    const tipo = document.getElementById('filt-tipo-mov').value;
    const res = await api.request(`/relatorios/pdf-historico?inicio=${inicio}&fim=${fim}&tipo=${tipo}`);
    if (res.sucesso) window.open(res.url, '_blank');
}

// Auxiliares de Obras
function abrirModalObra() { document.getElementById('modal-obra').style.display = 'block'; }
function fecharModalObra() { document.getElementById('modal-obra').style.display = 'none'; }
async function salvarNovaObra() {
    const nome = document.getElementById('nova-obra-nome').value;
    const cliente = document.getElementById('nova-obra-cliente').value;
    const user = JSON.parse(localStorage.getItem('usuario'));
    const res = await api.request('/projetos', 'POST', { nome, cliente, provincia_id: user.provincia_id });
    if (res.sucesso) { alert("obra registada!"); fecharModalObra(); prepararMovimento('SAIDA'); }
}