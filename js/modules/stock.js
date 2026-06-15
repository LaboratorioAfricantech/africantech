/**
 * js/modules/stock.js - VERSÃO ABSOLUTA FINAL E ESTÁVEL (COMPLETA)
 * Funcionalidades: Filtros Combinados + Stock 0 Unidade + Auditoria Retroativa + Hierarquia + SKU Auto + Excel
 */

let subcategoriaAtual = "Todos";

async function renderStock() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const isAdmin = usuario.tipo_acesso === 'admin';

    // 1. ESTRUTURA DE LAYOUT BLINDADA (Sidebar + Área de Conteúdo)
    main.innerHTML = `
        <div class="stock-wrapper" style="display: flex; flex-direction: row; flex: 1; width: 100%; height: 100%; overflow: hidden;">
            <!-- SIDEBAR DE CATEGORIAS -->
            <aside class="category-sidebar" style="width: 230px; min-width: 230px; background: #fff; border-right: 1px solid #d2d0ce; display: flex; flex-direction: column; flex-shrink: 0;">
                <div class="sidebar-header" style="padding: 15px; font-weight: 800; font-size: 11px; color: #004578; background: #f8f8f8; border-bottom: 1px solid #ddd; text-transform: uppercase;">Categorias</div>
                <ul class="cat-tree" id="lista-categorias-tree" style="list-style: none; overflow-y: auto; flex: 1;">
                    <li class="parent-label active" onclick="setFiltroSubcat('Todos', this)" style="padding: 12px 15px; cursor: pointer; font-size: 12px; border-bottom: 1px solid #f3f2f1;">🌍 todos os materiais</li>
                </ul>
            </aside>

            <!-- ÁREA DE VISUALIZAÇÃO DA DIREITA -->
            <div class="stock-view-area" style="flex: 1; display: flex; flex-direction: column; padding: 20px; overflow: hidden; background: #f3f2f1;">
                <div class="module-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-shrink: 0;">
                    <div>
                        <h2 id="txt-titulo-stock" style="font-size: 20px; font-weight: 700; color: #004578;">inventário de materiais</h2>
                        <p id="info-status" style="font-size:11px; color:var(--text-secondary);">controlo total: filtros combinados e stock real</p>
                    </div>
                    <div class="actions" style="display: flex; gap: 10px;">
                        <button class="btn-primavera" onclick="abrirModalImportacao()">📥 importar excel</button>
                        <button class="btn-primavera" onclick="abrirModalHierarquia()">⚙️ categorias</button>
                        <button class="btn-primary" onclick="abrirModalMaterial()">+ novo material</button>
                    </div>
                </div>

                <div class="filter-bar" style="background: #fff; padding: 10px; border: 1px solid #d2d0ce; margin-bottom: 15px; display: flex; gap: 10px; align-items: center; flex-shrink: 0;">
                    <!-- BUSCA INSTANTÂNEA -->
                    <input type="text" id="search-input" class="input-erp" style="flex: 2;" placeholder="pesquisar material ou sku..." oninput="executarFiltrosCombinados()">
                    
                    <!-- SELECT DE PROVÍNCIAS -->
                    <select id="provincia-filter" class="input-erp" style="flex: 1; ${isAdmin ? '' : 'display:none;'}" onchange="executarFiltrosCombinados()">
                        <option value="GERAL">stock global (sede + unidades)</option>
                    </select>

                    <!-- FILTRO DE DATA -->
                    <div class="input-erp" style="display:flex; align-items:center; gap:8px; flex:1;">
                        <label style="font-size:10px; font-weight:bold; white-space:nowrap;">stock no dia:</label>
                        <input type="date" id="data-auditoria" style="border:none; outline:none; background:transparent; width:100%;" onchange="executarFiltrosCombinados()">
                    </div>
                    
                    <button class="btn-primavera" onclick="renderStock()">🔄 reset</button>
                </div>

                <div class="table-container" id="stock-scroll-area" style="flex: 1; background: #fff; border: 1px solid #d2d0ce; overflow: auto;">
                    <table class="erp-table" id="main-stock-grid" style="width: 100%; border-collapse: collapse; min-width: 900px;">
                        <thead style="position: sticky; top: 0; background: #f8f8f8; z-index: 5;">
                            <tr>
                                <th width="120">sku</th>
                                <th>descrição do material</th>
                                <th width="150">subcategoria</th>
                                <th width="100" align="center">stock actual</th>
                                <th width="120" id="col-retroativa" style="display:none; background:#fff3cd; color:#856404; text-align:center;">saldo no dia</th>
                                <th width="80">unid.</th>
                                <th align="right" width="130" class="admin-only">valor total</th>
                                <th width="60" align="center">acção</th>
                            </tr>
                        </thead>
                        <tbody id="stock-body">
                            <tr><td colspan="8" align="center" style="padding:40px;">a processar...</td></tr>
                        </tbody>
                    </table>
                </div>

                <footer class="erp-footer" style="height: 40px; background: #e6e6e6; border-top: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; flex-shrink: 0;">
                    <div class="stat-box"><label>itens:</label><span id="f-count">0</span></div>
                    <div class="stat-box"><label>qtd total:</label><span id="f-qty">0.00</span></div>
                    <div class="summary-line admin-only"><label>investimento:</label><strong id="f-valor">0,00 mt</strong></div>
                </footer>
            </div>
        </div>
        <div id="container-modais-stock"></div>
    `;

    subcategoriaAtual = "Todos";
    await carregarProvinciasNoFiltro();
    await carregarSidebar();
    
    // Puxa a lista mestre (Global) para servir de base
    const res = await api.request('/stock');
    if(res && res.sucesso) {
        window.dadosStockGlobalBase = res.dados;
        window.fullHistoricoCache = null; 
        await executarFiltrosCombinados();
    }
}

