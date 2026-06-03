/**
 * js/modules/usuarios.js
 * MÓDULO DE GESTÃO DE RECURSOS HUMANOS E PERMISSÕES
 */

async function renderUsuarios() {
    const main = document.getElementById('main-content');
    if (!main) return;

    // 1. Estrutura Principal com Design Primavera
    main.innerHTML = `
        <div class="module-header" style="flex-shrink: 0;">
            <div>
                <h2>gestão de utilizadores e técnicos</h2>
                <p id="user-status-info" style="font-size:11px; color:var(--text-secondary);">controlo de acessos e equipas provinciais</p>
            </div>
            <button class="btn-primary" onclick="abrirModalUsuario()">+ novo utilizador</button>
        </div>

        <!-- BARRA DE FILTROS DE RH -->
        <div class="filter-bar" style="flex-shrink: 0;">
            <input type="text" id="search-user" class="input-erp" style="flex: 2;" 
                   placeholder="pesquisar por nome, função ou telefone..." onkeyup="filtrarUsuariosLocal()">
            
            <select id="filtro-provincia-user" class="input-erp" style="flex: 1;" onchange="filtrarUsuariosLocal()">
                <option value="Todas">todas as províncias</option>
            </select>

            <select id="filtro-acesso" class="input-erp" style="flex: 1;" onchange="filtrarUsuariosLocal()">
                <option value="Todos">todos os níveis</option>
                <option value="admin">administrador</option>
                <option value="tecnico">técnico / logística</option>
            </select>

            <button class="btn-primavera" onclick="renderUsuarios()">🔄 actualizar</button>
        </div>

        <!-- GRELHA DE UTILIZADORES -->
        <div class="table-container">
            <table class="erp-table">
                <thead>
                    <tr>
                        <th width="250">nome do funcionário</th>
                        <th width="150">função / cargo</th>
                        <th width="150">unidade provincial</th>
                        <th width="120">contacto</th>
                        <th width="120">nível acesso</th>
                        <th width="100">estado</th>
                        <th width="80" align="center">acções</th>
                    </tr>
                </thead>
                <tbody id="lista-usuarios-body">
                    <tr><td colspan="7" align="center">a carregar lista de pessoal...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- RODAPÉ DE RESUMO DE RH -->
        <footer class="erp-footer">
            <div class="footer-section">
                <div class="stat-box">
                    <label>total pessoal:</label>
                    <span id="footer-user-total">0</span>
                </div>
                <div style="border-left: 1px solid #ccc; height: 20px; margin: 0 15px;"></div>
                <div class="stat-box">
                    <label>activos:</label>
                    <span id="footer-user-ativos" style="color:var(--success)">0</span>
                </div>
            </div>
            <div class="summary-line">
                <label>segurança do sistema:</label>
                <strong>africantech</strong>
            </div>
        </footer>

        <!-- MODAL DE CADASTRO DE UTILIZADOR -->
        <div id="modal-user" class="modal">
            <div class="modal-content" style="width: 500px;">
                <div class="modal-header">
                    <h3>cadastrar novo funcionário</h3>
                    <span style="cursor:pointer" onclick="fecharModalUsuario()">&times;</span>
                </div>
                <div class="modal-body">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                        <div style="grid-column: span 2;">
                            <label style="font-size:10px; font-weight:bold;">nome completo:</label>
                            <input type="text" id="reg-u-nome" class="input-erp" style="width:100%">
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">e-mail (login):</label>
                            <input type="email" id="reg-u-email" class="input-erp" style="width:100%">
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">senha inicial:</label>
                            <input type="password" id="reg-u-senha" class="input-erp" style="width:100%">
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">função:</label>
                            <input type="text" id="reg-u-funcao" class="input-erp" placeholder="ex: técnico de frio" style="width:100%">
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">telefone:</label>
                            <input type="text" id="reg-u-fone" class="input-erp" style="width:100%">
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">unidade provincial:</label>
                            <select id="reg-u-provincia" class="input-erp" style="width:100%"></select>
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">nível de acesso:</label>
                            <select id="reg-u-acesso" class="input-erp" style="width:100%">
                                <option value="tecnico">técnico / logística</option>
                                <option value="admin">administrador</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primavera" onclick="fecharModalUsuario()">cancelar</button>
                    <button class="btn-primary" onclick="salvarNovoUsuario()">gravar utilizador</button>
                </div>
            </div>
        </div>
    `;

    // 2. Carregar Províncias e Dados
    setTimeout(async () => {
        await carregarProvinciasFiltro();
        await buscarListaUsuarios();
    }, 50);
}

/**
 * Puxa as províncias para os selects de filtro e cadastro
 */
async function carregarProvinciasFiltro() {
    const res = await api.request('/provincias');
    const fld = document.getElementById('filtro-provincia-user');
    const reg = document.getElementById('reg-u-provincia');

    if (res.sucesso && res.dados) {
        res.dados.forEach(p => {
            const html = `<option value="${p.nome}">${p.nome.toLowerCase()}</option>`;
            const htmlReg = `<option value="${p.id}">${p.nome.toLowerCase()}</option>`;
            if (fld) fld.innerHTML += html;
            if (reg) reg.innerHTML += htmlReg;
        });
    }
}

