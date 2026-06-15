/**
 * js/modules/projetos.js
 * MÓDULO DE GESTÃO DE OBRAS, CONSUMO E EQUIPAS (ESTILO INDUSTRIAL)
 */

async function renderProvincias() {
    // Redireciona para a função correta caso o nome no main.js seja diferente
    if (typeof renderProjetos === 'function') await renderProjetos();
}

async function renderProjetos() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const isAdmin = usuario.tipo_acesso === 'admin';

    // 1. ESTRUTURA CABEÇALHO + FILTROS (HORIZONTAL)
    main.innerHTML = `
        <div class="module-header">
            <div>
                <h2>gestão de obras e projectos</h2>
                <p style="font-size:11px; color:#666;">controlo de execução, consumo de material e equipas técnicas</p>
            </div>
            <div class="actions">
                <button class="btn-primary" onclick="abrirModalProjeto()">+ registar nova obra</button>
            </div>
        </div>

        <!-- BARRA DE FILTROS ORGANIZADA -->
        <div class="projetos-filter-bar">
            <input type="text" id="search-projeto" class="input-erp" placeholder="pesquisar por nome da obra ou cliente..." onkeyup="filtrarProjetosLocal()">
            
            <select id="filtro-status-projeto" class="input-erp" onchange="filtrarProjetosLocal()">
                <option value="Todos">todos os estados</option>
                <option value="PLANEADO">planeado</option>
                <option value="EM_CURSO">em curso</option>
                <option value="CONCLUIDO">concluído</option>
            </select>

            <button class="btn-primavera" onclick="renderProjetos()">🔄 actualizar dados</button>
        </div>

        <!-- GRELHA DE PROJECTOS (CARDS) -->
        <div id="projetos-grid" class="projetos-grid">
            <div class="loading">a carregar lista de projectos...</div>
        </div>

        <!-- MODAL: DETALHES DA OBRA (MATERIAIS E EQUIPA) -->
        <div id="modal-detalhe-projeto" class="modal">
            <div class="modal-content" style="width: 850px; max-width: 95%;">
                <div class="modal-header">
                    <h3 id="detalhe-nome-projeto">detalhes da obra</h3>
                    <span style="cursor:pointer; font-size:24px;" onclick="fecharModalDetalhe()">&times;</span>
                </div>
                <div class="modal-body" id="detalhe-projeto-body" style="max-height:70vh; overflow-y:auto;">
                    <!-- Conteúdo injetado via JS -->
                </div>
            </div>
        </div>

        <!-- MODAL: CADASTRAR OBRA -->
        <div id="modal-novo-projeto" class="modal">
            <div class="modal-content" style="width: 450px;">
                <div class="modal-header">
                    <h3>registar nova obra</h3>
                    <span style="cursor:pointer; font-size:20px;" onclick="fecharModaisProjetos()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="field-group" style="margin-bottom:15px;">
                        <label style="font-size:10px; font-weight:bold; color:#666;">NOME DO PROJECTO / OBRA:</label>
                        <input type="text" id="reg-p-nome" class="input-erp" style="width:100%">
                    </div>
                    
                    <div class="field-group" style="margin-bottom:15px;">
                        <label style="font-size:10px; font-weight:bold; color:#666;">CLIENTE:</label>
                        <input type="text" id="reg-p-cliente" class="input-erp" style="width:100%">
                    </div>
                    
                    <div class="field-group">
                        <label style="font-size:10px; font-weight:bold; color:#666;">UNIDADE PROVINCIAL RESPONSÁVEL:</label>
                        <select id="reg-p-provincia" class="input-erp" style="width:100%"></select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primavera" onclick="fecharModaisProjetos()">cancelar</button>
                    <button class="btn-primary" onclick="salvarNovoProjeto()">gravar obra</button>
                </div>
            </div>
        </div>
    `;

    // Inicialização de dados
    await carregarProvinciasProjeto();
    await buscarListaProjetos();
}

/**
 * BUSCA LISTA DE OBRAS DO BACKEND
 */
async function buscarListaProjetos() {
    const res = await api.request('/projetos');
    const grid = document.getElementById('projetos-grid');
    if (!grid) return;

    if (res && res.sucesso) {
        window.dadosProjetosCache = res.dados;
        renderizarCardsProjetos(res.dados);
    } else {
        grid.innerHTML = `<div style="padding:40px; text-align:center; color:red;">erro ao carregar obras.</div>`;
    }
}

/**
 * DESENHA OS CARDS NA GRELHA
 */