/**
 * MOTOR DE FILTROS COMBINADOS (O Coração do Stock)
 */
async function executarFiltrosCombinados() {
    const termoBusca = document.getElementById('search-input').value.toLowerCase();
    const dataAlvo = document.getElementById('data-auditoria').value;
    const colHead = document.getElementById('col-retroativa');
    const provId = document.getElementById('provincia-filter').value;
    const tbody = document.getElementById('stock-body');

    if (!tbody || !window.dadosStockGlobalBase) return;

    let dadosTrabalho = [...window.dadosStockGlobalBase];

    // A. APLICAR FILTRO DE PROVÍNCIA (Merge para garantir Stock 0)
    if (provId !== 'GERAL') {
        const resP = await api.request(`/relatorios/provincia/${provId}`);
        if (resP && resP.sucesso) {
            dadosTrabalho = dadosTrabalho.map(global => {
                const local = resP.dados.find(p => p.material.trim().toUpperCase() === global.nome.trim().toUpperCase());
                const qtdLocal = local ? parseFloat(local.quantidade) : 0;
                return { ...global, quantidade_real: qtdLocal, valor_total_item: qtdLocal * (parseFloat(global.preco_compra) || 0) };
            });
        }
    }

    // B. APLICAR FILTRO DE DATA (Auditoria Retroativa)
    if (dataAlvo) {
        colHead.style.display = "table-cell";
        if (!window.fullHistoricoCache) {
            const resH = await api.request('/historico');
            window.fullHistoricoCache = resH.dados;
        }

        dadosTrabalho = dadosTrabalho.map(item => {
            let ajuste = 0;
            window.fullHistoricoCache.forEach(m => {
                const dataMov = m.data_movimento.split('T')[0];
                const mesmaUnidade = (provId === 'GERAL') || (Number(m.provincia_id) === Number(provId));
                const mesmoMaterial = (m.material_nome.trim().toUpperCase() === item.nome.trim().toUpperCase());

                if (mesmoMaterial && mesmaUnidade && dataMov > dataAlvo) {
                    const q = parseFloat(m.quantidade);
                    if (m.tipo === 'ENTRADA') ajuste -= q; 
                    else if (m.tipo === 'SAIDA') ajuste += q;
                }
            });
            return { ...item, qtd_retro: parseFloat(item.quantidade_real) + ajuste };
        });
    } else {
        colHead.style.display = "none";
    }

    // C. APLICAR FILTRO DE CATEGORIA (Sidebar)
    if (subcategoriaAtual !== "Todos") {
        dadosTrabalho = dadosTrabalho.filter(i => i.categoria === subcategoriaAtual);
    }

    // D. APLICAR FILTRO DE BUSCA (Texto)
    if (termoBusca) {
        dadosTrabalho = dadosTrabalho.filter(i => 
            i.nome.toLowerCase().includes(termoBusca) || (i.sku && i.sku.toLowerCase().includes(termoBusca))
        );
    }

    // E. RENDERIZAR
    window.dadosStockCache = dadosTrabalho;
    atualizarTabelaHtml(dadosTrabalho, !!dataAlvo);
}