/**
 * Busca funcionários no Backend Railway
 */
async function buscarListaUsuarios() {
    const res = await api.request('/funcionarios/lista-geral?busca=&provincia=Todas');
    if (res.sucesso) {
        window.dadosUsuariosCache = res.dados;
        atualizarTabelaUsuariosHtml(res.dados);
    }
}

/**
 * Renderiza as linhas e actualiza rodapé de pessoal
 */
function atualizarTabelaUsuariosHtml(lista) {
    const tbody = document.getElementById('lista-usuarios-body');
    const fTotal = document.getElementById('footer-user-total');
    const fAtivos = document.getElementById('footer-user-ativos');

    if (!tbody) return;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" align="center" style="padding:20px;">nenhum funcionário encontrado.</td></tr>`;
        if (fTotal) fTotal.innerText = "0";
        if (fAtivos) fAtivos.innerText = "0";
        return;
    }

    let ativos = 0;

    tbody.innerHTML = lista.map(u => {
        if (u.ativo) ativos++;
        const iniciais = u.nome ? u.nome.substring(0,2).toUpperCase() : "??";
        
        return `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="avatar-circle" style="width:25px; height:25px; font-size:9px; background:#e1dfdd; color:#666;">
                            ${u.foto_url ? `<img src="${u.foto_url}" class="nav-avatar-img">` : iniciais}
                        </div>
                        <strong>${u.nome.toLowerCase()}</strong>
                    </div>
                </td>
                <td>${u.funcao.toLowerCase()}</td>
                <td>📍 ${u.provincia_nome ? u.provincia_nome.toLowerCase() : 'sede / geral'}</td>
                <td>${u.telefone || '---'}</td>
                <td><span class="badge" style="background:${u.tipo_acesso === 'admin' ? '#e1f5fe' : '#f3f2f1'}">${u.tipo_acesso}</span></td>
                <td>
                    <span style="color: ${u.ativo ? 'var(--success)' : 'var(--danger)'}; font-weight:bold;">
                        ${u.ativo ? '● activo' : '○ bloqueado'}
                    </span>
                </td>
                <td align="center">
                    <button class="btn-primavera" style="padding:2px 5px;" onclick="toggleStatusUsuario(${u.id}, ${u.ativo})">
                        ${u.ativo ? 'bloquear' : 'activar'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (fTotal) fTotal.innerText = lista.length;
    if (fAtivos) fAtivos.innerText = ativos;
}

/**
 * Filtro Instantâneo
 */
function filtrarUsuariosLocal() {
    const termo = document.getElementById('search-user').value.toLowerCase();
    const prov = document.getElementById('filtro-provincia-user').value;
    const acesso = document.getElementById('filtro-acesso').value;

    if (!window.dadosUsuariosCache) return;

    const filtrados = window.dadosUsuariosCache.filter(u => {
        const matchTexto = u.nome.toLowerCase().includes(termo) || 
                           u.funcao.toLowerCase().includes(termo) || 
                           (u.telefone && u.telefone.includes(termo));
        const matchProv = prov === "Todas" || u.provincia_nome === prov;
        const matchAcesso = acesso === "Todos" || u.tipo_acesso === acesso;
        return matchTexto && matchProv && matchAcesso;
    });

    atualizarTabelaUsuariosHtml(filtrados);
}

/**
 * Cadastro de Utilizador (POST /funcionarios)
 */
async function salvarNovoUsuario() {
    const dados = {
        nome: document.getElementById('reg-u-nome').value,
        email: document.getElementById('reg-u-email').value,
        senha: document.getElementById('reg-u-senha').value,
        funcao: document.getElementById('reg-u-funcao').value,
        telefone: document.getElementById('reg-u-fone').value,
        provincia_id: document.getElementById('reg-u-provincia').value,
        tipo_acesso: document.getElementById('reg-u-acesso').value
    };

    if (!dados.nome || !dados.email || !dados.senha) return alert("preencha os campos obrigatórios.");

    const res = await api.request('/funcionarios', 'POST', dados);
    if (res.sucesso) {
        alert("utilizador cadastrado com sucesso!");
        fecharModalUsuario();
        renderUsuarios();
    } else {
        alert("erro: " + res.mensagem);
    }
}

/**
 * Bloquear ou Activar Utilizador (PATCH /funcionarios/:id/status)
 */
async function toggleStatusUsuario(id, statusActual) {
    const acao = statusActual ? "bloquear" : "activar";
    if (!confirm(`deseja realmente ${acao} este utilizador?`)) return;

    const res = await api.request(`/funcionarios/${id}/status`, 'PATCH', { ativo: !statusActual });
    if (res.sucesso) {
        buscarListaUsuarios();
    }
}

function abrirModalUsuario() { const m = document.getElementById('modal-user'); if(m) m.style.display = 'block'; }
function fecharModalUsuario() { const m = document.getElementById('modal-user'); if(m) m.style.display = 'none'; }