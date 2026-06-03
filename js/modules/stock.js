/**
 * js/modules/stock.js
 * MÓDULO DE GESTÃO DE INVENTÁRIO (VERSÃO TOTALMENTE RESPONSIVA)
 */

async function renderStock() {
    const main = document.getElementById('main-content');
    if (!main) return;

    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const isAdmin = usuario.tipo_acesso === 'admin';

    main.innerHTML = `
        <div class="module-header" style="flex-shrink: 0;">
            <div>
                <h2>inventário e auditoria de stock</h2>
                <p id="info-status" style="font-size:11px; color:var(--text-secondary);">controlo de existências em tempo real</p>
            </div>
            <div class="actions">
                <button class="btn-primary" onclick="abrirModalMaterial()">+ cadastrar material</button>
            </div>
        </div>

        <div class="filter-bar" style="flex-shrink: 0;">
            <input type="text" id="search-input" class="input-erp" style="flex: 2;" placeholder="pesquisar material ou sku..." onkeyup="filtrarTabelaLocal()">
            <select id="categoria-filter" class="input-erp" style="flex: 1;" onchange="filtrarTabelaLocal()">
                <option value="Todos">todas as categorias</option>
            </select>
            <select id="provincia-filter" class="input-erp" style="flex: 1; ${isAdmin ? '' : 'display:none;'}" onchange="trocarUnidadeFisica()">
                <option value="GERAL">stock geral (geral)</option>
            </select>
            <div class="input-erp" style="display:flex; align-items:center; gap:8px; flex:1;">
                <label style="font-size:10px; font-weight:bold; white-space:nowrap;">dia:</label>
                <input type="date" id="data-auditoria" style="border:none; outline:none; background:transparent; width:100%;" onchange="processarAuditoriaData()">
            </div>
            <button class="btn-primavera" onclick="renderStock()">🔄 reset</button>
        </div>

        <div class="table-container" id="stock-scroll-area">
            <table class="erp-table" id="main-stock-grid">
                <thead>
                    <tr>
                        <th width="100">sku <div class="resizer"></div></th>
                        <th>descrição do material <div class="resizer"></div></th>
                        <th width="150">categoria <div class="resizer"></div></th>
                        <th width="100">stock atual <div class="resizer"></div></th>
                        <th width="120" id="col-retroativa" style="display:none; background:#fff3cd;">saldo no dia <div class="resizer"></div></th>
                        <th width="80">unid. <div class="resizer"></div></th>
                        <th align="right" width="150">valor total <div class="resizer"></div></th>
                    </tr>
                </thead>
                <tbody id="stock-body">
                    <tr><td colspan="7" align="center">a carregar dados...</td></tr>
                </tbody>
            </table>
        </div>

        <footer class="erp-footer">
            <div class="footer-section">
                <div class="stat-box"><label>artigos:</label><span id="footer-count">0</span></div>
                <div style="border-left: 1px solid #ccc; height: 20px; margin: 0 10px;"></div>
                <div class="stat-box"><label>qtd total:</label><span id="footer-qty">0.00</span></div>
            </div>
            <div class="summary-line"><label>total:</label><strong id="footer-total-valor">0,00 mt</strong></div>
        </footer>

        <!-- MODAL DE CADASTRO (RESPONSIVO) -->
        <div id="modal-material" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>registo de material</h3>
                    <span style="cursor:pointer; font-size:24px;" onclick="fecharModalMaterial()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="erp-form-grid">
                        <div class="full-width">
                            <label style="font-size:10px; font-weight:bold;">nome do material:</label>
                            <input type="text" id="reg-nome" class="input-erp" style="width:100%" placeholder="nome completo">
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">sku (auto):</label>
                            <input type="text" id="reg-sku" class="input-erp" style="width:100%; background:#f5f5f5;" readonly>
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">unidade:</label>
                            <input type="text" id="reg-unidade" class="input-erp" placeholder="un, kg, mt" style="width:100%">
                        </div>
                        <div class="full-width">
                            <label style="font-size:10px; font-weight:bold;">categoria:</label>
                            <div style="display:flex; gap:5px;">
                                <select id="reg-categoria" class="input-erp" style="flex:1">
                                    <option value="">-- seleccione --</option>
                                </select>
                                <button class="btn-primavera" onclick="abrirModalCategoria()" style="font-weight:bold;">+</button>
                            </div>
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">marca:</label>
                            <input type="text" id="reg-marca" class="input-erp" style="width:100%">
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">preço (mt):</label>
                            <input type="number" id="reg-preco" class="input-erp" style="width:100%" value="0">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primavera" onclick="fecharModalMaterial()">cancelar</button>
                    <button class="btn-primary" onclick="gravarMaterialNovo()">gravar</button>
                </div>
            </div>
        </div>

        <!-- SUB-MODAL CATEGORIA (RESPONSIVO) -->
        <div id="modal-categoria" class="modal" style="z-index: 3000;">
            <div class="modal-content" style="max-width: 350px;">
                <div class="modal-header"><h3>nova categoria</h3></div>
                <div class="modal-body">
                    <label style="font-size:10px; font-weight:bold;">nome:</label>
                    <input type="text" id="new-cat-nome" class="input-erp" style="width:100%">
                </div>
                <div class="modal-footer">
                    <button class="btn-primavera" onclick="fecharModalCategoria()">cancelar</button>
                    <button class="btn-primary" onclick="gravarNovaCategoria()">gravar</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(async () => {
        await carregarComponentesFiltro(isAdmin);
        await carregarDadosStock('/stock');
        configurarGrelhaInterativa();
    }, 50);
}

/**
 * SKU AUTOMÁTICO
 */
function gerarSkuAutomatico() {
    const d = new Date();
    return `SKU${d.getFullYear().toString().substring(2)}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getTime().toString().substring(9)}${Math.floor(Math.random()*900)+100}`;
}

function abrirModalMaterial() { 
    const m = document.getElementById('modal-material');
    if(m) {
        m.style.display = 'block'; 
        document.getElementById('reg-sku').value = gerarSkuAutomatico();
    }
}
function fecharModalMaterial() { document.getElementById('modal-material').style.display = 'none'; }

function abrirModalCategoria() { document.getElementById('modal-categoria').style.display = 'block'; }
function fecharModalCategoria() { document.getElementById('modal-categoria').style.display = 'none'; }

async function gravarNovaCategoria() {
    const nome = document.getElementById('new-cat-nome').value;
    if(!nome) return alert("insira o nome.");
    const res = await api.request('/categorias', 'POST', { nome });
    if(res.sucesso) {
        alert("categoria criada!");
        fecharModalCategoria();
        const isAdmin = JSON.parse(localStorage.getItem('usuario')).tipo_acesso === 'admin';
        await carregarComponentesFiltro(isAdmin);
    }
}

async function gravarMaterialNovo() {
    const dados = {
        nome: document.getElementById('reg-nome').value.toUpperCase(),
        sku: document.getElementById('reg-sku').value,
        categoria_id: document.getElementById('reg-categoria').value,
        marca: document.getElementById('reg-marca').value,
        unidade_medida: document.getElementById('reg-unidade').value,
        preco_compra: parseFloat(document.getElementById('reg-preco').value) || 0
    };
    if(!dados.nome || !dados.categoria_id) return alert("nome e categoria são obrigatórios.");
    const res = await api.request('/materiais', 'POST', dados);
    if (res.sucesso) {
        alert("material registado!");
        fecharModalMaterial();
        renderStock();
    }
}

async function carregarComponentesFiltro(isAdmin) {
    const resCat = await api.request('/categorias');
    const fld = document.getElementById('categoria-filter');
    const reg = document.getElementById('reg-categoria');
    if (resCat.sucesso && resCat.dados) {
        fld.innerHTML = '<option value="Todos">todas as categorias</option>';
        reg.innerHTML = '<option value="">-- seleccione --</option>';
        resCat.dados.forEach(c => {
            fld.innerHTML += `<option value="${c.nome}">${c.nome.toLowerCase()}</option>`;
            reg.innerHTML += `<option value="${c.id}">${c.nome.toLowerCase()}</option>`;
        });
    }
    if (isAdmin) {
        const resProv = await api.request('/provincias');
        const fldProv = document.getElementById('provincia-filter');
        if (resProv.sucesso && fldProv) {
            fldProv.innerHTML = '<option value="GERAL">stock geral (todas as unidades)</option>';
            resProv.dados.forEach(p => {
                fldProv.innerHTML += `<option value="${p.id}">📍 província: ${p.nome.toLowerCase()}</option>`;
            });
        }
    }
}

async function carregarDadosStock(endpoint) {
    const res = await api.request(endpoint);
    if (res.sucesso) {
        window.dadosStockCache = res.dados; 
        atualizarTabelaHtml(res.dados);
    }
}

function atualizarTabelaHtml(lista) {
    const tbody = document.getElementById('stock-body');
    const fCount = document.getElementById('footer-count');
    const fQty = document.getElementById('footer-qty');
    const fTotal = document.getElementById('footer-total-valor');
    if (!tbody) return;
    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" align="center">sem registos.</td></tr>`;
        return;
    }
    let somaQtd = 0; let somaValor = 0;
    tbody.innerHTML = lista.map(item => {
        const qtd = parseFloat(item.quantidade_real || 0);
        const valor = parseFloat(item.valor_total_item || 0);
        somaQtd += qtd; somaValor += valor;
        return `<tr><td><span class="badge">${item.sku}</span></td><td><div style="font-weight:600;">${item.nome.toLowerCase()}</div></td><td>${item.categoria.toLowerCase()}</td><td align="center"><b>${qtd}</b></td><td>${item.unidade_medida.toLowerCase()}</td><td align="right">${valor.toLocaleString()} mt</td></tr>`;
    }).join('');
    if (fCount) fCount.innerText = lista.length;
    if (fQty) fQty.innerText = somaQtd.toFixed(2);
    if (fTotal) fTotal.innerText = somaValor.toLocaleString() + " mt";
}