/**
 * RENDERIZAÇÃO DA TABELA
 */
function atualizarTabelaHtml(lista, mostrarRetro = false) {
    const tbody = document.getElementById('stock-body');
    if (!tbody) return;

    const filtrados = lista.filter(i => subcategoriaAtual === "Todos" || i.categoria === subcategoriaAtual);

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" align="center" style="padding:40px; color:#999;">sem registos.</td></tr>`;
        return;
    }

    let sQ = 0; let sV = 0;
    tbody.innerHTML = filtrados.map(i => {
        const qAct = parseFloat(i.quantidade_real || 0);
        const qRet = mostrarRetro ? parseFloat(i.qtd_retro || 0) : 0;
        const preco = parseFloat(i.preco_compra || 0);
        sQ += qAct; sV += (qAct * preco);

        const classeAct = (qAct <= 0) ? 'stock-zero' : '';
        const classeRet = (mostrarRetro && qRet <= 0) ? 'stock-zero' : '';

        return `
            <tr class="${classeAct}">
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><span class="badge" style="background:#e1dfdd; padding: 2px 6px;">${i.sku}</span></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${i.nome.toLowerCase()}</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${i.categoria.toLowerCase()}</td>
                <td align="center" style="padding: 10px; border-bottom: 1px solid #eee; font-weight:bold;">${qAct}</td>
                <td align="center" style="display: ${mostrarRetro ? 'table-cell' : 'none'}; background:#fff3cd; font-weight:800;" class="${classeRet}">${qRet.toFixed(2)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${i.unidade_medida.toLowerCase()}</td>
                <td align="right" class="admin-only" style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${(qAct * preco).toLocaleString('pt-PT', {minimumFractionDigits:2})} mt</strong></td>
                
                <td align="center" style="padding: 10px; border-bottom: 1px solid #eee;">
                    <!-- CORREÇÃO AQUI: Passamos apenas o ID -->
                    <button class="btn-primavera" onclick="abrirTrocaSubcat(${i.id})">edit</button>
                </td>
            </tr>`;
    }).join('');

    document.getElementById('f-count').innerText = lista.length;
    document.getElementById('f-qty').innerText = sQ.toFixed(2);
    const fV = document.getElementById('f-valor');
    if (fV) fV.innerText = sV.toLocaleString('pt-PT', {minimumFractionDigits:2}) + " mt";
}

/**
 * SIDEBAR E CATEGORIAS
 */
async function carregarSidebar() {
    const res = await api.request('/categorias');
    if (!res || !res.sucesso) return;
    window.dadosCategorias = res.dados;
    const tree = document.getElementById('lista-categorias-tree');
    if (!tree) return;
    const pais = res.dados.filter(c => !c.categoria_pai_id);
    pais.forEach(p => {
        const filhos = res.dados.filter(c => c.categoria_pai_id === p.id);
        const li = document.createElement('li');
        li.className = 'parent-cat';
        li.innerHTML = `<div class="parent-label" onclick="toggleSubMenu(this, '${p.nome}')" style="padding: 12px 15px; cursor: pointer; font-size: 12px; border-bottom: 1px solid #f3f2f1; display: flex; justify-content: space-between;">${p.nome.toLowerCase()} ${filhos.length > 0 ? '<span>▸</span>' : ''}</div>
            ${filhos.length > 0 ? `<ul class="sub-menu" style="list-style: none; display: none; background: #fff; border-left: 3px solid #005a9e; margin-left: 10px;">${filhos.map(f => `<li class="parent-label" onclick="setFiltroSubcat('${f.nome}', this)" style="padding: 8px 20px; font-size: 11px; cursor: pointer;">- ${f.nome.toLowerCase()}</li>`).join('')}</ul>` : ''}`;
        tree.appendChild(li);
    });
}

function toggleSubMenu(el, nome) {
    const sub = el.nextElementSibling;
    if (sub) sub.style.display = sub.style.display === 'none' ? 'block' : 'none';
    setFiltroSubcat(nome, el);
}

function setFiltroSubcat(nome, el) {
    subcategoriaAtual = nome;
    document.querySelectorAll('#lista-categorias-tree .parent-label').forEach(label => label.classList.remove('active'));
    if (el) el.classList.contains('parent-label') ? el.classList.add('active') : el.querySelector('.parent-label')?.classList.add('active');
    const titulo = document.getElementById('txt-titulo-stock');
    if (titulo) titulo.innerText = nome === "Todos" ? "inventário de materiais" : nome.toLowerCase();
    executarFiltrosCombinados();
}

/**
 * MODAIS E AUXILIARES
 */
async function carregarProvinciasNoFiltro() {
    const res = await api.request('/provincias');
    const select = document.getElementById('provincia-filter');
    if (res && res.sucesso && select) {
        res.dados.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id; opt.innerText = `unidade: ${p.nome.toLowerCase()}`;
            select.appendChild(opt);
        });
    }
}

async function abrirModalHierarquia() {
    const res = await api.request('/categorias');
    const modalHtml = `<div id="modal-hierarquia" class="modal" style="display:flex; z-index:12000;"><div class="modal-content" style="max-width: 600px; max-height: 85vh; display: flex; flex-direction: column;"><div class="modal-header"><h3>vincular categorias</h3><span onclick="fecharModais()" style="cursor:pointer;">&times;</span></div><div class="modal-body" style="overflow-y: auto; flex: 1;"><table class="erp-table" style="width:100%"><thead style="position: sticky; top: 0; background: #eee; z-index: 10;"><tr><th>categoria</th><th>pai</th></tr></thead><tbody>${res.dados.map(c => `<tr><td style="padding: 8px;">${c.nome.toLowerCase()}</td><td style="padding: 8px;"><select class="input-erp" style="width:100%" onchange="vincularPai(${c.id}, this.value)"><option value="">-- principal --</option>${res.dados.filter(p => p.id !== c.id).map(p => `<option value="${p.id}" ${c.categoria_pai_id == p.id ? 'selected' : ''}>${p.nome.toLowerCase()}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div><div class="modal-footer"><button class="btn-primary" onclick="renderStock()">concluir</button></div></div></div>`;
    document.getElementById('container-modais-stock').innerHTML = modalHtml;
}

async function vincularPai(id, paiId) { await api.request(`/categorias/${id}/vincular`, 'PATCH', { categoria_pai_id: paiId || null }); }

function abrirModalMaterial() {
    const skuAuto = `SKU${Date.now().toString().substring(9)}${Math.floor(Math.random()*900)+100}`;
    
    const modalHtml = `
        <div id="modal-material" class="modal" style="display:flex; z-index:11000;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>REGISTO DE NOVO MATERIAL</h3>
                    <span onclick="fecharModais()" style="cursor:pointer;">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="erp-form-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                        <div style="grid-column: span 2;">
                            <label style="font-size:10px; font-weight:bold;">NOME DO MATERIAL:</label>
                            <input type="text" id="reg-nome" class="input-erp" style="width:100%">
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">SKU:</label>
                            <input type="text" id="reg-sku" class="input-erp" value="${skuAuto}" readonly style="background:#eee">
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">UNIDADE:</label>
                            <input type="text" id="reg-unidade" class="input-erp" placeholder="un, kg, mt">
                        </div>
                        <div style="grid-column: span 2;">
                            <label style="font-size:10px; font-weight:bold;">SUBCATEGORIA:</label>
                            <div style="display:flex; gap:5px;">
                                <select id="reg-categoria" class="input-erp" style="flex:1">
                                    <option value="">-- seleccione --</option>
                                    ${window.dadosCategorias ? window.dadosCategorias.map(c => `<option value="${c.id}">${c.nome.toLowerCase()}</option>`).join('') : ''}
                                </select>
                                <!-- BOTÃO PARA CRIAR CATEGORIA NA HORA -->
                                <button class="btn-primary" onclick="abrirPromptNovaCategoria()" style="width:35px; padding:0;" title="Nova Categoria">+</button>
                            </div>
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">PREÇO COMPRA:</label>
                            <input type="number" id="reg-preco" class="input-erp" value="0">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="gravarMaterialNovo()">gravar material</button>
                </div>
            </div>
        </div>

        <!-- SUB-MODAL RÁPIDO PARA NOVA CATEGORIA -->
        <div id="modal-sub-cat" class="modal" style="z-index:12000; background: rgba(0,0,0,0.3);">
            <div class="modal-content" style="max-width: 300px; margin-top: 10vh;">
                <div class="modal-header"><h4>nova categoria</h4></div>
                <div class="modal-body">
                    <input type="text" id="new-cat-name-quick" class="input-erp" placeholder="nome da categoria..." style="width:100%">
                </div>
                <div class="modal-footer">
                    <button class="btn-primavera" onclick="document.getElementById('modal-sub-cat').style.display='none'">cancelar</button>
                    <button class="btn-primary" onclick="gravarNovaCategoriaRapida()">criar</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('container-modais-stock').innerHTML = modalHtml;
}

function abrirPromptNovaCategoria() {
    document.getElementById('modal-sub-cat').style.display = 'flex';
    document.getElementById('new-cat-name-quick').focus();
}

async function gravarNovaCategoriaRapida() {
    const nome = document.getElementById('new-cat-name-quick').value;
    if (!nome) return;

    const res = await api.request('/categorias', 'POST', { nome: nome.toUpperCase() });
    
    if (res && res.sucesso) {
        // 1. Fecha o sub-modal
        document.getElementById('modal-sub-cat').style.display = 'none';
        
        // 2. Atualiza a lista global de categorias na memória
        const resCat = await api.request('/categorias');
        window.dadosCategorias = resCat.dados;

        // 3. Atualiza o select do formulário de material automaticamente
        const select = document.getElementById('reg-categoria');
        select.innerHTML = '<option value="">-- seleccione --</option>' + 
            window.dadosCategorias.map(c => `<option value="${c.id}">${c.nome.toLowerCase()}</option>`).join('');
        
        // 4. Seleciona a categoria que acabou de ser criada
        select.value = res.dados.id; 

        // 5. Atualiza a sidebar em background
        carregarSidebar();
    } else {
        alert("erro ao criar categoria: " + res.mensagem);
    }
}
async function gravarMaterialNovo() {
    const dados = { nome: document.getElementById('reg-nome').value.toUpperCase(), sku: document.getElementById('reg-sku').value, categoria_id: document.getElementById('reg-categoria').value, unidade_medida: document.getElementById('reg-unidade').value, preco_compra: document.getElementById('reg-preco').value };
    const res = await api.request('/materiais', 'POST', dados);
    if(res.sucesso) { fecharModais(); renderStock(); }
}

function abrirModalImportacao() {
    const modalHtml = `<div id="modal-import" class="modal" style="display:flex;"><div class="modal-content" style="max-width: 600px;"><div class="modal-header"><h3>📥 Importação Excel</h3><span onclick="fecharModais()" style="cursor:pointer;">&times;</span></div><div class="modal-body"><p style="font-size:11px; margin-bottom:15px;">Seleccione o ficheiro .xlsx. Os dados devem iniciar na <b>Linha 4</b>.</p><input type="file" id="file-excel" accept=".xlsx" class="input-erp" style="width: 100%;"></div><div class="modal-footer"><button class="btn-primary" onclick="processarExcel(this)">🚀 Iniciar Carga</button></div></div></div>`;
    document.getElementById('container-modais-stock').innerHTML = modalHtml;
}

async function processarExcel(btn) {
    const file = document.getElementById('file-excel').files[0];
    if(!file) return alert("Seleccione o ficheiro.");
    btn.innerText = "a carregar..."; btn.disabled = true;
    const fd = new FormData(); fd.append('file', file);
    try {
        const response = await fetch(`https://africanstocks-backend-production.up.railway.app/api/v1/importar/materiais`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: fd });
        const data = await response.json();
        if(data.sucesso) { alert("sucesso!"); renderStock(); } else { alert(data.mensagem); }
    } catch (e) { alert("erro na ligação."); } finally { btn.disabled = false; btn.innerText = "Iniciar Carga"; }
}

function abrirTrocaSubcat(id) {
    const item = window.dadosStockCache.find(x => x.id == id);
    if (!item) return;

    const modalHtml = `
        <div id="modal-edit-material" class="modal" style="display:flex; z-index:11000;">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h3>EDITAR MATERIAL</h3>
                    <span onclick="fecharModais()" style="cursor:pointer;">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="field-group" style="margin-bottom:15px;">
                        <label style="font-size:10px; font-weight:bold; color:#666;">NOME DO MATERIAL:</label>
                        <input type="text" id="edit-nome-material" class="input-erp" style="width:100%" value="${item.nome}">
                    </div>

                    <div class="field-group">
                        <label style="font-size:10px; font-weight:bold; color:#666;">CATEGORIA / SUBCATEGORIA:</label>
                        <select id="sel-nova-subcat" class="input-erp" style="width:100%">
                            ${window.dadosCategorias ? window.dadosCategorias.map(c => 
                                `<option value="${c.id}" ${c.nome === item.categoria ? 'selected' : ''}>${c.nome.toLowerCase()}</option>`
                            ).join('') : ''}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primavera" onclick="fecharModais()">cancelar</button>
                    <button class="btn-primary" onclick="salvarEdicaoMaterial(${id})">gravar alterações</button>
                </div>
            </div>
        </div>`;
    
    document.getElementById('container-modais-stock').innerHTML = modalHtml;
}

async function salvarEdicaoMaterial(id) {
    const novoNome = document.getElementById('edit-nome-material').value;
    const novaCatId = document.getElementById('sel-nova-subcat').value;

    if (!novoNome) return alert("O nome não pode estar vazio.");

   
    const res = await api.request(`/stock/${id}/editar`, 'PATCH', { 
        nome: novoNome, 
        categoria_id: novaCatId 
    });
    
    if (res && res.sucesso) {
        fecharModais();
        renderStock();
    } else {
        alert("Erro ao gravar: " + (res ? res.mensagem : "erro de ligação"));
    }
}

function fecharModais() { document.getElementById('container-modais-stock').innerHTML = ''; }
async function carregarDadosStock(url) {
    const res = await api.request(url);
    if (res && res.sucesso) { window.dadosStockGlobalBase = res.dados; executarFiltrosCombinados(); }
}