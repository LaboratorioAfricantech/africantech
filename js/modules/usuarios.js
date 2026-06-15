/**
 * js/modules/usuarios.js
 * MÓDULO DE GESTÃO DE RECURSOS HUMANOS E PERMISSÕES (RH)
 */

async function renderUsuarios() {
    const main = document.getElementById('main-content');
    if (!main) return;

    // 1. ESTRUTURA CABEÇALHO + BARRA DE FILTROS HORIZONTAL
    main.innerHTML = `
        <div class="module-header">
            <div>
                <h2>gestão de utilizadores e técnicos</h2>
                <p style="font-size:11px; color:#666;">controlo de acessos, equipas provinciais e segurança</p>
            </div>
            <button class="btn-primary" onclick="abrirModalUsuario()">+ cadastrar funcionário</button>
        </div>

        <!-- BARRA DE FILTROS (USA A CLASSE DO CSS/USUARIOS.CSS) -->
        <div class="users-filter-bar">
            <div class="field-group" style="flex: 2;">
                <label style="font-size:10px; font-weight:bold; color:#888;">PESQUISAR:</label>
                <input type="text" id="search-user" class="input-erp" placeholder="nome, função ou contacto..." onkeyup="filtrarUsuariosLocal()">
            </div>
            
            <div class="field-group" style="flex: 1;">
                <label style="font-size:10px; font-weight:bold; color:#888;">UNIDADE:</label>
                <select id="filtro-provincia-user" class="input-erp" onchange="filtrarUsuariosLocal()">
                    <option value="Todas">todas as províncias</option>
                </select>
            </div>

            <div class="field-group" style="flex: 1;">
                <label style="font-size:10px; font-weight:bold; color:#888;">NÍVEL:</label>
                <select id="filtro-acesso" class="input-erp" onchange="filtrarUsuariosLocal()">
                    <option value="Todos">todos os níveis</option>
                    <option value="admin">administrador</option>
                    <option value="responsavel">responsável / técnico</option>
                </select>
            </div>

            <button class="btn-primavera" style="margin-top:18px;" onclick="renderUsuarios()">🔄</button>
        </div>

        <!-- GRELHA DE UTILIZADORES -->
        <div class="table-container">
            <table class="erp-table">
                <thead>
                    <tr>
                        <th width="50"></th>
                        <th>nome do funcionário</th>
                        <th width="150">função / cargo</th>
                        <th width="150">unidade provincial</th>
                        <th width="120">contacto</th>
                        <th width="120">acesso</th>
                        <th width="100">estado</th>
                        <th width="100" align="center">acções</th>
                    </tr>
                </thead>
                <tbody id="lista-usuarios-body">
                    <tr><td colspan="8" align="center" style="padding:40px;">a carregar lista de pessoal...</td></tr>
                </tbody>
            </table>
        </div>

        <footer class="erp-footer">
            <div>total de pessoal: <strong id="footer-user-total">0</strong></div>
            <div>utilizadores activos: <strong id="footer-user-ativos" style="color:var(--success)">0</strong></div>
        </footer>

        <!-- MODAL: CADASTRAR/EDITAR UTILIZADOR -->
        <div id="modal-user" class="modal">
            <div class="modal-content" style="width: 500px;">
                <div class="modal-header">
                    <h3>ficha de funcionário</h3>
                    <span onclick="fecharModalUsuario()" style="cursor:pointer; font-size:20px;">&times;</span>
                </div>
                <div class="modal-body">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        <div style="grid-column: span 2;">
                            <label style="font-size:10px; font-weight:bold;">NOME COMPLETO:</label>
                            <input type="text" id="reg-u-nome" class="input-erp" style="width:100%">
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">E-MAIL (LOGIN):</label>
                            <!-- Adicionado no-lowercase para permitir letras reais -->
                            <input type="email" id="reg-u-email" class="input-erp no-lowercase" style="width:100%">
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">SENHA:</label>
                            <!-- Adicionado no-lowercase para aceitar MAIÚSCULAS na senha -->
                            <input type="password" id="reg-u-senha" class="input-erp no-lowercase" style="width:100%">
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">FUNÇÃO:</label>
                            <input type="text" id="reg-u-funcao" class="input-erp" style="width:100%" placeholder="ex: técnico de frio">
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">TELEFONE:</label>
                            <input type="text" id="reg-u-fone" class="input-erp" style="width:100%">
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">PROVÍNCIA:</label>
                            <select id="reg-u-provincia" class="input-erp" style="width:100%"></select>
                        </div>
                        <div>
                            <label style="font-size:10px; font-weight:bold;">NÍVEL ACESSO:</label>
                            <select id="reg-u-acesso" class="input-erp" style="width:100%">
                                <option value="responsavel">responsável / técnico</option>
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

    // 2. CARREGAMENTO DE DADOS INICIAIS
    await carregarProvinciasFiltro();
    await buscarListaUsuarios();
}

/**
 * BUSCA TODOS OS UTILIZADORES
 */
async function buscarListaUsuarios() {
    const res = await api.request('/funcionarios/lista-geral?busca=&provincia=Todas');
    const tbody = document.getElementById('lista-usuarios-body');
    if (!tbody) return;

    if (res && res.sucesso) {
        window.dadosUsuariosCache = res.dados;
        atualizarTabelaUsuariosHtml(res.dados);
    } else {
        tbody.innerHTML = `<tr><td colspan="8" align="center" style="color:red;">erro ao carregar lista.</td></tr>`;
    }
}

/**
 * RENDERIZA AS LINHAS DA TABELA (ESTILO RH)
 */
function atualizarTabelaUsuariosHtml(lista) {
    const tbody = document.getElementById('lista-usuarios-body');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" align="center" style="padding:20px; color:#999;">nenhum utilizador encontrado.</td></tr>`;
        return;
    }

    let ativos = 0;

    tbody.innerHTML = lista.map(u => {
        if (u.ativo) ativos++;
        const iniciais = u.nome ? u.nome.substring(0,2).toUpperCase() : "??";
        
        return `
            <tr>
                <td align="center">
                    <div class="user-table-avatar" style="width:30px; height:30px; border-radius:50%; background:#eee; display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:10px;">
                        ${u.foto_url ? `<img src="${u.foto_url}" style="width:100%; height:100%; object-fit:cover;">` : iniciais}
                    </div>
                </td>
                <td><strong>${u.nome.toLowerCase()}</strong></td>
                <td>${u.funcao.toLowerCase()}</td>
                <td>📍 ${u.provincia_nome ? u.provincia_nome.toLowerCase() : 'sede / geral'}</td>
                <td>${u.telefone || '---'}</td>
                <td><span class="badge-role" style="background:#f3f2f1; padding:2px 8px; border-radius:10px; font-size:10px;">${u.tipo_acesso}</span></td>
                <td>
                    <span class="${u.ativo ? 'status-active' : 'status-blocked'}" style="color: ${u.ativo ? 'var(--success)' : 'var(--danger)'}; font-weight:800;">
                        ${u.ativo ? '● activo' : '○ bloqueado'}
                    </span>
                </td>
                <td align="center">
                    <button class="btn-action-table" style="background:white; border:1px solid #ccc; padding:4px 10px; font-size:11px; cursor:pointer;" onclick="toggleStatusUsuario(${u.id}, ${u.ativo})">
                        ${u.ativo ? 'bloquear' : 'activar'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('footer-user-total').innerText = lista.length;
    document.getElementById('footer-user-ativos').innerText = ativos;
}

/**
 * FILTRAGEM LOCAL INSTANTÂNEA
 */
function filtrarUsuariosLocal() {
    const termo = document.getElementById('search-user').value.toLowerCase();
    const prov = document.getElementById('filtro-provincia-user').value;
    const acesso = document.getElementById('filtro-acesso').value;

    if (!window.dadosUsuariosCache) return;

    const filtrados = window.dadosUsuariosCache.filter(u => {
        const matchTexto = u.nome.toLowerCase().includes(termo) || u.funcao.toLowerCase().includes(termo);
        const matchProv = prov === "Todas" || u.provincia_nome === prov;
        const matchAcesso = acesso === "Todos" || u.tipo_acesso === acesso;
        return matchTexto && matchProv && matchAcesso;
    });

    atualizarTabelaUsuariosHtml(filtrados);
}

/**
 * AUXILIARES (MODAIS E PROVÍNCIAS)
 */
async function carregarProvinciasFiltro() {
    const res = await api.request('/provincias');
    const fld = document.getElementById('filtro-provincia-user');
    const reg = document.getElementById('reg-u-provincia');

    if (res && res.sucesso && res.dados) {
        res.dados.forEach(p => {
            const opt = `<option value="${p.nome}">${p.nome.toLowerCase()}</option>`;
            const optId = `<option value="${p.id}">${p.nome.toLowerCase()}</option>`;
            if (fld) fld.innerHTML += opt;
            if (reg) reg.innerHTML += optId;
        });
    }
}

async function toggleStatusUsuario(id, statusAtual) {
    const acao = statusAtual ? "bloquear" : "activar";
    if (!confirm(`deseja realmente ${acao} este utilizador?`)) return;

    const res = await api.request(`/funcionarios/${id}/status`, 'PATCH', { ativo: !statusAtual });
    if (res && res.sucesso) buscarListaUsuarios();
}

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

    if (!dados.nome || !dados.email || !dados.senha) return alert("nome, e-mail e senha são obrigatórios.");

    const res = await api.request('/funcionarios', 'POST', dados);
    if (res && res.sucesso) {
        alert("utilizador cadastrado!");
        fecharModalUsuario();
        renderUsuarios();
    } else {
        alert("erro: " + (res ? res.mensagem : "falha de rede"));
    }
}

function abrirModalUsuario() { document.getElementById('modal-user').style.display = 'flex'; }
function fecharModalUsuario() { document.getElementById('modal-user').style.display = 'none'; }