function filtrarTabelaLocal() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const cat = document.getElementById('categoria-filter').value;
    if (!window.dadosStockCache) return;
    const filtrados = window.dadosStockCache.filter(i => {
        const txt = i.nome.toLowerCase().includes(term) || i.sku.toLowerCase().includes(term);
        const ct = cat === "Todos" || i.categoria === cat;
        return txt && ct;
    });
    atualizarTabelaHtml(filtrados);
}

async function processarAuditoriaData() {
    const dataX = document.getElementById('data-auditoria').value;
    const col = document.getElementById('col-retroativa');
    const tbody = document.getElementById('stock-body');
    if (!dataX || !tbody) return;
    col.style.display = "table-cell";
    tbody.innerHTML = `<tr><td colspan="7" align="center">a reverter histórico...</td></tr>`;
    const resH = await api.request(`/historico`); 
    if (resH.sucesso) {
        const calculados = window.dadosStockCache.map(item => {
            let ajuste = 0;
            resH.dados.filter(m => m.material_id === item.id && m.data_movimento >= dataX).forEach(m => {
                if (m.tipo === 'ENTRADA') ajuste -= m.quantidade;
                if (m.tipo === 'SAIDA') ajuste += m.quantidade;
            });
            return { ...item, qtd_retro: parseFloat(item.quantidade_real) + ajuste };
        });
        tbody.innerHTML = calculados.map(item => `<tr><td><span class="badge">${item.sku}</span></td><td><strong>${item.nome.toLowerCase()}</strong></td><td>${item.categoria.toLowerCase()}</td><td align="center">${item.quantidade_real}</td><td align="center" style="background:#fff3cd;">${item.qtd_retro}</td><td>${item.unidade_medida.toLowerCase()}</td><td align="right">---</td></tr>`).join('');
    }
}

async function trocarUnidadeFisica() {
    const id = document.getElementById('provincia-filter').value;
    if (id === 'GERAL') await carregarDadosStock('/stock');
    else {
        const res = await api.request(`/relatorios/provincia/${id}`);
        if (res.sucesso) {
            const formatados = res.dados.map(d => ({
                id: d.material_id, sku: d.sku || '---', nome: d.material, categoria: d.categoria || 'geral',
                quantidade_real: d.quantidade, unidade_medida: d.unidade_medida || 'un',
                valor_total_item: (d.quantidade * (d.preco_compra || 0))
            }));
            window.dadosStockCache = formatados;
            atualizarTabelaHtml(formatados);
        }
    }
}

function configurarGrelhaInterativa() {
    const ths = document.querySelectorAll('.erp-table th');
    ths.forEach(th => {
        const resizer = th.querySelector('.resizer');
        if (resizer) {
            let startX, startWidth;
            resizer.addEventListener('mousedown', e => {
                startX = e.pageX; startWidth = th.offsetWidth;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
            function onMouseMove(e) { th.style.width = (startWidth + (e.pageX - startX)) + 'px'; }
            function onMouseUp() { document.removeEventListener('mousemove', onMouseMove); }
        }
    });
}