function renderizarCardsProjetos(lista) {
    const grid = document.getElementById('projetos-grid');
    if (!grid) return;

    if (!lista || lista.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:50px; color:#999;">nenhuma obra encontrada para os filtros aplicados.</div>`;
        return;
    }

    grid.innerHTML = lista.map(p => {
        const progresso = p.progresso || 0;
        let corStatus = '#0078d4'; // EM_CURSO
        if (p.status === 'CONCLUIDO') corStatus = '#107c10';
        if (p.status === 'PLANEADO') corStatus = '#666';

        return `
            <div class="projeto-card" onclick="verDetalhesObra(${p.id})">
                <div class="status-badge-card" style="background: ${corStatus}">${p.status.toLowerCase()}</div>
                <h3>${p.nome.toLowerCase()}</h3>
                <p>cliente: ${p.cliente ? p.cliente.toLowerCase() : 'cliente geral'}</p>
                
                <div class="progress-container">
                    <div class="progress-bar" style="width: ${progresso}%; background: ${corStatus}"></div>
                </div>
                <div class="progress-text">
                    <span>estado de execução</span>
                    <strong>${progresso}%</strong>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * DETALHES DA OBRA (MODAL)
 */
async function verDetalhesObra(id) {
    const res = await api.request(`/projetos/detalhes/${id}`);
    const modal = document.getElementById('modal-detalhe-projeto');
    const body = document.getElementById('detalhe-projeto-body');

    if (res && res.sucesso) {
        const { info, equipa, materiais } = res.dados;
        document.getElementById('detalhe-nome-projeto').innerText = `obra: ${info.nome.toLowerCase()}`;
        
        body.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:25px;">
                <!-- COLUNA 1: GESTÃO E MATERIAIS -->
                <div>
                    <div style="background:#f9f9f9; padding:15px; border:1px solid #ddd; margin-bottom:20px;">
                        <h4 style="font-size:11px; font-weight:800; margin-bottom:10px; color:#005a9e;">ACTUALIZAR PROGRESSO</h4>
                        <div style="display:flex; gap:10px; align-items:center;">
                            <select id="edit-p-status" class="input-erp" style="flex:1">
                                <option value="PLANEADO" ${info.status === 'PLANEADO' ? 'selected' : ''}>planeado</option>
                                <option value="EM_CURSO" ${info.status === 'EM_CURSO' ? 'selected' : ''}>em curso</option>
                                <option value="CONCLUIDO" ${info.status === 'CONCLUIDO' ? 'selected' : ''}>concluído</option>
                            </select>
                            <input type="number" id="edit-p-progresso" class="input-erp" style="width:70px;" value="${info.progresso}" min="0" max="100">
                            <button class="btn-primary" onclick="actualizarObra(${info.id})">ok</button>
                        </div>
                    </div>

                    <h4 style="font-size:11px; font-weight:800; margin-bottom:10px;">MATERIAIS CONSUMIDOS / ALOCADOS</h4>
                    <table class="erp-table">
                        <thead>
                            <tr><th>material</th><th width="80" align="center">total</th></tr>
                        </thead>
                        <tbody>
                            ${materiais && materiais.length > 0 ? materiais.map(m => `
                                <tr>
                                    <td>${m.nome.toLowerCase()}</td>
                                    <td align="center"><b>${m.total}</b> <small>${m.unidade_medida}</small></td>
                                </tr>`).join('') : '<tr><td colspan="2" align="center" style="padding:15px; color:#999;">sem materiais registados.</td></tr>'}
                        </tbody>
                    </table>
                </div>

                <!-- COLUNA 2: EQUIPA TÉCNICA -->
                <div>
                    <h4 style="font-size:11px; font-weight:800; margin-bottom:10px;">EQUIPA TÉCNICA ESCALADA</h4>
                    <table class="erp-table">
                        <thead>
                            <tr><th>técnico</th><th>função</th><th width="100">presença</th></tr>
                        </thead>
                        <tbody>
                            ${equipa && equipa.length > 0 ? equipa.map(f => `
                                <tr>
                                    <td><strong>${f.nome.toLowerCase()}</strong></td>
                                    <td><small>${f.funcao.toLowerCase()}</small></td>
                                    <td><span class="badge" style="background:#e1dfdd;">${f.status_presenca.toLowerCase()}</span></td>
                                </tr>`).join('') : '<tr><td colspan="3" align="center" style="padding:15px; color:#999;">nenhum técnico alocado.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    }
}

/**
 * FILTRAGEM LOCAL INSTANTÂNEA
 */
function filtrarProjetosLocal() {
    const termo = document.getElementById('search-projeto').value.toLowerCase();
    const status = document.getElementById('filtro-status-projeto').value;
    
    if (!window.dadosProjetosCache) return;

    const filtrados = window.dadosProjetosCache.filter(p => {
        const matchTexto = p.nome.toLowerCase().includes(termo) || (p.cliente && p.cliente.toLowerCase().includes(termo));
        const matchStatus = status === "Todos" || p.status === status;
        return matchTexto && matchStatus;
    });
    renderizarCardsProjetos(filtrados);
}

/**
 * AUXILIARES E GRAVAÇÃO
 */
async function carregarProvinciasProjeto() {
    const res = await api.request('/provincias');
    const sel = document.getElementById('reg-p-provincia');
    if (res && res.sucesso && sel) {
        sel.innerHTML = res.dados.map(p => `<option value="${p.id}">${p.nome.toLowerCase()}</option>`).join('');
    }
}

async function actualizarObra(id) {
    const status = document.getElementById('edit-p-status').value;
    const progresso = document.getElementById('edit-p-progresso').value;
    const res = await api.request(`/projetos/${id}`, 'PUT', { status, progresso });
    if (res && res.sucesso) {
        alert("obra actualizada com sucesso!");
        fecharModalDetalhe();
        buscarListaProjetos();
    }
}

async function salvarNovoProjeto() {
    const nome = document.getElementById('reg-p-nome').value;
    const cliente = document.getElementById('reg-p-cliente').value;
    const provincia_id = document.getElementById('reg-p-provincia').value;

    if(!nome) return alert("o nome da obra é obrigatório.");

    const res = await api.request('/projetos', 'POST', { nome, cliente, provincia_id });
    if(res && res.sucesso) {
        alert("obra registada com sucesso!");
        fecharModaisProjetos();
        buscarListaProjetos();
    }
}

function abrirModalProjeto() { document.getElementById('modal-novo-projeto').style.display = 'flex'; }
function fecharModalDetalhe() { document.getElementById('modal-detalhe-projeto').style.display = 'none'; }
function fecharModaisProjetos() { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }